/**
 * Wren House on a Tuesday in late July: the one source of the app's sample
 * data.
 *
 * `npm run sample` writes `seeds/hotel.sample.json` from this module — the
 * bundle an operator adds from Adminium, and the very rows the website's demo
 * loads — so the demo and a real install show the same house, and every
 * figure the design quotes comes out of these rows (`figures.test.ts`).
 *
 * The house: 34 rooms of four types over three floors, Snug singles to Loft
 * suites; room 108 out of service for a week while its shower is replaced,
 * room 210 until a window is repaired; weekend nights $25 dearer and the
 * summer weeks $20 dearer; breakfast, a parking space (six of them) and a late
 * leaving as extras; seven charge items at the desk.
 *
 * The book (as the design draws it at 09:05 on Tuesday 28 July 2026): 48
 * reservations — one checked out yesterday, two cancelled (one of them late),
 * one due yesterday and not come, twenty-one in the house (four leaving this
 * morning, one who arrived at 08:40), four arriving this afternoon, and
 * nineteen still to come.
 *
 * Dates are days from the Tuesday nearest the adding moment (`@week`), so
 * every night keeps its weekday — a weekend night stays a weekend night and
 * every price is the design's, whatever day the sample is added. The summer
 * rule is dated from that Tuesday too (its Saturday on, 31 nights), and named
 * for what it is, since the sample lands in any month.
 * What the clock decides follows the adding moment (`@byStay`, `@byClock`): a
 * stay not yet begun is booked, one under way is in the house in its room,
 * one over has checked out and settled; money and charges are there only once
 * their time has come. At 09:05 on the Tuesday it is the design's book.
 *
 * References carry an `S` (`WH-S3283`) and no running number, so a house's
 * own first reservation (`WH-1001`) is never one of them. Addresses end in
 * `.example`, which Adminium never mails; phones are in the 555-01 block.
 */

// ── the house ───────────────────────────────────────────────────────────────

export const SETTINGS = {
  name: "Wren House",
  address: "Four Quay Steps, Bellhaven",
  town: "Bellhaven",
  phone: "(207) 555-0142",
  email: "stay@wrenhouse.example",
  since: 1974,
  about: "Breakfast when you want it and nobody rushing you out.",
  finding: "Two doors up from the harbour steps. Eight minutes on foot from the station; parking behind the house if you need it.",
  morning: "House coffee and a pot of tea from seven, the papers on the hall table, and WiFi throughout — all included in the room.",
  directions_train: "Bellhaven station, then eight minutes on foot: down Fore Street, left at the chandlery, up the quay steps. Tell us your train and someone will watch for you.",
  directions_car: "Route 1 as far as the harbour, then the lane behind the chandlery.",
  directions_foot: "From the harbour wall, keep the water on your right until the steps. Blue door, brass bell, a wren on the fanlight.",
  breakfast_hours: "07:30 – 10:00",
  late_arrival_note: "After 22:00 — we will leave your key",
  tax_rate: 9,
  tax_label: "Taxes and city levy",
  arrive_from: "15:00",
  leave_by: "11:00",
  late_until: "14:00",
  no_show_at: "11:00",
  cancel_days: 2,
  max_nights: 14,
  ahead_days: 365,
  ref_start: 1001,
  ref_prefix: "WH-",
  guest_emails_on: true,
};

export const HOUSE_NOTES: [icon: string, text: string][] = [
  ["wifi", "WiFi throughout"],
  ["dog", "Dogs in the garden doubles and the loft suites"],
  ["moon", "Quiet in the house after 22:30"],
];

/** The day the demo stands on: Tuesday 28 July 2026, 09:05 in Bellhaven. */
export const DEMO_DAY = { y: 2026, m: 7, d: 28 };
export const DEMO_TIME = "09:05";
export const DEMO_ZONE = "America/New_York";

/** The desk: Maeve at the front desk this morning, Owen the manager. */
export const STAFF = { desk: "Maeve R.", manager: "Owen Tremayne" };

// ── the rooms ───────────────────────────────────────────────────────────────

export type TypeKey = "snug" | "garden" | "harbour" | "loft";

export interface RoomType {
  code: string;
  name: string;
  sleeps: number;
  base: number;
  color: string;
  icon: string;
  blurb: string;
  description: string;
  features: string[];
}

export const TYPES: Record<TypeKey, RoomType> = {
  snug: {
    code: "SNG",
    name: "Snug single",
    sleeps: 1,
    base: 110,
    color: "#8a5a48",
    icon: "bed-single",
    blurb: "A small room at the back of the house, quiet as anything, made for one.",
    description: "Tucked over the garden wall where the road noise never reaches. Everything you need for a night or two and not one thing more.",
    features: ["Single bed, proper linen", "Rain shower", "Desk and a reading lamp", "Tea tray", "WiFi throughout"],
  },
  garden: {
    code: "GDN",
    name: "Garden double",
    sleeps: 2,
    base: 150,
    color: "#4a7a5c",
    icon: "bed-double",
    blurb: "Our steady room — a double bed and a window onto the walled garden.",
    description: "They are the reason people come back. Sash window over the walled garden, deep sill, a chair you can actually read in.",
    features: ["Double bed", "Bath and shower", "Window onto the garden", "Tea tray", "WiFi throughout"],
  },
  harbour: {
    code: "HBR",
    name: "Harbour double",
    sleeps: 2,
    base: 180,
    color: "#3a6d92",
    icon: "waves",
    blurb: "Front of the house, water in the window, the boats out from six.",
    description: "The rooms along the front. You will hear the harbour before you see it, and the light comes off the water onto the ceiling.",
    features: ["Double bed", "Bath and shower", "Water view", "Robes", "WiFi throughout"],
  },
  loft: {
    code: "LFT",
    name: "Loft suite",
    sleeps: 4,
    base: 215,
    color: "#6d4f86",
    icon: "sofa",
    blurb: "The top of the house — a sitting room under the beams and room for four.",
    description: "Up under the roof. A sitting room with a sofa bed, the bedroom beyond it, and two windows that take in the whole bay.",
    features: ["Double bed and a sofa bed", "Sitting room", "Bath and shower", "Bay window", "WiFi throughout"],
  },
};
export const TYPE_ORDER: TypeKey[] = ["snug", "garden", "harbour", "loft"];

export interface Room {
  number: number;
  type: TypeKey;
  note?: string;
}

const snugs = [101, 102, 103, 104, 201, 202, 203, 204];
const gardens = [105, 106, 107, 108, 109, 110, 111, 112, 205, 206, 207, 208, 211, 212];
const harbours = [209, 210, 305, 306, 307, 308, 309, 310];
const lofts = [301, 302, 303, 304];
const NOTES: Record<number, string> = {
  107: "Sloped ceiling on the garden side.",
  110: "Ground floor, no stairs.",
  203: "First door past the stairs.",
  204: "Quiet corner.",
  211: "Nearest the lift.",
  305: "Best window in the house.",
};
export const ROOMS: Room[] = [
  ...snugs.map((n) => ({ number: n, type: "snug" as const })),
  ...gardens.map((n) => ({ number: n, type: "garden" as const })),
  ...harbours.map((n) => ({ number: n, type: "harbour" as const })),
  ...lofts.map((n) => ({ number: n, type: "loft" as const })),
]
  .sort((a, b) => a.number - b.number)
  .map((room) => (NOTES[room.number] === undefined ? room : { ...room, note: NOTES[room.number] }));

/** Being cleaned this morning. */
export const CLEANING = [103, 205, 306];

/** Out of service: [room, from, last night out (or none), reason] in days from today. */
export const CLOSURES: [room: number, from: number, to: number | null, reason: string][] = [
  [108, 0, 7, "The shower is being replaced"],
  [210, -8, null, "Waiting on the window repair"],
];

/** The rate rules: a weekend, and the summer weeks. */
export const RATE_RULES = [
  { name: "Weekend", weekdays: "fri,sat", from: null, to: null, amount: 25 },
  { name: "Summer weeks", weekdays: null, from: "2026-08-01", to: "2026-08-31", amount: 20 },
];

export type ExtraKey = "breakfast" | "parking" | "late";
export const EXTRAS: Record<ExtraKey, { code: string; label: string; short: string; how: string; icon: string; amount: number; per: "person_night" | "night" | "stay"; spaces: number | null }> = {
  breakfast: { code: "BRK", label: "Breakfast in the dining room", short: "Breakfast", how: "$16 per person, per night · 07:30 – 10:00", icon: "croissant", amount: 16, per: "person_night", spaces: null },
  parking: { code: "PRK", label: "A space behind the house", short: "Parking", how: "$14 a night · six spaces", icon: "car", amount: 14, per: "night", spaces: 6 },
  late: { code: "LATE", label: "A late leaving", short: "A late leaving", how: "$35 · the room until 14:00", icon: "clock", amount: 35, per: "stay", spaces: null },
};
export const EXTRA_ORDER: ExtraKey[] = ["breakfast", "parking", "late"];

export type ItemKey = "breakfast1" | "parking1" | "late1" | "wine" | "ale" | "sandwich" | "red";
export const CHARGE_ITEMS: Record<ItemKey, { label: string; detail: string; amount: number; icon: string; extra?: ExtraKey }> = {
  breakfast1: { label: "Breakfast, one morning", detail: "one person", amount: 16, icon: "croissant", extra: "breakfast" },
  parking1: { label: "A night's parking", detail: "one night behind the house", amount: 14, icon: "car", extra: "parking" },
  late1: { label: "A late leaving", detail: "the room until 14:00", amount: 35, icon: "clock", extra: "late" },
  wine: { label: "A glass of house wine", detail: "from the bar", amount: 9, icon: "wine" },
  ale: { label: "A pint of Quay ale", detail: "from the bar", amount: 7, icon: "beer" },
  sandwich: { label: "Sandwiches from the kitchen", detail: "from the kitchen", amount: 12, icon: "sandwich" },
  red: { label: "A bottle of the house red", detail: "from the bar", amount: 32, icon: "wine" },
};
export const ITEM_ORDER: ItemKey[] = ["breakfast1", "parking1", "late1", "wine", "ale", "sandwich", "red"];

// ── the book ────────────────────────────────────────────────────────────────

export type Status = "booked" | "in_house" | "departed" | "cancelled" | "no_show";

export interface Stay {
  ref: number;
  first: string;
  last: string;
  type: TypeKey;
  room: number | null;
  /** Days from today. */
  arrive: number;
  depart: number;
  guests: number;
  time: string;
  extras: ExtraKey[];
  status: Status;
  note?: string;
  channel?: "online" | "desk";
  /** Checked in this morning at…; otherwise on the arrival day at the time they gave. */
  checkedIn?: string;
  checkedOut?: [day: number, time: string];
  cancelled?: [day: number, time: string, late: boolean];
  /** Settled in full at check-out, [day, time]. */
  settled?: [day: number, time: string];
  charges?: [item: ItemKey, day: number, note: string][];
  payments?: [day: number, time: string, method: "card" | "cash" | "transfer", amount: number][];
}

const st = (
  ref: number,
  first: string,
  last: string,
  type: TypeKey,
  room: number | null,
  arrive: number,
  depart: number,
  guests: number,
  time: string,
  extras: ExtraKey[],
  status: Status,
  more: Partial<Stay> = {},
): Stay => ({ ref, first, last, type, room, arrive, depart, guests, time, extras, status, ...more });

const B: ExtraKey[] = ["breakfast"];
const P: ExtraKey[] = ["parking"];
const BP: ExtraKey[] = ["breakfast", "parking"];

/** The 48 stays, in the order they were numbered. Days from Tuesday 28 July. */
export const STAYS: Stay[] = [
  // history
  st(3276, "Agnes", "Pellow", "harbour", 310, -4, -1, 2, "16:00", B, "departed", { checkedOut: [-1, "10:20"], settled: [-1, "10:15"] }),
  st(3277, "Tomasz", "Kowal", "garden", null, 8, 10, 2, "15:00", [], "cancelled", { cancelled: [-8, "14:12", false] }),
  st(3278, "Lena", "Hartigan", "snug", null, 1, 3, 1, "18:00", [], "cancelled", { cancelled: [-1, "18:40", true] }),
  st(3279, "Rafe", "Collier", "snug", null, -1, 0, 1, "21:00", [], "booked", { note: "Coming off the late ferry." }),
  // leaving today
  st(3280, "Iris", "Waverley", "garden", 105, -4, 0, 2, "16:00", B, "in_house", { settled: [0, "08:10"] }),
  st(3281, "Callum", "Reece", "snug", 101, -2, 0, 1, "19:00", [], "in_house", { settled: [0, "08:25"], channel: "desk" }),
  st(3282, "Marguerite", "Okafor", "harbour", 209, -3, 0, 2, "15:00", ["parking", "late"], "in_house", { settled: [0, "08:50"] }),
  st(3283, "Teodor", "Blank", "loft", 301, -5, 0, 3, "17:00", BP, "in_house", {
    charges: [["red", -3, "taken in the garden"]],
    payments: [[-5, "17:20", "card", 500]],
  }),
  // arrived this morning
  st(3284, "Noor", "Hadid", "garden", 106, 0, 3, 2, "15:00", B, "in_house", { checkedIn: "08:40" }),
  // staying on
  st(3285, "Bram", "Ellery", "snug", 102, -1, 2, 1, "18:00", [], "in_house"),
  st(3286, "Lucia", "Fenwick", "garden", 107, -2, 1, 2, "16:00", B, "in_house"),
  st(3287, "Osian", "Trelawney", "garden", 109, -3, 3, 2, "15:00", [], "in_house"),
  st(3288, "Petra", "Nadeau", "harbour", 305, -1, 4, 2, "17:00", B, "in_house"),
  st(3289, "Halvor", "Sund", "loft", 302, -2, 5, 4, "20:00", BP, "in_house"),
  st(3290, "Amara", "Sinclair", "snug", 104, -1, 1, 1, "21:00", [], "in_house", { channel: "desk" }),
  st(3291, "Devon", "Marchetti", "garden", 110, -4, 2, 2, "15:00", P, "in_house"),
  st(3292, "Rosalind", "Oyelaran", "harbour", 307, -2, 2, 2, "16:00", [], "in_house"),
  st(3293, "Fionn", "Castellane", "garden", 111, -1, 4, 2, "18:00", B, "in_house"),
  st(3294, "Sable", "Whitcombe", "loft", 303, -3, 6, 4, "15:00", B, "in_house"),
  st(3295, "Emrys", "Toll", "snug", 201, -1, 3, 1, "22:00", [], "in_house"),
  st(3296, "Junie", "Alvarez", "garden", 112, -2, 1, 2, "17:00", [], "in_house"),
  st(3297, "Kester", "Vane", "harbour", 308, -1, 3, 2, "16:00", P, "in_house"),
  st(3298, "Wilda", "Nkemelu", "garden", 206, -3, 2, 2, "19:00", [], "in_house"),
  st(3299, "Corin", "Ashdown", "snug", 202, -1, 1, 1, "15:00", [], "in_house", { channel: "desk" }),
  st(3300, "Marisol", "Fairbairn", "garden", 207, -2, 5, 2, "18:00", BP, "in_house"),
  // arriving today
  st(3301, "Ottoline", "Grey", "harbour", null, 0, 3, 2, "16:00", B, "booked", {
    note: "We are driving down and may be later than we said. Please keep the room.",
  }),
  st(3302, "Sorley", "Mackintosh", "snug", null, 0, 2, 1, "18:00", [], "booked", { channel: "desk" }),
  st(3303, "Priya", "Raman", "garden", null, 0, 5, 2, "15:00", BP, "booked"),
  st(3304, "Ren", "Kobayashi", "loft", 304, 0, 5, 4, "20:00", B, "booked"),
  // still to come
  st(3305, "Nadia", "Brightwell", "harbour", 309, 3, 6, 2, "17:00", B, "booked"),
  st(3306, "Hugo", "Marlowe", "loft", null, 4, 6, 3, "16:00", P, "booked"),
  st(3307, "Beatrix", "Onslow", "loft", null, 5, 9, 2, "15:00", B, "booked"),
  st(3308, "Cyrus", "Penhale", "loft", null, 6, 8, 4, "17:00", [], "booked"),
  st(3309, "Dilys", "Morgan", "loft", null, 6, 10, 2, "16:00", B, "booked"),
  st(3310, "Ezra", "Quint", "loft", null, 6, 9, 3, "18:00", P, "booked"),
  st(3311, "Freya", "Lund", "harbour", null, 5, 8, 2, "16:00", B, "booked"),
  st(3312, "Gideon", "Ashe", "harbour", null, 6, 9, 2, "15:00", [], "booked", { channel: "desk" }),
  st(3313, "Hana", "Sato", "harbour", null, 4, 8, 2, "19:00", B, "booked"),
  st(3314, "Ivo", "Brandt", "harbour", null, 6, 11, 2, "17:00", P, "booked"),
  st(3315, "Jonah", "Keel", "harbour", null, 7, 9, 2, "16:00", [], "booked"),
  st(3316, "Kit", "Lowry", "garden", null, 6, 8, 2, "15:00", B, "booked"),
  st(3317, "Mina", "Farrow", "garden", null, 5, 9, 2, "16:00", [], "booked"),
  st(3318, "Niall", "Draper", "snug", null, 7, 9, 1, "20:00", [], "booked"),
  st(3319, "Orla", "Keane", "garden", null, 10, 12, 2, "15:00", B, "booked"),
  st(3320, "Pim", "de Vries", "harbour", null, 10, 13, 2, "17:00", BP, "booked"),
  st(3321, "Quinn", "Arden", "loft", null, 10, 12, 4, "16:00", B, "booked"),
  st(3322, "Saoirse", "Doyle", "garden", 212, 1, 4, 2, "17:00", B, "booked"),
  st(3323, "Tobias", "Wynn", "snug", null, 1, 3, 1, "19:00", [], "booked", { channel: "desk" }),
];

/** Booked at the desk with no email: nobody to write to, so no guest account either. */
export const NO_EMAIL = new Set([3323]);

export const emailOf = (s: Stay): string | null =>
  NO_EMAIL.has(s.ref) ? null : `${s.first}.${s.last}`.toLowerCase().replace(/[^a-z.]/g, "") + "@example.com";
/** The fictional 555-01NN block. */
export const mobileOf = (s: Stay): string => `(207) 555-01${String((s.ref - 3200) % 100).padStart(2, "0")}`;

/**
 * When each stay was made: between 3 and 44 days before its arrival, in the
 * morning or the afternoon; never after the adding moment, and before its
 * cancellation. [days from today, time].
 */
export function madeAt(s: Stay): [day: number, time: string] {
  const LEADS = [3, 5, 9, 12, 16, 21, 30, 44];
  const minutesOfDay = (9 + (s.ref % 9)) * 60 + ((s.ref * 7) % 60);
  let at = (s.arrive - LEADS[s.ref % 8]!) * 1440 + minutesOfDay;
  const now = 9 * 60 + 5;
  if (at >= now) at = now - (20 + (s.ref % 5)) * 60;
  if (s.cancelled !== undefined) {
    const [day, time] = s.cancelled;
    const cancelledAt = day * 1440 + toMinutes(time);
    if (at >= cancelledAt) at -= 3 * 1440;
  }
  const day = Math.floor(at / 1440);
  return [day, hhmm(at - day * 1440)];
}

// ── the money, as the design works it out (the figures test holds the loader to it) ──

export const TAX_RATE = 9;

const cents = (n: number) => Math.round(n * 100);
/** Half away from zero, to the cent. */
export const round2 = (n: number) => Math.sign(n) * Math.round(Math.abs(n) * 100 + 1e-9) / 100;

/** The day `offset` days from the demo's Tuesday, as `YYYY-MM-DD`. */
export function isoDay(offset: number): string {
  return new Date(Date.UTC(DEMO_DAY.y, DEMO_DAY.m - 1, DEMO_DAY.d + offset)).toISOString().slice(0, 10);
}

/** One night's rate: the type's, plus every rate rule that matches. */
export function nightRate(type: TypeKey, iso: string): { rate: number; tags: string[] } {
  const date = new Date(`${iso}T00:00:00Z`);
  const weekday = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][date.getUTCDay()]!;
  let rate = TYPES[type].base;
  const tags: string[] = [];
  for (const rule of RATE_RULES) {
    if (rule.weekdays !== null && !rule.weekdays.split(",").includes(weekday)) continue;
    if (rule.from !== null && iso < rule.from) continue;
    if (rule.to !== null && iso > rule.to) continue;
    rate += rule.amount;
    tags.push(rule.name);
  }
  return { rate, tags };
}

/** What a stay costs, on the demo's calendar. */
export function stayMoney(s: Stay) {
  const nights = [];
  for (let day = s.arrive; day < s.depart; day += 1) nights.push({ date: isoDay(day), ...nightRate(s.type, isoDay(day)) });
  const n = nights.length;
  const room = nights.reduce((sum, night) => sum + cents(night.rate), 0);
  const extras = s.extras.map((key) => {
    const extra = EXTRAS[key];
    const amount = extra.per === "person_night" ? extra.amount * s.guests * n : extra.per === "night" ? extra.amount * n : extra.amount;
    return { key, amount };
  });
  const extrasTotal = extras.reduce((sum, e) => sum + cents(e.amount), 0);
  const chargesTotal = (s.charges ?? []).reduce((sum, [item]) => sum + cents(CHARGE_ITEMS[item].amount), 0);
  const subtotal = room + extrasTotal + chargesTotal;
  const tax = Math.round((subtotal * TAX_RATE) / 100);
  const total = subtotal + tax;
  const paid = s.settled !== undefined ? total : (s.payments ?? []).reduce((sum, p) => sum + cents(p[3]), 0);
  return { nights, n, room: room / 100, extrasTotal: extrasTotal / 100, extras, chargesTotal: chargesTotal / 100, subtotal: subtotal / 100, tax: tax / 100, total: total / 100, paid: paid / 100, balance: (total - paid) / 100 };
}

// ── the bundle ──────────────────────────────────────────────────────────────

type Row = Record<string, unknown>;

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number) as [number, number];
  return h * 60 + m;
}
function hhmm(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
/** A date, or a wall time, so many days from the sample's Tuesday — the weekday kept, whatever day it is added. */
const day = (n: number) => ({ "@day": n, "@week": true });
const wall = (n: number, time: string) => ({ "@day": n, "@time": time, "@week": true });
/** Days from the demo's Tuesday to an ISO date on its calendar. */
const offsetOf = (iso: string) => Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${isoDay(0)}T00:00:00Z`)) / 86_400_000);

/** The time a stay's guest came in: this morning's, or the time they gave (a key left out: 22:40). */
const checkInTime = (s: Stay) => s.checkedIn ?? (s.time === "22:30" ? "22:40" : s.time);
/** When a stay's guest leaves on the last morning, and when they settle before it. */
const LEAVING = "10:30";
const SETTLING = "10:15";
/** A stay given a room: booked, in the house or checked out by where the adding moment falls against its nights. */
const holdsRoom = (s: Stay) => s.room !== null && s.status !== "cancelled" && s.status !== "no_show";
/** When a stay given a room began and ended, as `@byStay` reads its dates. */
const stayTimes = (s: Stay) => ({ from: checkInTime(s), to: s.checkedOut?.[1] ?? LEAVING });
/** Where the design's own moment falls against a stay given a room. */
const onTheTuesday = (s: Stay): "before" | "during" | "after" => (s.status === "booked" ? "before" : s.status === "in_house" ? "during" : "after");
/** Kept only once its time has come. */
const once = (at: unknown) => ({ at, after: { "@skip": true } });

export interface SampleBundle {
  format: "adminium.sample/1";
  app: string;
  weekAnchor: "tue";

  assets: Record<string, never>;
  tables: { ref: string; rows: Row[] }[];
}

/** The sample bundle, as `seeds/hotel.sample.json` holds it. */
export function sampleBundle(): SampleBundle {
  const inHouseRooms = new Set(STAYS.filter((s) => s.status === "in_house").map((s) => s.room));
  const customers: Row[] = [];
  const stays: Row[] = [];
  const stayExtras: Row[] = [];
  const charges: Row[] = [];
  const payments: Row[] = [];

  for (const s of STAYS) {
    const label = `stay:${String(s.ref)}`;
    const email = emailOf(s);
    const [madeDay, madeTime] = madeAt(s);
    if (email !== null) {
      customers.push({ "@label": `guest:${String(s.ref)}`, email, first_name: s.first, last_name: s.last, created_at: wall(madeDay, madeTime) });
    }
    const money = stayMoney(s);
    const row: Row = {
      "@label": label,
      ...(holdsRoom(s)
        ? {
            "@byStay": {
              from: "arrive",
              to: "depart",
              times: stayTimes(s),
              before: { status: "booked", checked_in_at: null, checked_in_by: null, checked_out_at: null, checked_out_by: null },
              during: { status: "in_house", checked_in_at: wall(s.arrive, checkInTime(s)), checked_in_by: STAFF.desk, checked_out_at: null, checked_out_by: null },
              after: {
                status: "departed",
                checked_in_at: wall(s.arrive, checkInTime(s)),
                checked_in_by: STAFF.desk,
                checked_out_at: wall(...(s.checkedOut ?? [s.depart, LEAVING])),
                checked_out_by: STAFF.desk,
              },
            },
          }
        : {}),
      ref_seq: null,
      ref: `WH-S${String(s.ref)}`,
      status: s.status,
      room_type_id: { "@ref": `type:${s.type}` },
      room_id: s.room === null ? null : { "@ref": `room:${String(s.room)}` },
      arrive: day(s.arrive),
      depart: day(s.depart),
      guests: s.guests,
      first_name: s.first,
      last_name: s.last,
      email,
      mobile: mobileOf(s),
      arrival_time: s.time,
      note: s.note ?? null,
      language: "en-US",
      channel: s.channel ?? "online",
      tax_rate: TAX_RATE,
      tax_label: SETTINGS.tax_label,
      // A sample load writes no stamps: the cancel-by moment is spelled, 15:00 two days before the arrival.
      cancel_by: wall(s.arrive - SETTINGS.cancel_days, SETTINGS.arrive_from),
      created_at: wall(madeDay, madeTime),
      customer_id: email === null ? null : { "@ref": `guest:${String(s.ref)}` },
    };
    if (s.cancelled !== undefined) {
      const [d, t, late] = s.cancelled;
      Object.assign(row, { cancelled_at: wall(d, t), cancelled_by: "guest", cancel_code: "self", late_cancel: late });
    }
    stays.push(row);
    for (const key of s.extras) {
      stayExtras.push({ stay_id: { "@ref": label }, extra_id: { "@ref": `extra:${key}` }, state: "on", added_at: wall(madeDay, madeTime) });
    }
    for (const [item, d, note] of s.charges ?? []) {
      charges.push({ "@byClock": once(wall(d, "20:00")), stay_id: { "@ref": label }, charge_item_id: { "@ref": `item:${item}` }, note, charged_on: day(d), recorded_by: STAFF.desk });
    }
    const paid: [number, string, string, number][] = s.settled !== undefined ? [[s.settled[0], s.settled[1], "card", money.total]] : [...(s.payments ?? [])];
    // A stay given a room and not settled settles on its last morning: there once that morning has come.
    if (holdsRoom(s) && s.settled === undefined && money.balance > 0) paid.push([s.depart, SETTLING, "card", money.balance]);
    for (const [d, t, method, amount] of paid) {
      payments.push({ "@byClock": once("recorded_at"), stay_id: { "@ref": label }, kind: "taken", amount, method, paid_on: day(d), recorded_at: wall(d, t), recorded_by: STAFF.desk });
    }
  }

  return {
    format: "adminium.sample/1",
    app: "hotel",
    weekAnchor: "tue",
    assets: {},
    tables: [
      { ref: "settings", rows: [{ "@label": "settings", "@onlyIfEmpty": true, ...SETTINGS }] },
      { ref: "house_notes", rows: HOUSE_NOTES.map(([icon, text], i) => ({ icon, text, position: i + 1 })) },
      {
        ref: "room_types",
        rows: TYPE_ORDER.map((key, i) => {
          const t = TYPES[key];
          return { "@label": `type:${key}`, code: t.code, name: t.name, blurb: t.blurb, description: t.description, sleeps: t.sleeps, base_rate: t.base, color: t.color, icon: t.icon, position: i + 1, active: true };
        }),
      },
      {
        ref: "room_type_features",
        rows: TYPE_ORDER.flatMap((key) => TYPES[key].features.map((feature, i) => ({ room_type_id: { "@ref": `type:${key}` }, feature, position: i + 1 }))),
      },
      {
        ref: "rooms",
        rows: ROOMS.map((room) => {
          // A room given to a stay is occupied while the stay is under way, and being cleaned once it is over.
          const holders = STAYS.filter((s) => holdsRoom(s) && s.room === room.number);
          if (holders.length > 1) throw new Error(`Room ${String(room.number)} is given to more than one stay.`);
          const holder = holders[0];
          const status = inHouseRooms.has(room.number) ? "occupied" : CLEANING.includes(room.number) ? "cleaning" : "ready";
          const byStay =
            holder === undefined
              ? {}
              : {
                  "@byStay": {
                    from: day(holder.arrive),
                    to: day(holder.depart),
                    times: stayTimes(holder),
                    before: onTheTuesday(holder) === "before" ? {} : { status: "ready" },
                    during: { status: "occupied" },
                    after: onTheTuesday(holder) === "after" ? {} : { status: "cleaning" },
                  },
                };
          return {
            "@label": `room:${String(room.number)}`,
            ...byStay,
            number: String(room.number),
            floor: Math.floor(room.number / 100),
            room_type_id: { "@ref": `type:${room.type}` },
            status,
            note: room.note ?? null,
          };
        }),
      },
      {
        ref: "room_closures",
        rows: CLOSURES.map(([room, from, to, reason]) => ({
          room_id: { "@ref": `room:${String(room)}` },
          from_date: day(from),
          to_date: to === null ? null : day(to),
          reason,
          active: true,
          set_by: STAFF.manager,
          created_at: wall(from - 1, "16:30"),
        })),
      },
      {
        ref: "rate_rules",
        rows: RATE_RULES.map((rule) => ({
          room_type_id: null,
          name: rule.name,
          weekdays: rule.weekdays,
          from_date: rule.from === null ? null : day(offsetOf(rule.from)),
          to_date: rule.to === null ? null : day(offsetOf(rule.to)),
          amount: rule.amount,
          active: true,
        })),
      },
      {
        ref: "extras",
        rows: EXTRA_ORDER.map((key, i) => {
          const e = EXTRAS[key];
          return { "@label": `extra:${key}`, code: e.code, label: e.label, short: e.short, how: e.how, icon: e.icon, amount: e.amount, per: e.per, spaces: e.spaces, active: true, position: i + 1 };
        }),
      },
      {
        ref: "charge_items",
        rows: ITEM_ORDER.map((key, i) => {
          const item = CHARGE_ITEMS[key];
          return {
            "@label": `item:${key}`,
            label: item.label,
            detail: item.detail,
            amount: item.amount,
            icon: item.icon,
            extra_id: item.extra === undefined ? null : { "@ref": `extra:${item.extra}` },
            active: true,
            position: i + 1,
          };
        }),
      },
      { ref: "customers", rows: customers },
      { ref: "stays", rows: stays },
      { ref: "stay_extras", rows: stayExtras },
      { ref: "charges", rows: charges },
      { ref: "payments", rows: payments },
    ],
  };
}
