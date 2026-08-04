/**
 * Presentation helpers.
 *
 * Everything here reads the ambient locale (`i18n/ambient.ts`) rather than a
 * hook, so the store and the pure engine can format without being inside the
 * React tree. Callers that ARE in the tree get the same output, because the
 * provider pushes its own `t` / `money` / `number` into the ambient module on
 * every render.
 *
 * Nothing in this file reads the real clock — the pinned `now` is always passed
 * in by the caller.
 */

import type { RateTag } from "./stay.ts";
import type {
  ClockPhase,
  PayMethod,
  RoomStatus,
  StayStatus,
} from "../data/types.ts";
import {
  locale,
  money as ambientMoney,
  number as ambientNumber,
  t,
  tOr,
} from "../i18n/ambient.ts";
import type { MessageKey } from "../i18n/messages/index.ts";

/* ------------------------------------------------------------------ labels */

/**
 * Status → message key, written out rather than assembled from a template so
 * the compiler still checks every key. A status missing from one of these
 * tables is a build error; a template literal would have been a runtime shrug.
 */
export const ROOM_STATUS_KEY = {
  ready: "chrome.room.ready",
  occupied: "chrome.room.occupied",
  cleaning: "chrome.room.cleaning",
  oos: "chrome.room.oos",
} as const satisfies Record<RoomStatus, MessageKey>;

export const STAY_STATUS_KEY = {
  held: "chrome.stay.held",
  confirmed: "chrome.stay.confirmed",
  in_house: "chrome.stay.in_house",
  departed: "chrome.stay.departed",
  cancelled: "chrome.stay.cancelled",
} as const satisfies Record<StayStatus, MessageKey>;

export const METHOD_KEY = {
  card: "chrome.method.card",
  cash: "chrome.method.cash",
  transfer: "chrome.method.transfer",
} as const satisfies Record<PayMethod, MessageKey>;

export const TAG_KEY = {
  weekend: "chrome.tag.weekend",
  season: "chrome.tag.season",
} as const satisfies Record<RateTag, MessageKey>;

export function roomStatusLabel(status: RoomStatus): string {
  return t(ROOM_STATUS_KEY[status]);
}

export function stayStatusLabel(status: StayStatus): string {
  return t(STAY_STATUS_KEY[status]);
}

export function methodLabel(method: PayMethod): string {
  return t(METHOD_KEY[method]);
}

export function tagLabel(tag: RateTag): string {
  return t(TAG_KEY[tag]);
}

/** Resolve a seed field that stores an i18n key, falling back to its English. */
export function label(key: string | null, fallback: string): string {
  return key === null ? fallback : tOr(key, fallback);
}

/** A room type's name in the reader's language. */
export function typeName(type: { nameKey: string; name: string } | null): string {
  return type === null ? "" : tOr(type.nameKey, type.name);
}

/* ------------------------------------------------------------------- money */

/**
 * The house prices in dollars and quotes to the cent: a folio that rounds is a
 * folio somebody queries at the desk. The currency is a property of the money
 * and not of the reader's language, so it is fixed here rather than following
 * the locale.
 */
export function money(value: number): string {
  return ambientMoney(value, "USD");
}

/** A rate on a card, where the cents are always .00 and only add noise. */
export function money0(value: number): string {
  return ambientMoney(value, "USD").replace(/[.,]00\b/, "");
}

export function number(value: number, opts?: Intl.NumberFormatOptions): string {
  return ambientNumber(value, opts);
}

export function pctWhole(value: number): string {
  return `${ambientNumber(Math.round(value))}%`;
}

/** A signed amount, for the payment rows in a folio. A true minus, not a hyphen. */
export function signedMoney(value: number): string {
  return value < 0 ? `−${money(Math.abs(value))}` : money(value);
}

/* ------------------------------------------------------------------- times */

/**
 * A clock reading, passed straight through. Every time in this app is already
 * an `HH:MM` string on a 24-hour grid, and rendering 15:00 as "3:00 PM" in one
 * locale would break the arrival-time list the desk reads down.
 */
export function clock(hhmm: string): string {
  return hhmm;
}

/** Which half of the day the pinned clock is in. */
export function phaseLabel(phase: ClockPhase): string {
  return t(phase === "morning" ? "chrome.clock.morning" : "chrome.clock.after");
}

/* ------------------------------------------------------------------- dates */

function fmt(iso: string, opts: Intl.DateTimeFormatOptions): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(locale(), opts).format(new Date(y, m - 1, d));
}

/** "24 Jul" — chips, table cells, folio rows. */
export function dateShort(iso: string): string {
  return fmt(iso, { day: "numeric", month: "short" });
}

/** "Fri 24 Jul" — the per-night breakdown, where the weekday is the point. */
export function dateWeekday(iso: string): string {
  return fmt(iso, { weekday: "short", day: "numeric", month: "short" });
}

/** "24 July 2026" — headers and confirmations. */
export function dateLong(iso: string): string {
  return fmt(iso, { day: "numeric", month: "long", year: "numeric" });
}

/** "Tuesday, 28 July 2026" — the Today board's own heading. */
export function dateFull(iso: string): string {
  return fmt(iso, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/** "Sat" — the calendar's column head. */
export function weekdayShort(iso: string): string {
  return fmt(iso, { weekday: "short" });
}

/** "1" — the calendar's day number. */
export function dayNumber(iso: string): string {
  return fmt(iso, { day: "numeric" });
}

/* ----------------------------------------------------------------- counts */

/** "3 nights" — the count a guest checks before anything else. */
export function nightsLabel(count: number): string {
  return t("chrome.nights", { count }, count);
}

/** "2 guests". */
export function guestsLabel(count: number): string {
  return t("chrome.guests", { count }, count);
}

/** "2 left for these dates" — the remaining chip on a results card. */
export function leftLabel(count: number): string {
  return t("chrome.left", { count }, count);
}

/** "night 2 of 4". */
export function nightOfLabel(current: number, total: number): string {
  return t("chrome.nightOf", { current: String(current), total: String(total) });
}

/* --------------------------------------------------------------------- art */

function toRgb(hex: string): [number, number, number] {
  let h = (hex || "#1e3a8a").replace("#", "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const n = Number.parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = toRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * The gradient a room type is drawn as. There is no photography anywhere in
 * this app: a Harbour double is two stops and an oversized icon, and the same
 * two stops follow it onto the results card, the room-type page, the rack tile
 * and the calendar row, so a reader learns the tint once.
 */
export function typeTile(from: string, to: string): string {
  return `linear-gradient(140deg, ${from}, ${to})`;
}

/** Re-export so screens can pull one translation helper from one place. */
export { t };
export type { MessageKey };
