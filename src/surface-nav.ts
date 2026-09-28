/**
 * This app's screens, as data — the ONE declaration two build outputs and one
 * runtime all read (29-app-surfaces.md D7/D8).
 *
 * ─── Why this exists ────────────────────────────────────────────────────────
 *
 * The screens of each side are read in three places:
 *
 *   `urlSync.ts`      which path selects which screen,
 *   `surface.json`    which sections Adminium's sidebar offers,
 *   the surface gate  which modules only the desk's build may carry.
 *
 * Three copies of "the screens of this app" is three chances for a path to
 * exist in one and not another — which presents as a link that navigates
 * nowhere, or a sidebar row Adminium offers for a screen the bundle dropped.
 */

import type { View } from "./app/views.ts";
import type { MessageKey } from "./i18n/messages/index.ts";
import type { SurfaceNavEntry } from "./surface-types.ts";

export const APP_KEY = "hotel";

/** The sidebar section heading when this app is blended into Adminium. */
export const APP_LABEL_KEY: MessageKey = "chrome.brand";

type Entry = SurfaceNavEntry<View> & { labelKey: MessageKey };

/**
 * The NAVIGABLE screens — the ones that get a path, a sidebar row and a URL.
 *
 * Order is the sidebar order. Icons are lucide NAMES in kebab-case, never imported
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
  { id: "myreservation", path: "my-reservation", view: "signin", side: "customer", labelKey: "chrome.nav.myreservation" },
  { id: "findus", path: "find-us", view: "find", side: "customer", labelKey: "chrome.nav.findus" },
] as const satisfies readonly Entry[];

/**
 * Screens a side RENDERS but does not navigate to directly.
 *
 * They get no path: a folio without a reservation is not a page anyone can
 * link to, and inventing one here would promise a deep link the screens cannot
 * honour.
 */
export const SURFACE_EXTRAS = {
  staff: ["folio", "newbooking", "404"],
  customer: ["results", "type", "reserve", "conf", "list", "one", "404"],
} as const satisfies Record<"staff" | "customer", readonly View[]>;

/**
 * The modules only the desk's build may carry — its screens, their values and
 * its door into Adminium. The surface gate builds the guest site and fails if
 * its source maps name any of them. The screens live in one module per side
 * (`src/view/`), so they are named here rather than found by a view's name.
 */
export const SURFACE_STAFF_ONLY = [
  "src/view/DeskView.tsx",
  "src/view/OverlaysDeskView.tsx",
  "src/app/desk.ts",
  "src/app/vals/desk.ts",
  "src/app/vals/overlaysDesk.ts",
  "src/data/adminiumDesk.ts",
  "src/data/sessionSource.ts",
] as const;

/** Where the demo's seeded house is written: the surface gate reads its literals to prove the demo build still carries it. */
export const SURFACE_DEMO_DATA = "src/sample/wren-house.ts";

/**
 * Every view a side renders, as a TYPE — nav entries plus extras.
 *
 * Which side a build draws is decided by `app/sides.ts`, which folds at build
 * time so the side not drawn is not in the bundle at all.
 */
export type StaffView =
  | Extract<(typeof SURFACE_NAV)[number], { side: "staff" }>["view"]
  | (typeof SURFACE_EXTRAS)["staff"][number];

export type CustomerView =
  | Extract<(typeof SURFACE_NAV)[number], { side: "customer" }>["view"]
  | (typeof SURFACE_EXTRAS)["customer"][number];
