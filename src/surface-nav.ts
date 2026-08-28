/**
 * This app's screens, as data — the ONE declaration two build outputs and one
 * runtime all read (29-app-surfaces.md D7/D8).
 *
 * ─── Why this exists ────────────────────────────────────────────────────────
 *
 * `App.tsx` held the side split as two literal `SCREENS` records, and the shell
 * held its own lists for the two sidebars. That was fine while each had one
 * reader. The split now has three:
 *
 *   `App.tsx`         which components a build renders,
 *   `urlSync.ts`      which path selects which screen,
 *   `surface.json`    which sections Adminium's sidebar offers.
 *
 * Three copies of "the screens of this app" is three chances for a path to
 * exist in one and not another — which presents as a link that navigates
 * nowhere, or a sidebar row Adminium offers for a screen the bundle dropped.
 */

import type { View } from "./data/types.ts";
import type { MessageKey } from "./i18n/messages/index.ts";
import type { SurfaceNavEntry } from "./surface-types.ts";

export const APP_KEY = "hotel";

/** The sidebar section heading when this app is blended into Adminium. */
export const APP_LABEL_KEY: MessageKey = "chrome.brand";

type Entry = SurfaceNavEntry<View> & { labelKey: MessageKey };

/**
 * The NAVIGABLE screens — the ones that get a path, a sidebar row and a URL.
 *
 * Order is the sidebar order, and it matches `Shell.tsx`'s own lists because
 * both now read this one. Icons are lucide NAMES in kebab-case, never imported
 * components: this module is read by the Vite config to emit `surface.json`,
 * and pulling the icon package into a build script would be both slow and
 * pointless.
 */
export const SURFACE_NAV = [
  { id: "today", path: "today", view: "today", side: "staff", icon: "calendar-days", labelKey: "chrome.nav.today" },
  { id: "rack", path: "rack", view: "rack", side: "staff", icon: "layout-grid", labelKey: "chrome.nav.rack" },
  { id: "calendar", path: "calendar", view: "calendar", side: "staff", icon: "calendar-days", labelKey: "chrome.nav.calendar" },
  { id: "reservations", path: "reservations", view: "reservations", side: "staff", icon: "clipboard-list", labelKey: "chrome.nav.reservations" },
  /*
   * The guest side's entry screen takes the EMPTY path: a mapped domain serves
   * this app at `/`, and searching for a room is what someone arriving there
   * came to do. Giving it `home` as well would make two URLs for one screen.
   */
  { id: "home", path: "", view: "home", side: "customer", labelKey: "chrome.brand.site" },
  { id: "rooms", path: "rooms", view: "rooms", side: "customer", labelKey: "chrome.nav.rooms" },
  { id: "myreservation", path: "my-reservation", view: "myreservation", side: "customer", labelKey: "chrome.nav.myreservation" },
  { id: "findus", path: "find-us", view: "findus", side: "customer", labelKey: "chrome.nav.findus" },
] as const satisfies readonly Entry[];

/**
 * Screens a side RENDERS but does not navigate to directly.
 *
 * They are declared because `App.tsx` derives its `SCREENS` records from nav +
 * extras, so leaving one out drops it from the bundle rather than silently
 * rendering the wrong thing. They get no path: a folio without a reservation is
 * not a page anyone can link to, and inventing one here would promise a deep
 * link the store cannot honour.
 */
export const SURFACE_EXTRAS = {
  staff: ["folio", "notfound"],
  customer: ["results", "roomtype", "reserve", "confirm", "notfound"],
} as const satisfies Record<"staff" | "customer", readonly View[]>;

/**
 * Every view a side renders, as a TYPE — nav entries plus extras.
 *
 * A type and not a test, deliberately. `App.tsx` must keep its two `SCREENS`
 * records as separate object LITERALS: `SURFACE_SIDE` folds to a literal at
 * build time, and that is what lets Rollup eliminate the branch not taken —
 * and with it every screen component only that branch referenced. Building one
 * record by filtering an array at runtime would be tidier and would put the
 * whole front-desk app inside the PUBLIC guest bundle.
 */
export type StaffView =
  | Extract<(typeof SURFACE_NAV)[number], { side: "staff" }>["view"]
  | (typeof SURFACE_EXTRAS)["staff"][number];

export type CustomerView =
  | Extract<(typeof SURFACE_NAV)[number], { side: "customer" }>["view"]
  | (typeof SURFACE_EXTRAS)["customer"][number];
