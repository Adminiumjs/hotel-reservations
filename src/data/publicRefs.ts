/**
 * The public API's names for the guest site's entries.
 *
 * Adminium names each entry of the manifest's `publicAccess` when it installs
 * the app: the table's real name, a suffix for what the entry is (`_claimed`
 * for a sign-in or a link's own row, `_verified` for a signed-in guest's rows,
 * `_availability` for what is open, none for a plain read), and a counter
 * (`_2`, `_3` …) for the second entry of the same name, counted across both
 * keys in the manifest's order. The table's real name is the one the server
 * sends in `surface-config.json` (`stays` → `hotel_stays`).
 *
 * The suffixes below are the manifest's, worked out once and held by
 * `publicRefs.test.ts` against the manifest's own entries: an entry added or
 * moved fails that test before it can send a page to the wrong ref.
 */

/** Each entry the guest site calls: the table, and its suffix. */
export const PUBLIC_REFS = {
  // The customer key: the house.
  settings: ["settings", ""],
  types: ["room_types", ""],
  features: ["room_type_features", ""],
  rooms: ["rooms", ""],
  extras: ["extras", ""],
  notes: ["house_notes", ""],
  // What is open (a night pool per room type, and parking).
  nights: ["stays", "_availability"],
  parking: ["stay_extras", "_availability"],
  // Reserving: a stay with its extras, priced by Adminium.
  reserve: ["stays", "_verified_3"],
  // A signed-in guest: their account and their own stays.
  account: ["customers", "_claimed"],
  myStays: ["stays", "_verified"],
  myDates: ["stays", "_verified_2"],
  myExtras: ["stay_extras", "_verified"],
  myExtraState: ["stay_extras", "_verified_2"],
  myCharges: ["charges", "_verified"],
  myCredits: ["stay_credits", "_verified"],
  myPayments: ["payments", "_verified"],
  // The `link` key: the one stay its own link opens.
  linkStay: ["stays", "_claimed"],
  linkExtras: ["stay_extras", "_verified_3"],
  linkExtraState: ["stay_extras", "_verified_4"],
  linkCharges: ["charges", "_verified_2"],
  linkCredits: ["stay_credits", "_verified_2"],
  linkPayments: ["payments", "_verified_2"],
  // The extras on offer, read on the link key so an extra added through it is known.
  linkOffer: ["extras", "_2"],
} as const satisfies Record<string, readonly [string, string]>;

export type RefName = keyof typeof PUBLIC_REFS;
export type Refs = Record<RefName, string>;

/** The app's key, which names its tables when the server does not say (`hotel_stays`). */
const APP_KEY = "hotel";

/** Every ref by its real name, from the server's table names. */
export function publicRefs(tables: Readonly<Record<string, string>> = {}): Refs {
  const out = {} as Refs;
  for (const [name, [table, suffix]] of Object.entries(PUBLIC_REFS) as [RefName, readonly [string, string]][]) {
    out[name] = `${tables[table] ?? `${APP_KEY}_${table}`}${suffix}`;
  }
  return out;
}
