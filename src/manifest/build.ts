/**
 * `manifest.json`, assembled from the modules beside this file.
 *
 * The manifest is what Adminium installs: the tables and their rules, the
 * pages, the roles, the guest site's doors, the emails, the documents and the
 * add-ons the app works better with. It is written from typed modules rather
 * than by hand because it is long and mostly the same eight languages over and
 * over; the modules say each thing once. The file itself is still the
 * product's input, checked in, and `manifest-drift.test.ts` fails when it and
 * the modules disagree (`npm run manifest` re-writes it).
 */
import { ADD_ONS } from "./add-ons.ts";
import { DOCUMENTS } from "./documents.ts";
import { emailTemplates } from "./emails.ts";
import { KINDS, OUTBOX, TEXT_KINDS } from "./outbox.ts";
import { NAV_GROUPS, pages } from "./pages.ts";
import { PAYMENTS } from "./payments.ts";
import { PEOPLE } from "./people.ts";
import { PUBLIC_ACCESS, PUBLIC_KEYS } from "./public.ts";
import { ROLES } from "./roles.ts";
import { TABLES } from "./tables.ts";
import { textTemplates } from "./texts.ts";

/**
 * This release: texts. A message before the arrival, as an email and as a
 * text; a text when the dates change; and the box "Text me about my stay" on
 * the guest's reservation and on the desk's booking — its own, unticked,
 * never needed to book. Nothing goes by text until Adminium is connected to a
 * text service and the guest has said yes for that number.
 */
export const VERSION = "0.3.4";

/**
 * The Adminium release that first reads everything below: rooms counted night
 * by night, a stay priced by the night and written with its extras, strict
 * moves with their effects on the room, moves made by the clock, a stay's own
 * link; and an add-on asked what a code takes off inside the save, a gift
 * card paying a row of a table that takes other payments too, and a room
 * type's linen and amenities posted at check-out; and (0.3.38) the house's
 * guests, each email's class, the tables the law keeps and the reservation's
 * tick kept in the consent log; and (0.3.49) the same app installed once per
 * database, each install's screens at their own address; and (0.3.60) a
 * booking and a folio paid online, refunds kept as the house's own rows, and a
 * stay made waiting for its payment; and (0.3.61) how a guest's payment stands
 * when they come back from the pay page; and (0.3.62) the booking doors and
 * the emails that follow whether the house takes payments online right now;
 * and (0.3.76) texts: text templates, text kinds of the outbox and their
 * number, the reservation's box for texts, a guest's mobile in `people`, and
 * the manager's reading of the texts guests send back.
 * Written from the version actually released, never guessed.
 */
export const MIN_ADMINIUM = "0.3.76";

const ENV = {
  VITE_ADMINIUM_API_BASE_URL: { required: false, example: "https://admin.example.com" },
  VITE_ADMINIUM_PUBLISHABLE_KEY: { required: false, example: "adm_pub_..." },
};

/** The desk's screens open on one address; their tabs are its own. */
export const STAFF_ROUTES = { desk: "/" };

/** The guest site. A reservation's own link lands on `/r`, its code in the fragment; back from paying online, on `/paid`. */
export const CUSTOMER_ROUTES = {
  home: "/",
  rooms: "/rooms",
  find: "/find-us",
  results: "/results",
  reserve: "/reserve",
  reservation: "/r",
  paid: "/paid",
  signIn: "/sign-in",
  reservations: "/reservations",
  // A gift card's balance: the key Offers & gift cards' own email looks for.
  giftCard: "/gift-card",
};

export function buildManifest(): Record<string, unknown> {
  return {
    kind: "app",
    manifestVersion: 1,
    key: "hotel",
    name: "Hotel Reservations",
    version: VERSION,
    publisher: { id: "adminium", name: "Adminium", url: "https://adminium.dev" },
    license: "AGPL-3.0-only",
    description: {
      key: "mft.hotel.desc",
      fallback:
        "A small hotel's guest site and front desk: guests search, reserve and manage their stays, the desk checks them in and out and keeps the folio — every price, room, reference and status decided by your own database.",
    },
    categories: ["hospitality"],
    compatibility: {
      minAdminiumVersion: MIN_ADMINIUM,
      engines: ["sqlite", "postgres", "mysql"],
      requires: ["realtime"],
      // 0.1.x kept other tables in another shape: it cannot be updated in
      // place (uninstall it first — its tables are kept).
      updatesFrom: ">=0.2.0",
    },
    capabilities: ["realtime", "email-delivery"],
    frontends: [
      { side: "staff", kind: "spa", entry: "index.html", env: ENV, placement: "external", instances: true, routes: STAFF_ROUTES },
      { side: "customer", kind: "spa", entry: "index.html", env: ENV, instances: true, routes: CUSTOMER_ROUTES },
    ],
    addOns: ADD_ONS,
    documents: DOCUMENTS,
    navGroups: NAV_GROUPS,
    requiredSchema: { prefixed: true, tables: TABLES },
    pages: pages(),
    roles: ROLES,
    publicKeys: PUBLIC_KEYS,
    publicAccess: PUBLIC_ACCESS,
    outbox: OUTBOX,
    people: PEOPLE,
    emailTemplates: emailTemplates(KINDS),
    // The texts: before the arrival, and when the dates change. Adminium adds each one's opt-out line.
    textTemplates: textTemplates(TEXT_KINDS),
    // A guest's answer ("running late") reaches the manager in Adminium's Texts page.
    textReplies: "on",
    // A stay paid online: one night or the whole stay as it is reserved, and what is left on its folio. Switched on in Adminium's Payments.
    payments: PAYMENTS,
    // The house's own sample; and, while Inventory's sample is in, each room type linked to its "Room turnover" kit.
    sampleData: { file: "seeds/hotel.sample.json", addOns: { inventory: { file: "seeds/hotel.inventory.sample.json" } } },
  };
}

/** The file's text: two-space JSON and a final newline. */
export function manifestText(): string {
  return `${JSON.stringify(buildManifest(), null, 2)}\n`;
}
