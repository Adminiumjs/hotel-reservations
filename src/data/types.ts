/**
 * The shapes the reservations desk runs on.
 *
 * THE SCOPE BOUNDARY IS IN THIS FILE FIRST (21 D13). Wren House is ONE hotel in
 * ONE building, and this app covers the guest's stay and the desk that runs it:
 * search, rates, availability, reserve, arrive, assign a room, the folio, depart.
 *
 * There is deliberately NO type below for an owner, an owner statement, a unit
 * share, a lease, a tenancy, a long stay, a maintenance work order, a job
 * dispatch, a syndicated listing, or a second property. Two rules make the line
 * visible in the product rather than only in this comment:
 *
 *   • a stay is capped at 14 nights, enforced in `lib/stay.ts` with a plain
 *     message a guest actually reads;
 *   • housekeeping exists ONLY as `RoomStatus` — Ready, Being cleaned, Out of
 *     service — and never as a work queue, a job list or an assignment screen.
 *
 * Beyond that, the usual two rules. Nothing here is a formatted string: dates
 * are ISO `YYYY-MM-DD`, times of day are `HH:MM`, money is a number of pounds,
 * and everything a reader sees is produced at render time by `lib/format.ts`.
 * And nothing derived is stored — a stay's nights, its room total, its tax, its
 * balance, tonight's occupancy and the average nightly rate are all computed in
 * `lib/stay.ts` from what is here.
 */

/* -------------------------------------------------------------- navigation */

export type Persona = "guest" | "desk";

export type View =
  /* Guest */
  | "home"
  | "results"
  | "roomtype"
  | "reserve"
  | "confirm"
  | "myreservation"
  | "rooms"
  | "findus"
  /* Front desk */
  | "today"
  | "rack"
  | "calendar"
  | "reservations"
  | "folio"
  | "notfound";

export const HOME_VIEW: Record<Persona, View> = {
  guest: "home",
  desk: "today",
};

/* ------------------------------------------------------------- the clock */

/**
 * The pinned clock, and the one thing in the app that moves it.
 *
 * "Morning" is 09:05 — mid-departure, arrivals not yet due. The dock's
 * "Advance to check-out time" chip flips this to `after`, which is 11:20:
 * departures become due, any room checked out flips to being cleaned, and the
 * Today board re-sorts. Nothing else reads a clock, real or otherwise.
 */
export type ClockPhase = "morning" | "after";

export interface Now {
  /** ISO `YYYY-MM-DD` — Tuesday 28 July 2026. */
  date: string;
  /** Before the check-out hour. */
  morning: string;
  /** After it. */
  afterCheckout: string;
  /** Arrivals are from here. */
  arrivalsFrom: string;
  /** Departures are by here. */
  departBy: string;
}

/* ------------------------------------------------------------------ rooms */

/**
 * Housekeeping, in its entirety (21 D13). A room is ready, somebody is in it,
 * it is being cleaned, or it is out of service with a reason. There is no work
 * order, no assignment and no queue, because a work queue is the field-service
 * product this app is deliberately not.
 */
export type RoomStatus = "ready" | "occupied" | "cleaning" | "oos";

export interface RoomType {
  id: string;
  /** i18n key — `data.type.<id>`. */
  nameKey: string;
  name: string;
  /** Short line under the name. */
  blurbKey: string;
  blurb: string;
  /** The longer paragraph on the room-type page. */
  longKey: string;
  long: string;
  sleeps: number;
  /** Gradient stops — one tint per type, reused everywhere that type appears. */
  from: string;
  to: string;
  /** Lucide icon name. */
  icon: string;
  /** Mono chip on the tile. */
  code: string;
  /** Base nightly rate before the weekend and high-season deltas. */
  base: number;
  /** i18n keys for what is in the room, drawn as icon chips. */
  features: string[];
}

export interface Room {
  number: number;
  floor: number;
  type: string;
  status: RoomStatus;
  /** Out-of-service reason key, or a note worth carrying. */
  noteKey: string | null;
}

/* ------------------------------------------------------------------ stays */

/**
 * The reservation machine. A held room is not yet a stay; a confirmed one is;
 * `in_house` means somebody is in the building; `departed` means the folio is
 * closed. `cancelled` is reachable from held or confirmed only.
 */
export type StayStatus = "held" | "confirmed" | "in_house" | "departed" | "cancelled";

export type ExtraPer = "person-night" | "night" | "stay";

export interface Extra {
  id: string;
  labelKey: string;
  label: string;
  amount: number;
  per: ExtraPer;
  icon: string;
}

export type PayMethod = "card" | "cash" | "transfer";

export interface Payment {
  date: string;
  method: PayMethod;
  /** i18n key for what the payment was. */
  labelKey: string;
  label: string;
  amount: number;
  /** True for the one-night deposit taken when the room was held. */
  deposit?: boolean;
}

/** Something added to the folio at the desk during the stay. */
export interface Charge {
  date: string;
  /** Catalogue id, or `other` for a free-text line. */
  kind: string;
  labelKey: string;
  label: string;
  amount: number;
}

export interface Stay {
  ref: string;
  first: string;
  last: string;
  email: string;
  mobile: string;
  type: string;
  /** Assigned at arrival, never before — the confirmation says so. */
  room: number | null;
  arrive: string;
  depart: string;
  guests: number;
  /** `HH:MM` the guest said they would arrive. */
  arrivalTime: string;
  /** What the guest told the desk. One short line; may be empty. */
  noteKey: string | null;
  note: string;
  extras: string[];
  status: StayStatus;
  /** `HH:MM` they were checked in, or null. */
  checkedInAt: string | null;
  charges: Charge[];
  payments: Payment[];
  /**
   * A booking taken at the desk with nothing held, so the whole stay settles on
   * departure. The deposit row is absent rather than zero.
   */
  noDeposit?: boolean;
}

/* ---------------------------------------------------------------- overlays */

export interface Toast {
  id: string;
  text: string;
}
