// SPDX-License-Identifier: AGPL-3.0-only
/**
 * A `DataSource` backed by a real Adminium instance (28-public-surface.md §5.2,
 * 28-T28 wave 2).
 *
 * ── READS DO NOT BECOME ASYNC ──────────────────────────────────────────────
 * `loadSnapshot` fetches the whole read-set once, before React mounts, and
 * hands back the same SYNCHRONOUS shapes `demoSource` returns — so the store,
 * every selector and every screen are untouched. Making `DataSource` return
 * promises would touch all of them, and that is the cost the seam's own header
 * hides.
 *
 * ── WHY THIS APP NEEDED NO SCHEMA CHANGE, AND WHAT THAT TEACHES ────────────
 * clinic-desk's equivalent carries three WS-I gap markers: it addresses visit
 * types by slug while the database keys them by `serial`, so it maps rows off
 * operator-editable display text and drops any row it cannot recognise. None of
 * that appears below, because `room_types.id`, `extras.id` and `stays.ref` are
 * TEXT primary keys holding the app's own identifiers. Every i18n key this file
 * produces is DERIVED from one of them — `data.type.<id>`, `data.extra.<id>`,
 * `data.feature.<slug>` — which is the convention the other twelve repos should
 * copy: put the app's identifier in the database and the key falls out of it,
 * rather than reconstructing identity from a column an operator can rename.
 *
 * ── OPERATOR TEXT AND TRANSLATION BOTH SURVIVE ─────────────────────────────
 * Every screen renders `tLabel(key, text)`: the catalogue key first, the row's
 * own text as the fallback. So each mapping below supplies BOTH — the key from
 * the id, the text from the column. A tenant who renames a room type sees their
 * words; a locale that has translated it sees the translation. That is §5.5's
 * operator/catalogue split applied per column instead of per table.
 *
 * ── TIME COMES FROM THE SCOPE, NOT FROM THE BROWSER ────────────────────────
 * "Today" is computed with `toTenantDay` against the timezone the scope
 * publishes. `new Date().getDate()` would read the VISITOR's clock: a guest
 * browsing from Sydney would see tomorrow's arrivals board.
 *
 * ── WHAT IS STILL A GAP, AND IS NOT THIS FILE'S TO FIX ─────────────────────
 * The hotel's own policy — check-in from 15:00, out by 11:00, the housekeeping
 * flip at 11:20, and the tax rate — has no home in `db/schema.sql`. They are
 * carried below as the constants they already were. That is WS-I's G4 (28-T33:
 * 21 constants for this repo), and it wants a settings table, not a client-side
 * default. Marked rather than hidden.
 */

import {
  createPublicClient,
  toTenantDay,
  toTenantMinutes,
  type PublicClient,
} from "@adminiumjs/public-client";

import type {
  Charge,
  Extra,
  ExtraPer,
  Now,
  PayMethod,
  Payment,
  Room,
  RoomStatus,
  RoomType,
  Stay,
  StayStatus,
} from "./types.ts";
import { resolveSurfaceConfig } from "../publicConfig.ts";
import type { SnapshotPort } from "./snapshotPort.ts";
import type { DataSource } from "./source.ts";

/* --------------------------------------------------------------- the wire */

interface WireRoomType {
  id: string;
  name: string;
  blurb: string;
  description: string;
  sleeps: number;
  tint_from: string;
  tint_to: string;
  icon: string;
  code: string;
  /** `numeric` serializes as a STRING, not a number. */
  base_rate: string;
}

interface WireFeature {
  type_id: string;
  feature: string;
}

interface WireRoom {
  number: number;
  floor: number;
  type_id: string;
  status: RoomStatus;
  note: string | null;
}

interface WireExtra {
  id: string;
  label: string;
  amount: string;
  charged: ExtraPer;
  icon: string;
}

interface WireStay {
  ref: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile: string;
  type_id: string;
  room_number: number | null;
  /** `date`, which serializes as `YYYY-MM-DD` — already the app's shape. */
  arrive: string;
  depart: string;
  guests: number;
  arrival_time: string;
  note: string | null;
  status: StayStatus;
  checked_in_at: string | null;
  no_deposit: boolean;
}

interface WireStayExtra {
  stay_ref: string;
  extra_id: string;
}

interface WireCharge {
  stay_ref: string;
  charged_on: string;
  kind: string;
  label: string;
  amount: string;
}

interface WirePayment {
  stay_ref: string;
  paid_on: string;
  method: PayMethod;
  label: string;
  amount: string;
}

/*
 * WS-I G4 — the house's policy, which `db/schema.sql` has nowhere to put.
 * Identical to `demo.ts`'s pinned clock on purpose: connected mode changes
 * WHEN "today" is, not what the hotel's hours are.
 */
const HOUSE = {
  afterCheckout: "11:20",
  arrivalsFrom: "15:00",
  departBy: "11:00",
} as const;

/**
 * The columns the scope must expose, checked at boot.
 *
 * Fail with a legible message naming the missing column rather than at render
 * with a 403 on a screen nobody was looking at — an operator can narrow a scope
 * at any time, and this turns that into a startup error.
 */
export const REQUIRED = {
  roomTypes: ["id", "name", "blurb", "description", "sleeps", "tint_from", "tint_to", "icon", "code", "base_rate"],
  roomTypeFeatures: ["type_id", "feature"],
  rooms: ["number", "floor", "type_id", "status", "note"],
  extras: ["id", "label", "amount", "charged", "icon"],
  stays: [
    "ref", "first_name", "last_name", "email", "mobile", "type_id", "room_number",
    "arrive", "depart", "guests", "arrival_time", "note", "status", "checked_in_at", "no_deposit",
  ],
  stayExtras: ["stay_ref", "extra_id"],
  charges: ["stay_ref", "charged_on", "kind", "label", "amount"],
  payments: ["stay_ref", "paid_on", "method", "label", "amount"],
};

let lastSnapshotError: Error | null = null;

/** Why the last {@link loadSnapshot} returned null, or null if it did not. */
export function snapshotFailure(): Error | null {
  return lastSnapshotError;
}

export interface Snapshot {
  /** The tenant\'s ISO-4217 code, or null (28-T34). Drives every formatter. */
  currency: string | null;
  /** The zone `now` below was computed in, and every date on screen renders in. */
  timezone: string;
  /**
   * Who chose {@link timezone}. Carried so the UI can SAY which zone these
   * dates are in when nobody confirmed it — the field exists precisely because
   * both an unconfirmed zone and a UTC substitute are silent otherwise (a
   * console line is not an operator surface).
   */
  timezoneSource: 'operator' | 'host' | 'fallback' | null;
  roomTypes: RoomType[];
  rooms: Room[];
  extras: Extra[];
  stays: Stay[];
  now: Now;
}

/**
 * The client, or null when either build-time variable is absent.
 *
 * The emptiness check is `createPublicClient`'s, not repeated here: it already
 * treats a missing or empty value as "this build has no server", and a second
 * copy of that rule is a second place for it to drift.
 */
/**
 * The customer client, from the SERVED config (29 D10).
 *
 * Baked vars still win — see `resolveSurfaceConfig` — so a standalone build
 * pointed at an Adminium elsewhere is untouched. What this adds is the hosted
 * case: a key an operator bound in Studio, fetched at boot, so rotating it is
 * Studio + reload instead of a rebuild. It is also how this surface learns the
 * name the operator gave the app.
 */
export async function clientFromConfig(): Promise<PublicClient | null> {
  const config = await resolveSurfaceConfig();
  if (config === null) return null;
  return createPublicClient({ baseUrl: config.baseUrl, publishableKey: config.publishableKey });
}

export function clientFromEnv(): PublicClient | null {
  return createPublicClient({
    baseUrl: import.meta.env.VITE_ADMINIUM_API_BASE_URL,
    publishableKey: import.meta.env.VITE_ADMINIUM_PUBLISHABLE_KEY,
  });
}

/**
 * Read a whole ref, a page at a time.
 *
 * The page size is the SCOPE's — `refs[ref].limit` is the operator's ceiling
 * and asking for more than it allows is refused. This file used to read each
 * ref in ONE request with a generous `limit`, which works only while the set is
 * small: past the operator's ceiling the server answers page one with a 200 and
 * nothing anywhere says so. `max` is this app's own guard against a runaway
 * read; hitting it is reported rather than silently dropping the tail.
 */
async function listAll<T>(
  client: SnapshotPort,
  ref: string,
  size: number,
  max: number,
): Promise<T[]> {
  const out: T[] = [];
  const page = Math.max(1, Math.min(size, 500));
  for (let offset = 0; offset < max; offset += page) {
    const res = await client.list<T>(ref, { limit: page, offset });
    out.push(...res.data);
    if (res.data.length < page) return out;
  }
  console.warn(`[adminium] ${ref}: stopped at ${String(max)} rows — the rest were not read.`);
  return out;
}

/**
 * Fetch the read-set and map it into the app's shapes.
 *
 * Returns `null` on ANY failure so the caller falls back to demo mode
 * structurally rather than in a catch — the marketplace demos are static clones
 * with no server and must keep working byte-identically.
 */
export async function loadSnapshot(client: SnapshotPort): Promise<Snapshot | null> {
  try {
    await client.assertRefs(REQUIRED);

    const config = await client.config();
    const timezone = config.timezone;
    /* The operator's per-ref page ceiling. `?? 100` is the server's own
     * conservative default for a ref the scope does not size. */
    const cap = (ref: string): number => config.refs[ref]?.limit ?? 100;
    const [types, features, rooms, extras, stays, stayExtras, charges, payments] = await Promise.all([
      listAll<WireRoomType>(client, "roomTypes", cap("roomTypes"), 50_000),
      listAll<WireFeature>(client, "roomTypeFeatures", cap("roomTypeFeatures"), 50_000),
      listAll<WireRoom>(client, "rooms", cap("rooms"), 50_000),
      listAll<WireExtra>(client, "extras", cap("extras"), 50_000),
      listAll<WireStay>(client, "stays", cap("stays"), 50_000),
      listAll<WireStayExtra>(client, "stayExtras", cap("stayExtras"), 50_000),
      listAll<WireCharge>(client, "charges", cap("charges"), 50_000),
      listAll<WirePayment>(client, "payments", cap("payments"), 50_000),
    ]);

    const featuresByType = new Map<string, string[]>();
    for (const row of features) {
      const list = featuresByType.get(row.type_id) ?? [];
      // The bare slug, not a key: `Guest.tsx` expands it as `data.feature.<f>`
      // at render, and doing it here too would produce `data.feature.data...`.
      list.push(row.feature);
      featuresByType.set(row.type_id, list);
    }

    const roomTypes: RoomType[] = types.map((row) => ({
      id: row.id,
      nameKey: `data.type.${row.id}`,
      name: row.name,
      blurbKey: `data.type.${row.id}.blurb`,
      blurb: row.blurb,
      longKey: `data.type.${row.id}.long`,
      long: row.description,
      sleeps: row.sleeps,
      from: row.tint_from,
      to: row.tint_to,
      icon: row.icon,
      code: row.code,
      base: Number(row.base_rate),
      features: featuresByType.get(row.id) ?? [],
    }));

    const extrasByStay = new Map<string, string[]>();
    for (const row of stayExtras) {
      const list = extrasByStay.get(row.stay_ref) ?? [];
      list.push(row.extra_id);
      extrasByStay.set(row.stay_ref, list);
    }

    const chargesByStay = new Map<string, Charge[]>();
    for (const row of charges) {
      const list = chargesByStay.get(row.stay_ref) ?? [];
      list.push({
        date: row.charged_on,
        kind: row.kind,
        labelKey: `data.charge.${row.kind}`,
        label: row.label,
        amount: Number(row.amount),
      });
      chargesByStay.set(row.stay_ref, list);
    }

    const paymentsByStay = new Map<string, Payment[]>();
    for (const row of payments) {
      const list = paymentsByStay.get(row.stay_ref) ?? [];
      list.push({
        date: row.paid_on,
        method: row.method,
        labelKey: `data.pay.${row.method}`,
        label: row.label,
        amount: Number(row.amount),
      });
      paymentsByStay.set(row.stay_ref, list);
    }

    const mapped: Stay[] = stays.map((row) => ({
      ref: row.ref,
      first: row.first_name,
      last: row.last_name,
      email: row.email,
      mobile: row.mobile,
      type: row.type_id,
      room: row.room_number,
      arrive: row.arrive,
      depart: row.depart,
      guests: row.guests,
      arrivalTime: row.arrival_time,
      // A guest's own words, typed at the desk. There is no catalogue key for
      // free text, and inventing one would render an empty string.
      noteKey: null,
      note: row.note ?? "",
      extras: extrasByStay.get(row.ref) ?? [],
      status: row.status,
      checkedInAt: row.checked_in_at,
      charges: chargesByStay.get(row.ref) ?? [],
      payments: paymentsByStay.get(row.ref) ?? [],
      noDeposit: row.no_deposit,
    }));

    const nowIso = new Date().toISOString();
    return {
      currency: config.currency,
      timezone: timezone,
      // Absent on the public path (the API always carries a real zone on its
      // scope), and absent means no claim — never a guess.
      timezoneSource: config.timezoneSource ?? null,
      roomTypes,
      rooms: rooms.map((row) => ({
        number: row.number,
        floor: row.floor,
        type: row.type_id,
        status: row.status,
        // Out-of-service reasons ARE a small closed catalogue in the seed, so
        // the row's text doubles as its own fallback.
        noteKey: row.note === null || row.note.length === 0 ? null : `data.note.${row.note}`,
      })),
      extras: extras.map((row) => ({
        id: row.id,
        labelKey: `data.extra.${row.id}`,
        label: row.label,
        amount: Number(row.amount),
        per: row.charged,
        icon: row.icon,
      })),
      stays: mapped,
      now: {
        date: toTenantDay(nowIso, timezone),
        morning: minutesToClock(toTenantMinutes(nowIso, timezone)),
        ...HOUSE,
      },
    };
  } catch (error) {
    /* The reason is REPORTED, not swallowed — a non-demo build hard-stops now,
       so "using demo data" stopped being true and the caller was left showing a
       generic failure while the real cause sat in the console. */
    lastSnapshotError = error instanceof Error ? error : new Error(String(error));
    console.warn("[adminium] could not load a snapshot:", error);
    return null;
  }
}

/** `540` → `"09:00"`. The app's clock fields are `HH:MM`, not minutes. */
function minutesToClock(minutes: number): string {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** A synchronous `DataSource` over an already-fetched snapshot. */
export function snapshotSource(snap: Snapshot): DataSource {
  return {
    now: () => ({ ...snap.now }),
    roomTypes: () => snap.roomTypes.map((t) => ({ ...t, features: [...t.features] })),
    rooms: () => snap.rooms.map((r) => ({ ...r })),
    extras: () => snap.extras.map((e) => ({ ...e })),
    stays: () =>
      snap.stays.map((s) => ({
        ...s,
        extras: [...s.extras],
        charges: s.charges.map((c) => ({ ...c })),
        payments: s.payments.map((p) => ({ ...p })),
      })),
  };
}
