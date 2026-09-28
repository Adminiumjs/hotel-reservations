/**
 * What the guest site may read and write, through two browser keys.
 *
 * The `customer` key is the site's: the room types and their features, the
 * rooms (their numbers and floors, never their status), the extras on offer,
 * the house's public settings and notes; reserving a room with its extras in
 * one write, priced by Adminium and checked against the price the guest saw;
 * and, once a guest has signed in with a link emailed to them, their own
 * reservations and nothing else — to read, to change the arrival time or the
 * extras, to cancel, and to move the dates while they may still cancel at no
 * charge.
 *
 * The `link` key opens one reservation by the code in its own link — the
 * link its confirmation email carries — so the guest can read it, change the
 * arrival time or the extras, or cancel, without signing in. Moving the dates
 * needs a signed-in guest: a forwarded link cannot move a stay.
 *
 * What never leaves: who at the desk did what, the late flag (a guest sees
 * "cancelled"), who cancelled and why, whether the stay was made online, the
 * guest account behind it, the link code and the retry key, anyone else's
 * stay, the rooms' status, the rate rules.
 */
import { ARRIVAL_TIMES } from "./tables.ts";

/** What a guest sees of their reservation: the stay, their details, what it costs. */
export const STAY_SELECT = [
  "id",
  "ref",
  "status",
  "room_type_id",
  "room_id",
  "arrive",
  "depart",
  "guests",
  "nights",
  "first_name",
  "last_name",
  "email",
  "mobile",
  "arrival_time",
  "note",
  "language",
  "room_total",
  "extras_total",
  "charges_total",
  "credits_total",
  "subtotal",
  "tax_rate",
  "tax_label",
  "tax",
  "total",
  "paid",
  "balance",
  "cancel_by",
  "created_at",
  "checked_in_at",
  "checked_out_at",
  "cancelled_at",
  "no_show_marked_at",
];

/** The columns Adminium takes for personal data: a guest's name, email and mobile. */
export const PERSONAL = ["first_name", "last_name", "email", "mobile", "note"];

export const EXTRA_LINE_SELECT = ["id", "stay_id", "extra_id", "state", "label", "each", "per", "nights", "guests", "amount"];
export const CHARGE_SELECT = ["id", "stay_id", "label", "amount", "note", "charged_on", "voided"];
export const CREDIT_SELECT = ["id", "stay_id", "reason", "from_date", "to_date", "nights", "amount", "voided"];
export const PAYMENT_SELECT = ["id", "stay_id", "kind", "amount", "method", "paid_on", "voided"];

/** The house's public face: its words, its times, its rules for a stay. */
export const SETTINGS_SELECT = [
  "name",
  "address",
  "town",
  "phone",
  "email",
  "since",
  "about",
  "finding",
  "morning",
  "directions_train",
  "directions_car",
  "directions_foot",
  "breakfast_hours",
  "late_arrival_note",
  "tax_rate",
  "tax_label",
  "arrive_from",
  "leave_by",
  "late_until",
  "cancel_days",
  "max_nights",
  "ahead_days",
  "guest_emails_on",
];

const ARRIVE_FROM = { table: "settings", column: "arrive_from" };

/**
 * The changes a guest makes to a booked stay until the arrival afternoon: the
 * time they will come, and cancelling it (the reason is theirs).
 */
const OWN_CHANGES = {
  writable: ["arrival_time", "status"],
  writableValues: { status: ["cancelled"], arrival_time: ARRIVAL_TIMES },
  writableWhen: { status: ["booked"], arrive: { before: { time: ARRIVE_FROM } } },
  defaults: { cancel_code: "self" },
};

/** A signed-in guest's own stays. */
const SIGNED_IN = { level: "verified", claimedBy: { table: "customers", column: "customer_id" } };
/** One stay, by the code in its own link. */
const OWN_LINK = { claim: { by: "token", column: "link_token", stopped: "link_stopped", own: true, address: "email" } };

/**
 * A stay's extras and money rows, read where the stay is. An extra is added,
 * dropped or put back until the arrival afternoon.
 */
function linesOf(key?: string) {
  const keyed = key === undefined ? {} : { key };
  const withStay = { level: "verified", visibleWith: { table: "stays", via: "stay_id" } };
  return [
    {
      table: "stay_extras",
      ...keyed,
      methods: ["GET", "POST"],
      ...withStay,
      select: EXTRA_LINE_SELECT,
      writable: ["stay_id", "extra_id"],
      writableWhen: { stay_id: { before: { column: "arrive", time: ARRIVE_FROM } } },
    },
    {
      table: "stay_extras",
      ...keyed,
      methods: ["PATCH"],
      ...withStay,
      select: EXTRA_LINE_SELECT,
      writable: ["state"],
      writableValues: { state: ["on", "off"] },
      writableWhen: { stay_id: { before: { column: "arrive", time: ARRIVE_FROM } } },
    },
    { table: "charges", ...keyed, methods: ["GET"], ...withStay, select: CHARGE_SELECT },
    { table: "stay_credits", ...keyed, methods: ["GET"], ...withStay, select: CREDIT_SELECT },
    { table: "payments", ...keyed, methods: ["GET"], ...withStay, select: PAYMENT_SELECT },
  ];
}

export const PUBLIC_KEYS = { link: {} };

/** The extras on offer, as a guest picks them. */
const EXTRAS_READ = {
  table: "extras",
  methods: ["GET"],
  select: ["id", "code", "label", "short", "how", "icon", "amount", "per", "spaces", "position"],
  filters: [{ column: "active", op: "eq", value: true }],
};

export const PUBLIC_ACCESS = [
  // ── the guest who signs in with a link emailed to them ─────────────────────
  {
    table: "customers",
    methods: ["GET", "PATCH"],
    select: ["first_name", "last_name", "email"],
    writable: ["first_name", "last_name"],
    claim: { verify: "email-link", email: "email" },
    humanCheck: true,
    // "Delete my details" also stops the links of their reservations.
    forget: { columns: ["email", "first_name", "last_name"], stamp: "forgotten_at", links: true },
  },
  // Their own stays, and the changes they may make until the arrival afternoon;
  // a stay's link forwarded by mistake is replaced by a new one, emailed to them.
  {
    table: "stays",
    methods: ["GET", "PATCH"],
    ...SIGNED_IN,
    select: STAY_SELECT,
    ...OWN_CHANGES,
    newLink: { column: "link_token", kind: "stay-new-link" },
  },
  // Moving the dates: while the stay may still be cancelled at no charge, priced again by Adminium.
  {
    table: "stays",
    methods: ["PATCH"],
    ...SIGNED_IN,
    select: STAY_SELECT,
    writable: ["arrive", "depart"],
    writableWhen: { status: ["booked"], cancel_by: { before: {} } },
    dryRun: true,
    expect: "total",
  },
  ...linesOf(),

  // ── the house ───────────────────────────────────────────────────────────────
  {
    table: "room_types",
    methods: ["GET"],
    select: ["id", "code", "name", "blurb", "description", "sleeps", "base_rate", "color", "icon", "position"],
    filters: [{ column: "active", op: "eq", value: true }],
  },
  { table: "room_type_features", methods: ["GET"], select: ["id", "room_type_id", "feature", "icon", "position"] },
  // The rooms by number and floor: never their status.
  { table: "rooms", methods: ["GET"], select: ["id", "number", "floor", "room_type_id"] },
  EXTRAS_READ,
  { table: "settings", methods: ["GET"], select: SETTINGS_SELECT },
  { table: "house_notes", methods: ["GET"], select: ["id", "icon", "text", "position"] },
  // Rooms of a type left each night, and parking spaces: a number only when few are.
  { table: "stays", kind: "availability", methods: ["GET"], showLeft: { below: 5 } },
  { table: "stay_extras", kind: "availability", methods: ["GET"], showLeft: { below: 3 } },

  // ── reserving a room ─────────────────────────────────────────────────────────
  {
    table: "stays",
    methods: ["POST"],
    humanCheck: true,
    level: "verified",
    // What the confirmation shows: never the guest's own details back — an endpoint anyone can call selects nothing personal.
    select: STAY_SELECT.filter((c) => !PERSONAL.includes(c)),
    writable: [
      "room_type_id",
      "arrive",
      "depart",
      "guests",
      "first_name",
      "last_name",
      "email",
      "mobile",
      "arrival_time",
      "note",
      "language",
      "client_key",
    ],
    requires: ["first_name", "last_name", "email"],
    claimedBy: { table: "customers", column: "customer_id", optional: true },
    identity: { table: "customers", email: "email", link: "customer_id", fill: { first_name: "first_name", last_name: "last_name" } },
    shareLink: "link_token",
    // No more guests than the room type sleeps — and, at the desk, than a room given ahead sleeps.
    agrees: [
      { column: "guests", lte: { via: "room_type_id", column: "sleeps" } },
      { column: "guests", lte: { via: "room_id", column: "sleeps" } },
    ],
    anonymous: { perValue: { columns: ["email"], n: 10 }, perKeyHour: 300, perIpHour: 10, plainText: ["first_name", "last_name", "note", "mobile"] },
    children: {
      stay_extras: { via: "stay_id", writable: ["extra_id"], select: EXTRA_LINE_SELECT.filter((c) => c !== "stay_id"), max: 8 },
    },
    dryRun: true,
    expect: "total",
    clientKey: "client_key",
  },

  // ── one reservation, by its own link ─────────────────────────────────────────
  { table: "stays", key: "link", methods: ["GET", "PATCH"], select: STAY_SELECT, ...OWN_LINK, ...OWN_CHANGES },
  ...linesOf("link"),
  // What an extra added through the link is: the create reads the extra on this key.
  { ...EXTRAS_READ, key: "link" },
];
