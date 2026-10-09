/**
 * What the website's demo card offers for this app — written into `demo.json`
 * beside the demo build (`demo-emit.ts`, wired in `vite.config.ts`).
 *
 * Two sides, the guest site and the front desk, each with its own screens; the
 * card shows only the current side's. A screen may carry shortcuts that play a
 * moment of the house on it ("Four guests", "The room goes while you type").
 * The clock row moves the demo's Tuesday on — to check-out time, or a whole
 * day — and puts it back.
 *
 * Labels are message keys (`i18n/strings/demo-card.ts`), written out in all
 * eight languages. Icons are lucide names.
 */
import type { DemoFrame } from "./demo-types.ts";

export const DEMO_APP_KEY = "hotel";
export const DEMO_DIR = "hotel-reservations";

export interface DemoCardShortcut {
  id: string;
  icon: string;
  labelKey: string;
}

export interface DemoCardScreen {
  id: string;
  view: string;
  icon: string;
  labelKey: string;
  side: "staff" | "customer";
  persona: "guest" | "desk";
  shortcuts?: DemoCardShortcut[];
}

export const DEMO_FRAMES: DemoFrame[] = ["desktop", "phone"];

export const DEMO_PERSONAS = [
  { id: "guest", icon: "user-round", labelKey: "demo.persona.guest" },
  { id: "desk", icon: "concierge-bell", labelKey: "demo.persona.desk" },
];

const cut = (id: string, icon: string): DemoCardShortcut => ({ id, icon, labelKey: `demo.do.${id}` });
const guest = (id: string, view: string, icon: string, shortcuts?: DemoCardShortcut[]): DemoCardScreen => ({
  id,
  view,
  icon,
  labelKey: `demo.screen.${id}`,
  side: "customer",
  persona: "guest",
  ...(shortcuts === undefined ? {} : { shortcuts }),
});
const desk = (id: string, view: string, icon: string, shortcuts?: DemoCardShortcut[]): DemoCardScreen => ({
  id,
  view,
  icon,
  labelKey: `demo.screen.${id}`,
  side: "staff",
  persona: "desk",
  ...(shortcuts === undefined ? {} : { shortcuts }),
});

export const DEMO_SCREENS: DemoCardScreen[] = [
  guest("home", "home", "house", [cut("saturday", "calendar-x")]),
  guest("rooms", "rooms", "bed-double"),
  guest("find", "find", "map-pin"),
  guest("results", "results", "search", [cut("four-guests", "users"), cut("results-offline", "wifi-off")]),
  guest("type", "type", "door-open"),
  guest("reserve", "reserve", "calendar-check", [
    cut("fill-guest", "wand-sparkles"),
    cut("room-goes", "door-closed"),
    cut("reserve-offline", "wifi-off"),
    cut("price-moves", "tag"),
    cut("code-midweek", "tag"),
  ]),
  guest("conf", "conf", "circle-check", [cut("no-emails", "mail-x")]),
  guest("signin", "signin", "key-round", [
    cut("priya", "wand-sparkles"),
    cut("unknown-address", "mail-x"),
    cut("open-link", "mail-open"),
    cut("link-expires", "unplug"),
    cut("priya-link", "link"),
  ]),
  guest("list", "list", "list", [cut("rafe", "clock-alert"), cut("signed-20", "timer")]),
  guest("one", "one", "calendar-range", [
    cut("inside-48", "clock-alert"),
    cut("outside-48", "calendar-check"),
    cut("move-nadia", "calendar-range"),
    cut("close-309", "wrench"),
  ]),
  guest("giftcard", "giftcard", "gift", [cut("card-balance", "gift")]),
  guest("guest-404", "404", "file-x"),
  desk("today", "today", "sun", [
    cut("checkin-ren", "log-in"),
    cut("checkout-teodor", "log-out"),
    cut("walk-in", "door-open"),
    cut("afternoon", "clock-alert"),
    cut("no-garden", "bed-double"),
    cut("ottoline-rings", "phone"),
    cut("after-22", "key-round"),
    cut("sorley", "user-x"),
  ]),
  desk("newbooking", "newbooking", "calendar-plus", [cut("known-guest", "user-round"), cut("snug-three", "users"), cut("type-goes", "door-closed"), cut("desk-code", "tag")]),
  desk("rack", "rack", "grid-3x3", [cut("close-304", "wrench"), cut("housekeeping", "spray-can"), cut("linen-back", "washing-machine")]),
  desk("calendar", "calendar", "calendar-days"),
  desk("reservations", "reservations", "list"),
  desk("folio", "folio", "receipt-text", [
    cut("folio-afternoon", "clock-alert"),
    cut("record-balance", "receipt"),
    cut("leaving-early", "log-out"),
    cut("as-manager", "user-round"),
    cut("late-cancel", "calendar-x"),
    cut("noshow-paid", "user-x"),
    cut("another-desk", "users"),
    cut("pay-gift-card", "gift"),
  ]),
  desk("desk-404", "404", "triangle-alert"),
];

export type DemoShortcutId = NonNullable<DemoCardScreen["shortcuts"]>[number]["id"];

export const DEMO_CLOCK = {
  advance: [
    { id: "checkout", labelKey: "demo.clock.checkout" },
    { id: "day", labelKey: "demo.clock.day" },
  ],
  reset: { labelKey: "demo.clock.reset" },
};
