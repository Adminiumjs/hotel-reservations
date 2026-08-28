/**
 * The DataSource seam.
 *
 * This app ships in demo mode: every read below returns the seeded fiction in
 * `demo.ts`, synchronously, with no network involved. The seam exists so that
 * pointing the app at a real Adminium deployment is a change to ONE file rather
 * than a rewrite — the screens and the store already talk to this interface and
 * never import `demo.ts` for data they render.
 *
 * That second implementation now exists: `adminiumSource.ts` reads a real
 * Adminium instance through `@adminiumjs/public-client` and is swapped in by
 * `main.tsx` before React mounts. `demoSource` remains the fallback whenever
 * either build-time env var is absent — which is the case for every
 * marketplace demo, and is why that fallback is structural rather than a catch.
 */

import { EXTRAS, NOW, ROOMS, ROOM_TYPES, STAYS } from "./demo.ts";
import type { Extra, Now, Room, RoomType, Stay } from "./types.ts";

export interface DataSource {
  /** The pinned clock. A live deployment would return the real one here. */
  now(): Now;
  roomTypes(): RoomType[];
  rooms(): Room[];
  extras(): Extra[];
  stays(): Stay[];
}

/**
 * Records are copied on the way out, nested arrays and all. A caller that
 * mutates what it is given cannot reach back into the seed, which is what lets
 * the demo reset cleanly without a page reload.
 */
export const demoSource: DataSource = {
  now: () => ({ ...NOW }),
  roomTypes: () => ROOM_TYPES.map((t) => ({ ...t, features: [...t.features] })),
  rooms: () => ROOMS.map((r) => ({ ...r })),
  extras: () => EXTRAS.map((e) => ({ ...e })),
  stays: () =>
    STAYS.map((s) => ({
      ...s,
      extras: [...s.extras],
      charges: s.charges.map((c) => ({ ...c })),
      payments: s.payments.map((p) => ({ ...p })),
    })),
};

let current: DataSource = demoSource;
let read = false;

/**
 * The source the app is currently wired to.
 *
 * An indirection rather than a `let`, because `state/store.ts` reads it at
 * MODULE SCOPE (`PINNED`, `ROOM_TYPES`, `EXTRAS`) — a re-exported binding would
 * be captured at import time and a later swap would change nothing.
 */
export const source: DataSource = {
  now: () => ((read = true), current.now()),
  roomTypes: () => ((read = true), current.roomTypes()),
  rooms: () => ((read = true), current.rooms()),
  extras: () => ((read = true), current.extras()),
  stays: () => ((read = true), current.stays()),
};

/**
 * Swap the backing source. Must happen before any module-scope read.
 *
 * The tripwire is the whole reason this is a function and not an assignment:
 * the ordering it depends on is invisible, and getting it wrong fails SILENTLY
 * — the app renders demo data against a configured backend and looks fine. A
 * thrown error at boot is the only way that mistake announces itself.
 */
export function setDataSource(next: DataSource): void {
  if (read) {
    throw new Error(
      "setDataSource() called after the store already read — import App dynamically, after the snapshot resolves.",
    );
  }
  current = next;
}

/**
 * True once a real backend is behind the seam.
 *
 * Read by the demo dock, which resets and mutates seeded fiction: against real
 * rows those controls either lie or do damage, so it does not render.
 */
export function isConnected(): boolean {
  return current !== demoSource;
}
