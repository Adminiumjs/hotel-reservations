/**
 * THE DEMO'S ADMINIUM — what the server decides on every write, in memory.
 *
 * The website's demo has no server, so a write in the demo goes through this
 * instead of the APIs, and comes out as Adminium would have left it:
 *
 *   1. a stay judged night by night: its room type sells no more rooms a night
 *      than it has, less those out of service (a room given to a stay counts
 *      against its own type); a room holds one stay a night and none while it
 *      is out of service; parking sells no more spaces a night than there
 *      are; a stay runs from one night to the house's longest, two at least
 *      from a Saturday, and — for a guest — not before today nor further ahead
 *      than the house takes reservations; no more guests than the room type,
 *      or the room given, sleeps;
 *   2. every price: each night from the room type's rate and the rate rules
 *      that match it, each extra copied and multiplied out, the charges, the
 *      nights not stayed, the tax of the day the stay was made, the total,
 *      what was paid and what is owing — and a total other than the one the
 *      guest was shown written nowhere; money never runs backwards (more paid
 *      than the stay costs is refused);
 *   3. the states: one listed move at a time, each with what it waits for (a
 *      ready room, the arrival day, nothing owing), a repeat refused; a
 *      cancellation marked late after the stay's cancel-by moment; the room
 *      made occupied at check-in and sent to be cleaned at check-out; a
 *      finished stay locked; the no-show the clock marks;
 *   4. the stamps (when, and who), the running reference, the stay's own link;
 *   5. the emails the producers queue.
 *
 * Refusals carry the server's own status, code and params (`PUBLIC_NO_ROOM`,
 * `PUBLIC_PRICE_CHANGED`, `CAPACITY_FULL`, `STATE_MOVE_REFUSED`,
 * `BALANCE_EXCEEDED` …), so a screen says the same words it would against
 * Adminium. The rules are the manifest's (`rules.ts`, written from it, and the
 * sample loader's `RULES`), each held to it by a test; the few the demo plays
 * ahead of the manifest are listed in `AHEAD` below, and a test holds that
 * list too.
 *
 * DEMO BUILD ONLY — nothing in a real build imports it.
 */
import { RULES, pricedNights, type PerNight } from "../data/sampleRows.ts";
import { ApiError, type ExtraAvailability, type Id, type Night, type NightAnswer, type NightCount, type Row, type TypeAvailability } from "../data/wire.ts";
import { addDays, daysBetween, instantOf, toMs, venueDay, type Day } from "../lib/venueTime.ts";
import { MANIFEST_RULES } from "./rules.ts";
import type { Table, World } from "./world.ts";

/** Who is writing, and through which door — what the stamps, the moves and the limits read. */
export interface Writer {
  /** `public`: the guest site; `staff`: a person at the desk; `automation`: the clock. */
  origin: "public" | "staff" | "automation";
  name: string | null;
  roles: readonly string[];
}

export const CLOCK: Writer = { origin: "automation", name: "Timed move", roles: [] };

/**
 * What the demo plays that the manifest cannot say, because the desk's screen
 * keeps it: a guest who said "after 22:00" (the key left out) is not marked a
 * no-show before the next morning's no-show time, although Adminium would
 * allow it from 22:30.
 */
export const DESK_ONLY = {
  lateArrival: "22:30",
} as const;

/** "N left" is said below this many, as the guest site's availability entries answer. */
const SHOW_LEFT = Object.fromEntries(
  (MANIFEST_RULES.publicAccess as unknown as readonly Json[])
    .filter((e) => e["kind"] === "availability")
    .map((e) => [String(e["table"]), Number((e["showLeft"] as Json | undefined)?.["below"] ?? 0)]),
) as Record<string, number>;

const COUNTED = ["booked", "in_house"];
const iso = (ms: number) => new Date(ms).toISOString();
const empty = (value: unknown) => value === null || value === undefined || (typeof value === "string" && value.trim() === "");
const cents = (value: unknown) => Math.round(Number(value ?? 0) * 100);

type Json = Record<string, unknown>;
type Move = string | { to: string; requires?: Json; roles?: readonly string[] };
type StatesRule = {
  column: string;
  initial: string;
  moves: Record<string, readonly Move[]>;
  lock?: { when: readonly string[]; except?: readonly string[] };
  children?: Record<string, { via: string; parentIn?: readonly string[]; createIn?: readonly string[]; changeIn?: readonly string[] }>;
  late?: readonly { to: string; from?: readonly string[]; moment: Json; within: Json; mode: string; flag?: string }[];
  timed?: readonly { from: string; to: string; at: Json }[];
  effects?: readonly ({ on: { to: string }; via: string; set: Record<string, string> } | { on: { change: string; in?: readonly string[] }; old?: { set: Record<string, string> }; new?: { set: Record<string, string> } })[];
  strict?: unknown;
};
const STATES = MANIFEST_RULES.states as unknown as Record<string, StatesRule>;
const STAMPS = MANIFEST_RULES.stamps as unknown as Record<string, Record<string, { set: unknown; on: unknown }>>;
type RoleRule = { key: string; grants: Record<string, readonly string[]>; limits: Record<string, { writable?: readonly string[]; writableValues?: Record<string, readonly unknown[]> }> | null };
const ROLES = MANIFEST_RULES.roles as unknown as readonly RoleRule[];
type Producer = {
  kind: string;
  link: string;
  gate?: unknown;
  onCreate?: { table: string; where?: Json };
  onChange?: { table: string; column?: string; to?: unknown; columns?: readonly string[]; changed?: true; where?: Json };
  repeat?: true;
  was?: readonly string[];
  dropWhen?: readonly Json[];
};
const PRODUCERS = MANIFEST_RULES.producers as unknown as readonly Producer[];

const STAY_PRICE = RULES.perNights.find((rule) => rule.table === "stays") as PerNight;
const CREDIT_PRICE = RULES.perNights.find((rule) => rule.table === "stay_credits") as PerNight;

/** Thrown inside a dry run to put everything back once the figures are read. */
class DryRun<T> {
  readonly value: T;
  constructor(value: T) {
    this.value = value;
  }
}

export class Engine {
  readonly world: World;
  /** The desk's next stale write: another desk made the same change a moment ago. */
  staleNext = false;
  constructor(world: World) {
    this.world = world;
  }

  get now(): number {
    return this.world.now;
  }

  setting(column: string): unknown {
    return this.world.settings()[column];
  }
  private num(column: string): number {
    return Number(this.setting(column));
  }

  today(): Day {
    return venueDay(this.now, this.world.zone);
  }

  /** An instant of a wall time on a day of the house. */
  at(day: Day, time: string): number {
    return instantOf(day, time, this.world.zone);
  }

  // ── the night pools ─────────────────────────────────────────────────────────

  /** Whether a room is out of service on a night. */
  closed(roomId: unknown, night: Day): Row | undefined {
    return this.world.all("room_closures").find(
      (c) => c["room_id"] === roomId && c["active"] === true && String(c["from_date"]) <= night && (empty(c["to_date"]) || night <= String(c["to_date"])),
    );
  }

  /** A room type's rooms on a night, and how many of them are out of service. */
  typeSize(typeId: unknown, night: Day): { size: number; outOfService: number } {
    const rooms = this.world.where("rooms", (r) => r["room_type_id"] === typeId);
    const out = rooms.filter((r) => this.closed(r.id, night) !== undefined).length;
    return { size: rooms.length - out, outOfService: out };
  }

  /** The type a counted stay takes from: the given room's, when it has one. */
  poolType(stay: Row): unknown {
    if (!empty(stay["room_id"])) return this.world.get("rooms", stay["room_id"] as Id)?.["room_type_id"] ?? stay["room_type_id"];
    return stay["room_type_id"];
  }

  private sleepsOn(stay: Row, night: Day): boolean {
    return String(stay["arrive"]) <= night && night < String(stay["depart"]);
  }

  /** Stays of a type counted on a night (one left out). */
  typeTaken(typeId: unknown, night: Day, except?: Id): number {
    return this.world.where("stays", (s) => s.id !== except && COUNTED.includes(String(s["status"])) && this.poolType(s) === typeId && this.sleepsOn(s, night)).length;
  }

  /** The stay holding a room on a night (one left out). */
  roomTaken(roomId: unknown, night: Day, except?: Id): Row | undefined {
    return this.world.all("stays").find((s) => s.id !== except && COUNTED.includes(String(s["status"])) && s["room_id"] === roomId && this.sleepsOn(s, night));
  }

  /** Spaces of an extra taken on a night (one stay left out). */
  extraTaken(extraId: unknown, night: Day, exceptStay?: Id): number {
    return this.world.where("stay_extras", (line) => {
      if (line["extra_id"] !== extraId || line["state"] !== "on" || line["stay_id"] === exceptStay) return false;
      const stay = this.world.get("stays", line["stay_id"] as Id);
      return stay !== undefined && COUNTED.includes(String(stay["status"])) && this.sleepsOn(stay, night);
    }).length;
  }

  /** The nights of a stay from `arrive` up to the day before `depart`. */
  nightsOf(arrive: Day, depart: Day): Day[] {
    const out: Day[] = [];
    for (let night = arrive; night < depart; night = addDays(night, 1)) out.push(night);
    return out;
  }

  /**
   * The stay rules: at least one night and no more than the house's longest,
   * two at least from a Saturday; for a guest, not before today and no
   * further ahead than the house takes reservations.
   */
  judgeNights(arrive: unknown, depart: unknown, origin: Writer["origin"]): void {
    const a = String(arrive ?? "");
    const d = String(depart ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a)) throw refusedValue("arrive", "invalid", origin);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw refusedValue("depart", "invalid", origin);
    const nights = daysBetween(a, d);
    if (nights < 1 || nights > this.num("max_nights")) throw refusedValue("depart", "out-of-range", origin);
    if (new Date(`${a}T12:00:00Z`).getUTCDay() === 6 && nights < 2) throw refusedValue("depart", "out-of-range", origin);
    if (origin === "public" && (a < this.today() || daysBetween(this.today(), a) > this.num("ahead_days"))) throw refusedValue("arrive", "out-of-range", origin);
  }

  /** Whether the stay rules let these dates through. */
  nightsAllowed(arrive: Day, depart: Day, origin: Writer["origin"]): boolean {
    try {
      this.judgeNights(arrive, depart, origin);
      return true;
    } catch {
      return false;
    }
  }

  /** What a type has left over some nights (the fewest of any night), one stay left out. */
  typeLeft(typeId: unknown, nights: Day[], except?: Id): number {
    return Math.min(...nights.map((night) => this.typeSize(typeId, night).size - this.typeTaken(typeId, night, except)));
  }

  /**
   * The night availability: each room type that sleeps the party, open, full
   * or closed by a stay rule; with `earliest`, each type's first later arrival
   * of the same length it is open from, and the first of those.
   */
  availability(q: { from: Day; to: Day; guests: number; earliest?: number; exclude?: Id }): NightAnswer {
    const types = this.world.where("room_types", (t) => t["active"] === true && Number(t["sleeps"]) >= q.guests).sort(byPosition);
    const ruleOk = this.nightsAllowed(q.from, q.to, "public");
    const length = daysBetween(q.from, q.to);
    let first: string | null = null;
    const answer = types.map((type) => {
      const left = this.typeLeft(type.id, this.nightsOf(q.from, q.to), q.exclude);
      const state: TypeAvailability["state"] = !ruleOk ? "closed" : left < 1 ? "full" : "open";
      const row: TypeAvailability = { pool: String(type.id), state, ...(state !== "closed" && left < (SHOW_LEFT["stays"] ?? 0) ? { left: Math.max(0, left) } : {}) };
      if ((q.earliest ?? 0) > 0 && length >= 1) {
        row.earliest = null;
        for (let k = 1; k <= q.earliest!; k += 1) {
          const a = addDays(q.from, k);
          const d = addDays(a, length);
          if (!this.nightsAllowed(a, d, "public")) continue;
          if (this.typeLeft(type.id, this.nightsOf(a, d), q.exclude) >= 1) {
            row.earliest = a;
            break;
          }
        }
        if (row.earliest !== null && (first === null || row.earliest < first)) first = row.earliest;
      }
      return row;
    });
    return { types: answer, earliest: first };
  }

  /** Each extra with a limit a night, over some nights. */
  extrasOpen(from: Day, to: Day): ExtraAvailability[] {
    return this.world
      .where("extras", (e) => e["active"] === true && !empty(e["spaces"]))
      .map((extra) => {
        const left = Math.min(...this.nightsOf(from, to).map((night) => Number(extra["spaces"]) - this.extraTaken(extra.id, night)));
        return { extra_id: extra.id, state: left > 0 ? "open" : "full", ...(left > 0 && left < 3 ? { left } : {}) };
      });
  }

  /** The staff counts: each room type's and each limited extra's nights from a day. */
  counts(from: Day, days: number): NightCount[] {
    if (days < 1 || days > 62) throw new ApiError(400, "INVALID_PARAMS", "days is 1 to 62.");
    const out: NightCount[] = [];
    const nights = Array.from({ length: days }, (_, i) => addDays(from, i));
    for (const type of this.world.all("room_types").slice().sort(byPosition)) {
      for (const date of nights) {
        const { size, outOfService } = this.typeSize(type.id, date);
        const taken = this.typeTaken(type.id, date);
        out.push({ table: "stays", pool: type.id, date, size, outOfService, taken, left: size - taken });
      }
    }
    for (const extra of this.world.where("extras", (e) => !empty(e["spaces"]))) {
      for (const date of nights) {
        const taken = this.extraTaken(extra.id, date);
        out.push({ table: "stay_extras", pool: extra.id, date, size: Number(extra["spaces"]), outOfService: 0, taken, left: Number(extra["spaces"]) - taken });
      }
    }
    return out;
  }

  // ── the money ──────────────────────────────────────────────────────────────

  /** A stay's nights, each priced as Adminium prices it. */
  nights(stay: Readonly<Record<string, unknown>>): Night[] {
    return pricedNights(STAY_PRICE, stay as Record<string, unknown>, this.world.tables, 2) ?? [];
  }

  /** What the nights from `from` to a stay's last morning come to, as a credit would take them off. */
  creditFor(stay: Row, from: Day): number {
    const nights = pricedNights(CREDIT_PRICE, { room_type_id: stay["room_type_id"], from_date: from, to_date: stay["depart"] }, this.world.tables, 2) ?? [];
    return (nights.reduce((sum, n) => sum + cents(n.rate), 0) + cents(stay["extras_nightly"]) * nights.length) / 100;
  }

  // ── a write, all or nothing ─────────────────────────────────────────────────

  /** One write: its rows settled and checked, or none of it. */
  write<T>(make: () => T): T {
    return this.world.transaction(() => {
      const before = this.balances();
      const result = make();
      this.world.settle();
      this.judgeBalances(before);
      this.sendDue();
      return result;
    });
  }

  /** Each stay's balance, in cents, as it stands. */
  private balances(): Map<Id, number> {
    return new Map(this.world.all("stays").map((s) => [s.id, cents(s["balance"])]));
  }

  /**
   * The write worked out and put back: what a save would have written. `make`
   * writes, and returns what to read once every figure is settled.
   */
  dry<T>(make: () => () => T): T {
    try {
      this.world.transaction(() => {
        const before = this.balances();
        const read = make();
        this.world.settle();
        this.judgeBalances(before);
        throw new DryRun(read());
      });
    } catch (error) {
      if (error instanceof DryRun) return error.value as T;
      throw error;
    }
    throw new Error("a dry run wrote");
  }

  /**
   * Money never runs backwards: a write that leaves a stay with more paid
   * than it costs — or more so than before — is refused. Stays the write did
   * not move are not its to answer for.
   */
  private judgeBalances(before: Map<Id, number>): void {
    for (const stay of this.world.all("stays")) {
      const now = cents(stay["balance"]);
      const was = before.get(stay.id);
      if (now < 0 && (was === undefined || now < was)) {
        throw new ApiError(409, "BALANCE_EXCEEDED", "That would leave more paid than the stay costs.", { column: "balance", balance: Number(stay["balance"]), stay: stay.id });
      }
    }
  }

  // ── stays ──────────────────────────────────────────────────────────────────

  /**
   * A stay's place on the nights it asks for: its type has a room every
   * night, its room (when it has one) is free and in service, and the party
   * fits. `from` leaves out the nights before it (a stay already in the house).
   */
  judgePlace(stay: Row, origin: Writer["origin"], opts: { from?: Day; except?: Id } = {}): void {
    const type = this.world.get("room_types", stay["room_type_id"] as Id);
    if (type === undefined) throw refusedValue("room_type_id", "invalid", origin);
    if (Number(stay["guests"]) > Number(type["sleeps"])) throw refusedValue("guests", "too-many", origin);
    const room = empty(stay["room_id"]) ? undefined : this.world.get("rooms", stay["room_id"] as Id);
    if (room !== undefined && Number(stay["guests"]) > Number(room["sleeps"] ?? type["sleeps"])) throw refusedValue("guests", "too-many", origin);
    const nights = this.nightsOf(String(stay["arrive"]), String(stay["depart"])).filter((n) => opts.from === undefined || n >= opts.from);
    const poolType = this.poolType(stay);
    for (const night of nights) {
      const left = this.typeSize(poolType, night).size - this.typeTaken(poolType, night, opts.except);
      if (left < 1) throw full(origin, "room_type_id", poolType, night, left);
      if (room !== undefined) {
        if (this.closed(room.id, night) !== undefined || this.roomTaken(room.id, night, opts.except) !== undefined) throw full(origin, "room_id", room.id, night, 0);
      }
    }
  }

  /** Parking and every limited extra of a stay, over its nights. */
  judgeExtras(stayId: Id, origin: Writer["origin"], from?: Day): void {
    const stay = this.world.get("stays", stayId)!;
    if (!COUNTED.includes(String(stay["status"]))) return;
    for (const line of this.world.where("stay_extras", (l) => l["stay_id"] === stayId && l["state"] === "on")) {
      const extra = this.world.get("extras", line["extra_id"] as Id);
      if (extra === undefined || empty(extra["spaces"])) continue;
      for (const night of this.nightsOf(String(stay["arrive"]), String(stay["depart"])).filter((n) => from === undefined || n >= from)) {
        const left = Number(extra["spaces"]) - this.extraTaken(extra.id, night, stayId);
        if (left < 1) {
          throw origin === "public"
            ? new ApiError(409, "PUBLIC_NO_ROOM", "That extra is full on those nights.", { child: "stay_extras", column: "extra_id", extra: extra.id })
            : new ApiError(409, "CAPACITY_FULL", "That extra is full on those nights.", { kind: "night", column: "extra_id", pool: { key: extra.id, at: night }, left });
        }
      }
    }
  }

  /** The next reference of the house's own series: one past the largest, from its first number. */
  private nextRef(): { ref_seq: number; ref: string } {
    const n = Math.max(this.num("ref_start") - 1, ...this.world.all("stays").map((s) => Number(s["ref_seq"] ?? 0))) + 1;
    return { ref_seq: n, ref: `${String(this.setting("ref_prefix") ?? "")}${String(n)}` };
  }

  /**
   * A stay created with its extras: judged, priced, stamped, numbered, with
   * its own link. `extras` are the extras' ids.
   */
  createStay(values: Json, extras: Id[], writer: Writer): { stay: Row; lines: Row[] } {
    const stay = this.world.insert("stays", {
      status: "booked",
      room_id: null,
      guests: 2,
      channel: writer.origin === "public" ? "online" : "desk",
      language: null,
      late_cancel: false,
      link_stopped: false,
      tax_rate: this.setting("tax_rate"),
      tax_label: this.setting("tax_label"),
      ...values,
      ...this.nextRef(),
      link_token: randomCode(16),
    });
    this.judgeNights(stay["arrive"], stay["depart"], writer.origin);
    this.judgePlace(stay, writer.origin, { except: stay.id });
    Object.assign(stay, this.stampsFor("stays", null, stay, writer));
    const lines = extras.map((extraId) => this.addLine(stay, extraId, writer));
    this.judgeExtras(stay.id, writer.origin);
    this.produce("stays", null, stay);
    return { stay, lines };
  }

  /** An extra put on a stay (or put back, when it was dropped). */
  addLine(stay: Row, extraId: Id, writer: Writer): Row {
    const extra = this.world.get("extras", extraId);
    if (extra === undefined || (writer.origin === "public" && extra["active"] !== true)) throw refusedValue("extra_id", "invalid", writer.origin);
    this.judgeChildState(stay, "stay_extras");
    const known = this.world.where("stay_extras", (l) => l["stay_id"] === stay.id && l["extra_id"] === extraId)[0];
    if (known !== undefined) {
      if (known["state"] === "on") throw new ApiError(409, writer.origin === "public" ? "PUBLIC_WRITE_REFUSED" : "UNIQUE_VIOLATION", "That extra is on the stay already.", { columns: ["stay_id", "extra_id"] });
      return this.world.update("stay_extras", known.id, { state: "on" });
    }
    return this.world.insert("stay_extras", { stay_id: stay.id, extra_id: extraId, state: "on", ...this.stampsFor("stay_extras", null, { stay_id: stay.id }, writer) });
  }

  /** The states a child table may be added (`create`) or changed (`change`) in, by its parent's state. */
  judgeChildState(stay: Row, table: string, on: "create" | "change" = "create"): void {
    const rule = STATES["stays"]!.children?.[table];
    const allowed = on === "create" ? (rule?.createIn ?? rule?.parentIn) : (rule?.changeIn ?? rule?.parentIn);
    if (allowed !== undefined && !allowed.includes(String(stay["status"]))) {
      throw new ApiError(409, "RECORD_LOCKED", "The stay is not open for that now.", { on, state: stay["status"] });
    }
  }

  /**
   * A change to a stay: a move of its state, its dates, its room, its
   * details — judged, re-priced, stamped, and the rooms its move takes along.
   * `from` is the state the screen showed.
   */
  updateStay(id: Id, values: Json, writer: Writer, opts: { from?: string } = {}): Row {
    const stored = this.world.get("stays", id);
    if (stored === undefined) throw notFound(writer.origin);
    if (this.staleNext && writer.origin === "staff") {
      this.staleNext = false;
      throw new ApiError(409, "WRITE_CONFLICT", "Someone changed this a moment ago.", { retry: true });
    }
    const before = { ...stored };
    const states = STATES["stays"]!;
    if (opts.from !== undefined && opts.from !== before["status"]) {
      throw new ApiError(409, "STATE_UNCHANGED", "It has moved on already.", { state: before["status"], at: stateStampOf(before) });
    }
    this.judgeLimits("stays", values, writer);
    const lock = states.lock;
    if (lock !== undefined && lock.when.includes(String(before["status"]))) {
      const touched = Object.keys(values).filter((c) => values[c] !== before[c] && !(lock.except ?? []).includes(c));
      if (touched.length > 0) throw new ApiError(409, "RECORD_LOCKED", "A finished stay is kept as it was.", { state: before["status"], columns: touched });
    }
    const after = { ...before, ...values } as Row;
    const moving = values["status"] !== undefined && values["status"] !== before["status"];
    if (values["status"] !== undefined && !moving && states.strict !== undefined) {
      throw writer.origin === "public"
        ? new ApiError(400, "PUBLIC_WRITE_REFUSED", "It is that already.", { reason: "unchanged" })
        : new ApiError(409, "STATE_UNCHANGED", "It is that already.", { state: before["status"], at: stateStampOf(before) });
    }
    if (moving) this.judgeMove(before, after, writer);
    const datesChange = ["arrive", "depart", "room_type_id", "room_id", "guests"].some((c) => values[c] !== undefined && values[c] !== before[c]);
    const counted = COUNTED.includes(String(after["status"]));
    if (counted && (datesChange || (moving && !COUNTED.includes(String(before["status"]))))) {
      const inHouse = before["status"] === "in_house" && after["status"] === "in_house";
      if (values["arrive"] !== undefined || values["depart"] !== undefined) {
        if (!(inHouse && values["arrive"] === undefined)) this.judgeNights(after["arrive"], after["depart"], writer.origin);
        // A begun stay keeps its own arrival: only its length is judged, as Adminium judges it (one night to the most).
        else if (daysBetween(String(after["arrive"]), String(after["depart"])) < 1 || daysBetween(String(after["arrive"]), String(after["depart"])) > this.num("max_nights")) throw refusedValue("depart", "out-of-range", writer.origin);
      }
      this.judgePlace(after, writer.origin, { except: id, ...(inHouse ? { from: this.today() } : {}) });
    }
    // The late flag, read from the stay's own cancel-by moment.
    const extra: Json = {};
    for (const late of states.late ?? []) {
      if (!moving || after["status"] !== late.to || (late.from !== undefined && !late.from.includes(String(before["status"])))) continue;
      const moment = this.moment(before, late.moment);
      if (moment !== null && this.now > moment && late.flag !== undefined) extra[late.flag] = true;
    }
    const row = this.world.update("stays", id, { ...values, ...extra });
    Object.assign(row, this.stampsFor("stays", before, row, writer));
    if (moving) this.effects(before, row, writer);
    if (!moving && values["room_id"] !== undefined && values["room_id"] !== before["room_id"] && before["status"] === "in_house") this.moveRooms(before, row);
    if (counted && datesChange) this.judgeExtras(id, writer.origin, before["status"] === "in_house" ? this.today() : undefined);
    this.produce("stays", before, row);
    return row;
  }

  /** A listed move, by someone who may make it, with what it waits for. */
  private judgeMove(before: Row, after: Row, writer: Writer): void {
    const from = String(before["status"]);
    const to = String(after["status"]);
    const moves = STATES["stays"]!.moves[from] ?? [];
    const move = moves.map((m) => (typeof m === "string" ? { to: m } : m)).find((m) => m.to === to);
    const refuse = (params: Json) => {
      if (writer.origin === "public") throw notFound("public");
      throw new ApiError(409, "STATE_MOVE_REFUSED", `Not from ${from} to ${to} now.`, { from, to, ...params });
    };
    if (move === undefined) refuse({ requires: "move" });
    if (move!.roles !== undefined && writer.origin === "staff" && !writer.roles.some((r) => move!.roles!.includes(r))) {
      throw new ApiError(403, "STATE_MOVE_FORBIDDEN", "Not for your role.", { from, to, roles: move!.roles });
    }
    const requires = (move!.requires ?? {}) as { where?: Json[]; linked?: { via: string; where: Json[] }[]; time?: { after?: Json; before?: Json } };
    for (const condition of requires.where ?? []) {
      if (!holds(after, condition)) refuse({ requires: condition["column"] === "balance" ? "balance" : "where", column: condition["column"] });
    }
    for (const linked of requires.linked ?? []) {
      const row = empty(after[linked.via]) ? undefined : this.world.get("rooms", after[linked.via] as Id);
      if (row === undefined || !linked.where.every((c) => holds(row, c))) refuse({ requires: "linked", via: linked.via });
    }
    if (requires.time?.after !== undefined) {
      const at = this.moment(after, requires.time.after);
      if (at !== null && this.now < at) refuse({ requires: "time", bound: "after", at: iso(at) });
    }
    if (requires.time?.before !== undefined) {
      const at = this.moment(after, requires.time.before);
      if (at !== null && this.now > at) refuse({ requires: "time", bound: "before", at: iso(at) });
    }
    // The desk marks a no-show from the time the guest said; a key left out waits for the morning.
    if (from === "booked" && to === "no_show" && writer.origin === "staff") {
      const said = String(after["arrival_time"] ?? this.setting("arrive_from"));
      const opens =
        said === DESK_ONLY.lateArrival
          ? this.at(addDays(String(after["arrive"]), 1), String(this.setting("no_show_at")))
          : this.at(String(after["arrive"]), /^\d\d:\d\d$/.test(said) ? said : String(this.setting("arrive_from")));
      if (this.now < opens) refuse({ requires: "time", bound: "after", at: iso(opens) });
    }
  }

  /** The rooms a move takes along: occupied at check-in, to be cleaned at check-out. */
  private effects(before: Row, after: Row, writer: Writer): void {
    for (const effect of STATES["stays"]!.effects ?? []) {
      if (!("via" in effect) || effect.on.to !== after["status"]) continue;
      const roomId = after[effect.via];
      if (empty(roomId)) continue;
      for (const [column, state] of Object.entries(effect.set)) this.moveRoomState(roomId as Id, column, state, { ...writer, roles: ["manager"] });
    }
    void before;
  }

  /** A room changed while the guest is in: the old one to be cleaned, the new one occupied (it must be ready). */
  private moveRooms(before: Row, after: Row): void {
    const next = this.world.get("rooms", after["room_id"] as Id);
    if (next === undefined || next["status"] !== "ready") {
      throw new ApiError(409, "STATE_MOVE_REFUSED", "That room is not ready.", { requires: "linked", via: "room_id" });
    }
    if (!empty(before["room_id"])) this.world.update("rooms", before["room_id"] as Id, { status: "cleaning" });
    this.world.update("rooms", next.id, { status: "occupied" });
  }

  /** A room's move, as the rooms' own list allows it. */
  moveRoomState(roomId: Id, column: string, to: string, writer: Writer): Row {
    const room = this.world.get("rooms", roomId);
    if (room === undefined) throw new ApiError(404, "NOT_FOUND", "No such room.");
    const from = String(room[column]);
    if (from === to) return room;
    const move = (STATES["rooms"]!.moves[from] ?? []).map((m) => (typeof m === "string" ? { to: m } : m)).find((m) => m.to === to);
    if (move === undefined) throw new ApiError(409, "STATE_MOVE_REFUSED", `Not from ${from} to ${to}.`, { from, to, requires: "move" });
    if (move.roles !== undefined && writer.origin === "staff" && !writer.roles.some((r) => move.roles!.includes(r))) {
      throw new ApiError(403, "STATE_MOVE_FORBIDDEN", "Not for your role.", { from, to, roles: move.roles });
    }
    return this.world.update("rooms", roomId, { [column]: to });
  }

  /** What a role's limits let it write to a table; a role with a plain grant is not held to a limit. */
  judgeLimits(table: Table, values: Json, writer: Writer): void {
    if (writer.origin !== "staff") return;
    const held = ROLES.filter((r) => writer.roles.includes(r.key));
    if (held.length === 0) return;
    if (!held.some((r) => (r.grants[table] ?? []).includes("update"))) throw new ApiError(403, "FORBIDDEN", "Not for your role.", { table, action: "update" });
    if (held.some((r) => (r.grants[table] ?? []).includes("update") && r.limits?.[table] === undefined)) return;
    const limits = held.map((r) => r.limits?.[table]).filter((l) => l !== undefined);
    for (const [column, value] of Object.entries(values)) {
      const ok = limits.some((l) => (l.writable === undefined || l.writable.includes(column)) && (l.writableValues?.[column] === undefined || l.writableValues[column]!.includes(value)));
      if (!ok) throw new ApiError(403, "COLUMN_FORBIDDEN", "Not for your role.", { column, reason: "update-limit" });
    }
  }

  /** Whether a role may create in a table. */
  judgeCreate(table: Table, writer: Writer): void {
    if (writer.origin !== "staff") return;
    const held = ROLES.filter((r) => writer.roles.includes(r.key));
    if (held.length > 0 && !held.some((r) => (r.grants[table] ?? []).includes("create"))) throw new ApiError(403, "FORBIDDEN", "Not for your role.", { table, action: "create" });
  }

  // ── the clock ──────────────────────────────────────────────────────────────

  /** A moment of a row, as the manifest writes one: a date at a wall time, shifted, or the next in its list. */
  moment(row: Row, spec: Json): number | null {
    const tries = [spec, ...((spec["or"] as Json[] | undefined) ?? [])];
    for (const m of tries) {
      const value = row[String(m["column"])];
      if (empty(value)) continue;
      // A wall time: as written, a setting's, or one kept on the row itself (the guest's arrival time).
      const spec = m["time"] as string | Json | undefined;
      const time = spec === undefined ? null : typeof spec === "string" ? spec : "table" in spec ? this.setting(String(spec["column"])) : row[String(spec["column"])];
      if (spec !== undefined && (empty(time) || !/^\d\d:\d\d$/.test(String(time)))) continue;
      let at: number;
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
        let day = String(value);
        const shift = (m["plus"] ?? m["minus"]) as Json | undefined;
        const sign = m["plus"] !== undefined ? 1 : -1;
        if (shift?.["days"] !== undefined) day = addDays(day, sign * amount(shift["days"], this));
        at = this.at(day, String(time ?? "00:00"));
        if (shift?.["hours"] !== undefined) at += sign * amount(shift["hours"], this) * 3_600_000;
        if (shift?.["minutes"] !== undefined) at += sign * amount(shift["minutes"], this) * 60_000;
      } else {
        at = toMs(String(value));
      }
      return at;
    }
    return null;
  }

  /** The moves the clock makes: a stay not come by the morning after the day it was expected is a no-show. */
  runTimed(): Row[] {
    const moved: Row[] = [];
    for (const timed of STATES["stays"]!.timed ?? []) {
      for (const stay of this.world.where("stays", (s) => s["status"] === timed.from)) {
        const at = this.moment(stay, timed.at);
        if (at === null || this.now < at) continue;
        // A move its own rules refuse now (the guest's stated time not come yet) is left, and tried again later.
        try {
          moved.push(this.write(() => this.updateStay(stay.id, { status: timed.to }, CLOCK)));
        } catch {
          continue;
        }
      }
    }
    return moved;
  }

  // ── stamps ─────────────────────────────────────────────────────────────────

  /** The stamps a write sets on a row, as the manifest's `stamp` rules say. */
  stampsFor(table: Table, stored: Row | null, after: Json, writer: Writer): Json {
    const out: Json = {};
    for (const [column, rule] of Object.entries(STAMPS[table] ?? {})) {
      const triggers = (Array.isArray(rule.on) ? rule.on : [rule.on]) as unknown[];
      const fires = triggers.some((t) => {
        if (t === "create") return stored === null;
        const trigger = t as { column?: string; values?: unknown[]; columns?: string[]; filled?: true };
        if (trigger.columns !== undefined) return stored === null || trigger.columns.some((c) => after[c] !== stored[c]);
        if (trigger.column === undefined) return false;
        const changed = stored === null || after[trigger.column] !== stored[trigger.column];
        if (trigger.filled === true) return changed && !empty(after[trigger.column]);
        return changed && (trigger.values ?? []).includes(after[trigger.column]);
      });
      if (!fires) continue;
      const value = this.stampValue(rule.set, { ...(stored ?? {}), ...after } as Row, writer);
      if (value !== undefined) out[column] = value;
    }
    return out;
  }

  private stampValue(set: unknown, row: Row, writer: Writer): unknown {
    if (set === "now") return iso(this.now);
    if (set === "today") return this.today();
    if (set === "user-name") return writer.origin === "public" ? undefined : writer.name;
    if (typeof set === "object" && set !== null) {
      const s = set as Json;
      if (s["byOrigin"] !== undefined) {
        const by = s["byOrigin"] as { public: string; staff?: string };
        return writer.origin === "public" ? by.public : by.staff === "user-name" ? writer.name : by.staff;
      }
      if (s["moment"] !== undefined) {
        const at = this.moment(row, s["moment"] as Json);
        return at === null ? null : iso(at);
      }
    }
    return undefined;
  }

  // ── the emails ─────────────────────────────────────────────────────────────

  /** The emails a write queues, as the outbox's producers say. */
  produce(table: Table, before: Row | null, after: Row): void {
    for (const producer of PRODUCERS) {
      const on = producer.onCreate ?? producer.onChange;
      if (on === undefined || on.table !== table) continue;
      if (producer.onCreate !== undefined && before !== null) continue;
      if (producer.onChange !== undefined) {
        const change = producer.onChange;
        if (before === null) continue;
        if (change.changed === true) {
          // Any change of these columns, whatever they became.
          if ((change.columns ?? []).every((column) => before[column] === after[column])) continue;
        } else {
          const column = String(change.column);
          if (before[column] === after[column]) continue;
          const targets = Array.isArray(change.to) ? change.to : [change.to];
          if (!targets.includes(after[column])) continue;
        }
      }
      if (on.where !== undefined && !holds(after, on.where)) continue;
      // A message that waits a few seconds is dropped by the sender when its row already says it is not needed.
      if ((producer.dropWhen ?? []).some((c) => holds(after, c))) continue;
      // One of a kind per stay — or, with `repeat`, one for each change.
      if (producer.repeat !== true && this.world.where("messages", (m) => m["kind"] === producer.kind && m["stay_id"] === after.id).length > 0) continue;
      const was = producer.was === undefined || before === null ? null : JSON.stringify(Object.fromEntries(producer.was.map((column) => [column, before[column] ?? null])));
      const customer = empty(after["customer_id"]) ? undefined : this.world.get("customers", after["customer_id"] as Id);
      const address = customer !== undefined ? customer["email"] : after["email"];
      const gated = producer.gate !== undefined && this.setting("guest_emails_on") !== true;
      this.world.insert("messages", {
        kind: producer.kind,
        status: gated ? "queued" : empty(address) ? "skipped" : "queued",
        to_address: empty(address) ? null : address,
        language: after["language"] ?? null,
        stay_id: after.id,
        customer_id: after["customer_id"] ?? null,
        due: iso(this.now),
        created_at: iso(this.now),
        sent_at: null,
        error: empty(address) ? "No email on file" : null,
        skip_reason: null,
        was,
      });
    }
  }

  /** The emails that came due go out (the demo's mail goes nowhere). */
  sendDue(): void {
    if (this.setting("guest_emails_on") !== true) return;
    for (const message of this.world.where("messages", (m) => m["status"] === "queued" && toMs(String(m["due"])) <= this.now)) {
      this.world.update("messages", message.id, { status: "sent", sent_at: iso(this.now) });
    }
  }
}

// ── helpers ─────────────────────────────────────────────────────────────────

/** A number the manifest states, or one the settings row holds. */
function amount(value: unknown, engine: Engine): number {
  if (typeof value === "number") return value;
  return Number(engine.setting(String((value as Json)["column"])));
}

/** A condition of a row, as the manifest writes one. */
export function holds(row: Row | Json, condition: Json): boolean {
  const value = row[String(condition["column"])];
  if (condition["eq"] !== undefined) return value === condition["eq"];
  if (condition["in"] !== undefined) return (condition["in"] as unknown[]).includes(value);
  if (condition["isNull"] !== undefined) return empty(value) === condition["isNull"];
  const n = Number(value ?? 0);
  if (condition["gt"] !== undefined) return n > Number(condition["gt"]);
  if (condition["gte"] !== undefined) return n >= Number(condition["gte"]);
  if (condition["lt"] !== undefined) return n < Number(condition["lt"]);
  if (condition["lte"] !== undefined) return cents(value) <= cents(condition["lte"]);
  return true;
}

/** When a stay got to the state it is in, for a refused repeat. */
function stateStampOf(stay: Row): unknown {
  const column = { in_house: "checked_in_at", departed: "checked_out_at", cancelled: "cancelled_at", no_show: "no_show_marked_at" }[String(stay["status"])];
  return column === undefined ? null : stay[column];
}

export function byPosition(a: Row, b: Row): number {
  return Number(a["position"] ?? 0) - Number(b["position"] ?? 0) || a.id - b.id;
}

/** A value refused, as the public API or the data API says it. */
export function refusedValue(column: string, reason: string, origin: Writer["origin"] = "public"): ApiError {
  return origin === "public"
    ? new ApiError(400, "PUBLIC_WRITE_REFUSED", "That value is not allowed.", { column, reason })
    : new ApiError(400, "VALIDATION_FAILED", "That value is not allowed.", { column, reason });
}

/** A pool with nothing left on a night. */
function full(origin: Writer["origin"], column: string, pool: unknown, at: Day, left: number): ApiError {
  return origin === "public"
    ? new ApiError(409, "PUBLIC_NO_ROOM", "That has just gone for those nights.", { column })
    : new ApiError(409, "CAPACITY_FULL", "There is no room on those nights.", { kind: "night", column, pool: { key: pool, at }, left });
}

export function notFound(origin: Writer["origin"]): ApiError {
  return origin === "public" ? new ApiError(404, "PUBLIC_REF_NOT_FOUND", "Not found.") : new ApiError(404, "NOT_FOUND", "Not found.");
}

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
/** A code as the server draws one (Crockford base 32). */
export function randomCode(length: number): string {
  let out = "";
  for (let i = 0; i < length; i += 1) out += CROCKFORD[Math.floor(Math.random() * CROCKFORD.length)];
  return out;
}
