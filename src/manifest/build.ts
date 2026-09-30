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
import { KINDS, OUTBOX } from "./outbox.ts";
import { NAV_GROUPS, pages } from "./pages.ts";
import { PUBLIC_ACCESS, PUBLIC_KEYS } from "./public.ts";
import { ROLES } from "./roles.ts";
import { TABLES } from "./tables.ts";

/** This release, a patch over 0.2.0 (the version moved 0.1.3 → 0.2.0 once: its tables were new). */
export const VERSION = "0.2.1";

/**
 * The Adminium release that first reads everything below: rooms counted night
 * by night, a stay priced by the night and written with its extras, strict
 * moves with their effects on the room, moves made by the clock, a stay's own
 * link. Written from the version actually released, never guessed.
 */
export const MIN_ADMINIUM = "0.3.6";

const ENV = {
  VITE_ADMINIUM_API_BASE_URL: { required: false, example: "https://admin.example.com" },
  VITE_ADMINIUM_PUBLISHABLE_KEY: { required: false, example: "adm_pub_..." },
};

/** The desk's screens open on one address; their tabs are its own. */
export const STAFF_ROUTES = { desk: "/" };

/** The guest site. A reservation's own link lands on `/r`, its code in the fragment. */
export const CUSTOMER_ROUTES = {
  home: "/",
  rooms: "/rooms",
  find: "/find-us",
  results: "/results",
  reserve: "/reserve",
  reservation: "/r",
  signIn: "/sign-in",
  reservations: "/reservations",
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
      { side: "staff", kind: "spa", entry: "index.html", env: ENV, placement: "external", routes: STAFF_ROUTES },
      { side: "customer", kind: "spa", entry: "index.html", env: ENV, routes: CUSTOMER_ROUTES },
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
    emailTemplates: emailTemplates(KINDS),
    sampleData: { file: "seeds/hotel.sample.json" },
  };
}

/** The file's text: two-space JSON and a final newline. */
export function manifestText(): string {
  return `${JSON.stringify(buildManifest(), null, 2)}\n`;
}
