/**
 * The sample house, resolved in the browser.
 *
 * The website's demo runs with no server: it reads the very bundle an operator
 * adds from Adminium (`seeds/hotel.sample.json`) and needs the rows Adminium
 * would have written from it. `resolveSample()` is that loader, done here —
 * and done the SAME way, because a demo that worked out "today" or a total
 * differently from a real install would show a house nobody can get:
 *
 *   - each table's rows get `id`s 1, 2, 3 … in bundle order, as a fresh
 *     table's counter hands them out; a row left out by `@byClock` takes none;
 *   - `@ref` is the id of the earlier row with that `@label`;
 *   - `@ago` is an instant that long before `now`; `@in` one that long after,
 *     rounded up with `@grid` to the next step of that many minutes on the
 *     house's clock, counted from its midnight and never past the next;
 *   - `@day`/`@time` is a wall time on the house's clock, `@day` alone a
 *     date there; with `@week` the days count from the bundle's `weekAnchor`
 *     weekday nearest today (at most three days either side), so every date
 *     keeps the weekday it was written for; with `@workdays` the days count Monday to Friday, and day 0
 *     on a weekend is the Monday after;
 *   - `@month`/`@dom` is that day of the month so many months back, the
 *     month's last day when it has fewer, and never later than today (with
 *     `@time`, never later than now) — so a month's history keeps its shape
 *     whatever day it is added;
 *   - `@onlyIfEmpty` is a row for a table that holds one: the demo's tables
 *     start empty, so the row is always added;
 *   - `@byStay` merges its `before`, `during` or `after` set by where `now`
 *     falls against the row's arrival and departure (a date read at
 *     `times.from` / `times.to` on its day), and `"@skip": true` leaves the
 *     row out;
 *   - `@byClock` merges its `before`, `around` or `after` set by where the
 *     row's time falls against `now` — more than half an hour before, within
 *     half an hour, or later — and `"@skip": true` leaves the row out;
 *   - `@t` is the reader's language: the exact tag, then the same language,
 *     then US English;
 *   - what the database fills in is filled in: a copy through the row's link
 *     (always, or only when the row names none), a setting the column falls
 *     back to (a column of the app's own settings row, read as the bundle
 *     wrote it), each column's default ("now" is the adding moment), a running
 *     number the row leaves out, and null for the rest;
 *   - then, once every row is in, the totals are settled from the rows that
 *     feed them, as the loader does last: each copy that follows its row,
 *     each price by the night (the rate of the row it links to, and every
 *     rate rule that matches the night, each night rounded, then summed), each
 *     formula (a stay's nights, an extra's amount, a name joined from its
 *     parts), each total over child rows and the balance it leaves.
 *
 * Instants come out as ISO strings in UTC (`…Z`), dates as `YYYY-MM-DD` on the
 * house's clock, worked-out money as numbers. Formulas are worked out exactly
 * (fractions, not floats) and rounded once, half away from zero, to the
 * column's scale — a currency's own decimals for money.
 *
 * Nothing is stamped: Adminium's stamps skip a sample load, so a row carries
 * the times and names it spells — a stay's cancel-by moment too. A code the server draws at random (a share
 * link's token) is left empty here.
 *
 * Pure, and browser-safe: it imports nothing, and nothing that runs only in
 * Node — it ships in the demo bundle. The server's own resolver is in Adminium
 * (`apps/server/src/apps/sample-data.ts`); sampleRows.test.ts holds this one
 * to the same answers, and sample-drift.test.ts holds the written part below
 * to manifest.json.
 */

/** The parts of an `adminium.sample/1` bundle this resolver reads. */
export interface SampleBundleRows {
  format: string;
  app: string;
  /** The weekday `@week` days count from. */
  weekAnchor?: string;
  tables: { ref: string; rows: Record<string, unknown>[] }[];
}

export type ResolvedRow = Record<string, unknown>;
export type ResolvedSample = Record<string, ResolvedRow[]>;

export interface ResolveOptions {
  /** The adding moment, in epoch milliseconds. */
  now: number;
  /** The house's IANA zone, e.g. "America/New_York". */
  zone: string;
  /** The reader's BCP 47 tag, e.g. "de-DE". */
  locale: string;
  /** The connection's currency, for a column that falls back to it. */
  currency?: string;
  /** The add-ons' settings a column falls back to, by `<addOn>.<setting>`. */
  settings?: Readonly<Record<string, unknown>>;
}

/** A column the database fills with the adding moment. */
const NOW = Symbol("now");
/** A column every row must name: it has no default and may not be empty. */
const REQUIRED = Symbol("required");
type Fill = string | number | boolean | null | typeof NOW | typeof REQUIRED;

/** A decimal column's places: a number, or the row's currency's own. */
type Scale = number | "currency";

/** A formula as the manifest writes it (`rules.formula`). */
export type Formula =
  | number
  | string
  | { add: Formula[] }
  | { sub: [Formula, Formula] }
  | { mul: Formula[] }
  | { div: [Formula, Formula] }
  | { min: Formula[] }
  | { max: Formula[] }
  | { round: Formula | [Formula, number] }
  | { coalesce: [Formula, Formula] }
  | { if: [Condition, Formula, Formula] }
  | { daysBetween: [string, string] }
  | { join: string[] };

export type Condition =
  | { eq: [string, string | number | boolean] }
  | { neq: [string, string | number | boolean] }
  | { gt: [Formula, Formula] }
  | { gte: [Formula, Formula] }
  | { lt: [Formula, Formula] }
  | { lte: [Formula, Formula] }
  | { isNull: string }
  | { and: Condition[] }
  | { or: Condition[] };

export interface Rules {
  /**
   * `column.copy`: the value of `from` on the row `via` links to (a `parent` row); `always`, or only when the row names none.
   * `follow`: kept in step when the parent changes later; a copy that does not follow keeps what it copied when the row was added.
   */
  copies: { table: string; column: string; via: string; parent: string; from: string; always: boolean; follow: boolean }[];
  /** `column.default.from`: a setting the column falls back to when the row and its copy leave it empty. */
  defaults: { table: string; column: string; from: string }[];
  /** `column.formula`, worked out over the row's own columns. */
  formulas: { table: string; column: string; scale: Scale; expr: Formula }[];
  /** `column.rollup`: the sum of `child.sum` over the rows linked by `via`, and the balance it leaves. */
  rollups: {
    table: string;
    column: string;
    child: string;
    via: string;
    sum: string;
    scale: Scale;
    where?: { column: string; eq: unknown };
    balance?: { column: string; of: string };
  }[];
  /** `column.sequence`: the next number when a row leaves it out (per `scope` row when scoped). */
  sequences: { table: string; column: string; scope: string | null }[];
  /** `column.format`: the text of a running number, with its prefix. */
  formats: { table: string; column: string; from: string; prefix: string | null; prefixSetting: string | null; pad: number }[];
  /** `column.code`: drawn at random by the server; left empty here. */
  codes: { table: string; column: string }[];
  /**
   * `column.perNight`: for each night from `from` up to the day before `to`,
   * the rate on the row `rateVia` links to, plus every adjustment row that
   * matches the night; each night rounded, and the column holds their sum.
   */
  perNights: PerNight[];
}

export interface PerNight {
  table: string;
  column: string;
  scale: Scale;
  from: string;
  to: string;
  rateVia: string;
  rateTable: string;
  rateColumn: string;
  adjust: {
    table: string;
    match: { via?: string; weekdays?: string; from?: string; to?: string };
    add: string;
    name: string;
    where?: { column: string; eq: unknown };
  } | null;
}

/*
 * Every column after `id`, in the manifest's order, with what the database
 * puts there when a row does not say, and the rules the loader settles rows
 * by (manifest.json `requiredSchema`). The manifest is too big to ship to the
 * browser for this, so `npm run sample` writes them here from it, between
 * the two marker lines.
 */
// ── written by `npm run sample` from manifest.json; do not edit by hand ──
export const COLUMNS: Record<string, Record<string, Fill>> = {
  settings: { name: REQUIRED, address: REQUIRED, town: null, phone: REQUIRED, email: null, since: null, about: null, finding: null, morning: null, directions_train: null, directions_car: null, directions_foot: null, breakfast_hours: null, late_arrival_note: null, tax_rate: 0, tax_label: "Tax", credit_label: "Nights not stayed", arrive_from: "15:00", leave_by: "11:00", late_until: "14:00", no_show_at: "11:00", cancel_days: 2, max_nights: 14, ahead_days: 365, ref_start: 1001, ref_prefix: "R-", guest_emails_on: true },
  house_notes: { icon: null, text: REQUIRED, position: 0 },
  room_types: { code: REQUIRED, name: REQUIRED, blurb: null, description: null, sleeps: 2, base_rate: REQUIRED, color: null, icon: null, position: 0, active: true },
  room_type_features: { room_type_id: REQUIRED, feature: REQUIRED, icon: null, position: 0 },
  rooms: { number: REQUIRED, floor: 1, room_type_id: REQUIRED, sleeps: null, status: "ready", note: null },
  room_closures: { room_id: REQUIRED, from_date: REQUIRED, to_date: null, reason: null, active: true, set_by: null, created_at: null },
  rate_rules: { room_type_id: null, name: REQUIRED, weekdays: null, from_date: null, to_date: null, amount: REQUIRED, active: true },
  extras: { code: null, label: REQUIRED, short: null, how: null, icon: null, amount: REQUIRED, per: "night", spaces: null, active: true, position: 0 },
  charge_items: { label: REQUIRED, detail: null, amount: REQUIRED, icon: null, extra_id: null, active: true, position: 0 },
  customers: { email: null, first_name: null, last_name: null, forgotten_at: null, created_at: null },
  stays: { ref_seq: null, ref: null, status: "booked", room_type_id: REQUIRED, room_id: null, arrive: REQUIRED, depart: REQUIRED, guests: 2, nights: null, first_name: REQUIRED, last_name: null, guest_name: null, email: null, mobile: null, arrival_time: null, note: null, expect_by: null, language: null, channel: "online", room_total: null, extras_total: null, extras_nightly: null, charges_total: null, credits_total: null, discount: null, room_discount: null, subtotal: null, tax_rate: null, tax_label: null, tax: null, total: null, paid: null, balance: null, late_cancel: false, cancel_code: null, cancel_by: null, created_at: null, checked_in_at: null, checked_in_by: null, checked_out_at: null, checked_out_by: null, cancelled_at: null, cancelled_by: null, folio_sent_at: null, folio_so_far_at: null, no_show_marked_at: null, customer_id: null, customer_proved: null, link_token: null, link_stopped: false, client_key: null },
  stay_extras: { stay_id: REQUIRED, extra_id: REQUIRED, state: "on", label: null, each: null, per: null, nights: null, guests: null, nightly: null, amount: null, added_at: null, discount: null },
  stay_codes: { stay_id: REQUIRED, typed: null, code_id: null, voucher_id: null, removed_at: null, created_at: null },
  charges: { stay_id: REQUIRED, charge_item_id: null, label: null, amount: REQUIRED, note: null, charged_on: null, recorded_by: null, voided: false, void_reason: null, voided_at: null, voided_by: null },
  stay_credits: { stay_id: REQUIRED, reason: "left_early", label: null, from_date: REQUIRED, to_date: REQUIRED, room_type_id: null, nights: null, room_amount: null, extras_nightly: null, amount: null, line_amount: null, recorded_by: null, created_at: null, voided: false, void_reason: null, voided_at: null, voided_by: null },
  payments: { stay_id: REQUIRED, kind: "taken", amount: REQUIRED, method: "card", reference: null, note: null, signed: null, paid_on: null, recorded_at: null, recorded_by: null, voided: false, void_reason: null, voided_at: null, voided_by: null, settle_as: null, card_code: null, card_id: null, card_last4: null, card_balance_after: null, asked: null, against_id: null },
  messages: { kind: REQUIRED, status: "queued", to_address: null, language: null, stay_id: null, customer_id: null, due: null, created_at: null, sent_at: null, error: null, was: null, repeat_key: null, skip_reason: null },
};

export const RULES: Rules = {
  copies: [
    { table: "rooms", column: "sleeps", via: "room_type_id", parent: "room_types", from: "sleeps", always: true, follow: true },
    { table: "stay_extras", column: "label", via: "extra_id", parent: "extras", from: "label", always: true, follow: false },
    { table: "stay_extras", column: "each", via: "extra_id", parent: "extras", from: "amount", always: true, follow: false },
    { table: "stay_extras", column: "per", via: "extra_id", parent: "extras", from: "per", always: true, follow: false },
    { table: "stay_extras", column: "nights", via: "stay_id", parent: "stays", from: "nights", always: true, follow: true },
    { table: "stay_extras", column: "guests", via: "stay_id", parent: "stays", from: "guests", always: true, follow: true },
    { table: "charges", column: "label", via: "charge_item_id", parent: "charge_items", from: "label", always: true, follow: false },
    { table: "charges", column: "amount", via: "charge_item_id", parent: "charge_items", from: "amount", always: true, follow: false },
    { table: "stay_credits", column: "room_type_id", via: "stay_id", parent: "stays", from: "room_type_id", always: true, follow: true },
    { table: "stay_credits", column: "extras_nightly", via: "stay_id", parent: "stays", from: "extras_nightly", always: true, follow: false },
  ],
  defaults: [
    { table: "stays", column: "tax_rate", from: "app:settings.tax_rate" },
    { table: "stays", column: "tax_label", from: "app:settings.tax_label" },
    { table: "stay_credits", column: "label", from: "app:settings.credit_label" },
  ],
  formulas: [
    { table: "stays", column: "nights", scale: 2, expr: {"daysBetween":["arrive","depart"]} },
    { table: "stays", column: "guest_name", scale: 2, expr: {"join":["first_name"," ","last_name"]} },
    { table: "stays", column: "subtotal", scale: "currency", expr: {"sub":[{"sub":[{"add":["room_total",{"coalesce":["extras_total",0]},{"coalesce":["charges_total",0]}]},{"coalesce":["credits_total",0]}]},{"coalesce":["discount",0]}]} },
    { table: "stays", column: "tax", scale: "currency", expr: {"round":{"div":[{"mul":["subtotal",{"coalesce":["tax_rate",0]}]},100]}} },
    { table: "stays", column: "total", scale: "currency", expr: {"add":["subtotal",{"coalesce":["tax",0]}]} },
    { table: "stay_extras", column: "nightly", scale: "currency", expr: {"if":[{"eq":["per","person_night"]},{"mul":["each",{"coalesce":["guests",1]}]},{"if":[{"eq":["per","night"]},"each",0]}]} },
    { table: "stay_extras", column: "amount", scale: "currency", expr: {"if":[{"eq":["per","stay"]},"each",{"mul":["nightly",{"coalesce":["nights",0]}]}]} },
    { table: "stay_credits", column: "nights", scale: 2, expr: {"daysBetween":["from_date","to_date"]} },
    { table: "stay_credits", column: "amount", scale: "currency", expr: {"add":["room_amount",{"mul":[{"coalesce":["extras_nightly",0]},{"coalesce":["nights",0]}]}]} },
    { table: "stay_credits", column: "line_amount", scale: "currency", expr: {"sub":[0,"amount"]} },
    { table: "payments", column: "signed", scale: "currency", expr: {"if":[{"eq":["kind","given_back"]},{"sub":[0,"amount"]},"amount"]} },
    { table: "payments", column: "settle_as", scale: 2, expr: {"if":[{"eq":["method","gift_card"]},{"if":[{"eq":["kind","given_back"]},2,1]},0]} },
  ],
  rollups: [
    { table: "stays", column: "extras_total", child: "stay_extras", via: "stay_id", sum: "amount", scale: "currency", where: {"column":"state","eq":"on"} },
    { table: "stays", column: "extras_nightly", child: "stay_extras", via: "stay_id", sum: "nightly", scale: "currency", where: {"column":"state","eq":"on"} },
    { table: "stays", column: "charges_total", child: "charges", via: "stay_id", sum: "amount", scale: "currency", where: {"column":"voided","eq":false} },
    { table: "stays", column: "credits_total", child: "stay_credits", via: "stay_id", sum: "amount", scale: "currency", where: {"column":"voided","eq":false} },
    { table: "stays", column: "paid", child: "payments", via: "stay_id", sum: "signed", scale: "currency", where: {"column":"voided","eq":false}, balance: { column: "balance", of: "total" } },
  ],
  sequences: [
    { table: "stays", column: "ref_seq", scope: null },
  ],
  formats: [
    { table: "stays", column: "ref", from: "ref_seq", prefix: null, prefixSetting: "app:settings.ref_prefix", pad: 0 },
  ],
  codes: [
    { table: "stays", column: "link_token" },
  ],
  perNights: [
    { table: "stays", column: "room_total", scale: "currency", from: "arrive", to: "depart", rateVia: "room_type_id", rateTable: "room_types", rateColumn: "base_rate", adjust: {"table":"rate_rules","match":{"via":"room_type_id","weekdays":"weekdays","from":"from_date","to":"to_date"},"add":"amount","name":"name","where":{"column":"active","eq":true}} },
    { table: "stay_credits", column: "room_amount", scale: "currency", from: "from_date", to: "to_date", rateVia: "room_type_id", rateTable: "room_types", rateColumn: "base_rate", adjust: {"table":"rate_rules","match":{"via":"room_type_id","weekdays":"weekdays","from":"from_date","to":"to_date"},"add":"amount","name":"name","where":{"column":"active","eq":true}} },
  ],
};
// ── end of the written part ──

// ── the clock ───────────────────────────────────────────────────────────────

interface Ymd {
  y: number;
  m: number;
  d: number;
}

/** How far `zone` is ahead of UTC at `instant`, in ms. */
function zoneOffsetMs(zone: string, instant: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const local = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((local - instant) / 60_000) * 60_000;
}

/** The instant of a wall-clock time in `zone`; across a clock change a second pass settles it. */
function zonedWallTime(date: Ymd, time: string, zone: string): number {
  const [hh, mm] = time.split(":").map(Number) as [number, number];
  const guess = Date.UTC(date.y, date.m - 1, date.d, hh, mm);
  const offset = zoneOffsetMs(zone, guess);
  const again = zoneOffsetMs(zone, guess - offset);
  return again === offset ? guess - offset : guess - again;
}

/** Today's date in `zone`, moved by `days`. */
function zonedDay(now: number, zone: string, days: number): Ymd {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(now));
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const shifted = new Date(Date.UTC(get("year"), get("month") - 1, get("day") + days));
  return { y: shifted.getUTCFullYear(), m: shifted.getUTCMonth() + 1, d: shifted.getUTCDate() };
}

const WEEKDAY_INDEX: Readonly<Record<string, number>> = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 };

/** The day with the anchor weekday nearest today in `zone` (at most three days either side), moved by `days`. */
function zonedWeekDay(now: number, zone: string, anchor: string, days: number): Ymd {
  const today = zonedDay(now, zone, 0);
  const at = new Date(Date.UTC(today.y, today.m - 1, today.d));
  const weekday = (at.getUTCDay() + 6) % 7;
  let shift = (WEEKDAY_INDEX[anchor] ?? weekday) - weekday;
  if (shift > 3) shift -= 7;
  if (shift < -3) shift += 7;
  at.setUTCDate(at.getUTCDate() + shift + days);
  return { y: at.getUTCFullYear(), m: at.getUTCMonth() + 1, d: at.getUTCDate() };
}

/** `n` working days from today in `zone`; day 0 on a weekend is the Monday after. */
function zonedWorkday(now: number, zone: string, n: number): Ymd {
  const today = zonedDay(now, zone, 0);
  const at = new Date(Date.UTC(today.y, today.m - 1, today.d));
  const weekend = (date: Date) => date.getUTCDay() === 0 || date.getUTCDay() === 6;
  while (weekend(at)) at.setUTCDate(at.getUTCDate() + 1);
  for (let left = Math.abs(n); left > 0; ) {
    at.setUTCDate(at.getUTCDate() + Math.sign(n));
    if (!weekend(at)) left -= 1;
  }
  return { y: at.getUTCFullYear(), m: at.getUTCMonth() + 1, d: at.getUTCDate() };
}

/**
 * Day `dom` of the month `months` from this one in `zone`: the month's last
 * day when it has fewer, and today when that day has not come yet.
 */
export function zonedMonthDay(now: number, zone: string, months: number, dom: number): Ymd & { today: boolean } {
  const today = zonedDay(now, zone, 0);
  const first = new Date(Date.UTC(today.y, today.m - 1 + months, 1));
  const y = first.getUTCFullYear();
  const m = first.getUTCMonth() + 1;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const day = { y, m, d: Math.min(dom, last) };
  const later = day.y * 10_000 + day.m * 100 + day.d >= today.y * 10_000 + today.m * 100 + today.d;
  return later ? { ...today, today: true } : { ...day, today: false };
}

/**
 * The first time at or after `instant` on a `grid`-minute step of the
 * kitchen's own clock, counted from its midnight: 12:07 on a 15-minute grid
 * is 12:15, and 12:15 stays 12:15. Never past the next midnight.
 */
export function onVenueGrid(instant: number, grid: number, zone: string): number {
  const local = instant + zoneOffsetMs(zone, instant);
  const midnight = Math.floor(local / 86_400_000) * 86_400_000;
  const step = grid * 60_000;
  const rounded = new Date(midnight + Math.min(Math.ceil((local - midnight) / step) * step, 86_400_000));
  const time = `${pad2(rounded.getUTCHours())}:${pad2(rounded.getUTCMinutes())}`;
  return zonedWallTime({ y: rounded.getUTCFullYear(), m: rounded.getUTCMonth() + 1, d: rounded.getUTCDate() }, time, zone);
}

/** `P[nW][nD][T[nH][nM][nS]]` in ms. */
function durationMs(duration: string): number {
  const match = /^P(?!$)(\d+W)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+(\.\d+)?S)?)?$/.exec(duration);
  if (match === null) throw new Error(`"${duration}" is not an ISO-8601 duration`);
  const n = (part: string | undefined) => (part === undefined ? 0 : Number.parseFloat(part));
  return ((((n(match[1]) * 7 + n(match[2])) * 24 + n(match[4])) * 60 + n(match[5])) * 60 + n(match[6])) * 1000;
}

/** Half an hour either side of the adding moment is "around" it. */
const AROUND_MS = 30 * 60_000;

const pad2 = (n: number) => String(n).padStart(2, "0");
const spellDay = (day: Ymd) => `${String(day.y).padStart(4, "0")}-${pad2(day.m)}-${pad2(day.d)}`;

/** The text for the reader's language: theirs, their language, US English, any. */
export function pickText(texts: Readonly<Record<string, string>>, locale: string): string {
  const tag = locale.replace("_", "-");
  if (texts[tag] !== undefined) return texts[tag]!;
  const language = tag.split("-")[0];
  const near = Object.entries(texts).find(([key]) => key.split("-")[0] === language);
  if (near !== undefined) return near[1];
  return texts["en-US"] ?? Object.values(texts)[0] ?? "";
}

// ── exact arithmetic ────────────────────────────────────────────────────────

/** A fraction of two big integers; `d` is always positive. */
interface Ratio {
  n: bigint;
  d: bigint;
}

function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) [x, y] = [y, x % y];
  return x === 0n ? 1n : x;
}

function ratio(n: bigint, d: bigint): Ratio {
  if (d < 0n) return ratio(-n, -d);
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}

/** A stored value as an exact fraction, from its decimal text (never a float product); null when empty. */
function toRatio(value: unknown): Ratio | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return { n: value ? 1n : 0n, d: 1n };
  const text = typeof value === "number" ? (Number.isFinite(value) ? String(value) : "") : typeof value === "string" ? value.trim() : "";
  const match = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(text);
  if (match === null) return null;
  const [, sign = "", whole = "", fraction = "", exponent = "0"] = match;
  if (whole === "" && fraction === "") return null;
  let n = BigInt(`${whole}${fraction}` || "0");
  let d = 10n ** BigInt(fraction.length);
  const e = Number.parseInt(exponent, 10);
  if (e > 0) n *= 10n ** BigInt(e);
  else if (e < 0) d *= 10n ** BigInt(-e);
  return ratio(sign === "-" ? -n : n, d);
}

const add = (a: Ratio, b: Ratio) => ratio(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a: Ratio, b: Ratio) => ratio(a.n * b.d - b.n * a.d, a.d * b.d);
const mul = (a: Ratio, b: Ratio) => ratio(a.n * b.n, a.d * b.d);
const cmp = (a: Ratio, b: Ratio) => Math.sign(Number(a.n * b.d - b.n * a.d));

/** Round half away from zero to `scale` places. */
function roundTo(value: Ratio, scale: number): Ratio {
  const factor = 10n ** BigInt(scale);
  const scaled = value.n * factor;
  const negative = scaled < 0n;
  const magnitude = negative ? -scaled : scaled;
  let q = magnitude / value.d;
  if ((magnitude % value.d) * 2n >= value.d) q += 1n;
  return ratio(negative ? -q : q, factor);
}

/** A fraction as a number, rounded to `scale` places first. */
function toNumber(value: Ratio, scale: number): number {
  const rounded = roundTo(value, scale);
  const factor = 10n ** BigInt(scale);
  const units = (rounded.n * factor) / rounded.d;
  return Number(units) / Number(factor);
}

/** The decimals a currency is written with: JPY 0, most 2, KWD 3. Unknown → 2. */
export function currencyScale(code: unknown): number {
  if (typeof code !== "string" || !/^[A-Za-z]{3}$/.test(code)) return 2;
  const upper = code.toUpperCase();
  if (["BIF", "CLP", "DJF", "GNF", "ISK", "JPY", "KMF", "KRW", "PYG", "RWF", "UGX", "UYI", "VND", "VUV", "XAF", "XOF", "XPF"].includes(upper)) return 0;
  if (["BHD", "IQD", "JOD", "KWD", "LYD", "OMR", "TND"].includes(upper)) return 3;
  return 2;
}

function sameValue(stored: unknown, literal: string | number | boolean): boolean {
  if (stored === null || stored === undefined) return false;
  if (typeof literal === "boolean") return stored === literal || stored === (literal ? 1 : 0) || stored === (literal ? "1" : "0") || stored === String(literal);
  if (typeof literal === "number") {
    const a = toRatio(stored);
    const b = toRatio(literal);
    return a !== null && b !== null && cmp(a, b) === 0;
  }
  return String(stored) === literal;
}

function holds(condition: Condition, row: Readonly<Record<string, unknown>>, scale: number): boolean {
  const [op, args] = Object.entries(condition)[0] as [string, unknown];
  switch (op) {
    case "eq": {
      const [column, value] = args as [string, string | number | boolean];
      return sameValue(row[column], value);
    }
    case "neq": {
      const [column, value] = args as [string, string | number | boolean];
      return row[column] !== null && row[column] !== undefined && !sameValue(row[column], value);
    }
    case "isNull": {
      const stored = row[args as string];
      return stored === null || stored === undefined || stored === "";
    }
    case "and":
      return (args as Condition[]).every((c) => holds(c, row, scale));
    case "or":
      return (args as Condition[]).some((c) => holds(c, row, scale));
    default: {
      const [left, right] = (args as [Formula, Formula]).map((side) => evaluate(side, row, scale));
      if (left === null || left === undefined || right === null || right === undefined) return false;
      const order = cmp(left, right);
      return op === "gt" ? order > 0 : op === "gte" ? order >= 0 : op === "lt" ? order < 0 : order <= 0;
    }
  }
}

/** A formula over the row, exactly; null when an input it needs is empty or a divisor is zero. */
function evaluate(expr: Formula, row: Readonly<Record<string, unknown>>, scale: number): Ratio | null {
  if (typeof expr === "number") return toRatio(expr);
  if (typeof expr === "string") return toRatio(row[expr]);
  const [op, args] = Object.entries(expr)[0] as [string, unknown];
  const all = (list: Formula[]): Ratio[] | null => {
    const out: Ratio[] = [];
    for (const item of list) {
      const v = evaluate(item, row, scale);
      if (v === null) return null;
      out.push(v);
    }
    return out;
  };
  switch (op) {
    case "add":
    case "mul":
    case "min":
    case "max": {
      const values = all(args as Formula[]);
      if (values === null) return null;
      return values.reduce((a, b) =>
        op === "add" ? add(a, b) : op === "mul" ? mul(a, b) : op === "min" ? (cmp(a, b) <= 0 ? a : b) : cmp(a, b) >= 0 ? a : b,
      );
    }
    case "sub": {
      const values = all(args as Formula[]);
      return values === null ? null : sub(values[0]!, values[1]!);
    }
    case "div": {
      const values = all(args as Formula[]);
      if (values === null || values[1]!.n === 0n) return null;
      return ratio(values[0]!.n * values[1]!.d, values[0]!.d * values[1]!.n);
    }
    case "round": {
      const [inner, places] = Array.isArray(args) ? (args as [Formula, number]) : [args as Formula, scale];
      const v = evaluate(inner, row, scale);
      return v === null ? null : roundTo(v, places);
    }
    case "coalesce": {
      const [first, second] = args as [Formula, Formula];
      return evaluate(first, row, scale) ?? evaluate(second, row, scale);
    }
    case "if": {
      const [condition, then, otherwise] = args as [Condition, Formula, Formula];
      return evaluate(holds(condition, row, scale) ? then : otherwise, row, scale);
    }
    case "daysBetween": {
      const [start, end] = (args as [string, string]).map((column) => dayNumber(row[column]));
      if (start === null || end === null || end < start) return null;
      return { n: BigInt(end - start), d: 1n };
    }
    default:
      return null;
  }
}

/** A date's day count since 1970, read from its `YYYY-MM-DD` text; null when it is none. */
function dayNumber(value: unknown): number | null {
  const match = typeof value === "string" ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null;
  if (match === null) return null;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86_400_000;
}

/** A formula's value for the row at `scale` places, as a number; null when it has none. */
export function workOut(expr: Formula, row: Readonly<Record<string, unknown>>, scale: number): number | string | null {
  if (typeof expr === "object" && expr !== null && "join" in expr) {
    // Columns of the row and text, empty parts left out, and nothing left at either end.
    const parts = expr.join.map((part) => (/^[a-z][a-z0-9_]*$/.test(part) ? row[part] : part));
    const text = parts
      .map((part) => (part === null || part === undefined ? "" : String(part)))
      .join("")
      .replace(/\s+/g, " ")
      .trim();
    return text === "" ? null : text;
  }
  const value = evaluate(expr, row, scale);
  return value === null ? null : toNumber(value, scale);
}

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

/** One night of a price by the night: its date, its rate, the base it started from, and what it was tagged with. */
export interface PricedNight {
  date: string;
  rate: number;
  base: number;
  tags: string[];
}

/**
 * The nights of a row's price by the night, each priced: the rate of the row
 * `rateVia` links to, plus every active adjustment that matches the night (the
 * same room type or none, the night's weekday listed or no list, inside its
 * first and last night where it names them), rounded once a night.
 */
export function pricedNights(rule: PerNight, row: Readonly<Record<string, unknown>>, out: Readonly<ResolvedSample>, places: number): PricedNight[] | null {
  const start = dayNumber(row[rule.from]);
  const end = dayNumber(row[rule.to]);
  const rateRow = out[rule.rateTable]?.find((candidate) => candidate["id"] === row[rule.rateVia]);
  const base = toRatio(rateRow?.[rule.rateColumn]);
  if (start === null || end === null || end <= start || base === null) return null;
  const adjustments = (rule.adjust === null ? [] : (out[rule.adjust.table] ?? [])).filter((candidate) => {
    const adjust = rule.adjust!;
    return adjust.where === undefined || sameValue(candidate[adjust.where.column], adjust.where.eq as string | number | boolean);
  });
  const nights: PricedNight[] = [];
  for (let day = start; day < end; day += 1) {
    const date = new Date(day * 86_400_000).toISOString().slice(0, 10);
    const weekday = WEEKDAYS[new Date(day * 86_400_000).getUTCDay()]!;
    let rate = base;
    const tags: string[] = [];
    for (const candidate of adjustments) {
      const { match, add: addColumn, name } = rule.adjust!;
      if (match.via !== undefined && candidate[match.via] !== null && candidate[match.via] !== undefined && candidate[match.via] !== row[rule.rateVia]) continue;
      const listed = match.weekdays === undefined ? null : candidate[match.weekdays];
      if (typeof listed === "string" && listed.trim() !== "" && !listed.toLowerCase().split(",").map((w) => w.trim()).includes(weekday)) continue;
      const first = match.from === undefined ? null : dayNumber(candidate[match.from]);
      const last = match.to === undefined ? null : dayNumber(candidate[match.to]);
      if ((first !== null && day < first) || (last !== null && day > last)) continue;
      const amount = toRatio(candidate[addColumn]);
      if (amount === null) continue;
      rate = add(rate, amount);
      if (typeof candidate[name] === "string") tags.push(candidate[name]);
    }
    nights.push({ date, rate: toNumber(roundTo(rate, places), places), base: toNumber(base, places), tags });
  }
  return nights;
}

/** A column's places for this row: its own, or its currency's (the row's, else the connection's). */
function placesOf(scale: Scale, row: Readonly<Record<string, unknown>>, currency: string | undefined): number {
  return scale === "currency" ? currencyScale(row["currency"] ?? currency) : scale;
}

// ── one value, one row ──────────────────────────────────────────────────────

/** An instant, kept as a Date until the row is spelled out, so `@byClock` can compare it. */
type Resolved = unknown;

interface Context extends ResolveOptions {
  labels: Map<string, number>;
  weekAnchor?: string | undefined;
}

function resolveValue(value: unknown, ctx: Context): Resolved {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return value;
  const record = value as Record<string, unknown>;
  if (typeof record["@ref"] === "string") {
    const id = ctx.labels.get(record["@ref"]);
    if (id === undefined) throw new Error(`The sample row "${record["@ref"]}" was not written.`);
    return id;
  }
  if (typeof record["@ago"] === "string") return new Date(ctx.now - durationMs(record["@ago"]));
  if (typeof record["@in"] === "string") {
    const at = ctx.now + durationMs(record["@in"]);
    return typeof record["@grid"] === "number" ? new Date(onVenueGrid(at, record["@grid"], ctx.zone)) : new Date(at);
  }
  if (typeof record["@day"] === "number") {
    const day =
      record["@week"] === true && ctx.weekAnchor !== undefined
        ? zonedWeekDay(ctx.now, ctx.zone, ctx.weekAnchor, record["@day"])
        : record["@workdays"] === true
          ? zonedWorkday(ctx.now, ctx.zone, record["@day"])
          : zonedDay(ctx.now, ctx.zone, record["@day"]);
    if (typeof record["@time"] === "string") return new Date(zonedWallTime(day, record["@time"], ctx.zone));
    return spellDay(day);
  }
  if (typeof record["@month"] === "number" && typeof record["@dom"] === "number") {
    const day = zonedMonthDay(ctx.now, ctx.zone, record["@month"], record["@dom"]);
    if (typeof record["@time"] !== "string") return spellDay(day);
    const at = zonedWallTime(day, record["@time"], ctx.zone);
    // A time on today that has not come yet is now: a month's history never runs into the future.
    return new Date(day.today && at > ctx.now ? ctx.now : at);
  }
  if (typeof record["@t"] === "object" && record["@t"] !== null) return pickText(record["@t"] as Record<string, string>, ctx.locale);
  if (typeof record["@asset"] === "string") throw new Error(`The sample asset "${record["@asset"]}" cannot be shown without a server.`);
  return value;
}

/** One row with its directives resolved, or null when its `@byClock` or `@byStay` set leaves it out. */
function resolveRow(row: Readonly<Record<string, unknown>>, ctx: Context): Record<string, Resolved> | null {
  let values: Readonly<Record<string, unknown>> = row;
  const clock = row["@byClock"] as { at: unknown; before?: Record<string, unknown>; around?: Record<string, unknown>; after?: Record<string, unknown> } | undefined;
  type Branch = Record<string, unknown>;
  const stay = row["@byStay"] as { from: unknown; to: unknown; times?: { from?: string; to?: string }; before?: Branch; during?: Branch; after?: Branch } | undefined;
  if (stay !== undefined) {
    // The row's arrival and departure, against the adding moment: before its stay, during it, or after it.
    const edge = (end: "from" | "to"): number => {
      const when = resolveValue(typeof stay[end] === "string" ? row[stay[end] as string] : stay[end], ctx);
      if (when instanceof Date) return when.getTime();
      const day = typeof when === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(when.trim()) : null;
      if (day === null) return Number.NaN;
      return zonedWallTime({ y: Number(day[1]), m: Number(day[2]), d: Number(day[3]) }, stay.times?.[end] ?? "00:00", ctx.zone);
    };
    const from = edge("from");
    const to = edge("to");
    const branch = Number.isNaN(from) || Number.isNaN(to) ? undefined : ctx.now < from ? stay.before : ctx.now < to ? stay.during : stay.after;
    if (branch?.["@skip"] === true) return null;
    const { ["@skip"]: _skip, ...columns } = branch ?? {};
    values = { ...row, ...columns };
  } else if (clock !== undefined) {
    const when = resolveValue(typeof clock.at === "string" ? row[clock.at] : clock.at, ctx);
    const instant = when instanceof Date ? when.getTime() : Number.NaN;
    const branch = Number.isNaN(instant)
      ? undefined
      : instant < ctx.now - AROUND_MS
        ? clock.before
        : instant <= ctx.now + AROUND_MS
          ? clock.around
          : clock.after;
    if (branch?.["@skip"] === true) return null;
    const { ["@skip"]: _skip, ...columns } = branch ?? {};
    values = { ...row, ...columns };
  }
  const out: Record<string, Resolved> = {};
  for (const [column, value] of Object.entries(values)) {
    if (column === "@label" || column === "@byClock" || column === "@byStay" || column === "@onlyIfEmpty") continue;
    out[column] = resolveValue(value, ctx);
  }
  return out;
}

const spell = (value: Resolved): unknown => (value instanceof Date ? value.toISOString() : value);

/**
 * A setting a column falls back to: the connection's currency, a column of
 * the app's own settings row (`app:<table>.<column>`, as resolved so far), or
 * an add-on's setting.
 */
function settingValue(name: string, options: ResolveOptions, out?: ResolvedSample): unknown {
  if (name === "connection.currency") return options.currency;
  const own = /^app:([a-z_]+)\.([a-z_]+)$/.exec(name);
  if (own !== null) return out?.[own[1]!]?.[0]?.[own[2]!] ?? undefined;
  return options.settings?.[name];
}

// ── the whole bundle ────────────────────────────────────────────────────────

/** Every table of the bundle, as Adminium would have written it at `now`. */
export function resolveSample(bundle: SampleBundleRows, options: ResolveOptions): ResolvedSample {
  const ctx: Context = { ...options, labels: new Map(), weekAnchor: bundle.weekAnchor };
  const out: ResolvedSample = {};
  const rowById = (table: string, id: unknown) => out[table]?.find((candidate) => candidate["id"] === id);
  for (const table of bundle.tables) {
    const shape = COLUMNS[table.ref];
    if (shape === undefined) throw new Error(`"${table.ref}" is not a table of this app.`);
    const rows = (out[table.ref] ??= []);
    for (const row of table.rows) {
      const values = resolveRow(row, ctx);
      if (values === null) continue;
      for (const column of Object.keys(values)) {
        if (!(column in shape)) throw new Error(`"${table.ref}" has no column "${column}".`);
      }
      // A copy through the row's link, from a row written earlier: always, or when the row names none.
      for (const copy of RULES.copies) {
        if (copy.table !== table.ref || (!copy.always && values[copy.column] !== undefined)) continue;
        const link = values[copy.via];
        if (link === null || link === undefined) continue;
        const source = rowById(copy.parent, link);
        if (source !== undefined) values[copy.column] = source[copy.from];
      }
      // A setting the column falls back to when it is still empty.
      for (const fallback of RULES.defaults) {
        if (fallback.table !== table.ref || (values[fallback.column] !== undefined && values[fallback.column] !== null)) continue;
        const setting = settingValue(fallback.from, options, out);
        if (setting !== undefined) values[fallback.column] = setting;
      }
      // A running number the row leaves out: the largest so far (in its scope) + 1.
      for (const sequence of RULES.sequences) {
        if (sequence.table !== table.ref || values[sequence.column] !== undefined) continue;
        const peers = rows.filter((peer) => sequence.scope === null || peer[sequence.scope] === values[sequence.scope]);
        values[sequence.column] = Math.max(0, ...peers.map((peer) => Number(peer[sequence.column] ?? 0))) + 1;
      }
      for (const format of RULES.formats) {
        if (format.table !== table.ref || values[format.column] !== undefined) continue;
        const number = values[format.from];
        const prefix = format.prefix ?? (format.prefixSetting === null ? undefined : settingValue(format.prefixSetting, options));
        if (typeof number === "number" && typeof prefix === "string") values[format.column] = `${prefix}${String(number).padStart(format.pad, "0")}`;
      }
      const id = rows.length + 1;
      const record: ResolvedRow = { id };
      for (const [column, fill] of Object.entries(shape)) {
        const value = values[column];
        if (value !== undefined) record[column] = spell(value);
        else if (fill === REQUIRED) throw new Error(`A sample row for "${table.ref}" has no "${column}".`);
        else record[column] = fill === NOW ? new Date(options.now).toISOString() : fill;
      }
      rows.push(record);
      const label = row["@label"];
      if (typeof label === "string") ctx.labels.set(label, id);
    }
  }
  settle(out, options);
  return out;
}

/** The columns a row's nightly price is worked out from: writing one of them prices it again. */
export function priceInputs(table: string): string[] {
  return RULES.perNights.filter((rule) => rule.table === table).flatMap((rule) => [rule.from, rule.to, rule.rateVia]);
}

/**
 * Every total, from every row that feeds it — last, as the loader does. A
 * document's tax reads its subtotal, a stage line's rate reads its proposal's
 * total, so the rules run again until nothing moves (a handful of passes).
 */
export function settle(out: ResolvedSample, options: Pick<ResolveOptions, "currency"> & { reprice?: (table: string, row: ResolvedRow) => boolean }): void {
  const order = [...Object.keys(COLUMNS)];
  for (let pass = 0; pass < 12; pass += 1) {
    let moved = false;
    const put = (row: ResolvedRow, column: string, value: unknown) => {
      if (row[column] === value) return;
      row[column] = value;
      moved = true;
    };
    for (const table of order) {
      const rows = out[table] ?? [];
      for (const row of rows) {
        for (const copy of RULES.copies) {
          if (copy.table !== table || !copy.always || row[copy.via] === null || row[copy.via] === undefined) continue;
          // Copied once, when the row was added: only a copy that follows its row moves with it.
          if (!copy.follow && row[copy.column] !== undefined) continue;
          const source = out[copy.parent]?.find((candidate) => candidate["id"] === row[copy.via]);
          if (source !== undefined) put(row, copy.column, source[copy.from]);
        }
        for (const rule of RULES.perNights) {
          if (rule.table !== table) continue;
          // Priced once, by the night, as Adminium does: again only when its nights or its type are written.
          if (options.reprice !== undefined && row[rule.column] !== undefined && row[rule.column] !== null && !options.reprice(table, row)) continue;
          const places = placesOf(rule.scale, row, options.currency);
          const nights = pricedNights(rule, row, out, places);
          put(row, rule.column, nights === null ? null : nights.reduce((sum, night) => toNumber(add(toRatio(sum)!, toRatio(night.rate)!), places), 0));
        }
        for (const formula of formulaOrder(table)) {
          put(row, formula.column, workOut(formula.expr, row, placesOf(formula.scale, row, options.currency)));
        }
      }
      for (const rollup of RULES.rollups) {
        if (rollup.table !== table) continue;
        for (const row of rows) {
          let total: Ratio = { n: 0n, d: 1n };
          for (const child of out[rollup.child] ?? []) {
            if (child[rollup.via] !== row["id"]) continue;
            if (rollup.where !== undefined && !sameValue(child[rollup.where.column], rollup.where.eq as string | number | boolean)) continue;
            const amount = toRatio(child[rollup.sum]);
            if (amount !== null) total = add(total, amount);
          }
          const places = placesOf(rollup.scale, row, options.currency);
          put(row, rollup.column, toNumber(total, places));
          if (rollup.balance !== undefined) {
            const of = toRatio(row[rollup.balance.of]);
            put(row, rollup.balance.column, of === null ? null : toNumber(sub(of, total), places));
          }
        }
      }
    }
    if (!moved) return;
  }
  throw new Error("The sample's totals did not settle.");
}

/** A table's formulas in the order they can be worked out: each after every formula column it reads. */
function formulaOrder(table: string): Rules["formulas"] {
  const own = RULES.formulas.filter((formula) => formula.table === table);
  const byColumn = new Map(own.map((formula) => [formula.column, formula]));
  const done: Rules["formulas"] = [];
  const reads = (node: unknown, found: Set<string>): Set<string> => {
    if (typeof node === "string") found.add(node);
    else if (Array.isArray(node)) node.forEach((child) => reads(child, found));
    else if (typeof node === "object" && node !== null) Object.values(node).forEach((child) => reads(child, found));
    return found;
  };
  const visit = (formula: Rules["formulas"][number]) => {
    if (done.includes(formula)) return;
    for (const name of reads(formula.expr, new Set())) {
      const before = byColumn.get(name);
      if (before !== undefined && before !== formula) visit(before);
    }
    done.push(formula);
  };
  own.forEach(visit);
  return done;
}
