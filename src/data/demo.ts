/**
 * The seeded fiction: Wren House, a 34-room independent hotel in a coastal
 * town.
 *
 * ONE hotel, ONE building (21 D13). There is no second property anywhere in
 * this file, no owner, no lease and no long stay, and the two guards that keep
 * it that way live in the engine rather than in a comment: stays cap at
 * fourteen nights, and housekeeping is a room-status flag.
 *
 * This module is an IMMUTABLE description. The store copies it on creation and
 * mutates the copy, so "Reset the demo" is a re-copy rather than a page reload.
 *
 * TIME IS PINNED to Tuesday 28 July 2026, 09:05 — mid-departure, with arrivals
 * from 15:00 and departures by 11:00. The dock's "Advance to check-out time"
 * chip is the ONLY thing that moves it, to 11:20.
 *
 * Every translatable string is stored as a KEY with the English beside it, so
 * an unseeded locale still renders a real word. Guest names, staff names and
 * the address stay literal: a name is a name in every language.
 */

import type { Extra, Now, Room, RoomType, Stay } from "./types.ts";

/* ------------------------------------------------------------- the clock */

export const NOW: Now = {
  date: "2026-07-28",
  morning: "09:05",
  afterCheckout: "11:20",
  arrivalsFrom: "15:00",
  departBy: "11:00",
};

/** Lodging tax, one rate, because this is one hotel in one town. */
export const TAX_RATE = 0.08;

/** Who is on the desk. */
export const STAFF = { name: "Bea Marlow", ini: "BM" } as const;

export const ADDRESS = "9 Quay Street, Wrensmouth";

/** Seeded references end at WH-3306; the first booking made in-app is WH-3307. */
export const NEXT_REF = 3307;
export const REF_PREFIX = "WH-";

/** What the "Your reservation" lookup fills in when you tap the hint chips. */
export const DEMO_LOOKUP = { ref: "WH-3301", surname: "Grey" } as const;

/* -------------------------------------------------------------- the rooms */

/**
 * Four room types, each with its own tint. The tint is reused everywhere the
 * type appears — the results card, the room-type page, the rack tile and the
 * calendar row — so a reader learns Harbour blue once.
 *
 * Rates run $110 to $260 once the weekend and August deltas land on the loft
 * suite, which is what makes the per-night breakdown on a results card worth
 * expanding rather than decoration.
 */
export const ROOM_TYPES: RoomType[] = [
  {
    id: "snug",
    nameKey: "data.type.snug",
    name: "Snug single",
    blurbKey: "data.type.snug.blurb",
    blurb: "A small room at the back, quiet as anything.",
    longKey: "data.type.snug.long",
    long: "One bed, one window over the yard, and the quietest corner of the house. We give it to people who are here to walk and come back tired.",
    sleeps: 1,
    from: "#c9a882",
    to: "#a07f57",
    icon: "bed-single",
    code: "SNG",
    base: 110,
    features: ["single", "shower", "wifi", "tea", "desk"],
  },
  {
    id: "garden",
    nameKey: "data.type.garden",
    name: "Garden double",
    blurbKey: "data.type.garden.blurb",
    blurb: "Doors onto the walled garden.",
    longKey: "data.type.garden.long",
    long: "A double bed and a pair of doors that open onto the walled garden. Most of the house is these, and most people who come back ask for one.",
    sleeps: 2,
    from: "#88a58e",
    to: "#5b7a63",
    icon: "trees",
    code: "GDN",
    base: 150,
    features: ["double", "garden", "bath", "wifi", "tea", "robes"],
  },
  {
    id: "harbour",
    nameKey: "data.type.harbour",
    name: "Harbour double",
    blurbKey: "data.type.harbour.blurb",
    blurb: "The water, and the boats going out.",
    longKey: "data.type.harbour.long",
    long: "Front of the house, up a floor, looking straight out at the water. The boats go out early and you will hear them, which people either love or move room over.",
    sleeps: 2,
    from: "#6d93b8",
    to: "#3f6389",
    icon: "waves",
    code: "HBR",
    base: 180,
    features: ["double", "water", "bath", "wifi", "tea", "robes"],
  },
  {
    id: "loft",
    nameKey: "data.type.loft",
    name: "Loft suite",
    blurbKey: "data.type.loft.blurb",
    blurb: "The whole top floor, with a sitting room.",
    longKey: "data.type.loft.long",
    long: "Under the roof, with a sitting room, a sofa bed and windows on both sides. Four of them, and they go first in August.",
    sleeps: 4,
    from: "#9d86b5",
    to: "#6f5a89",
    icon: "sofa",
    code: "LFT",
    base: 215,
    features: ["double", "sofa", "sitting", "bath", "wifi", "tea", "robes"],
  },
];

/**
 * Thirty-four rooms over three floors.
 *
 * Two are out of service with real reasons and three are being cleaned. That is
 * the whole of housekeeping in this product: a flag on a room, a "mark ready"
 * action, and a legend. There is no work queue and no assignment screen, and
 * adding one would cross the line in 21 D13.
 */
function room(number: number, floor: number, type: string, status: Room["status"] = "ready", noteKey: string | null = null): Room {
  return { number, floor, type, status, noteKey };
}

export const ROOMS: Room[] = [
  /* --- first floor --- */
  room(101, 1, "snug", "occupied"),
  room(102, 1, "snug", "occupied"),
  room(103, 1, "snug", "cleaning"),
  room(104, 1, "snug", "occupied"),
  room(105, 1, "garden", "occupied"),
  room(106, 1, "garden", "occupied"),
  room(107, 1, "garden", "occupied"),
  room(108, 1, "garden", "oos", "data.oos.shower"),
  room(109, 1, "garden", "occupied"),
  room(110, 1, "garden", "occupied"),
  room(111, 1, "garden", "occupied"),
  room(112, 1, "garden", "occupied"),
  /* --- second floor --- */
  room(201, 2, "snug", "occupied"),
  room(202, 2, "snug", "occupied"),
  room(203, 2, "snug"),
  room(204, 2, "snug"),
  room(205, 2, "garden", "cleaning"),
  room(206, 2, "garden", "occupied"),
  room(207, 2, "garden", "occupied"),
  room(208, 2, "garden"),
  room(209, 2, "harbour", "occupied"),
  room(210, 2, "harbour", "oos", "data.oos.window"),
  room(211, 2, "garden"),
  room(212, 2, "garden"),
  /* --- third floor --- */
  room(301, 3, "loft", "occupied"),
  room(302, 3, "loft", "occupied"),
  room(303, 3, "loft", "occupied"),
  room(304, 3, "loft"),
  room(305, 3, "harbour", "occupied"),
  room(306, 3, "harbour", "cleaning"),
  room(307, 3, "harbour", "occupied"),
  room(308, 3, "harbour", "occupied"),
  room(309, 3, "harbour"),
  room(310, 3, "harbour"),
];

/* ------------------------------------------------------------------ extras */

export const EXTRAS: Extra[] = [
  {
    id: "breakfast",
    labelKey: "data.extra.breakfast",
    label: "Breakfast in the morning",
    amount: 14,
    per: "person-night",
    icon: "croissant",
  },
  {
    id: "parking",
    labelKey: "data.extra.parking",
    label: "A space in the yard",
    amount: 12,
    per: "night",
    icon: "car",
  },
  {
    id: "late",
    labelKey: "data.extra.late",
    label: "A late leaving",
    amount: 30,
    per: "stay",
    icon: "clock",
  },
];

/** What the desk can add to a folio mid-stay. */
export const CHARGE_KINDS = [
  { id: "breakfast", labelKey: "data.charge.breakfast", label: "Breakfast", amount: 14, icon: "croissant" },
  { id: "parking", labelKey: "data.charge.parking", label: "Parking", amount: 12, icon: "car" },
  { id: "late", labelKey: "data.charge.late", label: "A late leaving", amount: 30, icon: "clock" },
  { id: "bar", labelKey: "data.charge.bar", label: "Something from the bar", amount: 18, icon: "wine" },
];

/* ------------------------------------------------------------------ stays */

function stay(s: Omit<Stay, "charges" | "payments" | "noteKey" | "note" | "checkedInAt"> &
  Partial<Pick<Stay, "charges" | "payments" | "noteKey" | "note" | "checkedInAt">>): Stay {
  return {
    charges: [],
    payments: [],
    noteKey: null,
    note: "",
    checkedInAt: null,
    ...s,
  };
}

/** The three who settled up at the desk this morning. */
function settled(amount: number) {
  return [
    {
      date: NOW.date,
      method: "card" as const,
      labelKey: "data.pay.settled",
      label: "Settled at the desk",
      amount,
    },
  ];
}

/**
 * Twenty-seven reservations, WH-3280 … WH-3306.
 *
 * Today reads like a real Tuesday: four rooms leaving, twenty-one in the
 * building, five arriving of whom one is already in and one has left a note.
 * WH-3283 leaves with $1,291.60 still on the folio, which is the whole reason
 * the block-on-check-out rule is demonstrable rather than merely implemented.
 *
 * Saturday 1 August is fully committed on the loft suites — all four of them —
 * so the calendar has a night with a mark on it.
 */
export const STAYS: Stay[] = [
  /* --- leaving today --- */
  stay({
    ref: "WH-3280", first: "Iris", last: "Waverley", email: "iris.waverley@example.com",
    mobile: "07700 900118", type: "garden", room: 105, arrive: "2026-07-24", depart: "2026-07-28",
    guests: 2, arrivalTime: "16:00", extras: ["breakfast"], status: "in_house",
    checkedInAt: "16:20", payments: settled(647.96),
  }),
  stay({
    ref: "WH-3281", first: "Callum", last: "Reece", email: "c.reece@example.com",
    mobile: "07700 900204", type: "snug", room: 101, arrive: "2026-07-26", depart: "2026-07-28",
    guests: 1, arrivalTime: "19:00", extras: [], status: "in_house",
    checkedInAt: "19:10", payments: settled(127.6),
  }),
  stay({
    ref: "WH-3282", first: "Marguerite", last: "Okafor", email: "m.okafor@example.com",
    mobile: "07700 900377", type: "harbour", room: 209, arrive: "2026-07-25", depart: "2026-07-28",
    guests: 2, arrivalTime: "15:00", extras: ["parking"], status: "in_house",
    checkedInAt: "15:05", payments: settled(444.08),
  }),
  /* The one who has not settled. Check-out is blocked, with the amount named. */
  stay({
    ref: "WH-3283", first: "Teodor", last: "Blank", email: "t.blank@example.com",
    mobile: "07700 900461", type: "loft", room: 301, arrive: "2026-07-23", depart: "2026-07-28",
    guests: 3, arrivalTime: "17:00", extras: ["breakfast", "parking"], status: "in_house",
    checkedInAt: "17:35",
  }),

  /* --- arrived this morning, already in --- */
  stay({
    ref: "WH-3284", first: "Noor", last: "Hadid", email: "noor.hadid@example.com",
    mobile: "07700 900512", type: "garden", room: 106, arrive: "2026-07-28", depart: "2026-07-31",
    guests: 2, arrivalTime: "09:00", extras: ["breakfast"], status: "in_house",
    checkedInAt: "08:40",
  }),

  /* --- in the building, staying on --- */
  stay({ ref: "WH-3285", first: "Bram", last: "Ellery", email: "bram.ellery@example.com", mobile: "07700 900623", type: "snug", room: 102, arrive: "2026-07-27", depart: "2026-07-30", guests: 1, arrivalTime: "18:00", extras: [], status: "in_house", checkedInAt: "18:15" }),
  stay({ ref: "WH-3286", first: "Lucia", last: "Fenwick", email: "l.fenwick@example.com", mobile: "07700 900734", type: "garden", room: 107, arrive: "2026-07-26", depart: "2026-07-29", guests: 2, arrivalTime: "16:00", extras: ["breakfast"], status: "in_house", checkedInAt: "16:40" }),
  stay({ ref: "WH-3287", first: "Osian", last: "Trelawney", email: "o.trelawney@example.com", mobile: "07700 900845", type: "garden", room: 109, arrive: "2026-07-25", depart: "2026-07-31", guests: 2, arrivalTime: "15:00", extras: [], status: "in_house", checkedInAt: "15:20" }),
  stay({ ref: "WH-3288", first: "Petra", last: "Nadeau", email: "p.nadeau@example.com", mobile: "07700 900956", type: "harbour", room: 305, arrive: "2026-07-27", depart: "2026-08-01", guests: 2, arrivalTime: "17:00", extras: ["breakfast"], status: "in_house", checkedInAt: "17:05" }),
  stay({ ref: "WH-3289", first: "Halvor", last: "Sund", email: "h.sund@example.com", mobile: "07700 901067", type: "loft", room: 302, arrive: "2026-07-26", depart: "2026-08-02", guests: 4, arrivalTime: "20:00", extras: ["breakfast", "parking"], status: "in_house", checkedInAt: "20:25" }),
  stay({ ref: "WH-3290", first: "Amara", last: "Sinclair", email: "a.sinclair@example.com", mobile: "07700 901178", type: "snug", room: 104, arrive: "2026-07-27", depart: "2026-07-29", guests: 1, arrivalTime: "21:00", extras: [], status: "in_house", checkedInAt: "21:30" }),
  stay({ ref: "WH-3291", first: "Devon", last: "Marchetti", email: "d.marchetti@example.com", mobile: "07700 901289", type: "garden", room: 110, arrive: "2026-07-24", depart: "2026-07-30", guests: 2, arrivalTime: "15:00", extras: ["parking"], status: "in_house", checkedInAt: "15:45" }),
  stay({ ref: "WH-3292", first: "Rosalind", last: "Oyelaran", email: "r.oyelaran@example.com", mobile: "07700 901390", type: "harbour", room: 307, arrive: "2026-07-26", depart: "2026-07-30", guests: 2, arrivalTime: "16:00", extras: [], status: "in_house", checkedInAt: "16:05" }),
  stay({ ref: "WH-3293", first: "Fionn", last: "Castellane", email: "f.castellane@example.com", mobile: "07700 901401", type: "garden", room: 111, arrive: "2026-07-27", depart: "2026-08-01", guests: 3, arrivalTime: "18:00", extras: ["breakfast"], status: "in_house", checkedInAt: "18:50" }),
  stay({ ref: "WH-3294", first: "Sable", last: "Whitcombe", email: "s.whitcombe@example.com", mobile: "07700 901512", type: "loft", room: 303, arrive: "2026-07-25", depart: "2026-08-03", guests: 4, arrivalTime: "15:00", extras: ["breakfast"], status: "in_house", checkedInAt: "15:10" }),
  stay({ ref: "WH-3295", first: "Emrys", last: "Toll", email: "e.toll@example.com", mobile: "07700 901623", type: "snug", room: 201, arrive: "2026-07-27", depart: "2026-07-31", guests: 1, arrivalTime: "22:00", extras: [], status: "in_house", checkedInAt: "22:10" }),
  stay({ ref: "WH-3296", first: "Junie", last: "Alvarez", email: "j.alvarez@example.com", mobile: "07700 901734", type: "garden", room: 112, arrive: "2026-07-26", depart: "2026-07-29", guests: 2, arrivalTime: "17:00", extras: [], status: "in_house", checkedInAt: "17:20" }),
  stay({ ref: "WH-3297", first: "Kester", last: "Vane", email: "k.vane@example.com", mobile: "07700 901845", type: "harbour", room: 308, arrive: "2026-07-27", depart: "2026-07-31", guests: 2, arrivalTime: "16:00", extras: ["parking"], status: "in_house", checkedInAt: "16:15" }),
  stay({ ref: "WH-3298", first: "Wilda", last: "Nkemelu", email: "w.nkemelu@example.com", mobile: "07700 901956", type: "garden", room: 206, arrive: "2026-07-25", depart: "2026-07-30", guests: 2, arrivalTime: "19:00", extras: [], status: "in_house", checkedInAt: "19:35" }),
  stay({ ref: "WH-3299", first: "Corin", last: "Ashdown", email: "c.ashdown@example.com", mobile: "07700 902067", type: "snug", room: 202, arrive: "2026-07-27", depart: "2026-07-29", guests: 1, arrivalTime: "15:00", extras: [], status: "in_house", checkedInAt: "15:40" }),
  stay({ ref: "WH-3300", first: "Marisol", last: "Fairbairn", email: "m.fairbairn@example.com", mobile: "07700 902178", type: "garden", room: 207, arrive: "2026-07-26", depart: "2026-08-02", guests: 2, arrivalTime: "18:00", extras: ["breakfast", "parking"], status: "in_house", checkedInAt: "18:05" }),

  /* --- arriving today, not yet in --- */
  stay({
    ref: "WH-3301", first: "Ottoline", last: "Grey", email: "o.grey@example.com",
    mobile: "07700 902289", type: "harbour", room: null, arrive: "2026-07-28", depart: "2026-07-31",
    guests: 2, arrivalTime: "16:00", extras: ["breakfast"], status: "confirmed",
    noteKey: "data.note.late", note: "We are driving down and may be later than we said — please hold the room.",
  }),
  stay({ ref: "WH-3302", first: "Sorley", last: "Mackintosh", email: "s.mackintosh@example.com", mobile: "07700 902390", type: "snug", room: null, arrive: "2026-07-28", depart: "2026-07-30", guests: 1, arrivalTime: "18:00", extras: [], status: "confirmed" }),
  stay({ ref: "WH-3303", first: "Zeynep", last: "Aydın", email: "z.aydin@example.com", mobile: "07700 902401", type: "garden", room: null, arrive: "2026-07-28", depart: "2026-08-02", guests: 2, arrivalTime: "15:00", extras: ["breakfast", "parking"], status: "confirmed" }),
  stay({ ref: "WH-3304", first: "Ren", last: "Kobayashi", email: "r.kobayashi@example.com", mobile: "07700 902512", type: "loft", room: null, arrive: "2026-07-28", depart: "2026-08-02", guests: 4, arrivalTime: "20:00", extras: ["breakfast"], status: "confirmed" }),

  /* --- still to come --- */
  stay({ ref: "WH-3305", first: "Nadia", last: "Brightwell", email: "n.brightwell@example.com", mobile: "07700 902623", type: "harbour", room: null, arrive: "2026-07-31", depart: "2026-08-03", guests: 2, arrivalTime: "17:00", extras: ["breakfast"], status: "confirmed" }),
  /* A Saturday arrival — and the fourth loft on the night of 1 August, which is
   * what makes that column fully committed on the calendar. */
  stay({ ref: "WH-3306", first: "Aurelio", last: "Pastore", email: "a.pastore@example.com", mobile: "07700 902734", type: "loft", room: null, arrive: "2026-08-01", depart: "2026-08-03", guests: 3, arrivalTime: "16:00", extras: ["parking"], status: "confirmed" }),
];
