/**
 * The stay engine.
 *
 * Pure functions of data passed in: no store, no clock, no formatting. That is
 * what makes the whole of it testable in `stay.test.ts` without a DOM, and it
 * is why the store is a thin layer that applies the results.
 *
 * FIVE RULES this module exists to hold, and the first is the one everything
 * else rests on:
 *
 *   1. A stay occupies the nights `[arrive, departure)`. A room given up on the
 *      26th is sellable to somebody arriving on the 26th, and the calendar must
 *      show that as available rather than blocked. Getting this wrong is how a
 *      hotel loses a night's revenue per turnover, every turnover.
 *   2. A stay runs 1–14 nights (21 D13), and a Saturday arrival needs two.
 *   3. The stay total is the sum of the NIGHTLY rates, never a flat rate times
 *      the number of nights — weekends and August cost more, and the per-night
 *      breakdown a guest can expand has to add up to the total they are shown.
 *   4. A room is assignable only if it is Ready and of the booked type.
 *   5. Check-out is BLOCKED while a balance is outstanding, with the amount
 *      named.
 *
 * Dates are ISO `YYYY-MM-DD` and are compared as calendar days, never as
 * instants, so nothing here shifts by an hour twice a year.
 */

import type {
  Charge,
  Extra,
  Payment,
  Room,
  RoomType,
  Stay,
  StayStatus,
} from "../data/types.ts";

/* ------------------------------------------------------------- arithmetic */

/** Round to the penny. A balance that drifts by a hundredth is not trusted. */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/* --------------------------------------------------------------- calendar */

/** Parse `YYYY-MM-DD` as a LOCAL calendar day — never as UTC midnight. */
export function parseDay(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toIso(d: Date): string {
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** ISO date `n` days after `iso`. */
export function plusDays(iso: string, n: number): string {
  const d = parseDay(iso);
  d.setDate(d.getDate() + n);
  return toIso(d);
}

/** Whole days from `from` to `to`. Negative when `to` is earlier. */
export function dayDiff(from: string, to: string): number {
  return Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / 86_400_000);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(iso: string): number {
  return parseDay(iso).getDay();
}

/**
 * How many NIGHTS a stay covers.
 *
 * This is the whole of rule 1 in one line: arriving on the 24th and leaving on
 * the 26th is two nights — the 24th and the 25th — and the 26th belongs to
 * whoever arrives that afternoon.
 */
export function nights(arrive: string, depart: string): number {
  return dayDiff(arrive, depart);
}

/** The individual nights a stay occupies, oldest first. */
export function nightsBetween(arrive: string, depart: string): string[] {
  const count = nights(arrive, depart);
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) out.push(plusDays(arrive, i));
  return out;
}

/** True when a stay covering `[arrive, depart)` is in the building on `night`. */
export function occupiesNight(stay: Stay, night: string): boolean {
  return stay.arrive <= night && night < stay.depart;
}

/* ------------------------------------------------------------ stay length */

export const MIN_NIGHTS = 1;
/** 21 D13 — one hotel, short stays. Anything longer is a letting, not a stay. */
export const MAX_NIGHTS = 14;

export type StayProblem = "too-short" | "too-long" | "saturday";

/**
 * Why a search cannot be run, or null when it can.
 *
 * Both length rules and the Saturday rule surface as friendly inline messages
 * rather than a disabled control with no explanation — a guest who cannot book
 * deserves to know which rule they hit.
 */
export function stayProblem(arrive: string, depart: string): StayProblem | null {
  const n = nights(arrive, depart);
  if (n < MIN_NIGHTS) return "too-short";
  if (n > MAX_NIGHTS) return "too-long";
  if (weekday(arrive) === 6 && n < 2) return "saturday";
  return null;
}

/* ------------------------------------------------------------ availability */

/** A stay that still holds a room. Cancelled and departed ones do not. */
export function isLive(stay: Stay): boolean {
  return stay.status === "held" || stay.status === "confirmed" || stay.status === "in_house";
}

/** Rooms of a type that can be sold at all — out of service means not at all. */
export function sellable(rooms: readonly Room[], typeId: string): number {
  return rooms.filter((r) => r.type === typeId && r.status !== "oos").length;
}

/** How many rooms of a type are committed on one night. */
export function soldOn(stays: readonly Stay[], typeId: string, night: string): number {
  return stays.filter((s) => isLive(s) && s.type === typeId && occupiesNight(s, night)).length;
}

/**
 * How many rooms of a type are open across EVERY night of a range.
 *
 * The minimum, not the average: a guest needs the same room type for the whole
 * stay, so one full night in the middle makes the range unbookable however
 * empty the rest of it is.
 */
export function freeAcross(
  rooms: readonly Room[],
  stays: readonly Stay[],
  typeId: string,
  arrive: string,
  depart: string,
): number {
  const list = nightsBetween(arrive, depart);
  if (list.length === 0) return 0;
  const total = sellable(rooms, typeId);
  let free = total;
  for (const night of list) {
    free = Math.min(free, total - soldOn(stays, typeId, night));
  }
  return Math.max(0, free);
}

/**
 * The earliest arrival date on or after `from` where this type is open for the
 * same number of nights — what a sold-out card offers as a button rather than
 * leaving the guest to guess. Saturdays that would break the two-night rule are
 * skipped rather than offered and then refused.
 */
export function earliestFor(
  rooms: readonly Room[],
  stays: readonly Stay[],
  typeId: string,
  nightCount: number,
  from: string,
  horizon = 45,
): string | null {
  for (let i = 1; i <= horizon; i += 1) {
    const arrive = plusDays(from, i);
    if (weekday(arrive) === 6 && nightCount < 2) continue;
    if (freeAcross(rooms, stays, typeId, arrive, plusDays(arrive, nightCount)) > 0) {
      return arrive;
    }
  }
  return null;
}

/* ------------------------------------------------------------------ rates */

/**
 * What one night of one room type costs.
 *
 * Never a flat rate. Friday and Saturday nights carry a weekend delta, August
 * carries a high-season one, and both apply together — which is exactly why the
 * per-night breakdown on the results card is worth expanding, and why it has to
 * be the same arithmetic the total is built from.
 */
export const WEEKEND_DELTA = 25;
export const SEASON_DELTA = 20;

export function isWeekendNight(night: string): boolean {
  const d = weekday(night);
  return d === 5 || d === 6;
}

export function isHighSeason(night: string): boolean {
  return night.slice(5, 7) === "08";
}

export function rateFor(type: RoomType, night: string): number {
  let rate = type.base;
  if (isWeekendNight(night)) rate += WEEKEND_DELTA;
  if (isHighSeason(night)) rate += SEASON_DELTA;
  return rate;
}

export type RateTag = "weekend" | "season";

export function rateTags(night: string): RateTag[] {
  const tags: RateTag[] = [];
  if (isWeekendNight(night)) tags.push("weekend");
  if (isHighSeason(night)) tags.push("season");
  return tags;
}

export interface NightRow {
  /** 1-based night number within the stay. */
  index: number;
  night: string;
  rate: number;
  tags: RateTag[];
}

export function nightRows(type: RoomType, arrive: string, depart: string): NightRow[] {
  return nightsBetween(arrive, depart).map((night, i) => ({
    index: i + 1,
    night,
    rate: rateFor(type, night),
    tags: rateTags(night),
  }));
}

/** The room half of a stay: the nightly rates, added up. */
export function roomTotal(type: RoomType, arrive: string, depart: string): number {
  return round2(nightRows(type, arrive, depart).reduce((sum, r) => sum + r.rate, 0));
}

/* ----------------------------------------------------------------- extras */

export interface ExtraRow {
  id: string;
  labelKey: string;
  label: string;
  icon: string;
  per: Extra["per"];
  amount: number;
  /** Numbers the detail line needs — guests, nights, dates. */
  guests: number;
  nights: number;
}

/**
 * What the chosen extras come to, each priced the way it is actually charged:
 * breakfast per person per night, parking per night, a late leaving once.
 * Showing "how it is charged" beside the amount is the difference between a
 * guest trusting the total and a guest querying it at the desk.
 */
export function extraRows(
  catalogue: readonly Extra[],
  ids: readonly string[],
  guests: number,
  nightCount: number,
): ExtraRow[] {
  return ids
    .map((id) => catalogue.find((e) => e.id === id))
    .filter((e): e is Extra => e !== undefined)
    .map((e) => ({
      id: e.id,
      labelKey: e.labelKey,
      label: e.label,
      icon: e.icon,
      per: e.per,
      guests,
      nights: nightCount,
      amount:
        e.per === "person-night"
          ? round2(e.amount * guests * nightCount)
          : e.per === "night"
            ? round2(e.amount * nightCount)
            : e.amount,
    }));
}

/* ------------------------------------------------------------------ money */

export interface Folio {
  nights: NightRow[];
  roomTotal: number;
  extras: ExtraRow[];
  extrasTotal: number;
  charges: Charge[];
  chargesTotal: number;
  subtotal: number;
  tax: number;
  total: number;
  /** One night, taken when the room was held. */
  deposit: number;
  payments: Payment[];
  paid: number;
  /** What is still to settle. Never negative in practice — see `checkPayment`. */
  balance: number;
}

/**
 * A stay account, read top to bottom: a line per night, then extras with their
 * dates, then payments starting with the deposit. Every figure here is derived;
 * none of it is stored on the stay.
 */
export function folioFor(
  stay: Stay,
  type: RoomType,
  catalogue: readonly Extra[],
  taxRate: number,
): Folio {
  const rows = nightRows(type, stay.arrive, stay.depart);
  const room = round2(rows.reduce((sum, r) => sum + r.rate, 0));
  const extras = extraRows(catalogue, stay.extras, stay.guests, rows.length);
  const extrasTotal = round2(extras.reduce((sum, e) => sum + e.amount, 0));
  const chargesTotal = round2(stay.charges.reduce((sum, c) => sum + c.amount, 0));

  const subtotal = round2(room + extrasTotal + chargesTotal);
  const tax = round2(subtotal * taxRate);
  const total = round2(subtotal + tax);

  const deposit = rows.length > 0 ? rows[0].rate : 0;
  const payments: Payment[] =
    stay.noDeposit === true
      ? [...stay.payments]
      : [
          {
            date: stay.arrive,
            method: "card",
            labelKey: "data.pay.deposit",
            label: "Deposit taken when the room was held",
            amount: deposit,
            deposit: true,
          },
          ...stay.payments,
        ];
  const paid = round2(payments.reduce((sum, p) => sum + p.amount, 0));

  return {
    nights: rows,
    roomTotal: room,
    extras,
    extrasTotal,
    charges: stay.charges,
    chargesTotal,
    subtotal,
    tax,
    total,
    deposit,
    payments,
    paid,
    balance: round2(total - paid),
  };
}

export interface PaymentCheck {
  ok: boolean;
  /** How far over the balance the entry is. Zero when it fits. */
  over: number;
}

/** Partials are welcome; overpayment is refused with the size of the excess. */
export function checkPayment(amount: number, balance: number): PaymentCheck {
  if (amount <= 0) return { ok: false, over: 0 };
  const over = round2(amount - balance);
  return over > 0.005 ? { ok: false, over } : { ok: true, over: 0 };
}

/* ------------------------------------------------------------ the machine */

const FLOW: Record<StayStatus, StayStatus[]> = {
  held: ["confirmed", "cancelled"],
  confirmed: ["in_house", "cancelled"],
  in_house: ["departed"],
  departed: [],
  cancelled: [],
};

export function canMoveTo(from: StayStatus, to: StayStatus): boolean {
  return FLOW[from].includes(to);
}

/* ------------------------------------------------------- room assignment */

/**
 * The rooms a guest may actually be given: READY, and of the type they booked.
 * Not "any free room" — a Harbour double is what they paid for, and handing
 * them a Snug single because it is clean is how a desk starts its day badly.
 */
export function assignableRooms(rooms: readonly Room[], typeId: string): Room[] {
  return rooms.filter((r) => r.type === typeId && r.status === "ready");
}

/** For the honest state when nothing of the type is ready yet. */
export function cleaningCount(rooms: readonly Room[], typeId: string): number {
  return rooms.filter((r) => r.type === typeId && r.status === "cleaning").length;
}

export interface CheckoutBlock {
  blocked: boolean;
  /** The amount still owed, named in the refusal. */
  outstanding: number;
}

/**
 * Rule 5. Checking out with a balance still outstanding is refused, with the
 * amount named — not a silently disabled button, because the guest is standing
 * there and somebody has to be able to say why.
 */
export function checkoutBlock(balance: number): CheckoutBlock {
  return { blocked: balance > 0.005, outstanding: round2(Math.max(0, balance)) };
}

/* -------------------------------------------------------- the cancellation */

export const CANCEL_WINDOW_HOURS = 48;

/**
 * Whether cancelling is clean or costs the deposit.
 *
 * Outside 48 hours before arrival it is clean. Inside, the one-night deposit is
 * kept — and the product says so BEFORE the button, not after, because a guest
 * who finds out afterwards is a guest who telephones.
 */
export function cancellationIsFree(today: string, arrive: string): boolean {
  return dayDiff(today, arrive) * 24 >= CANCEL_WINDOW_HOURS;
}

/* ------------------------------------------------------- the desk's day */

export interface DayBoard {
  arriving: Stay[];
  inHouse: Stay[];
  leaving: Stay[];
}

/**
 * The three columns of the Today board.
 *
 * Somebody already checked in this morning belongs in In house, not in
 * Arriving — the column is what is left to do, not what was booked.
 */
export function dayBoard(stays: readonly Stay[], today: string): DayBoard {
  const live = stays.filter(isLive);
  return {
    arriving: live.filter((s) => s.arrive === today && s.status !== "in_house"),
    inHouse: live.filter((s) => s.status === "in_house" && s.depart !== today),
    leaving: live.filter((s) => s.depart === today && s.status === "in_house"),
  };
}

/** "night 2 of 4" — which night of their stay a guest is on tonight. */
export function nightOfStay(stay: Stay, today: string): { current: number; total: number } {
  const total = nights(stay.arrive, stay.depart);
  return { current: Math.min(total, Math.max(1, dayDiff(stay.arrive, today) + 1)), total };
}

export interface Occupancy {
  /** Rooms committed tonight. */
  sold: number;
  /** Rooms that could be sold at all — out of service does not count. */
  sellable: number;
  pct: number;
  /** Mean rate across the rooms sold tonight, or null when nothing is sold. */
  averageRate: number | null;
}

/**
 * Occupancy tonight, and the average nightly rate across what is sold.
 *
 * `sellable` excludes out-of-service rooms on purpose: a hotel with two rooms
 * being repaired is not 94% full, it is full, and reporting 94% is how a desk
 * stops believing the number.
 */
export function occupancyOn(
  rooms: readonly Room[],
  stays: readonly Stay[],
  types: readonly RoomType[],
  night: string,
): Occupancy {
  const total = rooms.filter((r) => r.status !== "oos").length;
  const committed = stays.filter((s) => isLive(s) && occupiesNight(s, night));

  const rates = committed
    .map((s) => types.find((t) => t.id === s.type))
    .filter((t): t is RoomType => t !== undefined)
    .map((t) => rateFor(t, night));

  return {
    sold: committed.length,
    sellable: total,
    pct: total > 0 ? Math.round((committed.length / total) * 100) : 0,
    averageRate:
      rates.length > 0
        ? round2(rates.reduce((sum, r) => sum + r, 0) / rates.length)
        : null,
  };
}

export interface CalendarCell {
  night: string;
  sold: number;
  available: number;
  /** 0–100, how full this type is on this night. */
  pct: number;
  full: boolean;
}

/**
 * A row of the two-week grid: one room type, one cell per night.
 *
 * The cell counts rooms committed on THAT night, which is where rule 1 shows
 * up in the interface: a stay ending on the 26th does not fill the 26th, so the
 * grid offers it.
 */
export function calendarRow(
  rooms: readonly Room[],
  stays: readonly Stay[],
  typeId: string,
  from: string,
  days: number,
): CalendarCell[] {
  const available = sellable(rooms, typeId);
  const out: CalendarCell[] = [];
  for (let i = 0; i < days; i += 1) {
    const night = plusDays(from, i);
    const sold = soldOn(stays, typeId, night);
    out.push({
      night,
      sold,
      available,
      pct: available > 0 ? Math.round((sold / available) * 100) : 0,
      full: available > 0 && sold >= available,
    });
  }
  return out;
}

/** Everyone arriving and everyone leaving on one night — the calendar's drill-in. */
export function movementsOn(
  stays: readonly Stay[],
  night: string,
): { arriving: Stay[]; leaving: Stay[] } {
  const live = stays.filter(isLive);
  return {
    arriving: live.filter((s) => s.arrive === night),
    leaving: live.filter((s) => s.depart === night),
  };
}

/* ------------------------------------------------------------------ lookup */

/**
 * The guest's own lookup: a reference and a surname, both of which they have on
 * the confirmation. Deliberately case- and space-insensitive, because a person
 * reading a number off a phone screen should not be told they got it wrong.
 */
export function findByRef(
  stays: readonly Stay[],
  ref: string,
  surname: string,
): Stay | null {
  const r = ref.trim().toUpperCase().replace(/\s+/g, "");
  const s = surname.trim().toLowerCase();
  return (
    stays.find(
      (stay) => stay.ref.toUpperCase().replace(/\s+/g, "") === r && stay.last.toLowerCase() === s,
    ) ?? null
  );
}
