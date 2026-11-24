/**
 * The hotel's tables, as the manifest asks Adminium to make them.
 *
 * Everything the guest site, the front desk and the dashboard read or write is
 * here, and so is every rule the server keeps on their behalf — a rule the
 * browser keeps is a rule another browser can skip:
 *
 *   - a reservation's reference runs without gaps from the first number in
 *     Settings; its room is priced night by night from the room type's rate
 *     and the rate rules that match each night; its extras copy their prices
 *     and follow the stay's nights and guests; the tax is the rate of the day
 *     it was made, kept with it; the total, what was paid and what is still
 *     owing are worked out by the server, never sent by a page;
 *   - a room type sells no more rooms a night than it has, less the ones out
 *     of service; one room holds one stay a night; a stay runs from one night
 *     to the most the house allows, two at least from a Saturday, and not
 *     further ahead than the house takes reservations; parking sells no more
 *     spaces a night than there are;
 *   - a stay moves booked → in house → departed; a booked stay may be
 *     cancelled (marked late once its cancel-by moment has passed) or marked
 *     a no-show; the clock marks one on the morning after the day it was
 *     expected; checking in needs a ready room and makes it occupied, checking
 *     out needs nothing owing and sends the room to be cleaned;
 *   - money cannot run backwards: a payment, a void or a credit that would
 *     leave more paid than the stay costs is refused;
 *   - once the house takes payments online (switched on in Adminium's
 *     Payments), a guest may pay the first night or the whole stay as they
 *     reserve, by the house's choice: if they want, or before the room is
 *     theirs. Asked to pay first, the stay is made waiting for the payment,
 *     its room held for a few minutes; the payment books it, and a stay left
 *     unpaid past the hold lets its room go — never while a payment for it is
 *     still on its way. What is left on a folio can be paid by a pay link.
 *     Money paid online is Adminium's to write, with the service it went
 *     through; money given back of it is a row of the stay's own payments,
 *     sent back through that service.
 *
 * The house's own words — the room types, the extras, the notes — are the
 * house's, shown as typed.
 */
import { l, type Labels } from "./labels.ts";

type Tone = "pos" | "warn" | "danger" | "info" | "neutral" | "accent";

export interface Column {
  ref: string;
  type: "int" | "text" | "decimal" | "money" | "bool" | "enum" | "date" | "timestamptz" | "fk";
  role?: "pk" | "created_at";
  semantic?: "name" | "email" | "image" | "money";
  nullable?: true;
  enum?: string[];
  references?: string;
  default?: string | number | boolean;
  maxLength?: number;
  unique?: true;
  index?: true;
  scale?: number | "currency";
  rules?: Record<string, unknown>;
  label?: Labels | Record<string, string>;
}

export interface Table {
  ref: string;
  label: Labels | Record<string, string>;
  labelPlural: Labels | Record<string, string>;
  keyField?: string;
  unique?: string[][];
  capacity?: Record<string, unknown> | Record<string, unknown>[];
  states?: Record<string, unknown>;
  /** The price question an add-on answers inside every save of this table. */
  adjust?: Record<string, unknown>;
  /** What this table hands an add-on's ledger, and when. */
  postings?: Record<string, unknown>[];
  /** The law makes the house keep these rows (a stay is the guest register and its bill): an erasure leaves them as they are. */
  keep?: { law: "tax" | "health" | "contract" | "safety" };
  columns: Column[];
}

/** The record of a stay and its money, kept for the tax years whoever asks to be forgotten. */
const KEPT_FOR_TAX = { law: "tax" } as const;

// ── column makers ───────────────────────────────────────────────────────────

const id: Column = { ref: "id", type: "int", role: "pk" };
const opt = { nullable: true } as const;

function text(ref: string, maxLength: number, label: string, more: Partial<Column> = {}): Column {
  return { ref, type: "text", maxLength, label: l(label), ...more };
}
function int(ref: string, label: string, more: Partial<Column> = {}): Column {
  return { ref, type: "int", label: l(label), ...more };
}
function bool(ref: string, label: string, value: boolean): Column {
  return { ref, type: "bool", default: value, label: l(label) };
}
function fk(ref: string, references: string, label: string, more: Partial<Column> = {}): Column {
  return { ref, type: "fk", references, label: l(label), ...more };
}
function date(ref: string, label: string, more: Partial<Column> = {}): Column {
  return { ref, type: "date", label: l(label), ...more };
}
function at(ref: string, label: string, more: Partial<Column> = {}): Column {
  return { ref, type: "timestamptz", label: l(label), ...more };
}
/** A price the house types: the connection's currency decides the places. */
function price(ref: string, label: string, more: Partial<Column> = {}): Column {
  return { ref, type: "decimal", scale: "currency", label: l(label), ...more };
}
/** Money Adminium works out. */
function money(ref: string, label: string, rules: Record<string, unknown>): Column {
  return { ref, type: "decimal", scale: "currency", nullable: true, label: l(label), rules };
}
/** Money somebody else decides (an add-on's answer), or nobody has yet: empty until then. */
function amount(ref: string, label: string): Column {
  return { ref, type: "decimal", scale: "currency", nullable: true, label: l(label) };
}
/** A row of an add-on's table, by its key. No database link: the add-on may be away, and its table with it. */
function link(ref: string, addOn: string, table: string, label: string, rules: Record<string, unknown> = {}): Column {
  return { ref, type: "int", nullable: true, label: l(label), rules: { addOnLink: { addOn, table }, ...rules } };
}
/** A wall time on the house's clock, "15:00". */
function clock(ref: string, label: string, value: string): Column {
  return { ref, type: "text", maxLength: 5, default: value, label: l(label) };
}
/** An enum, each value labelled, with tones where a list shows it as a chip. */
function choice(
  ref: string,
  label: string,
  values: Record<string, string>,
  more: Partial<Column> & { tones?: Record<string, Tone> } = {},
): Column {
  const { tones, rules, ...rest } = more;
  return {
    ref,
    type: "enum",
    enum: Object.keys(values),
    label: l(label),
    ...rest,
    rules: {
      ...rules,
      enumLabels: {
        labels: Object.fromEntries(Object.entries(values).map(([value, word]) => [value, l(word)])),
        ...(tones === undefined ? {} : { tones }),
      },
    },
  };
}

const stamp = (set: unknown, on: unknown) => ({ stamp: { set, on } });
const onCreate = "create";
const onStatus = (...values: string[]) => ({ column: "status", values });
const setting = (column: string) => ({ table: "settings", column });
const voidedNow = { column: "voided", values: [true] };

// ── the words the tables share ──────────────────────────────────────────────

/** The eight languages a stay may be kept in, by their own names. */
export const LANGUAGES: Record<string, string> = {
  "en-US": "English",
  "de-DE": "Deutsch",
  "fr-FR": "Français",
  "da-DK": "Dansk",
  "cs-CZ": "Čeština",
  "ar-EG": "العربية",
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
};

/** A language column: the emails read their language from it. */
function language(ref: string): Column {
  return {
    ref,
    type: "text",
    maxLength: 16,
    nullable: true,
    label: l("Language"),
    rules: { options: { values: Object.entries(LANGUAGES).map(([value, label]) => ({ value, label })) } },
  };
}

export const STATUSES = ["pending_payment", "booked", "in_house", "departed", "cancelled", "no_show"] as const;

/** The stays a night counts: every one still coming, every one in the house, and one held while its guest pays. */
export const COUNTED = ["pending_payment", "booked", "in_house"];

/**
 * The times a guest may say they will arrive. "22:30" is the late arrival:
 * the house leaves a key.
 */
export const ARRIVAL_TIMES = ["15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "22:30"];

/**
 * Why a stay was cancelled. `self` is written by the guest's own cancel
 * online and never offered to the desk; the desk says whether the guest asked
 * or the house is cancelling. A cancellation by the house is never the guest's
 * late cancellation.
 */
export const CANCEL_CODES = ["self", "guest_asked", "house", "unpaid"] as const;
export const DESK_CANCEL_CODES = ["guest_asked", "house"];

const WHO_CANCELLED = {
  self: "The guest, online",
  guest_asked: "The guest asked the desk",
  house: "The house",
  // A stay made waiting for its payment, left unpaid past the hold: its room went back. Nothing was taken.
  unpaid: "Not paid in time",
};

/** When a guest pays online for a stay they reserve: never (the default), if they want, or before the room is theirs. */
const PAY_AT_BOOKING = {
  none: "Nothing online (they settle at the desk)",
  optional: "Let them pay now if they want",
  required: "Ask them to pay now",
};
/** What a guest pays as they reserve: one night of the room with its tax, or the whole stay. */
const PAY_HOW_MUCH = { one_night: "One night", whole_stay: "The whole stay" };

/** Nothing: a formula's way of leaving a column empty (an email leaves out what reads it). */
const EMPTY = { div: [0, 0] };
/** A figure, or nothing when it is not above zero. */
const shownIf = (column: string) => ({ if: [{ gt: [{ coalesce: [column, 0] }, 0] }, column, EMPTY] });
/** The guest chose to pay as they booked, and has not paid what that was yet. */
const PAYING_NOW = { and: [{ eq: ["pay_now", true] }, { lt: [{ coalesce: ["paid", 0] }, "deposit"] }] };
/** What the stay still owes, never below nothing. */
const STILL_OWED = { max: [0, { sub: ["total", { coalesce: ["paid", 0] }] }] };

/** The outbox's kinds, as the Messages page names them: the emails, and the texts. */
export const EMAIL_KINDS: Record<string, string> = {
  "stay-made": "Reservation made",
  "stay-made-desk": "Reservation made at the desk",
  "stay-cancelled-self": "Cancelled by the guest",
  "stay-cancelled-self-late": "Cancelled by the guest, late",
  "stay-cancelled-desk": "Cancelled at the guest's request",
  "stay-cancelled-desk-late": "Cancelled at the guest's request, late",
  "stay-cancelled-house": "Cancelled by the house",
  "stay-no-show": "We missed you",
  "stay-dates-changed": "Dates changed",
  "stay-new-link": "A new link",
  "stay-folio": "The folio",
  "stay-folio-owing": "The folio so far",
  "stay-made-pay": "Reservation made, paying online",
  "stay-folio-owing-pay": "The folio so far, with a pay link",
  "stay-arriving": "Before the arrival",
  "stay-arriving-text": "Before the arrival, by text",
  "stay-dates-changed-text": "Dates changed, by text",
};

// ── the stay's rules ────────────────────────────────────────────────────────

/** Rooms out of service, as both night pools read them. */
const OUT_OF_SERVICE = { table: "room_closures", room: "room_id", from: "from_date", to: "to_date", active: "active" };

/** The type pool and the room pool: no type over-sold, no room given twice a night. */
const NIGHT_RULES = [
  {
    kind: "night",
    from: "arrive",
    to: "depart",
    countWhere: { column: "status", values: COUNTED },
    pool: {
      via: "room_type_id",
      count: { table: "rooms", column: "room_type_id", outOfService: OUT_OF_SERVICE },
      fits: { column: "sleeps" },
      // A room given to a stay counts against its own type, so a guest given
      // a better room at the booked price takes that type's room.
      given: { via: "room_id", column: "room_type_id" },
    },
    nights: { min: 1, max: setting("max_nights"), minByArrival: { sat: 2 }, aheadDays: setting("ahead_days") },
    // A guest in the house moved to another room or type is judged from tonight on.
    arrived: { states: ["in_house"] },
  },
  {
    kind: "night",
    from: "arrive",
    to: "depart",
    countWhere: { column: "status", values: COUNTED },
    pool: { via: "room_id", size: 1, outOfService: OUT_OF_SERVICE },
    arrived: { states: ["in_house"] },
  },
];

/** The moment the arrival day starts on the house's clock. */
const arrivalDay = { column: "arrive", time: "00:00" };
/** The morning after the day a stay was expected, at the no-show time. */
const noShowAt = {
  column: "expect_by",
  time: setting("no_show_at"),
  plus: { days: 1 },
  or: [{ column: "arrive", time: setting("no_show_at"), plus: { days: 1 } }],
};
/** The last morning of a stay, at the leaving time. */
const lastMorning = { column: "depart", time: setting("leave_by") };
/** A ready room, given in the same write or before it. */
const readyRoom = {
  where: [{ column: "room_id", isNull: false }],
  linked: [{ via: "room_id", where: [{ column: "status", eq: "ready" }] }],
};

const STAY_STATES = {
  column: "status",
  initial: "booked",
  // A guest asked to pay as they reserve: the stay is made waiting for the payment, its room held.
  starts: ["pending_payment"],
  // "Checked in at 15:04 by Maeve R.": a second desk's tap is refused, naming the first.
  strict: true,
  moves: {
    // The payment books it (Adminium's own move); a manager may book it by hand (a guest who paid by telephone).
    // Left unpaid past the hold, Adminium lets the room go.
    pending_payment: [
      { to: "booked", roles: ["manager"] },
      { to: "cancelled", requires: { where: [{ column: "cancel_code", isNull: false }] } },
    ],
    booked: [
      { to: "in_house", requires: { ...readyRoom, time: { after: arrivalDay } } },
      { to: "cancelled", requires: { where: [{ column: "cancel_code", isNull: false }] } },
      // From the time the guest said they would come, or the arrival afternoon when they said none.
      {
        to: "no_show",
        requires: { time: { after: { column: "arrive", time: { column: "arrival_time" }, or: [{ column: "arrive", time: setting("arrive_from") }] } } },
      },
    ],
    in_house: [
      { to: "departed", requires: { where: [{ column: "balance", lte: 0 }] } },
      // A check-in made by mistake.
      { to: "booked", roles: ["manager"] },
    ],
    // They came after all: while a night of the stay is left.
    no_show: [
      // Taken back: the no-show mark is emptied.
      { to: "booked", undo: true, requires: { time: { before: lastMorning } } },
      { to: "in_house", requires: { ...readyRoom, time: { before: lastMorning } } },
    ],
  },
  // A finished stay keeps what it was.
  lock: { when: ["departed", "cancelled"], except: ["link_stopped", "language"] },
  children: {
    stay_extras: { via: "stay_id", parentIn: ["pending_payment", "booked", "in_house"] },
    // A code is typed when the stay is booked; it is kept with the stay, and nothing adds one to a finished stay.
    stay_codes: { via: "stay_id", parentIn: ["pending_payment", "booked", "in_house"] },
    // Charged while the stay is live; voided whatever state it is in, so a
    // manager can correct what was recorded before it closed.
    charges: { via: "stay_id", createIn: ["booked", "in_house"], changeIn: [...STATUSES] },
    // Nights not stayed: at check-out, or a missed night when a no-show comes after all.
    stay_credits: { via: "stay_id", createIn: ["in_house", "no_show"], changeIn: [...STATUSES] },
  },
  // Inside the cancel-by moment a cancellation is marked late. Nothing is charged.
  late: [{ to: "cancelled", from: ["booked"], moment: { column: "cancel_by" }, within: { minutes: 0 }, mode: "flag", flag: "late_cancel" }],
  timed: [
    // Not come by the morning after the day they were expected: a no-show, the nights freed.
    { from: "booked", to: "no_show", at: noShowAt },
    // Not paid by the end of the hold: the room goes back, nothing taken — never while a payment for it is on its way.
    {
      from: "pending_payment",
      to: "cancelled",
      at: { column: "created_at", plus: { minutes: setting("pay_hold_minutes") } },
      set: { cancel_code: "unpaid", pay_lapsed: true },
      waitsForPayment: true,
    },
  ],
  // Checking in makes the room occupied; checking out sends it to be cleaned.
  effects: [
    { on: { to: "in_house" }, via: "room_id", set: { status: "occupied" } },
    { on: { to: "departed" }, via: "room_id", set: { status: "cleaning" } },
    // A guest in the house moved to another room: the room left is cleaned, the
    // room given (which must be ready) is theirs — in the same write.
    { on: { change: "room_id", in: ["in_house"] }, old: { set: { status: "cleaning" } }, new: { set: { status: "occupied" } } },
  ],
};

/**
 * What an extra costs a night: per person, per night, or nothing for one
 * charged once a stay.
 */
const EXTRA_NIGHTLY = {
  if: [
    { eq: ["per", "person_night"] },
    { mul: ["each", { coalesce: ["guests", 1] }] },
    { if: [{ eq: ["per", "night"] }, "each", 0] },
  ],
};

// ── the tables ──────────────────────────────────────────────────────────────

export const TABLES: Table[] = [
  {
    ref: "settings",
    label: l("House settings"),
    labelPlural: l("House settings"),
    keyField: "name",
    columns: [
      id,
      text("name", 80, "Name"),
      // A business's own address and phone, shown on its guest site: not a person's.
      text("address", 160, "Address", { rules: { personal: false } }),
      text("town", 80, "Town", { ...opt, rules: { personal: false } }),
      text("phone", 32, "Phone", { rules: { personal: false, validation: { format: "phone" } } }),
      text("email", 254, "Email", { ...opt, semantic: "email", rules: { personal: false, validation: { format: "email" } } }),
      int("since", "Since", { ...opt, rules: { validation: { min: 1000, max: 3000 } } }),
      // The house's own words for its site; empty, the site leaves the line out.
      text("about", 200, "About line", opt),
      text("finding", 280, "Finding us", opt),
      text("morning", 280, "The morning", opt),
      text("directions_train", 280, "By train", opt),
      text("directions_car", 280, "By car", opt),
      text("directions_foot", 280, "On foot", opt),
      text("breakfast_hours", 40, "Breakfast hours", opt),
      text("late_arrival_note", 80, "Late arrival words", opt),
      { ref: "tax_rate", type: "decimal", scale: 3, default: 0, label: l("Tax rate (%)"), rules: { validation: { min: 0, max: 100 } } },
      text("tax_label", 60, "Tax name", { default: "Tax" }),
      // The house's words for a credit of nights not stayed, as its folio prints it.
      text("credit_label", 60, "Folio line for nights not stayed", { default: "Nights not stayed" }),
      clock("arrive_from", "Arrive from", "15:00"),
      clock("leave_by", "Leave by", "11:00"),
      clock("late_until", "Late leaving until", "14:00"),
      clock("no_show_at", "No-show time", "11:00"),
      int("cancel_days", "Days' notice to cancel", { default: 2, rules: { validation: { min: 0, max: 30 } } }),
      int("max_nights", "Longest stay (nights)", { default: 14, rules: { validation: { min: 1, max: 60 } } }),
      int("ahead_days", "Days ahead a guest may reserve", { default: 365, rules: { validation: { min: 1, max: 730 } } }),
      int("ref_start", "First reference number", { default: 1001, rules: { validation: { min: 1 } } }),
      text("ref_prefix", 12, "Reference prefix", { default: "R-" }),
      bool("guest_emails_on", "Email guests", true),
      // Texts go only once Adminium is connected to a text service, and only to a guest who ticked the box for them.
      bool("guest_texts_on", "Text guests", true),
      // The message before a stay: so many hours before the room is ready on the arrival day, sent at 10:00 that day.
      int("arrival_hours", "Arrival message, hours before", { default: 24, rules: { validation: { min: 1, max: 72 } } }),
      // Paying online, once the house takes payments: nothing when booking (the guests settle at the desk), the
      // guest's choice, or before the room is theirs; the first night or the whole stay; how long a room is held
      // while its guest pays; and whether a cancellation in time gives the money back by itself.
      choice("pay_at_booking", "When guests book", PAY_AT_BOOKING, { default: "none" }),
      choice("pay_how_much", "How much they pay when booking", PAY_HOW_MUCH, { default: "one_night" }),
      int("pay_hold_minutes", "Room held while a guest pays (minutes)", { default: 15, rules: { validation: { min: 5, max: 60 } } }),
      bool("auto_refund", "Refund cancellations in time automatically", true),
      // How many hours before the free-cancellation time a refund stops starting by itself: none, so up to that moment.
      int("auto_refund_stop_hours", "Automatic refunds stop (hours before the time to cancel at no charge)", { default: 0, rules: { validation: { min: 0, max: 720 } } }),
    ],
  },
  {
    ref: "house_notes",
    label: l("House note"),
    labelPlural: l("House notes"),
    keyField: "text",
    columns: [id, text("icon", 40, "Icon", opt), text("text", 160, "Note"), int("position", "Position", { default: 0 })],
  },
  {
    ref: "room_types",
    label: l("Room type"),
    labelPlural: l("Room types"),
    keyField: "name",
    columns: [
      id,
      text("code", 8, "Code", { unique: true }),
      text("name", 80, "Name"),
      text("blurb", 200, "Short line", opt),
      text("description", 600, "Description", opt),
      int("sleeps", "Sleeps", { default: 2, rules: { validation: { min: 1, max: 8 } } }),
      price("base_rate", "Rate a night", { rules: { validation: { min: 0 } } }),
      text("color", 16, "Colour", opt),
      text("icon", 40, "Icon", opt),
      int("position", "Position", { default: 0 }),
      bool("active", "Offered", true),
      // A room type's own lead for the arrival message; empty, the house's.
      int("arrival_hours", "Arrival message, hours before", { ...opt, rules: { validation: { min: 1, max: 72 } } }),
    ],
  },
  {
    ref: "room_type_features",
    label: l("Feature"),
    labelPlural: l("Features"),
    keyField: "feature",
    columns: [
      id,
      fk("room_type_id", "room_types", "Room type"),
      text("feature", 120, "Feature"),
      text("icon", 40, "Icon", opt),
      int("position", "Position", { default: 0 }),
    ],
  },
  {
    ref: "rooms",
    label: l("Room"),
    labelPlural: l("Rooms"),
    keyField: "number",
    // Ready → occupied at check-in, occupied → being cleaned at check-out, and
    // both when a guest is moved, are made by the stay's own writes. By hand,
    // housekeeping and the desk move a room between ready and being cleaned;
    // a manager puts right a room a mistaken check-in left occupied.
    states: {
      column: "status",
      initial: "ready",
      moves: {
        ready: ["cleaning", { to: "occupied", roles: ["manager"] }],
        cleaning: ["ready"],
        occupied: [{ to: "cleaning", roles: ["manager"] }],
      },
    },
    columns: [
      id,
      text("number", 8, "Number", { unique: true }),
      int("floor", "Floor", { default: 1 }),
      fk("room_type_id", "room_types", "Room type"),
      // What the room sleeps, as its type does: a guest given another room is checked against it.
      int("sleeps", "Sleeps", { ...opt, rules: { copy: { via: "room_type_id", from: "sleeps", mode: "always", follow: true } } }),
      choice("status", "Status", { ready: "Ready", occupied: "Occupied", cleaning: "Being cleaned" }, {
        default: "ready",
        tones: { ready: "pos", occupied: "info", cleaning: "warn" },
      }),
      text("note", 160, "Note", opt),
    ],
  },
  {
    ref: "room_closures",
    label: l("Out of service"),
    labelPlural: l("Out of service"),
    keyField: "reason",
    columns: [
      id,
      fk("room_id", "rooms", "Room"),
      date("from_date", "From"),
      // The last night out of service; empty, until further notice.
      date("to_date", "Last night out", { ...opt, rules: { notBefore: { column: "from_date" } } }),
      text("reason", 160, "Reason", opt),
      bool("active", "On", true),
      text("set_by", 80, "Set by", { ...opt, rules: stamp("user-name", onCreate) }),
      at("created_at", "Set on", { ...opt, rules: stamp("now", onCreate) }),
    ],
  },
  {
    ref: "rate_rules",
    label: l("Rate rule"),
    labelPlural: l("Rate rules"),
    keyField: "name",
    columns: [
      id,
      // Empty: every room type.
      fk("room_type_id", "room_types", "Room type", opt),
      text("name", 60, "Name"),
      // The nights it applies on, "fri,sat"; empty, every night.
      text("weekdays", 27, "Nights of the week", opt),
      date("from_date", "First night", opt),
      date("to_date", "Last night", { ...opt, rules: { notBefore: { column: "from_date" } } }),
      price("amount", "Added a night"),
      bool("active", "On", true),
    ],
  },
  {
    ref: "extras",
    label: l("Extra"),
    labelPlural: l("Extras"),
    keyField: "label",
    columns: [
      id,
      text("code", 16, "Code", { ...opt, unique: true }),
      text("label", 80, "Name"),
      text("short", 40, "Short name", opt),
      text("how", 120, "How it is charged", opt),
      text("icon", 40, "Icon", opt),
      price("amount", "Price", { rules: { validation: { min: 0 } } }),
      choice("per", "Charged", { person_night: "Per person, per night", night: "Per night", stay: "Once a stay" }, { default: "night" }),
      // Parking behind the house: six spaces a night. Empty, no limit.
      int("spaces", "Spaces a night", { ...opt, rules: { validation: { min: 0 } } }),
      bool("active", "Offered", true),
      int("position", "Position", { default: 0 }),
    ],
  },
  {
    ref: "charge_items",
    label: l("Charge item"),
    labelPlural: l("Charge items"),
    keyField: "label",
    columns: [
      id,
      text("label", 80, "Name"),
      text("detail", 80, "Detail", opt),
      price("amount", "Price", { rules: { validation: { min: 0 } } }),
      text("icon", 40, "Icon", opt),
      // The extra this is one of: the desk is warned when the stay already has it.
      fk("extra_id", "extras", "Same as the extra", opt),
      bool("active", "Offered", true),
      int("position", "Position", { default: 0 }),
    ],
  },
  {
    ref: "customers",
    label: l("Guest"),
    labelPlural: l("Guests"),
    keyField: "email",
    columns: [
      id,
      text("email", 254, "Email", { ...opt, unique: true, semantic: "email", rules: { normalize: "email", validation: { format: "email" } } }),
      text("first_name", 60, "First name", opt),
      text("last_name", 60, "Surname", opt),
      // Joined from their own names, as a stay's guest is: what names them wherever a person is listed.
      text("full_name", 130, "Full name", { ...opt, semantic: "name", rules: { personal: true, formula: { join: ["first_name", " ", "last_name"] } } }),
      // The language of their first reservation: what the house writes to them in.
      language("language"),
      // The newsletter's yes, kept in step with Adminium's consent log: set by the tick on a reservation, never by hand on the site.
      bool("opt_in", "News from us", false),
      // Their mobile, as their first reservation gave it: what a run of offers from Adminium's Texts reads (and only
      // for a number they said yes to offers for). A text about a stay goes to the mobile on the stay itself. No rule
      // works it out: a total over the stays' boxes cannot be kept on an install that is updated, where a column the
      // update adds may be empty.
      text("mobile", 32, "Mobile", { ...opt, rules: { personal: true } }),
      at("forgotten_at", "Details deleted", opt),
      at("created_at", "First stay", { ...opt, rules: stamp("now", onCreate) }),
    ],
  },
  {
    ref: "stays",
    keep: KEPT_FOR_TAX,
    label: l("Reservation"),
    labelPlural: l("Reservations"),
    keyField: "ref",
    capacity: NIGHT_RULES,
    states: STAY_STATES,
    // Offers & gift cards works out what a code or a voucher takes off the room and the extras, inside the save.
    adjust: {
      by: { addOn: "offers" },
      needs: "codes",
      lines: [
        // The room: the stay itself is the line, its amount the nights together, each night with its own price.
        {
          self: true,
          price: "room_total",
          quantity: "nights",
          discount: "room_discount",
          what: [{ column: "room_type_id", as: "item" }],
          nights: { from: "arrive", to: "depart", rate: "room_total" },
        },
        // Each extra on the stay; a dropped one is no line. A charge at the bar is never reduced.
        {
          table: "stay_extras",
          via: "stay_id",
          price: "amount",
          discount: "discount",
          what: [{ column: "extra_id", as: "item" }],
          only: { column: "state", eq: "on" },
        },
      ],
      order: {
        discount: "discount",
        // Who is staying: a signed-in guest, or a guest the desk names. An earlier stay counts unless it was cancelled or never came.
        customer: { link: "customer_id", address: "email", proved: "customer_proved", counts: { column: "status", in: ["booked", "in_house", "departed"] } },
      },
      codes: { table: "stay_codes", via: "stay_id", typed: "typed", code: "code_id", voucher: "voucher_id", removed: "removed_at" },
      uses: "uses",
      frozen: { to: ["departed", "cancelled", "no_show"] },
      expect: "total",
    },
    postings: [
      // A code's use is taken when the stay is booked and given back when it is cancelled. A no-show keeps it.
      { id: "uses", into: { addOn: "offers", ledger: "value", action: "redeem" }, needs: "codes", post: { on: { create: true } }, reverse: { on: { to: ["cancelled"] } }, map: {} },
      // At check-out the room type's linen goes to the laundry and its amenities are used, as Inventory's links say.
      // Never taken back: a finished stay is closed, and a wrong check-out is put right by a transfer.
      {
        id: "turnover",
        into: { addOn: "inventory", ledger: "stock", action: "use" },
        needs: "linen-and-supplies",
        post: { on: { to: ["departed"] } },
        map: { what: "room_type_id", quantity: { value: 1 }, kind: { value: "used" } },
        multipliers: { night: "nights", guest: "guests" },
      },
    ],
    columns: [
      id,
      int("ref_seq", "Reference (running)", {
        ...opt,
        rules: { sequence: { gapless: true, startSetting: setting("ref_start") } },
      }),
      text("ref", 16, "Reference", { ...opt, unique: true, rules: { format: { from: "ref_seq", prefixSetting: setting("ref_prefix") } } }),
      choice("status", "Status", {
        pending_payment: "Waiting for payment",
        booked: "Booked",
        in_house: "In house",
        departed: "Checked out",
        cancelled: "Cancelled",
        no_show: "No-show",
      }, {
        default: "booked",
        tones: { pending_payment: "neutral", booked: "info", in_house: "pos", departed: "neutral", cancelled: "danger", no_show: "warn" },
      }),
      fk("room_type_id", "room_types", "Room type", { index: true }),
      fk("room_id", "rooms", "Room", { ...opt, index: true }),
      date("arrive", "Arriving"),
      date("depart", "Leaving"),
      int("guests", "Guests", { default: 2, rules: { validation: { min: 1, max: 8 } } }),
      int("nights", "Nights", { ...opt, rules: { formula: { daysBetween: ["arrive", "depart"] } } }),
      text("first_name", 60, "First name"),
      text("last_name", 60, "Surname", opt),
      // Joined from the guest's own names, so personal as they are.
      text("guest_name", 130, "Guest", { ...opt, semantic: "name", rules: { personal: true, formula: { join: ["first_name", " ", "last_name"] } } }),
      // A desk booking may have none; the guest's own reservation always has one.
      text("email", 254, "Email", { ...opt, semantic: "email", rules: { normalize: "email", validation: { format: "email" } } }),
      text("mobile", 32, "Mobile", { ...opt, rules: { validation: { format: "phone" } } }),
      text("arrival_time", 5, "Arriving about", {
        ...opt,
        rules: { options: { values: ARRIVAL_TIMES.map((value) => ({ value })) } },
      }),
      // What the guest writes about themselves and their stay: personal, read only where a role reads a guest's details.
      text("note", 500, "Note from the guest", { ...opt, rules: { personal: true } }),
      // The day the desk expects them, when they rang to say they would be late.
      date("expect_by", "Expected", { ...opt, rules: { notBefore: { column: "arrive" } } }),
      language("language"),
      choice("channel", "Booked via", { online: "Online", desk: "At the desk" }, { default: "online" }),
      // The money, all of it worked out here.
      money("room_total", "Room", {
        perNight: {
          from: "arrive",
          to: "depart",
          rate: { via: "room_type_id", column: "base_rate" },
          adjust: {
            table: "rate_rules",
            match: { via: "room_type_id", weekdays: "weekdays", from: "from_date", to: "to_date" },
            add: "amount",
            name: "name",
            where: { column: "active", eq: true },
          },
        },
      }),
      money("extras_total", "Extras", { rollup: { from: "stay_extras", via: "stay_id", sum: "amount", where: { column: "state", eq: "on" } } }),
      // What the extras cost a night, for a credit of nights not stayed.
      money("extras_nightly", "Extras a night", { rollup: { from: "stay_extras", via: "stay_id", sum: "nightly", where: { column: "state", eq: "on" } } }),
      money("charges_total", "Charges", { rollup: { from: "charges", via: "stay_id", sum: "amount", where: { column: "voided", eq: false } } }),
      money("credits_total", "Nights not stayed", { rollup: { from: "stay_credits", via: "stay_id", sum: "amount", where: { column: "voided", eq: false } } }),
      // What codes and vouchers took off, decided by Offers & gift cards; empty when it is not in use.
      amount("discount", "Reductions"),
      amount("room_discount", "Reduction on the room"),
      // Reductions come off before the tax. A stay from before these columns has none, and keeps its cents.
      money("subtotal", "Before tax", {
        formula: {
          sub: [
            {
              sub: [
                { add: ["room_total", { coalesce: ["extras_total", 0] }, { coalesce: ["charges_total", 0] }] },
                { coalesce: ["credits_total", 0] },
              ],
            },
            { coalesce: ["discount", 0] },
          ],
        },
      }),
      // The rate and its name of the day the stay was made, kept with it.
      { ref: "tax_rate", type: "decimal", scale: 3, nullable: true, label: l("Tax rate (%)"), rules: { default: { from: setting("tax_rate") } } },
      text("tax_label", 60, "Tax name", { ...opt, rules: { default: { from: setting("tax_label") } } }),
      money("tax", "Tax", { formula: { round: { div: [{ mul: ["subtotal", { coalesce: ["tax_rate", 0] }] }, 100] } } }),
      money("total", "Total", { formula: { add: ["subtotal", { coalesce: ["tax", 0] }] } }),
      money("paid", "Paid", {
        rollup: {
          from: "payments",
          via: "stay_id",
          sum: "signed",
          where: { column: "voided", eq: false },
          balance: { column: "balance", of: "total" },
          cap: true,
        },
      }),
      { ref: "balance", type: "decimal", scale: "currency", nullable: true, label: l("Owing") },
      bool("late_cancel", "Late cancellation", false),
      choice("cancel_code", "Who cancelled", WHO_CANCELLED, opt),
      // 15:00 two days before the arrival, on the house's clock; it moves with the arrival.
      at("cancel_by", "Cancel at no charge until", {
        ...opt,
        rules: stamp(
          { moment: { column: "arrive", time: setting("arrive_from"), minus: { days: setting("cancel_days") } } },
          { columns: ["arrive"] },
        ),
      }),
      // When the room is ready on the arrival day, on the house's clock: what the arrival message is sent ahead of.
      at("arrive_at", "Room ready from", {
        ...opt,
        rules: stamp({ moment: { column: "arrive", time: setting("arrive_from") } }, { columns: ["arrive"] }),
      }),
      at("created_at", "Made", { ...opt, rules: stamp("now", onCreate) }),
      at("checked_in_at", "Checked in", { ...opt, rules: stamp("now", onStatus("in_house")) }),
      text("checked_in_by", 80, "Checked in by", { ...opt, rules: stamp("user-name", onStatus("in_house")) }),
      at("checked_out_at", "Checked out", { ...opt, rules: stamp("now", onStatus("departed")) }),
      text("checked_out_by", 80, "Checked out by", { ...opt, rules: stamp("user-name", onStatus("departed")) }),
      at("cancelled_at", "Cancelled", { ...opt, rules: stamp("now", onStatus("cancelled")) }),
      // Staff only: a person's name, or "guest" for the guest's own cancel.
      text("cancelled_by", 80, "Cancelled by", { ...opt, rules: stamp({ byOrigin: { public: "guest", staff: "user-name" } }, onStatus("cancelled")) }),
      // When the desk last emailed the folio: settled, or so far.
      at("folio_sent_at", "Folio emailed", opt),
      at("folio_so_far_at", "Folio so far emailed", opt),
      at("no_show_marked_at", "Marked as a no-show", { ...opt, rules: { stamp: { set: "now", on: onStatus("no_show"), clearOnBack: true } } }),
      fk("customer_id", "customers", "Guest account", opt),
      // Whether the guest was signed in, or named by the desk, when a code asked who they are: Offers & gift cards is told, and it is kept.
      { ref: "customer_proved", type: "bool", nullable: true, label: l("Guest known when booking") },
      // The reservation's own link: emailed to the guest, never shown in a list.
      text("link_token", 16, "Link code", { ...opt, rules: { code: { length: 16 } } }),
      bool("link_stopped", "Link stopped", false),
      // The guest's retry key: a retried reservation lands on the same row.
      text("client_key", 64, "Retry key", { ...opt, unique: true }),
      // The tick the guest gave on their reservation ("Email me news and offers"): the guest's own, written by nobody else.
      bool("opt_in", "News from us", false),
      // The box "Text me about my stay": its own, never the email tick, never ticked for the guest and never needed to book.
      // A guest's tick is kept in Adminium's text consent log, for the mobile on this reservation.
      bool("texts_ok", "Texts about the stay", false),
      // "Text me offers from …": a second box of its own, for offers, the guest's alone; never ticked for them, never needed.
      bool("offers_ok", "Offers by text", false),
      // ── paying online ──
      // The guest chose to pay as they reserved (or was asked to): what they pay then is the deposit below.
      bool("pay_now", "Paying when booking", false),
      // What the house asked for when the stay was made, kept with it: one night, or the whole stay.
      choice("pay_part", "Paid when booking", PAY_HOW_MUCH, { ...opt, rules: { default: { from: setting("pay_how_much") } } }),
      // One night of the room at the stay's own rate, with its tax; or the whole stay. Never more than the stay costs.
      money("deposit", "Asked when booking", {
        formula: {
          if: [
            { eq: ["pay_part", "whole_stay"] },
            "total",
            {
              min: [
                "total",
                {
                  mul: [
                    { div: [{ sub: ["room_total", { coalesce: ["room_discount", 0] }] }, "nights"] },
                    { add: [1, { div: [{ coalesce: ["tax_rate", 0] }, 100] }] },
                  ],
                },
              ],
            },
          ],
        },
      }),
      // What is due online now: the deposit, while it is what the guest is paying (the stay waits for it, or they chose to
      // pay as they booked and it is not paid yet); else what the stay still owes, which a pay link asks for.
      money("pay_due", "Due online now", {
        formula: {
          if: [
            { or: [{ eq: ["status", "pending_payment"] }, PAYING_NOW] },
            { max: [0, { sub: ["deposit", { coalesce: ["paid", 0] }] }] },
            STILL_OWED,
          ],
        },
      }),
      // Paid online, and given back of it through the payment service; and what it still holds.
      money("taken_online", "Taken online", { rollup: { from: "payments", via: "stay_id", sum: "online_taken", where: { column: "voided", eq: false } } }),
      money("refunded_online", "Given back online", { rollup: { from: "payments", via: "stay_id", sum: "online_back", where: { column: "voided", eq: false } } }),
      money("paid_online", "Paid online", { formula: { sub: [{ coalesce: ["taken_online", 0] }, { coalesce: ["refunded_online", 0] }] } }),
      // What the emails say of it, each empty when it does not apply: being paid as the guest booked; nothing paid
      // online, so settled at the desk as ever; paid online with some still to settle, or the whole of it; what the house
      // still holds; what went back.
      money("pay_pending", "Being paid online", { formula: { if: [{ and: [PAYING_NOW, { lte: [{ coalesce: ["taken_online", 0] }, 0] }] }, "deposit", EMPTY] } }),
      money("settle_desk", "Settled at the desk", { formula: { if: [{ or: [{ gt: [{ coalesce: ["taken_online", 0] }, 0] }, PAYING_NOW] }, EMPTY, 0] } }),
      money("online_part", "Paid online, the rest at the desk", { formula: { if: [{ and: [{ gt: [{ coalesce: ["paid_online", 0] }, 0] }, { gt: [STILL_OWED, 0] }] }, "paid_online", EMPTY] } }),
      money("online_full", "Paid online in full", { formula: { if: [{ and: [{ gt: [{ coalesce: ["paid_online", 0] }, 0] }, { lte: [STILL_OWED, 0] }] }, "paid_online", EMPTY] } }),
      money("online_kept", "Paid online and kept", { formula: shownIf("paid_online") }),
      money("online_back", "Given back online", { formula: shownIf("refunded_online") }),
      // Set when the hold ended before the guest paid: the room went back, and nothing was taken.
      bool("pay_lapsed", "Not paid in time", false),
    ],
  },
  {
    ref: "stay_extras",
    label: l("Extra on a stay"),
    labelPlural: l("Extras on stays"),
    keyField: "label",
    // Each extra once on a stay; dropped and added back, it is the same row.
    unique: [["stay_id", "extra_id"]],
    // Parking sells no more spaces a night than the house has.
    capacity: {
      kind: "night",
      from: { via: "stay_id", column: "arrive" },
      to: { via: "stay_id", column: "depart" },
      countWhere: [
        { column: "state", values: ["on"] },
        { column: "status", values: COUNTED, via: "stay_id" },
      ],
      pool: { via: "extra_id", size: { column: "spaces" } },
      arrived: { states: ["in_house"], via: "stay_id" },
    },
    columns: [
      id,
      fk("stay_id", "stays", "Reservation", { index: true }),
      fk("extra_id", "extras", "Extra"),
      choice("state", "On the stay", { on: "On", off: "Dropped" }, { default: "on", tones: { on: "pos", off: "neutral" } }),
      text("label", 80, "Name", { ...opt, rules: { copy: { via: "extra_id", from: "label", mode: "always" } } }),
      money("each", "Price", { copy: { via: "extra_id", from: "amount", mode: "always" } }),
      choice("per", "Charged", { person_night: "Per person, per night", night: "Per night", stay: "Once a stay" }, {
        ...opt,
        rules: { copy: { via: "extra_id", from: "per", mode: "always" } },
      }),
      int("nights", "Nights", { ...opt, rules: { copy: { via: "stay_id", from: "nights", mode: "always", follow: true } } }),
      int("guests", "Guests", { ...opt, rules: { copy: { via: "stay_id", from: "guests", mode: "always", follow: true } } }),
      money("nightly", "A night", { formula: EXTRA_NIGHTLY }),
      money("amount", "Amount", { formula: { if: [{ eq: ["per", "stay"] }, "each", { mul: ["nightly", { coalesce: ["nights", 0] }] }] } }),
      at("added_at", "Added", { ...opt, rules: stamp("now", onCreate) }),
      // This extra's share of the stay's reductions, decided by Offers & gift cards.
      amount("discount", "Reduction"),
    ],
  },
  {
    // A code or a voucher typed when the stay was booked. The whole code is read by no page and no role.
    ref: "stay_codes",
    label: l("Code on a reservation"),
    labelPlural: l("Codes on reservations"),
    keyField: "id",
    columns: [
      id,
      fk("stay_id", "stays", "Reservation"),
      text("typed", 64, "Code as typed", opt),
      link("code_id", "offers", "codes", "Discount code"),
      link("voucher_id", "offers", "vouchers", "Voucher"),
      at("removed_at", "Removed", opt),
      at("created_at", "Added", { ...opt, rules: stamp("now", onCreate) }),
    ],
  },
  {
    ref: "charges",
    keep: KEPT_FOR_TAX,
    label: l("Charge"),
    labelPlural: l("Charges"),
    keyField: "label",
    columns: [
      id,
      fk("stay_id", "stays", "Reservation", { index: true }),
      // Empty: something not on the list, with its amount and a note.
      fk("charge_item_id", "charge_items", "Item", opt),
      text("label", 80, "Name", { ...opt, rules: { copy: { via: "charge_item_id", from: "label", mode: "always" } } }),
      { ref: "amount", type: "decimal", scale: "currency", label: l("Amount"), rules: { copy: { via: "charge_item_id", from: "amount", mode: "always" }, validation: { min: 0 } } },
      // Something not on the list says what it was (the desk's rule: a condition cannot name an empty link).
      text("note", 240, "Note", opt),
      date("charged_on", "Charged on", { ...opt, rules: stamp("today", onCreate) }),
      text("recorded_by", 80, "Recorded by", { ...opt, rules: stamp("user-name", onCreate) }),
      bool("voided", "Voided", false),
      text("void_reason", 240, "Why it was voided", opt),
      at("voided_at", "Voided on", { ...opt, rules: stamp("now", voidedNow) }),
      text("voided_by", 80, "Voided by", { ...opt, rules: stamp("user-name", voidedNow) }),
    ],
  },
  {
    ref: "stay_credits",
    keep: KEPT_FOR_TAX,
    label: l("Nights not stayed"),
    labelPlural: l("Nights not stayed"),
    keyField: "reason",
    columns: [
      id,
      fk("stay_id", "stays", "Reservation", { index: true }),
      choice("reason", "Why", { left_early: "Left early", missed: "A night they missed" }, { default: "left_early" }),
      // What the folio calls the line: the house's words of the day it was recorded.
      text("label", 60, "Folio line", { ...opt, rules: { default: { from: setting("credit_label") } } }),
      // The first night not stayed, and the day after the last.
      // Never before the stay began. (Leaving on the arrival day, the first night not stayed is tomorrow's.)
      date("from_date", "First night", { rules: { notBefore: { column: "arrive", via: "stay_id" } } }),
      date("to_date", "Until", { rules: { notBefore: { column: "from_date" } } }),
      fk("room_type_id", "room_types", "Room type", { ...opt, rules: { copy: { via: "stay_id", from: "room_type_id", mode: "always", follow: true } } }),
      int("nights", "Nights", { ...opt, rules: { formula: { daysBetween: ["from_date", "to_date"] } } }),
      // The room's nights, priced by Adminium as the stay's are.
      money("room_amount", "Room", {
        perNight: {
          from: "from_date",
          to: "to_date",
          rate: { via: "room_type_id", column: "base_rate" },
          adjust: {
            table: "rate_rules",
            match: { via: "room_type_id", weekdays: "weekdays", from: "from_date", to: "to_date" },
            add: "amount",
            name: "name",
            where: { column: "active", eq: true },
          },
        },
      }),
      // What the extras came to a night when the credit was recorded; a total cannot be followed.
      money("extras_nightly", "Extras a night", { copy: { via: "stay_id", from: "extras_nightly", mode: "always" } }),
      money("amount", "Amount", { formula: { add: ["room_amount", { mul: [{ coalesce: ["extras_nightly", 0] }, { coalesce: ["nights", 0] }] }] } }),
      // As a folio prints it: taken off.
      money("line_amount", "On the folio", { formula: { sub: [0, "amount"] } }),
      text("recorded_by", 80, "Recorded by", { ...opt, rules: stamp("user-name", onCreate) }),
      at("created_at", "Recorded", { ...opt, rules: stamp("now", onCreate) }),
      bool("voided", "Voided", false),
      text("void_reason", 240, "Why it was voided", opt),
      at("voided_at", "Voided on", { ...opt, rules: stamp("now", voidedNow) }),
      text("voided_by", 80, "Voided by", { ...opt, rules: stamp("user-name", voidedNow) }),
    ],
  },
  {
    ref: "payments",
    keep: KEPT_FOR_TAX,
    label: l("Payment"),
    labelPlural: l("Payments"),
    keyField: "method",
    postings: [
      // A gift card pays when the row names one, and gets its money back when that payment is voided.
      {
        id: "card",
        into: { addOn: "offers", ledger: "value", action: "spend" },
        needs: "gift-cards",
        via: "stay_id",
        post: { on: { column: "card_id", set: true, own: true } },
        reverse: { on: { column: "voided_at", set: true, own: true } },
        map: { card: "card_id", amount: "amount", ask: "asked", due: { parent: "balance" }, balance_after: "card_balance_after" },
      },
      // Money given back to the card it came from: the payment it returns to is named, never a code.
      {
        id: "card-refund",
        into: { addOn: "offers", ledger: "value", action: "refund" },
        needs: "gift-cards",
        via: "stay_id",
        post: { on: { column: "against_id", set: true, own: true } },
        reverse: { on: { column: "voided_at", set: true, own: true } },
        map: { amount: "amount", against_table: { value: "hotel:payments" }, against_row: "against_id" },
      },
    ],
    columns: [
      id,
      // Money given back online by Adminium itself (a cancellation in time) names only the payment it gives back: its stay is that payment's.
      fk("stay_id", "stays", "Reservation", { index: true, rules: { copy: { via: "refund_of", from: "stay_id", mode: "default" } } }),
      // Money taken, or money handed back to the guest.
      choice("kind", "Kind", { taken: "Taken", given_back: "Given back" }, { default: "taken", tones: { taken: "pos", given_back: "warn" } }),
      price("amount", "Amount", { rules: { validation: { min: 0.01 } } }),
      // `online`: paid on the pay page and written by Adminium alone (with its reference and the service it went through),
      // or given back through that service.
      choice("method", "How", { card: "Card", cash: "Cash", transfer: "Transfer", gift_card: "Gift card", online: "Online" }, { default: "card" }),
      text("reference", 80, "Payment reference", opt),
      // Money handed back says why.
      text("note", 240, "Note", { ...opt, rules: { requiredWhen: { column: "kind", in: ["given_back"] } } }),
      // What it does to what was paid: money given back takes it off.
      // A gift card's payment counts once the card has answered (what it then holds is written with what it gave): until then
      // the stay still owes all of it, which is what the card is asked against.
      // Money given back online counts once it is asked of the payment service, and not at all when it could not be sent.
      // Money taken online counts less what was given back at the service itself (a refund made there, a lost dispute).
      money("signed", "Counted", {
        formula: {
          if: [
            { eq: ["kind", "given_back"] },
            { if: [{ eq: ["refund_state", "not-sent"] }, 0, { sub: [0, "amount"] }] },
            {
              if: [
                { and: [{ eq: ["method", "gift_card"] }, { isNull: "card_balance_after" }] },
                0,
                { sub: ["amount", { coalesce: ["refunded_elsewhere", 0] }] },
              ],
            },
          ],
        },
      }),
      date("paid_on", "Paid on", { ...opt, rules: stamp("today", onCreate) }),
      at("recorded_at", "Recorded", { ...opt, rules: stamp("now", onCreate) }),
      text("recorded_by", 80, "Recorded by", { ...opt, rules: stamp("user-name", onCreate) }),
      bool("voided", "Voided", false),
      text("void_reason", 240, "Why it was voided", opt),
      at("voided_at", "Voided on", { ...opt, rules: stamp("now", voidedNow) }),
      text("voided_by", 80, "Voided by", { ...opt, rules: stamp("user-name", voidedNow) }),
      // Kind and method together, for the two rules below to read: 1 a gift card pays, 2 money goes back to one, 0 anything else.
      { ref: "settle_as", type: "int", nullable: true, label: l("Settled as"), rules: { formula: { if: [{ eq: ["method", "gift_card"] }, { if: [{ eq: ["kind", "given_back"] }, 2, 1] }, 0] } } },
      // A gift card's whole code, as typed at the desk: read by no page and no role.
      text("card_code", 64, "Card code", { ...opt, rules: { requiredWhen: { column: "settle_as", in: [1] } } }),
      link("card_id", "offers", "gift_cards", "Gift card", {
        lookup: { from: "card_code", table: { addOn: "offers", table: "gift_cards" }, column: "code", where: [{ column: "status", eq: "active" }] },
      }),
      text("card_last4", 4, "Card ending", { ...opt, rules: { codeLast4: { of: "card_code" } } }),
      amount("card_balance_after", "Left on the card"),
      // What the desk's check answered: the card is asked for exactly this, and gives it or nothing.
      amount("asked", "Asked of the card"),
      // The desk's retry key for a gift card's payment and for money back to a card: a save sent again after a reply
      // that never came is refused as the one already made, and never takes or gives twice.
      text("client_key", 64, "Retry key", { ...opt, unique: true }),
      // The gift card payment a given-back row returns its money to.
      fk("against_id", "payments", "Returns to", { ...opt, rules: { requiredWhen: { column: "settle_as", in: [2] } } }),
      // ── paid online ──
      // The payment's own reference at Adminium, the service it went through and, from a card reader, the card's last
      // four: written by Adminium alone. (`reference` above stays the desk's own, and `card_last4` a gift card's.)
      text("payment_ref", 64, "Online payment reference", { ...opt, unique: true }),
      text("provider", 40, "Paid through", opt),
      text("payment_last4", 4, "Card ending (online)", opt),
      // What was given back of it at the payment service itself, which no row here says: written by Adminium.
      amount("refunded_elsewhere", "Given back at the service"),
      // Money given back online: the online payment it goes back to (never `against_id`, which is a gift card's), and
      // where it stands at the service — asked, on its way, done, or not sent — with the service's own reference.
      fk("refund_of", "payments", "Gives back", opt),
      text("refund_ref", 80, "Refund reference", opt),
      choice("refund_state", "Refund", { asked: "Asked", pending: "On its way", done: "Done", "not-sent": "Not sent" }, {
        ...opt,
        tones: { asked: "info", pending: "info", done: "pos", "not-sent": "danger" },
      }),
      // Given back by Adminium itself, after a cancellation in time.
      bool("automatic", "Given back by itself", false),
      // What a row adds to "paid online" and to "given back online", for the stay's totals.
      money("online_taken", "Taken online", {
        formula: { if: [{ and: [{ eq: ["kind", "taken"] }, { eq: ["method", "online"] }] }, { sub: ["amount", { coalesce: ["refunded_elsewhere", 0] }] }, 0] },
      }),
      money("online_back", "Given back online", {
        formula: {
          if: [{ and: [{ eq: ["kind", "given_back"] }, { eq: ["method", "online"] }] }, { if: [{ eq: ["refund_state", "not-sent"] }, 0, "amount"] }, 0],
        },
      }),
    ],
  },
  {
    ref: "messages",
    label: l("Message"),
    labelPlural: l("Messages"),
    keyField: "kind",
    columns: [
      id,
      choice("kind", "Kind", EMAIL_KINDS),
      choice("status", "Status", { queued: "Going out", sent: "Sent", failed: "Not sent", skipped: "Skipped" }, {
        default: "queued",
        tones: { queued: "info", sent: "pos", failed: "danger", skipped: "neutral" },
      }),
      // An email's address, or a text's number.
      text("to_address", 254, "To", opt),
      text("language", 16, "Language", opt),
      fk("stay_id", "stays", "Reservation", opt),
      fk("customer_id", "customers", "Guest", opt),
      at("due", "Due", opt),
      at("created_at", "Created", { ...opt, rules: stamp("now", onCreate) }),
      at("sent_at", "Sent", opt),
      text("error", 500, "What went wrong", opt),
      // What a changed stay was before the change, for the email that tells it.
      text("was", 1000, "Before the change", opt),
      // Which new link an email was for: each is sent once.
      text("repeat_key", 64, "Sent for", opt),
      // A text's state in a word Adminium writes (queued, sent, no-consent, not-set-up …), beside the sentence.
      text("text_reason", 40, "Text result code", opt),
      choice("skip_reason", "Why it was skipped", {
        overtaken: "A later email took its place",
        paid: "Paid",
        void: "Void",
        "no-longer-needed": "No longer needed",
        "by-hand": "Skipped by hand",
      }, opt),
    ],
  },
];

export const TABLE_REFS = TABLES.map((t) => t.ref);
