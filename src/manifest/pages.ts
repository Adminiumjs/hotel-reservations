/**
 * The Hotel Reservations section in the dashboard: its pages, their forms and
 * the groups they sit in.
 *
 * The Overview first, with no heading of its own; then the reservations and
 * what hangs on them (Records), and the house itself (Manage): the room types
 * with their features, the rooms, what is out of service, the rates, the
 * extras, the charge items, the settings and the house notes. The desk's own
 * screens are the app's staff side, on their own address; the sidebar links
 * to them.
 *
 * A reservation's changes go through the desk, where the rules are said in
 * words; the Reservations page shows every column and the money on it, and a
 * value Adminium works out — a total, a reference, a stamp — shows in a form
 * and cannot be typed over.
 */
import { l, titles } from "./labels.ts";
import { OVERVIEW_LAYOUT } from "./overview.ts";

export const NAV_GROUPS = [
  { key: "records", label: l("Records"), order: 1 },
  { key: "manage", label: l("Manage"), order: 2 },
];

type Field = Record<string, unknown>;
const f = (column: string, more: Field = {}): Field => ({ column, ...more });
const title = (column: string): Field => ({ column, control: "title", span: 2 });
const wide = (column: string, control = "textarea"): Field => ({ column, control, span: 2 });
const toggle = (column: string): Field => ({ column, control: "toggle-row" });
const money = (column: string): Field => ({ column, control: "currency" });
const when = (column: string): Field => ({ column, control: "datetime" });
const day = (column: string): Field => ({ column, control: "date" });
const ref = (column: string): Field => ({ column, control: "reference" });
const rows = (relation: string, columns: Field[]): Field => ({ relation, control: "child-rows", span: 2, columns });
const form = (...sections: Field[][]) => ({
  form: { v: 2, sections: sections.map((fields, i) => ({ id: `s${String(i + 1)}`, fields })) },
});

interface PageSpec {
  ref: string;
  template: string;
  title: string;
  group: string;
  icon: string;
  order: number;
  table?: string;
  config: Record<string, unknown>;
}

const SPECS: PageSpec[] = [
  {
    ref: "hotel-overview",
    template: "page-dashboard",
    title: "Overview",
    group: "overview",
    icon: "layout-dashboard",
    order: 0,
    config: { layout: OVERVIEW_LAYOUT },
  },

  // ── the records ─────────────────────────────────────────────────────────────
  {
    ref: "hotel-reservations",
    template: "page-crud",
    title: "Reservations",
    group: "records",
    icon: "book-open",
    order: 1,
    table: "stays",
    config: form(
      [title("ref"), f("status", { control: "segmented" }), day("arrive"), day("depart"), f("nights"), f("guests", { control: "stepper" })],
      [ref("room_type_id"), ref("room_id"), f("arrival_time"), day("expect_by"), f("channel", { control: "segmented" }), f("language")],
      [f("first_name"), f("last_name"), f("email", { control: "email" }), f("mobile", { control: "phone" }), wide("note"), ref("customer_id")],
      [
        rows("stay_extras", [
          { column: "extra_id", control: "reference", width: "2fr" },
          { column: "state", width: "110px" },
          { column: "nights", width: "80px" },
          { column: "guests", width: "80px" },
          { column: "amount", control: "currency", width: "110px" },
        ]),
      ],
      [
        money("room_total"),
        money("extras_total"),
        money("charges_total"),
        money("credits_total"),
        money("subtotal"),
        f("tax_label"),
        f("tax_rate", { control: "number" }),
        money("tax"),
        money("total"),
        money("paid"),
        money("balance"),
      ],
      [when("cancel_by"), f("cancel_code", { control: "select" }), toggle("late_cancel"), when("cancelled_at"), f("cancelled_by"), when("no_show_marked_at")],
      [when("created_at"), when("checked_in_at"), f("checked_in_by"), when("checked_out_at"), f("checked_out_by"), toggle("link_stopped")],
    ),
  },
  {
    ref: "hotel-guests",
    template: "page-crud",
    title: "Guests",
    group: "records",
    icon: "contact",
    order: 2,
    table: "customers",
    config: form([f("first_name"), f("last_name"), f("email", { control: "email" }), when("created_at"), when("forgotten_at")]),
  },
  {
    ref: "hotel-charges",
    template: "page-crud",
    title: "Charges",
    group: "records",
    icon: "receipt",
    order: 3,
    table: "charges",
    config: form(
      [ref("stay_id"), ref("charge_item_id"), f("label"), money("amount"), wide("note", "text")],
      [day("charged_on"), f("recorded_by"), toggle("voided"), wide("void_reason", "text"), when("voided_at"), f("voided_by")],
    ),
  },
  {
    ref: "hotel-nights-not-stayed",
    template: "page-crud",
    title: "Nights not stayed",
    group: "records",
    icon: "calendar-minus",
    order: 4,
    table: "stay_credits",
    config: form(
      [ref("stay_id"), f("reason", { control: "segmented" }), day("from_date"), day("to_date"), f("nights"), money("room_amount"), money("amount")],
      [f("recorded_by"), when("created_at"), toggle("voided"), wide("void_reason", "text"), when("voided_at"), f("voided_by")],
    ),
  },
  {
    ref: "hotel-payments",
    template: "page-crud",
    title: "Payments",
    group: "records",
    icon: "wallet",
    order: 5,
    table: "payments",
    config: form(
      [ref("stay_id"), f("kind", { control: "segmented" }), money("amount"), f("method", { control: "segmented" }), f("reference"), wide("note", "text")],
      [day("paid_on"), when("recorded_at"), f("recorded_by"), toggle("voided"), wide("void_reason", "text"), when("voided_at"), f("voided_by")],
    ),
  },
  {
    ref: "hotel-messages",
    template: "page-crud",
    title: "Messages",
    group: "records",
    icon: "message-square",
    order: 6,
    table: "messages",
    config: form([
      f("kind"),
      f("status", { control: "select" }),
      f("to_address", { control: "email" }),
      f("language"),
      ref("stay_id"),
      ref("customer_id"),
      when("due"),
      when("sent_at"),
      f("skip_reason", { control: "select" }),
      wide("error", "text"),
    ]),
  },

  // ── the house ───────────────────────────────────────────────────────────────
  {
    ref: "hotel-room-types",
    template: "page-crud",
    title: "Room types",
    group: "manage",
    icon: "bed-double",
    order: 1,
    table: "room_types",
    config: form(
      [title("name"), f("code"), money("base_rate"), f("sleeps", { control: "stepper" }), wide("blurb", "text"), wide("description")],
      [
        rows("room_type_features", [
          { column: "feature", width: "3fr" },
          { column: "icon", width: "1fr" },
          { column: "position", width: "80px" },
        ]),
      ],
      [f("color"), f("icon"), f("position", { control: "stepper" }), toggle("active")],
    ),
  },
  {
    ref: "hotel-rooms",
    template: "page-crud",
    title: "Rooms",
    group: "manage",
    icon: "door-open",
    order: 2,
    table: "rooms",
    config: form([title("number"), f("floor", { control: "stepper" }), ref("room_type_id"), f("sleeps"), f("status", { control: "segmented" }), wide("note", "text")]),
  },
  {
    ref: "hotel-out-of-service",
    template: "page-crud",
    title: "Out of service",
    group: "manage",
    icon: "wrench",
    order: 3,
    table: "room_closures",
    config: form([ref("room_id"), day("from_date"), day("to_date"), wide("reason", "text"), toggle("active"), f("set_by"), when("created_at")]),
  },
  {
    ref: "hotel-rate-rules",
    template: "page-crud",
    title: "Rate rules",
    group: "manage",
    icon: "tags",
    order: 4,
    table: "rate_rules",
    config: form([title("name"), ref("room_type_id"), money("amount"), f("weekdays"), day("from_date"), day("to_date"), toggle("active")]),
  },
  {
    ref: "hotel-extras",
    template: "page-crud",
    title: "Extras",
    group: "manage",
    icon: "croissant",
    order: 5,
    table: "extras",
    config: form(
      [title("label"), f("short"), f("code"), money("amount"), f("per", { control: "segmented" }), f("spaces", { control: "stepper" })],
      [wide("how", "text"), f("icon"), f("position", { control: "stepper" }), toggle("active")],
    ),
  },
  {
    ref: "hotel-charge-items",
    template: "page-crud",
    title: "Charge items",
    group: "manage",
    icon: "list-plus",
    order: 6,
    table: "charge_items",
    config: form([title("label"), f("detail"), money("amount"), ref("extra_id"), f("icon"), f("position", { control: "stepper" }), toggle("active")]),
  },
  {
    ref: "hotel-settings",
    template: "page-crud",
    title: "Settings",
    group: "manage",
    icon: "settings",
    order: 7,
    table: "settings",
    config: form(
      [title("name"), f("phone", { control: "phone" }), f("email", { control: "email" }), wide("address", "text"), f("town"), f("since", { control: "number" })],
      [wide("about", "text"), wide("finding"), wide("morning"), wide("directions_train"), wide("directions_car"), wide("directions_foot")],
      [f("arrive_from"), f("leave_by"), f("late_until"), f("no_show_at"), f("breakfast_hours"), f("late_arrival_note")],
      [
        f("tax_label"),
        f("tax_rate", { control: "number" }),
        f("cancel_days", { control: "stepper" }),
        f("max_nights", { control: "stepper" }),
        f("ahead_days", { control: "stepper" }),
        f("ref_prefix"),
        f("ref_start", { control: "number" }),
      ],
      [toggle("guest_emails_on")],
    ),
  },
  {
    ref: "hotel-house-notes",
    template: "page-crud",
    title: "House notes",
    group: "manage",
    icon: "sticky-note",
    order: 8,
    table: "house_notes",
    config: form([wide("text", "text"), f("icon"), f("position", { control: "stepper" })]),
  },
];

/** A page as the manifest carries it. */
const pageOf = (spec: PageSpec) => ({
  ref: spec.ref,
  template: spec.template,
  title: { key: `mft.${spec.ref.replaceAll("-", ".")}`, fallback: spec.title },
  titles: titles(spec.title),
  nav: { group: spec.group, icon: spec.icon, order: spec.order },
  ...(spec.table === undefined ? {} : { bindings: { rows: spec.table } }),
  config: spec.config,
});

export function pages(): unknown[] {
  return SPECS.map(pageOf);
}

/** Every page's ref, in order (the manager's role grants them by name). */
export const PAGE_REFS = SPECS.map((spec) => spec.ref);
