/**
 * The DataSource seam.
 *
 * This app ships in demo mode: every read below returns the seeded fiction in
 * `demo.ts`, synchronously, with no network involved. The seam exists so that
 * pointing the app at a real Adminium deployment is a change to ONE file rather
 * than a rewrite — the screens and the store already talk to this interface and
 * never import `demo.ts` for data they render.
 *
 * When `@adminium/manifest` lands (Phase B), a second implementation backed by
 * `AdminiumDataSource` slots in here and `demoSource` becomes the fallback used
 * when no `adm_pub_` key is configured.
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

/** The source the app is currently wired to. */
export const source: DataSource = demoSource;
