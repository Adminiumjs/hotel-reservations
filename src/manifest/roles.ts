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
 *                  of service; marks a room ready or being cleaned. Reads no
 *                  guest and no reservation;
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
import { DESK_CANCEL_CODES, TABLE_REFS } from "./tables.ts";

const grant = (table: string, ...actions: string[]) => actions.map((action) => `table:@${table}:${action}`);
const view = (page: string) => `page:@${page}:view`;
/** Seeing a table's personal columns (a guest's name, email and mobile). */
const pii = (table: string) => `table:@${table}:read_pii`;

/** What the desk reads to run the day. */
const DESK_READS = TABLE_REFS.filter((table) => table !== "messages");

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
  "cancel_code",
  "customer_id",
];

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
      ...grant("charges", "create"),
      ...grant("stay_credits", "create"),
      ...grant("payments", "create"),
      ...grant("rooms", "update"),
      ...grant("room_closures", "create", "update"),
    ],
    limits: {
      stays: {
        writable: DESK_STAY_COLUMNS,
        writableValues: {
          status: ["booked", "in_house", "departed", "cancelled", "no_show"],
          cancel_code: DESK_CANCEL_CODES,
        },
      },
      stay_extras: { writable: ["state"] },
      rooms: { writable: ["status", "note"], writableValues: { status: ["ready", "cleaning", "occupied"] } },
      room_closures: { writable: ["to_date", "reason", "active"] },
    },
  },
  {
    key: "housekeeping",
    name: "Housekeeping",
    screensOnly: true,
    permissions: ["app:@:staff", ...["rooms", "room_types", "room_closures"].flatMap((table) => grant(table, "read")), ...grant("rooms", "update")],
    limits: { rooms: { writable: ["status"], writableValues: { status: ["ready", "cleaning"] } } },
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
  },
];
