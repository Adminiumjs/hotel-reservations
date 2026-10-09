/**
 * Who may do what, enforced by Adminium on every read and write.
 *
 *   front-desk     the desk's own screens, never the dashboard. Reads the
 *                  house, the rooms and every reservation (with the guest's
 *                  name, email and mobile, to find them and ring them). Takes
 *                  a booking with its extras, edits it, checks guests in and
 *                  out, cancels (saying who asked), marks a no-show, records a
 *                  charge, a payment, money given back and the nights not
 *                  stayed; moves a room between ready and being cleaned, and
 *                  takes one out of service. Never voids: that is a manager's;
 *   housekeeping   the room rack only: the rooms, their types and what is out
 *                  of service; marks a room ready or being cleaned. Of the
 *                  reservations it reads only which room, the dates, the
 *                  status and a late leaving — never a name, an email or a
 *                  figure;
 *   manager        everything: the dashboard section, the room types, rooms,
 *                  rates, extras, charge items, settings and house notes; voids
 *                  a charge, a payment or a credit; the guests, the emails.
 *
 * A one-person guest house is simply the workspace's admin.
 *
 * The desk's screens show or hide a button by the role, but the grants and
 * the limits below are what refuse the write — a hidden button is not a lock.
 */
import { PAGE_REFS } from "./pages.ts";
import { DESK_CANCEL_CODES, TABLE_REFS, TABLES } from "./tables.ts";

const grant = (table: string, ...actions: string[]) => actions.map((action) => `table:@${table}:${action}`);
const view = (page: string) => `page:@${page}:view`;
/** Seeing a table's personal columns (a guest's name, email and mobile). */
const pii = (table: string) => `table:@${table}:read_pii`;

/** What the desk reads to run the day. */
const DESK_READS = TABLE_REFS.filter((table) => table !== "messages");

/** What housekeeping reads of a reservation: which room, when, and whether it is still to come or in the house. */
export const HOUSEKEEPING_STAY_COLUMNS = ["room_id", "arrive", "depart", "status"];

/** What the desk may change of a reservation: never its money, its reference or its stamps. */
const DESK_STAY_COLUMNS = [
  "status",
  "room_type_id",
  "room_id",
  "arrive",
  "depart",
  "guests",
  "first_name",
  "last_name",
  "email",
  "mobile",
  "arrival_time",
  "note",
  "expect_by",
  "language",
  "folio_sent_at",
  "folio_so_far_at",
  "cancel_code",
  "customer_id",
];

/**
 * What a role reads and writes of the add-ons' own tables, column by column.
 * Nothing here is held while the add-on is away, and all of it is taken back
 * when the add-on is disconnected.
 *
 * Of Inventory: what a room type's linen is and how much of it is where, and
 * a transfer — "Back from the laundry" — made and moved through its steps.
 * No cost, no count, no receipt, no other movement. A second role with a
 * plain read of one of these tables lifts its column limit.
 */
const LINEN = [
  { addOn: "inventory", table: "transfers", actions: ["read", "create", "update"], limit: { creatable: ["from_place_id", "to_place_id", "note"], writable: ["status"] } },
  {
    addOn: "inventory",
    table: "transfer_lines",
    actions: ["read", "create", "update"],
    limit: { creatable: ["transfer_id", "item_id", "qty"], writable: ["status"], writableValues: { status: ["posted"] } },
  },
  { addOn: "inventory", table: "links", actions: ["read"], limit: { readable: ["id", "source_table", "source_row", "kind", "kit_id", "item_id", "place_id", "to_place_id"] } },
  { addOn: "inventory", table: "kits", actions: ["read"], limit: { readable: ["id", "name"] } },
  { addOn: "inventory", table: "kit_lines", actions: ["read"], limit: { readable: ["id", "kit_id", "item_id", "qty", "per", "action", "place_id", "to_place_id"] } },
  { addOn: "inventory", table: "items", actions: ["read"], limit: { readable: ["id", "name", "unit", "decimals"] } },
  { addOn: "inventory", table: "places", actions: ["read"], limit: { readable: ["id", "name"] } },
  { addOn: "inventory", table: "stock_points", actions: ["read"], limit: { readable: ["id", "item_id", "place_id", "on_hand"] } },
];

/**
 * Of Offers & gift cards: the reductions of a stay, for the folio; and what a
 * typed code is when the desk looks it up — a card's state, balance and
 * expiry, a voucher's worth and what is left of it, whether a code is on.
 * Never a code, a holder, an address or a message. Read only: the desk sells
 * no card.
 */
const OFFERS_AT_THE_DESK = [
  { addOn: "offers", table: "applied", actions: ["read"], limit: { readable: ["source_table", "source_row", "source_line", "name", "kind", "amount", "typed", "at"] } },
  { addOn: "offers", table: "gift_cards", actions: ["read"], limit: { readable: ["kind", "label", "status", "balance", "expires_on"] } },
  { addOn: "offers", table: "vouchers", actions: ["read"], limit: { readable: ["code_last4", "worth", "value", "what", "units", "public_name", "uses_left", "uses_total", "status", "expires_on"] } },
  { addOn: "offers", table: "codes", actions: ["read"], limit: { readable: ["offer_id", "active", "valid_until"] } },
];

/** What an add-on's answer fills, table by table: no role writes these. */
export const DECIDED: Readonly<Record<string, readonly string[]>> = {
  stays: ["discount", "room_discount", "customer_proved", "balance"],
  stay_extras: ["discount"],
  payments: ["card_id", "card_last4", "card_balance_after"],
};
/** The columns of a table a person may type: not its key, not one a rule works out, not one an add-on decides. */
const typed = (table: string): string[] =>
  TABLES.find((t) => t.ref === table)!
    .columns.filter((c) => c.ref !== "id" && !(DECIDED[table] ?? []).includes(c.ref) && c.rules?.["formula"] === undefined && c.rules?.["rollup"] === undefined && c.rules?.["perNight"] === undefined && c.rules?.["codeLast4"] === undefined)
    .map((c) => c.ref);
const columnsOf = (table: string) => TABLES.find((t) => t.ref === table)!.columns.map((c) => c.ref);
/** What anybody reads of a payment: never `card_code` — a gift card's whole code is typed once and shown again by no screen. */
export const PAYMENT_READS = columnsOf("payments").filter((ref) => ref !== "card_code");
/** What anybody reads of a code on a stay: never the code as typed. */
export const STAY_CODE_READS = columnsOf("stay_codes").filter((ref) => ref !== "typed");
/** What the desk sends with a payment: never what a card gave or kept, which Offers & gift cards decides. */
export const DESK_PAYMENT_COLUMNS = ["stay_id", "kind", "amount", "method", "reference", "note", "card_code", "asked", "against_id", "client_key"];

export const ROLES = [
  {
    key: "front-desk",
    name: "Front desk",
    screensOnly: true,
    permissions: [
      "app:@:staff",
      ...DESK_READS.flatMap((table) => grant(table, "read")),
      pii("stays"),
      pii("customers"),
      // A booking with its extras, in one write; the money rows of a stay.
      ...grant("stays", "create", "update"),
      ...grant("stay_extras", "create", "update"),
      // A code typed when the booking is taken: written with the stay, never changed after.
      ...grant("stay_codes", "create"),
      ...grant("charges", "create"),
      // A credit is recorded, never changed: the update grant only lets the stay's change quote send its credits back as they are.
      ...grant("stay_credits", "create", "update"),
      ...grant("payments", "create"),
      ...grant("rooms", "update"),
      ...grant("room_closures", "create", "update"),
    ],
    limits: {
      stay_credits: { writable: ["void_reason"] },
      stays: {
        writable: DESK_STAY_COLUMNS,
        // A booking is made of the same columns it is changed by, and how it came in. Never a reduction: what a code
        // takes off is Offers & gift cards' to decide — and nobody's to type while it is away.
        creatable: [...DESK_STAY_COLUMNS, "channel"],
        writableValues: {
          status: ["booked", "in_house", "departed", "cancelled", "no_show"],
          cancel_code: DESK_CANCEL_CODES,
        },
      },
      stay_extras: { writable: ["state"], creatable: ["stay_id", "extra_id", "state"] },
      stay_codes: { readable: STAY_CODE_READS, creatable: ["stay_id", "typed"] },
      payments: { readable: PAYMENT_READS, creatable: DESK_PAYMENT_COLUMNS },
      rooms: { writable: ["status", "note"], writableValues: { status: ["ready", "cleaning"] } },
      room_closures: { writable: ["to_date", "reason", "active"] },
    },
    tables: [...LINEN, ...OFFERS_AT_THE_DESK],
  },
  {
    key: "housekeeping",
    name: "Housekeeping",
    screensOnly: true,
    permissions: [
      "app:@:staff",
      ...["rooms", "room_types", "room_closures", "extras", "stays", "stay_extras"].flatMap((table) => grant(table, "read")),
      ...grant("rooms", "update"),
    ],
    limits: {
      rooms: { writable: ["status"], writableValues: { status: ["ready", "cleaning"] } },
      // "Leaving today", "Late leaving · until 14:00", "Arriving today" on a room's tile: no names.
      stays: { readable: HOUSEKEEPING_STAY_COLUMNS },
      stay_extras: { readable: ["stay_id", "extra_id", "state"] },
    },
    // The linen, and putting it back: nothing of Offers & gift cards.
    tables: LINEN,
  },
  {
    key: "manager",
    name: "Manager",
    permissions: [
      "app:@:staff",
      ...TABLE_REFS.flatMap((table) =>
        // The emails are the house's record of what was sent: nobody deletes from it.
        table === "messages" ? grant(table, "read", "create", "update") : grant(table, "read", "create", "update", "delete"),
      ),
      ...PAGE_REFS.flatMap((page) => [view(page), `page:@${page}:edit`]),
      ...["stays", "customers", "messages"].map(pii),
    ],
    limits: {
      // A code's whole text is typed and never read back, by a manager either.
      stay_codes: { readable: STAY_CODE_READS },
      payments: { readable: PAYMENT_READS, writable: typed("payments"), creatable: typed("payments") },
      // Everything a person writes: never what Adminium works out, or what Offers & gift cards decides — which is
      // nobody's to type, with the add-on connected or away.
      stays: { writable: typed("stays"), creatable: typed("stays") },
      stay_extras: { writable: typed("stay_extras"), creatable: typed("stay_extras") },
    },
    tables: [...LINEN, ...OFFERS_AT_THE_DESK],
  },
];
