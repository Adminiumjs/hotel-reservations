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
 * rather than moved twice. What this Adminium has no route for is said, not
 * worked out here: a quote of a change or of a void answers `NOT_OFFERED`.
 */
import type { DeskHouse, DeskPerson, DeskPort, Folio, StayWithLines } from "./ports.ts";
import { SessionPortError, type SessionTransport } from "./sessionSource.ts";
import type { StaffConfig } from "../staffConnection.ts";
import { addDays, venueDay } from "../lib/venueTime.ts";
import { ApiError, type Id, type LiveFrame, type Night, type NightCount, type QuoteReply, type Row, type StayBody, type StayReply } from "./wire.ts";

/** The app's key: its roles are named `hotel-<role>`, its tables `hotel_<table>` when the server does not say. */
const APP_KEY = "hotel";
const PAGE = 200;

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

/** The columns of a stay its price is made of. */
const PRICED = new Set(["arrive", "depart", "room_type_id", "guests"]);

const notOffered = (what: string) => new ApiError(501, "NOT_OFFERED", `${what} is not offered by this Adminium.`);
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

  constructor(transport: SessionTransport, config: StaffConfig, options: DeskOptions = {}) {
    this.t = transport;
    this.cfg = config;
    this.opts = options;
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
  private async list(table: Table, filter?: string): Promise<Row[]> {
    const rows: Row[] = [];
    for (let offset = 0; offset < 50 * PAGE; offset += PAGE) {
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
    return (await this.t.mutate<{ data: Row }>(await this.path(table), "POST", body)).data;
  }
  private async change(table: Table, id: Id, values: Record<string, unknown>, from?: string): Promise<Row> {
    const body = from === undefined ? { values } : { values, from };
    return (await this.t.mutate<{ data: Row }>(await this.path(table, `/${encodeURIComponent(String(id))}`), "PATCH", body)).data;
  }
  private today(): string {
    return venueDay(this.opts.clock?.() ?? Date.now(), this.cfg.timezone ?? this.cfg.serverTimezone ?? "UTC");
  }

  // ── who, and the house ────────────────────────────────────────────────────

  async me(): Promise<DeskPerson> {
    const prefix = `${APP_KEY}-`;
    const roles = (this.cfg.access?.roles ?? []).map((r) => (r.slug.startsWith(prefix) ? r.slug.slice(prefix.length) : r.slug));
    return { name: this.cfg.user?.name ?? "", roles };
  }

  async config() {
    return { timezone: this.cfg.timezone ?? this.cfg.serverTimezone, currency: this.cfg.currency };
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
      const [stays, extras, charges, credits, payments] = await Promise.all([this.list("stays"), this.list("stay_extras"), this.list("charges"), this.list("stay_credits"), this.list("payments")]);
      const of = (rows: Row[], id: Id) => rows.filter((row) => row["stay_id"] === id);
      return stays.map((stay) => ({ stay, extras: of(extras, stay.id), charges: of(charges, stay.id), credits: of(credits, stay.id), payments: of(payments, stay.id) }));
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
    try {
      const got = await this.t.get<{ data: { nights?: Record<string, unknown>[]; stale?: boolean } }>(await this.path("stays", `/${encodeURIComponent(String(id))}/nightly`));
      if (got.data.stale === true) return [];
      return (got.data.nights ?? []).map((n) => ({ date: String(n["date"]), rate: Number(n["rate"]), base: Number(n["base"] ?? n["rate"]), tags: Array.isArray(n["tags"]) ? n["tags"].map(String) : [] }));
    } catch (error) {
      if (error instanceof SessionPortError && error.status === 404) return [];
      throw error;
    }
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
      const got = await this.t.mutate<{ data: Row; children?: Record<string, { data: Row }[]>; nights?: Record<string, unknown>[] }>(await this.path("stays", "/dry-run"), "POST", write);
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
      const stay = await this.create("stays", write.values, write.children);
      const lines = await this.list("stay_extras", where("stay_id", stay.id));
      return { data: stay, children: { stay_extras: lines.map((data) => ({ data })) } };
    });
  }

  /**
   * A change that touches nothing a price is made of (a name, a note, the arrival time) leaves the stay's
   * figures as Adminium has them. A change of dates, room type, party or extras needs Adminium's own quote
   * of a change, which this Adminium has no route for.
   */
  quoteEdit(id: Id, values: Record<string, unknown>, extras: { extraId: Id; on: boolean }[] = []): Promise<QuoteReply> {
    return answer(async () => {
      if (extras.length > 0 || Object.keys(values).some((column) => PRICED.has(column))) throw notOffered("A quote of a change");
      const [stay, lines] = await Promise.all([this.one("stays", id), this.list("stay_extras", where("stay_id", id))]);
      return { data: { ...stay, ...values }, nights: [], children: { stay_extras: lines.map((data) => ({ data })) }, capacity: [], exact: true };
    });
  }

  edit(id: Id, values: Record<string, unknown>): Promise<Row> {
    return answer(() => this.change("stays", id, values));
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
      return this.create("stay_credits", { stay_id: id, reason: "left_early", from_date: from, to_date: stay["depart"] });
    });
  }

  quoteTakeOff(_id: Id, _from: string): Promise<{ total: number; refused: boolean; data: Record<string, unknown>; credit: number }> {
    return Promise.reject(notOffered("A quote of the nights stayed"));
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
      if (!to.chargeMissed && String(stay["arrive"]) < today) await this.create("stay_credits", { stay_id: id, reason: "missed", from_date: stay["arrive"], to_date: today });
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

  quoteVoid(_table: "charges" | "payments" | "stay_credits", _id: Id): Promise<{ refused: boolean; paid: number; total: number }> {
    return Promise.reject(notOffered("A quote of a void"));
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
      const yesterday = addDays(this.today(), -1);
      const ended = await this.change("room_closures", id, { active: false, to_date: yesterday < String(closure["from_date"]) ? closure["from_date"] : yesterday });
      // Back from repair, a room is cleaned before anyone sleeps in it.
      const room = await this.one("rooms", closure["room_id"] as Id);
      if (room["status"] === "ready") await this.change("rooms", room.id, { status: "cleaning" });
      return ended;
    });
  }

  // ── the session and the stream ────────────────────────────────────────────

  async signOut(): Promise<void> {
    try {
      await this.t.mutate("/api/v1/auth/logout", "POST");
    } finally {
      const next = typeof window === "undefined" ? "/" : window.location.pathname;
      (this.opts.leave ?? ((url: string) => window.location.assign(url)))(`/login?next=${encodeURIComponent(next)}`);
    }
  }

  subscribe(listener: (frame: LiveFrame) => void, onState?: (state: "live" | "reconnecting") => void): () => void {
    let source: EventSourceLike | null = null;
    let closed = false;
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
        source = open(`/api/v1/events?channels=${channels.map(encodeURIComponent).join(",")}`);
        let wasDown = false;
        source.onopen = () => {
          onState?.("live");
          // Whatever happened while the stream was down was not heard: ask again.
          if (wasDown) listener({ table: "*", id: 0, op: "update" });
          wasDown = false;
        };
        source.onerror = () => {
          wasDown = true;
          onState?.("reconnecting");
        };
        for (const type of ["record.create", "record.update", "record.delete", "record.bulk-create"]) {
          source.addEventListener(type, (event) => {
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
      } catch {
        onState?.("reconnecting");
      }
    })();
    return () => {
      closed = true;
      source?.close();
    };
  }
}
