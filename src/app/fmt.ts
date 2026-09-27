/**
 * Dates, times and money as the reader's language writes them (`Intl`), on
 * the house's calendar — never the reader's device's zone. A date is a
 * `YYYY-MM-DD` of the house; a time an `HH:MM` of the house; money in the
 * connection's currency.
 *
 * A figure or a date is one left-to-right run wherever it sits (`iso`): in
 * Arabic, the currency mark and the number are never reordered. Arabic keeps
 * the Latin digits the design draws.
 */
import { locale } from "../i18n/tr.ts";
import { tr } from "../i18n/tr.ts";

let currency = "USD";
export function setCurrency(code: string | null | undefined): void {
  if (typeof code === "string" && /^[A-Z]{3}$/.test(code)) currency = code;
}

const tagOf = () => (locale() === "ar-EG" ? "ar-EG-u-nu-latn" : locale());
const cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>();
function nf(key: string, make: () => Intl.NumberFormat): Intl.NumberFormat {
  const k = `${tagOf()}|${currency}|${key}`;
  let f = cache.get(k) as Intl.NumberFormat | undefined;
  if (f === undefined) {
    f = make();
    cache.set(k, f);
  }
  return f;
}
function df(key: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const k = `${tagOf()}|d|${key}`;
  let f = cache.get(k) as Intl.DateTimeFormat | undefined;
  if (f === undefined) {
    f = new Intl.DateTimeFormat(tagOf(), { timeZone: "UTC", ...opts });
    cache.set(k, f);
  }
  return f;
}

/** One left-to-right run. */
export const iso = (s: string): string => `⁦${s}⁩`;
export const strip = (s: unknown): string => String(s).replace(/[⁦⁩]/g, "");

export function money(v: unknown): string {
  const n = Number(v ?? 0);
  return iso(nf("money", () => new Intl.NumberFormat(tagOf(), { style: "currency", currency })).format(Math.abs(n) < 0.005 ? 0 : n));
}
/** A running balance: money taken off shows as "− $x". */
export function runMoney(v: unknown): string {
  const n = Number(v ?? 0);
  return n < -0.004 ? iso(`− ${strip(money(-n))}`) : money(n);
}
export function money0(v: unknown): string {
  return iso(nf("money0", () => new Intl.NumberFormat(tagOf(), { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 0 })).format(Number(v ?? 0)));
}
export function num(v: number): string {
  return nf("num", () => new Intl.NumberFormat(tagOf())).format(v);
}
export function pct(v: number): string {
  return iso(nf("pct", () => new Intl.NumberFormat(tagOf(), { style: "percent", maximumFractionDigits: 0 })).format(v));
}

const at = (day: string) => new Date(`${day}T12:00:00Z`);
/** "Jul 28" */
export const fD = (day: string): string => iso(df("dm", { day: "numeric", month: "short" }).format(at(day)));
/** "Tue, Jul 28" */
export const fDW = (day: string): string => iso(df("wdm", { weekday: "short", day: "numeric", month: "short" }).format(at(day)));
/** "Tuesday, July 28, 2026" */
export const fLong = (day: string): string => df("long", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(at(day));
/** "Tue" */
export const fWd = (day: string): string => df("wd", { weekday: "short" }).format(at(day));
/** An `HH:MM` of the house, as the reader writes a time ("3:00 PM"). */
export function fT(hhmm: string | null | undefined): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm ?? ""));
  if (m === null) return String(hhmm ?? "");
  return iso(df("t", { hour: "numeric", minute: "2-digit" }).format(new Date(Date.UTC(2026, 0, 1, Number(m[1]), Number(m[2])))));
}

/** The tax line's words, with its rate: "Taxes and city levy (9%)". */
export const taxWords = (label: string, rate: number): string => `${label} (${strip(pct(rate / 100))})`;

// ── the house's calendar ──────────────────────────────────────────────────

export function plus(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const dow = (day: string): number => new Date(`${day}T00:00:00Z`).getUTCDay();
export const nightsOf = (a: string, b: string): number => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
export const r2 = (v: number): number => Math.round(v * 100) / 100;

// ── counted words ─────────────────────────────────────────────────────────

export const nights = (n: number): string => iso(tr("{n} night|{n} nights", { n }));
export const guestsW = (n: number): string => iso(tr("{n} guest|{n} guests", { n }));
export const people = (n: number): string => iso(tr("{n} person|{n} people", { n }));
export const days = (n: number): string => iso(tr("{n} day|{n} days", { n }));
