/**
 * The desk's door into a real Adminium: the data API as the person signed in
 * to it, the way the dashboard reads it — the app served by Adminium at
 * `/apps/hotel/staff/`, riding that person's session, their roles and limits
 * holding every read and write.
 *
 * Everything the desk needs to start is in the staff `surface-config.json`:
 * the connection, the tables' real names, the house's zone and money, who is
 * signed in and the roles they hold, and what they may do to each table. A
 * front-desk person or housekeeping may not read the dashboard's own routes,
 * so nothing here asks them.
 *
 * Every figure is Adminium's: a booking's price comes from its dry run, a
 * stay's total from the row after the write, a night's rate from its nightly
 * lines. A move is a change of `status`, judged by the table's states; the
 * status the screen saw goes with it, so a stay that moved on since is refused
 * rather than moved twice. A change, the nights stayed and a void are priced
 * by Adminium's own change quote, never here; a booking's save carries the
 * price the desk showed and a retry key, and a change the price it showed.
 */
import type { DeskHouse, DeskPerson, DeskPort, Folio, StayWithLines } from "./ports.ts";
import { SessionPortError, type SessionTransport } from "./sessionSource.ts";
import type { StaffConfig } from "../staffConnection.ts";
import { addDays, venueDay } from "../lib/venueTime.ts";
import { ApiError, yes, type Id, type LiveFrame, type Night, type NightCount, type QuoteReply, type Row, type StayBody, type StayReply } from "./wire.ts";

/** The app's key: its roles are named `hotel-<role>`, its tables `hotel_<table>` when the server does not say. */
const APP_KEY = "hotel";
const PAGE = 200;
/** The most rows one read of the book brings back. */
const MOST_ROWS = 10_000;
/** How far back the desk's book reaches: stays that left within these days, and every stay still live or ahead. */
export const BOOK_DAYS = 60;

type Table =
  | "settings" | "room_types" | "room_type_features" | "rooms" | "extras" | "house_notes" | "room_closures" | "rate_rules" | "charge_items"
  | "customers" | "stays" | "stay_extras" | "charges" | "stay_credits" | "payments";

/** The tables whose changes the desk hears, in the order their channels are asked for. */
const LIVE: readonly Table[] = ["stays", "stay_extras", "charges", "stay_credits", "payments", "rooms", "room_closures", "customers", "room_types", "rate_rules", "extras"];

/** The transport's refusal as the screens read one: its status, its code, what it said beside. */
export function asApiError(error: unknown): unknown {
  if (error instanceof SessionPortError) {
    const details = error.details !== null && typeof error.details === "object" && !Array.isArray(error.details) ? (error.details as Record<string, unknown>) : {};
    return new ApiError(error.status, error.code, error.message, details);
  }
  return error;
}

async function answer<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw asApiError(error);
  }
}

/** Whether the transport's refusal is this code. */
const refusedAs = (error: unknown, code: string) => error instanceof SessionPortError && error.code === code;
const byPosition = (a: Row, b: Row) => Number(a["position"] ?? 0) - Number(b["position"] ?? 0) || Number(a.id) - Number(b.id);
const where = (column: string, value: unknown) => encodeURIComponent(JSON.stringify({ column, op: "eq", value }));
const whereAll = (...clauses: [string, unknown][]) => encodeURIComponent(JSON.stringify({ and: clauses.map(([column, value]) => ({ column, op: "eq", value })) }));

interface Page {
  data: Row[];
  page?: { total?: number | null };
}

export interface DeskOptions {
  /** The live stream's connection: `EventSource` in a browser, a stand-in in a test. */
  stream?: (url: string) => EventSourceLike;
  /** Where signing out lands. */
  leave?: (url: string) => void;
  clock?: () => number;
}

export interface EventSourceLike {
  /** 2 once the browser has given up on it (a reconnect answered other than 200). */
  readyState?: number;
  onopen: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  addEventListener(type: string, listener: (event: { data: string }) => void): void;
  close(): void;
}

export class AdminiumDesk implements DeskPort {
  private readonly t: SessionTransport;
  private readonly cfg: StaffConfig;
  private readonly opts: DeskOptions;
  /** The room types' base rates, for a night Adminium priced without one. */
  private baseRates = new Map<string, number>();

  /** Adminium's clock less the browser's, from the config's `now`: "today" is the house's, never the browser's. */
  private readonly skew: number;

  constructor(transport: SessionTransport, config: StaffConfig, options: DeskOptions = {}) {
    this.t = transport;
    this.cfg = config;
    this.opts = options;
    const said = typeof config.now === "string" ? Date.parse(config.now) : Number.NaN;
    this.skew = Number.isNaN(said) ? 0 : said - Date.now();
  }

  // ── the wire ──────────────────────────────────────────────────────────────

  private real(table: Table): string {
    return this.cfg.tables[table] ?? `${APP_KEY}_${table}`;
  }
  private async path(table: Table, rest = ""): Promise<string> {
    const conn = this.cfg.connectionId ?? (await this.t.connection());
    return `/api/v1/data/${encodeURIComponent(conn)}/${encodeURIComponent(this.real(table))}${rest}`;
  }
  /** Whether this person may read a table: when the server does not say, the server decides. */
  private may(table: Table, action: "read" | "create" | "update" = "read"): boolean {
    const actions = this.cfg.access?.tables[table];
    return actions === undefined ? this.cfg.access === null : actions.includes(action);
  }
  /**
   * A write. The CSRF token is the session's: after a sign-in in another tab
   * the one this page holds is refused, and the write never happened — so it
   * is sent once more with a fresh token.
   */
  private async mutate<T>(path: string, method: "POST" | "PATCH" | "DELETE", body?: unknown): Promise<T> {
    try {
      return await this.t.mutate<T>(path, method, body);
    } catch (error) {
      if (!refusedAs(error, "CSRF_FAILED")) throw error;
      await this.t.refresh();
      return this.t.mutate<T>(path, method, body);
    }
  }
  /** Every row of a table (or those `filter` keeps), a page at a time, oldest first. */
  private async list(table: Table, filter?: string): Promise<Row[]> {
    const rows: Row[] = [];
    for (let offset = 0; ; offset += PAGE) {
      // Past this the answer would be cut short without saying so: say so instead.
      if (offset >= MOST_ROWS) throw new ApiError(413, "TOO_MANY_ROWS", `More than ${String(MOST_ROWS)} ${table} rows to read.`, { table });
      const got = await this.t.get<Page>(await this.path(table, `?limit=${String(PAGE)}&offset=${String(offset)}${filter === undefined ? "" : `&where=${filter}`}`));
      rows.push(...got.data);
      if (got.data.length < PAGE) break;
    }
    return rows;
  }
  private async one(table: Table, id: Id): Promise<Row> {
    return (await this.t.get<{ data: Row }>(await this.path(table, `/${encodeURIComponent(String(id))}`))).data;
  }
  private async create(table: Table, values: Record<string, unknown>, children?: Record<string, { values: Record<string, unknown> }[]>): Promise<Row> {
    const body = children === undefined ? { values } : { values, children };
    return (await this.mutate<{ data: Row }>(await this.path(table), "POST", body)).data;
  }
  private async change(table: Table, id: Id, values: Record<string, unknown>, from?: string): Promise<Row> {
    const body = from === undefined ? { values } : { values, from };
    return (await this.mutate<{ data: Row }>(await this.path(table, `/${encodeURIComponent(String(id))}`), "PATCH", body)).data;
  }
  private today(): string {
    return venueDay(this.opts.clock?.() ?? Date.now() + this.skew, this.cfg.timezone ?? this.cfg.serverTimezone ?? "UTC");
  }

  // ── who, and the house ────────────────────────────────────────────────────

  async me(): Promise<DeskPerson> {
    const prefix = `${APP_KEY}-`;
    const roles = (this.cfg.access?.roles ?? []).map((r) => (r.slug.startsWith(prefix) ? r.slug.slice(prefix.length) : r.slug));
    return { name: this.cfg.user?.name ?? "", roles };
  }

  async config() {
    return {
      timezone: this.cfg.timezone ?? this.cfg.serverTimezone,
      currency: this.cfg.currency,
      ...(typeof this.cfg.now === "string" ? { now: this.cfg.now } : {}),
      folio: this.cfg.addOns["invoices"] !== undefined,
    };
  }

  house(): Promise<DeskHouse> {
    return answer(async () => {
      const read = (table: Table) => (this.may(table) ? this.list(table) : Promise.resolve([] as Row[]));
      const [settings, types, features, rooms, extras, notes, closures, rates, items] = await Promise.all([
        read("settings"),
        read("room_types"),
        read("room_type_features"),
        read("rooms"),
        read("extras"),
        read("house_notes"),
        read("room_closures"),
        read("rate_rules"),
        read("charge_items"),
      ]);
      for (const type of types) this.baseRates.set(String(type.id), Number(type["base_rate"]));
      return {
        settings: settings[0] ?? ({ id: 0 } as Row),
        types: types.sort(byPosition),
        features: features.sort(byPosition),
        rooms: rooms.sort((a, b) => String(a["number"]).localeCompare(String(b["number"]))),
        extras: extras.sort(byPosition),
        notes: notes.sort(byPosition),
        closures: closures.sort(byPosition),
        rates: rates.sort(byPosition),
        items: items.sort(byPosition),
      };
    });
  }

  stays(): Promise<StayWithLines[]> {
    return answer(async () => {
      // Only what this person may read: housekeeping reads a stay's room, dates and status, and its extras, and no money.
      // The book as the desk works it: every stay still to come or in the house, and those that left in the last
      // weeks. Older stays are Adminium's Reservations page's; a folio opened by its id reads the stay itself.
      const since = addDays(this.today(), -BOOK_DAYS);
      const window = encodeURIComponent(JSON.stringify({ or: [{ column: "depart", op: "gte", value: since }, { column: "status", op: "in", value: ["booked", "in_house"] }] }));
      const stays = this.may("stays") ? await this.list("stays", window) : [];
      if (stays.length === 0) return [];
      // A stay's lines are made after it: those of the book's oldest stay on are every line the book needs.
      const first = stays.reduce((least, stay) => Math.min(least, Number(stay.id)), Number.POSITIVE_INFINITY);
      const from = encodeURIComponent(JSON.stringify({ column: "stay_id", op: "gte", value: first }));
      const read = (table: Table) => (this.may(table) ? this.list(table, from) : Promise.resolve([] as Row[]));
      const [extras, charges, credits, payments] = await Promise.all([read("stay_extras"), read("charges"), read("stay_credits"), read("payments")]);
      const byStay = (rows: Row[]) => {
        const out = new Map<string, Row[]>();
        for (const row of rows) out.set(String(row["stay_id"]), [...(out.get(String(row["stay_id"])) ?? []), row]);
        return out;
      };
      const [e, c, cr, p] = [byStay(extras), byStay(charges), byStay(credits), byStay(payments)];
      const of = (rows: Map<string, Row[]>, id: Id) => rows.get(String(id)) ?? [];
      return stays.map((stay) => ({ stay, extras: of(e, stay.id), charges: of(c, stay.id), credits: of(cr, stay.id), payments: of(p, stay.id) }));
    });
  }

  folio(id: Id): Promise<Folio> {
    return answer(async () => {
      const f = where("stay_id", id);
      const [stay, extras, charges, credits, payments, nights] = await Promise.all([
        this.one("stays", id),
        this.list("stay_extras", f),
        this.list("charges", f),
        this.list("stay_credits", f),
        this.list("payments", f),
        this.nightly(id),
      ]);
      return { stay, extras, charges, credits, payments, nights };
    });
  }

  /** The stay's nights as Adminium priced them; none when it keeps the stay's price as one line, or has no nightly lines to say. */
  private async nightly(id: Id): Promise<Night[]> {
    return (await this.nightlyAnswer(id)).nights;
  }
  /** The nightly lines, and whether the rates moved since the stay was priced (its nights no longer add up to its room total). */
  private async nightlyAnswer(id: Id): Promise<{ nights: Night[]; stale: boolean }> {
    try {
      const got = await this.t.get<{ data: { nights?: Record<string, unknown>[]; stale?: boolean } }>(await this.path("stays", `/${encodeURIComponent(String(id))}/nightly`));
      if (got.data.stale === true) return { nights: [], stale: true };
      return { nights: (got.data.nights ?? []).map((n) => ({ date: String(n["date"]), rate: Number(n["rate"]), base: Number(n["base"] ?? n["rate"]), tags: Array.isArray(n["tags"]) ? n["tags"].map(String) : [] })), stale: false };
    } catch (error) {
      if (error instanceof SessionPortError && error.status === 404) return { nights: [], stale: false };
      throw error;
    }
  }
  /** A credit this stay already has for these nights: a write sent again after it was made finds it, and makes no second. */
  private async liveCredit(id: Id, reason: "left_early" | "missed", from: unknown): Promise<Row | undefined> {
    const credits = await this.list("stay_credits", where("stay_id", id));
    return credits.find((c) => c["reason"] === reason && String(c["from_date"]) === String(from) && !yes(c["voided"]));
  }

  guestByEmail(email: string) {
    return answer(async () => {
      const address = email.trim().toLowerCase();
      const found = await this.t.get<Page>(await this.path("customers", `?limit=1&where=${where("email", address)}`));
      const customer = found.data[0];
      if (customer === undefined) return null;
      const stays = await this.t.get<Page>(await this.path("stays", `?limit=1&count=exact&where=${where("customer_id", customer.id)}`));
      return { customer, stays: Number(stays.page?.total ?? stays.data.length) };
    });
  }

  counts(from: string, days: number): Promise<NightCount[]> {
    return answer(async () => {
      const ask = async (table: "stays" | "stay_extras"): Promise<NightCount[]> => {
        const got = await this.t.get<{ data: { rows: Record<string, unknown>[] } }>(await this.path(table, `/capacity-counts?rule=0&from=${from}&days=${String(days)}`));
        return got.data.rows.map((r) => ({ table, pool: Number(r["pool"]), date: String(r["date"]), size: Number(r["size"]), outOfService: Number(r["outOfService"] ?? 0), taken: Number(r["taken"]), left: Number(r["left"]) }));
      };
      const [rooms, parking] = await Promise.all([ask("stays"), this.may("extras") ? ask("stay_extras") : Promise.resolve([])]);
      return [...rooms, ...parking];
    });
  }

  // ── bookings and edits ────────────────────────────────────────────────────

  private async withExtras(body: StayBody): Promise<{ values: Record<string, unknown>; children: Record<string, { values: Record<string, unknown> }[]> }> {
    const rel = await this.t.relation(this.real("stay_extras"), "stay_id");
    return { values: { ...body.values, channel: "desk" }, children: { [rel]: body.children.stay_extras } };
  }

  private night(n: Record<string, unknown>, typeId: unknown): Night {
    const rate = Number(n["rate"]);
    const base = n["base"] ?? this.baseRates.get(String(typeId));
    return { date: String(n["date"]), rate, base: base === undefined ? rate : Number(base), tags: Array.isArray(n["tags"]) ? n["tags"].map(String) : [] };
  }

  quote(body: StayBody): Promise<QuoteReply> {
    return answer(async () => {
      const write = await this.withExtras(body);
      // A booking is priced before its guest is named: a placeholder name, written nowhere.
      if (write.values["first_name"] === undefined || write.values["first_name"] === "") write.values["first_name"] = "—";
      const got = await this.mutate<{ data: Row; children?: Record<string, { data: Row }[]>; nights?: Record<string, unknown>[] }>(await this.path("stays", "/dry-run"), "POST", write);
      const rel = Object.keys(write.children)[0]!;
      return {
        data: got.data,
        nights: (got.nights ?? []).map((n) => this.night(n, body.values["room_type_id"])),
        children: { stay_extras: (got.children?.[rel] ?? []).map((c) => ({ data: c.data })) },
        capacity: [],
        exact: true,
      };
    });
  }

  book(body: StayBody): Promise<StayReply> {
    return answer(async () => {
      const write = await this.withExtras(body);
      const sent = { ...write, ...(body.expect === undefined ? {} : { expect: body.expect }), ...(body.clientKey === undefined ? {} : { clientKey: body.clientKey }) };
      const reply = await this.mutate<{ data: Row; replayed?: boolean }>(await this.path("stays"), "POST", sent);
      // The booking is made: its lines are read for the toast only, and a failed read never hides the booking.
      const lines = await this.list("stay_extras", where("stay_id", reply.data.id)).catch(() => [] as Row[]);
      return { data: reply.data, children: { stay_extras: lines.map((data) => ({ data })) }, ...(reply.replayed === true ? { replayed: true as const } : {}) };
    });
  }

  /**
   * A stay's extras as a change sends them: every line it has (a list a
   * change sends is the whole list — a line left out would be deleted), each
   * ticked on or off as asked, and a new line for an extra it never had.
   */
  private async extrasList(id: Id, toggles: { extraId: Id; on: boolean }[]): Promise<{ key?: Record<string, unknown>; values: Record<string, unknown> }[]> {
    const lines = await this.list("stay_extras", where("stay_id", id));
    const wanted = new Map(toggles.map((t) => [String(t.extraId), t.on]));
    const rows: { key?: Record<string, unknown>; values: Record<string, unknown> }[] = lines.map((line) => {
      const on = wanted.get(String(line["extra_id"]));
      return { key: { id: line.id }, values: { state: on === undefined ? line["state"] : on ? "on" : "off" } };
    });
    for (const { extraId, on } of toggles) {
      if (on && !lines.some((line) => String(line["extra_id"]) === String(extraId))) rows.push({ values: { extra_id: extraId } });
    }
    return rows;
  }

  /** A change of a stay as a save sends it: its values, its extras when any are asked about, and the price the desk showed. */
  private async changeBody(id: Id, values: Record<string, unknown>, extras: { extraId: Id; on: boolean }[] | undefined, withLines: boolean) {
    const children = extras !== undefined && (extras.length > 0 || withLines) ? { [await this.t.relation(this.real("stay_extras"), "stay_id")]: await this.extrasList(id, extras) } : undefined;
    return { values, ...(children === undefined ? {} : { children }) };
  }

  /**
   * Adminium's own quote of a change: the stay as the change would leave it,
   * its extras as ticked (their nights and guests following the stay), the
   * nights it would be made of. Nothing is kept.
   */
  quoteEdit(id: Id, values: Record<string, unknown>, extras: { extraId: Id; on: boolean }[] = []): Promise<QuoteReply> {
    return answer(async () => {
      const body = await this.changeBody(id, values, extras, true);
      const got = await this.mutate<{ data: Row; children?: Record<string, { data: Row }[]>; nights?: Record<string, unknown>[] }>(await this.path("stays", `/${encodeURIComponent(String(id))}/dry-run`), "POST", body);
      const lines = Object.values(got.children ?? {})[0] ?? [];
      return {
        data: got.data,
        nights: (got.nights ?? []).map((n) => this.night(n, got.data["room_type_id"])),
        children: { stay_extras: lines.map((c) => ({ data: c.data })) },
        capacity: [],
        exact: true,
      };
    });
  }

  edit(id: Id, values: Record<string, unknown>, expectTotal?: string, extras?: { extraId: Id; on: boolean }[]): Promise<Row> {
    return answer(async () => {
      const body = await this.changeBody(id, values, extras, false);
      return (await this.mutate<{ data: Row }>(await this.path("stays", `/${encodeURIComponent(String(id))}`), "PATCH", { ...body, ...(expectTotal === undefined ? {} : { expect: { total: expectTotal } }) })).data;
    });
  }

  setExtra(stayId: Id, extraId: Id, on: boolean): Promise<Row> {
    return answer(async () => {
      const line = (await this.list("stay_extras", whereAll(["stay_id", stayId], ["extra_id", extraId])))[0];
      if (on) return line === undefined ? this.create("stay_extras", { stay_id: stayId, extra_id: extraId }) : line["state"] === "off" ? this.change("stay_extras", line.id, { state: "on" }) : line;
      if (line === undefined || line["state"] === "off") throw new ApiError(409, "STATE_UNCHANGED", "It is off already.");
      return this.change("stay_extras", line.id, { state: "off" });
    });
  }

  // ── the stay's moves ──────────────────────────────────────────────────────

  checkIn(id: Id, roomId: Id): Promise<Row> {
    return answer(() => this.change("stays", id, { room_id: roomId, status: "in_house" }, "booked"));
  }

  checkOut(id: Id): Promise<Row> {
    return answer(() => this.change("stays", id, { status: "departed" }, "in_house"));
  }

  takeOffNights(id: Id, from: string): Promise<Row> {
    return answer(async () => {
      const stay = await this.one("stays", id);
      if (from <= String(stay["arrive"]) || from >= String(stay["depart"])) throw new ApiError(422, "VALIDATION_FAILED", "Those nights are not the stay's.", { fields: { from_date: { code: "out-of-range" } } });
      return (await this.liveCredit(id, "left_early", from)) ?? this.create("stay_credits", { stay_id: id, reason: "left_early", from_date: from, to_date: stay["depart"] });
    });
  }

  /**
   * What the stay would come to with the nights from `from` taken off: the
   * credit row tried with the stay's change quote (every credit it has, and
   * the new one), priced by Adminium; refused when it would leave more paid
   * than the stay costs.
   */
  quoteTakeOff(id: Id, from: string): Promise<{ total: number; refused: boolean; data: Record<string, unknown>; credit: number; stale?: boolean }> {
    return answer(async () => {
      const [stay, credits, rel, nightly] = await Promise.all([this.one("stays", id), this.list("stay_credits", where("stay_id", id)), this.t.relation(this.real("stay_credits"), "stay_id"), this.nightlyAnswer(id)]);
      // Adminium prices a credit at today's rates: once they moved, the nights not stayed are not what the stay paid for them.
      if (nightly.stale) return { total: Number(stay["total"]), refused: true, data: stay, credit: 0, stale: true };
      const rows = [...credits.map((c) => ({ key: { id: c.id }, values: { voided: c["voided"] } })), { values: { reason: "left_early", from_date: from, to_date: stay["depart"] } }];
      try {
        const got = await this.mutate<{ data: Row; children?: Record<string, { data: Row }[]> }>(await this.path("stays", `/${encodeURIComponent(String(id))}/dry-run`), "POST", { values: {}, children: { [rel]: rows } });
        const made = (got.children?.[rel] ?? []).find((c) => !credits.some((old) => old.id === c.data["id"]));
        return { total: Number(got.data["total"]), refused: false, data: got.data, credit: Number(made?.data["amount"] ?? 0) };
      } catch (error) {
        if (refusedAs(error, "BALANCE_EXCEEDED")) return { total: Number(stay["total"]), refused: true, data: stay, credit: 0 };
        throw error;
      }
    });
  }

  cancel(id: Id, code: "guest_asked" | "house"): Promise<Row> {
    return answer(() => this.change("stays", id, { status: "cancelled", cancel_code: code }, "booked"));
  }

  noShow(id: Id): Promise<Row> {
    return answer(() => this.change("stays", id, { status: "no_show" }, "booked"));
  }

  cameAfterAll(id: Id, to: { roomId: Id; chargeMissed: boolean } | null): Promise<Row> {
    return answer(async () => {
      if (to === null) return this.change("stays", id, { status: "booked" }, "no_show");
      const stay = await this.one("stays", id);
      const today = this.today();
      // The nights missed come off only when the desk says so: a credit row, priced by Adminium.
      if (!to.chargeMissed && String(stay["arrive"]) < today && (await this.liveCredit(id, "missed", stay["arrive"])) === undefined)
        await this.create("stay_credits", { stay_id: id, reason: "missed", from_date: stay["arrive"], to_date: today });
      return this.change("stays", id, { room_id: to.roomId, status: "in_house" }, "no_show");
    });
  }

  expectBy(id: Id, day: string | null): Promise<Row> {
    return answer(() => this.change("stays", id, { expect_by: day }));
  }

  giveRoom(id: Id, roomId: Id | null): Promise<Row> {
    return answer(() => this.change("stays", id, { room_id: roomId }));
  }

  moveRoom(id: Id, roomId: Id): Promise<Row> {
    // A guest moved while in the house: Adminium sends the room left to be
    // cleaned and makes the ready room given theirs, in the same write.
    return answer(() => this.change("stays", id, { room_id: roomId }));
  }

  // ── the folio's money ─────────────────────────────────────────────────────

  addCharge(stayId: Id, charge: { itemId: Id; note?: string | null } | { label: string; amount: string; note: string }): Promise<Row> {
    return answer(() =>
      "itemId" in charge
        ? this.create("charges", { stay_id: stayId, charge_item_id: charge.itemId, note: charge.note?.trim() || null })
        : this.create("charges", { stay_id: stayId, charge_item_id: null, label: charge.label.trim(), amount: charge.amount.trim(), note: charge.note.trim() }),
    );
  }

  recordPayment(stayId: Id, payment: { kind: "taken" | "given_back"; amount: string; method: "card" | "cash" | "transfer"; reference?: string | null; note?: string | null }): Promise<Row> {
    return answer(() =>
      this.create("payments", {
        stay_id: stayId,
        kind: payment.kind,
        amount: payment.amount.trim(),
        method: payment.method,
        reference: payment.reference?.trim() || null,
        note: payment.note?.trim() || null,
      }),
    );
  }

  voidRow(table: "charges" | "payments" | "stay_credits", id: Id, reason: string): Promise<Row> {
    return answer(() => this.change(table, id, { voided: true, void_reason: reason.trim() }));
  }

  printFolio(id: Id): Promise<{ url: string | null }> {
    return answer(async () => {
      const drawn = await this.mutate<{ printUrl: string }>(`/api/v1/apps/${APP_KEY}/documents/render`, "POST", { ref: "stays", kind: "invoice", pk: { id } });
      return { url: drawn.printUrl };
    });
  }

  emailFolio(id: Id, soFar: boolean): Promise<Row> {
    // Adminium's own clock stamps when it was asked for; the outbox hears the change and sends the folio.
    const at = new Date(this.opts.clock?.() ?? Date.now() + this.skew).toISOString();
    return answer(() => this.change("stays", id, soFar ? { folio_so_far_at: at } : { folio_sent_at: at }));
  }

  /** Whether a void would go through: the row voided in the stay's change quote, its other rows as they are. */
  quoteVoid(table: "charges" | "payments" | "stay_credits", id: Id): Promise<{ refused: boolean; paid: number; total: number }> {
    return answer(async () => {
      const row = await this.one(table, id);
      const stayId = row["stay_id"] as Id;
      const [stay, rows, rel] = await Promise.all([this.one("stays", stayId), this.list(table, where("stay_id", stayId)), this.t.relation(this.real(table), "stay_id")]);
      const sent = rows.map((r) => ({ key: { id: r.id }, values: { voided: r.id === row.id ? true : r["voided"] } }));
      try {
        const got = await this.mutate<{ data: Row }>(await this.path("stays", `/${encodeURIComponent(String(stayId))}/dry-run`), "POST", { values: {}, children: { [rel]: sent } });
        return { refused: false, paid: Number(got.data["paid"]), total: Number(got.data["total"]) };
      } catch (error) {
        if (refusedAs(error, "BALANCE_EXCEEDED")) return { refused: true, paid: Number(stay["paid"]), total: Number(stay["total"]) };
        throw error;
      }
    });
  }

  // ── rooms ─────────────────────────────────────────────────────────────────

  setRoom(id: Id, values: { status?: "ready" | "cleaning" | "occupied"; note?: string | null }): Promise<Row> {
    return answer(() => this.change("rooms", id, values));
  }

  closeRoom(values: { room_id: Id; from_date: string; to_date: string | null; reason: string | null }): Promise<Row> {
    return answer(() => this.create("room_closures", values));
  }

  endClosure(id: Id): Promise<Row> {
    return answer(async () => {
      const closure = await this.one("room_closures", id);
      const today = this.today();
      const yesterday = addDays(today, -1);
      const begun = String(closure["from_date"]) <= today;
      const ended = await this.change("room_closures", id, { active: false, to_date: yesterday < String(closure["from_date"]) ? closure["from_date"] : yesterday });
      // Back from repair, a room is cleaned before anyone sleeps in it; one never closed is as it was.
      if (begun) {
        const room = await this.one("rooms", closure["room_id"] as Id);
        if (room["status"] === "ready") await this.change("rooms", room.id, { status: "cleaning" });
      }
      return ended;
    });
  }

  // ── the session and the stream ────────────────────────────────────────────

  signInAgain(): void {
    const next = typeof window === "undefined" ? "/" : window.location.pathname;
    (this.opts.leave ?? ((url: string) => window.location.assign(url)))(`/login?next=${encodeURIComponent(next)}`);
  }

  async signOut(): Promise<void> {
    try {
      await this.t.mutate("/api/v1/auth/logout", "POST");
    } finally {
      const next = typeof window === "undefined" ? "/" : window.location.pathname;
      (this.opts.leave ?? ((url: string) => window.location.assign(url)))(`/login?next=${encodeURIComponent(next)}`);
    }
  }

  private subscribeAgain(listener: (frame: LiveFrame) => void, onState: ((state: "live" | "reconnecting") => void) | undefined, keep: (stop: () => void) => void): void {
    keep(this.subscribe((frame) => listener(frame), (state) => {
      onState?.(state);
      // Set up at last: whatever changed meanwhile was not heard.
      if (state === "live") listener({ table: "*", id: 0, op: "update" });
    }));
  }

  subscribe(listener: (frame: LiveFrame) => void, onState?: (state: "live" | "reconnecting") => void): () => void {
    let source: EventSourceLike | null = null;
    let closed = false;
    let later: ReturnType<typeof setTimeout> | undefined;
    let restarted: (() => void) | undefined;
    const byChannel = new Map<string, string>();
    void (async () => {
      try {
        const conn = this.cfg.connectionId ?? (await this.t.connection());
        // Only what this person may read: one channel they may not would refuse the whole stream.
        const tables = LIVE.filter((table) => this.may(table));
        const channels: string[] = [];
        for (const table of tables) {
          const channel = `widget-data:${conn}:${await this.t.tableId(this.real(table))}`;
          byChannel.set(channel, table);
          channels.push(channel);
        }
        if (closed || channels.length === 0) return;
        const open = this.opts.stream ?? ((url: string) => new EventSource(url, { withCredentials: true }) as unknown as EventSourceLike);
        const url = `/api/v1/events?channels=${channels.map(encodeURIComponent).join(",")}`;
        let wasDown = false;
        let wait = 1_000;
        const connect = () => {
          if (closed) return;
          const here = open(url);
          source = here;
          here.onopen = () => {
            wait = 1_000;
            onState?.("live");
            // Whatever happened while the stream was down was not heard: ask again.
            if (wasDown) listener({ table: "*", id: 0, op: "update" });
            wasDown = false;
          };
          here.onerror = () => {
            wasDown = true;
            onState?.("reconnecting");
            // A reconnect answered other than 200 (a proxy's 502 while the server restarts, a session gone) ends
            // the browser's own retries for good: open it again, a little later each time.
            if (here.readyState === 2) {
              here.close();
              later = setTimeout(connect, wait);
              wait = Math.min(wait * 2, 30_000);
            }
          };
          for (const type of ["record.create", "record.update", "record.delete", "record.bulk-create"]) {
            here.addEventListener(type, (event) => {
              try {
                const frame = JSON.parse(event.data) as { channel?: string; type?: string; data?: { pk?: { id?: unknown } } };
                const table = byChannel.get(String(frame.channel)) ?? "*";
                const op = String(frame.type ?? type).replace(/^record\./, "");
                listener({ table, id: Number(frame.data?.pk?.id ?? 0), op: op === "create" || op === "bulk-create" ? "insert" : op === "delete" ? "delete" : "update" });
              } catch {
                listener({ table: "*", id: 0, op: "update" });
              }
            });
          }
        };
        connect();
      } catch {
        onState?.("reconnecting");
        // The channels could not be set up (a schema read failed): try again shortly.
        if (!closed) later = setTimeout(() => this.subscribeAgain(listener, onState, (stop) => (restarted = stop)), 5_000);
      }
    })();
    return () => {
      closed = true;
      if (later !== undefined) clearTimeout(later);
      restarted?.();
      source?.close();
    };
  }
}
