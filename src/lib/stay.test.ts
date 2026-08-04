/**
 * Stay-engine assertions.
 *
 * The rules first, against the smallest data that can express each one, then
 * one section for the seeded house — the numbers the demo story depends on:
 * twenty-one rooms in the building, four leaving, one of whom cannot check out,
 * and a Saturday in August with every loft suite committed.
 *
 * The half-open interval `[arrive, departure)` is asserted from four different
 * directions on purpose. It is the rule this whole product rests on, and every
 * way of getting it wrong loses the hotel a night per turnover.
 */

import { describe, expect, it } from "vitest";

import { EXTRAS, NOW, ROOMS, ROOM_TYPES, STAYS, TAX_RATE } from "../data/demo.ts";
import type { Room, Stay } from "../data/types.ts";
import {
  MAX_NIGHTS,
  assignableRooms,
  calendarRow,
  cancellationIsFree,
  canMoveTo,
  checkPayment,
  checkoutBlock,
  cleaningCount,
  dayBoard,
  dayDiff,
  earliestFor,
  extraRows,
  findByRef,
  folioFor,
  freeAcross,
  isLive,
  movementsOn,
  nightOfStay,
  nightRows,
  nights,
  nightsBetween,
  occupancyOn,
  occupiesNight,
  plusDays,
  rateFor,
  rateTags,
  roomTotal,
  sellable,
  soldOn,
  stayProblem,
  weekday,
} from "./stay.ts";

/* ------------------------------------------------------------- fixtures */

const type = (patch: Partial<(typeof ROOM_TYPES)[number]> = {}) => ({
  ...ROOM_TYPES[0],
  ...patch,
});

function s(patch: Partial<Stay> & { ref: string }): Stay {
  return {
    first: "A",
    last: "Guest",
    email: "a@example.com",
    mobile: "0",
    type: "garden",
    room: null,
    arrive: "2026-07-28",
    depart: "2026-07-30",
    guests: 2,
    arrivalTime: "16:00",
    noteKey: null,
    note: "",
    extras: [],
    status: "confirmed",
    checkedInAt: null,
    charges: [],
    payments: [],
    ...patch,
  };
}

function rooms(spec: [number, string, Room["status"]][]): Room[] {
  return spec.map(([number, t, status]) => ({ number, floor: 1, type: t, status, noteKey: null }));
}

/* ------------------------------------------------------------- calendar */

describe("the half-open interval", () => {
  it("counts nights, not days", () => {
    expect(nights("2026-07-24", "2026-07-26")).toBe(2);
  });

  it("lists the nights a stay actually occupies", () => {
    expect(nightsBetween("2026-07-24", "2026-07-26")).toEqual(["2026-07-24", "2026-07-25"]);
  });

  it("does NOT occupy the night of departure", () => {
    // The whole rule in one assertion: a room given up on the 26th is free on
    // the 26th, and anything that says otherwise loses a night per turnover.
    const stay = s({ ref: "R", arrive: "2026-07-24", depart: "2026-07-26" });
    expect(occupiesNight(stay, "2026-07-25")).toBe(true);
    expect(occupiesNight(stay, "2026-07-26")).toBe(false);
  });

  it("lets a departure and an arrival share a date", () => {
    const leaving = s({ ref: "OUT", type: "loft", arrive: "2026-07-24", depart: "2026-07-26", status: "in_house" });
    const coming = s({ ref: "IN", type: "loft", arrive: "2026-07-26", depart: "2026-07-28" });
    const one = rooms([[301, "loft", "occupied"]]);
    expect(soldOn([leaving, coming], "loft", "2026-07-26")).toBe(1);
    expect(freeAcross(one, [leaving, coming], "loft", "2026-07-26", "2026-07-27")).toBe(0);
    // …and the night before the turnover is the leaver's, not the arriver's.
    expect(soldOn([leaving, coming], "loft", "2026-07-25")).toBe(1);
  });

  it("parses as a LOCAL day, so a date never slips by a timezone", () => {
    expect(dayDiff("2026-07-28", "2026-07-28")).toBe(0);
    expect(plusDays("2026-07-31", 1)).toBe("2026-08-01");
  });

  it("knows a Saturday from a Tuesday", () => {
    expect(weekday("2026-07-28")).toBe(2);
    expect(weekday("2026-08-01")).toBe(6);
  });
});

/* ---------------------------------------------------------- stay length */

describe("stayProblem", () => {
  it("accepts an ordinary midweek stay", () => {
    expect(stayProblem("2026-07-28", "2026-07-30")).toBeNull();
  });

  it("refuses a stay that ends before it starts", () => {
    expect(stayProblem("2026-07-28", "2026-07-28")).toBe("too-short");
    expect(stayProblem("2026-07-28", "2026-07-27")).toBe("too-short");
  });

  it("caps a stay at fourteen nights — 21 D13, in the engine", () => {
    expect(stayProblem("2026-07-01", plusDays("2026-07-01", MAX_NIGHTS))).toBeNull();
    expect(stayProblem("2026-07-01", plusDays("2026-07-01", MAX_NIGHTS + 1))).toBe("too-long");
  });

  it("needs two nights from a Saturday", () => {
    expect(stayProblem("2026-08-01", "2026-08-02")).toBe("saturday");
    expect(stayProblem("2026-08-01", "2026-08-03")).toBeNull();
  });

  it("checks the length before the Saturday rule", () => {
    // A guest who asked for nothing should be told that, not lectured about
    // weekends.
    expect(stayProblem("2026-08-01", "2026-08-01")).toBe("too-short");
  });
});

/* --------------------------------------------------------- availability */

describe("sellable / soldOn / freeAcross", () => {
  const house = rooms([
    [301, "loft", "ready"],
    [302, "loft", "occupied"],
    [303, "loft", "cleaning"],
    [304, "loft", "oos"],
  ]);

  it("counts a room being cleaned as sellable and an out-of-service one as not", () => {
    // Cleaning finishes this afternoon; a broken window does not.
    expect(sellable(house, "loft")).toBe(3);
  });

  it("ignores cancelled and departed stays", () => {
    const list = [
      s({ ref: "A", type: "loft", status: "cancelled", arrive: "2026-07-27", depart: "2026-07-30" }),
      s({ ref: "B", type: "loft", status: "departed", arrive: "2026-07-27", depart: "2026-07-30" }),
      s({ ref: "C", type: "loft", status: "confirmed", arrive: "2026-07-27", depart: "2026-07-30" }),
    ];
    expect(list.filter(isLive)).toHaveLength(1);
    expect(soldOn(list, "loft", "2026-07-28")).toBe(1);
  });

  it("takes the MINIMUM across the range, not the average", () => {
    // One full night in the middle makes the whole range unbookable, however
    // empty the rest of it is.
    const list = [
      s({ ref: "A", type: "loft", arrive: "2026-07-29", depart: "2026-07-30" }),
      s({ ref: "B", type: "loft", arrive: "2026-07-29", depart: "2026-07-30" }),
      s({ ref: "C", type: "loft", arrive: "2026-07-29", depart: "2026-07-30" }),
    ];
    expect(freeAcross(house, list, "loft", "2026-07-29", "2026-07-30")).toBe(0);
    expect(freeAcross(house, list, "loft", "2026-07-28", "2026-07-31")).toBe(0);
    expect(freeAcross(house, list, "loft", "2026-07-30", "2026-07-31")).toBe(3);
  });

  it("is zero for a range with no nights in it", () => {
    expect(freeAcross(house, [], "loft", "2026-07-28", "2026-07-28")).toBe(0);
  });
});

describe("earliestFor", () => {
  const house = rooms([[301, "loft", "ready"]]);

  it("offers the first date the type is actually open", () => {
    const full = [s({ ref: "A", type: "loft", arrive: "2026-07-28", depart: "2026-07-31" })];
    expect(earliestFor(house, full, "loft", 1, "2026-07-28")).toBe("2026-07-31");
  });

  it("skips a Saturday it would only have to refuse", () => {
    // 1 August 2026 is a Saturday; a one-night stay cannot start there.
    expect(earliestFor(house, [], "loft", 1, "2026-07-31")).toBe("2026-08-02");
  });

  it("offers that same Saturday for a two-night stay", () => {
    expect(earliestFor(house, [], "loft", 2, "2026-07-31")).toBe("2026-08-01");
  });

  it("gives up rather than looping forever", () => {
    const oos = rooms([[301, "loft", "oos"]]);
    expect(earliestFor(oos, [], "loft", 1, "2026-07-28")).toBeNull();
  });
});

/* --------------------------------------------------------------- rates */

describe("rateFor", () => {
  const t = type({ base: 180 });

  it("charges the base rate on an ordinary night", () => {
    expect(rateFor(t, "2026-07-28")).toBe(180);
  });

  it("adds a weekend delta on Friday and Saturday nights", () => {
    expect(rateFor(t, "2026-07-24")).toBe(205);
    expect(rateFor(t, "2026-07-25")).toBe(205);
    expect(rateFor(t, "2026-07-26")).toBe(180);
  });

  it("adds a high-season delta through August", () => {
    expect(rateFor(t, "2026-08-04")).toBe(200);
  });

  it("applies both together on an August weekend", () => {
    expect(rateFor(t, "2026-08-01")).toBe(225);
    expect(rateTags("2026-08-01")).toEqual(["weekend", "season"]);
  });
});

describe("the per-night breakdown", () => {
  const t = type({ base: 150 });

  it("sums to the stay total — never a flat rate times nights", () => {
    // This is the assertion that stops somebody 'simplifying' the total later.
    const rows = nightRows(t, "2026-07-24", "2026-07-28");
    expect(rows.map((r) => r.rate)).toEqual([175, 175, 150, 150]);
    expect(roomTotal(t, "2026-07-24", "2026-07-28")).toBe(650);
    expect(roomTotal(t, "2026-07-24", "2026-07-28")).not.toBe(150 * 4);
  });

  it("numbers the nights from one", () => {
    expect(nightRows(t, "2026-07-24", "2026-07-26").map((r) => r.index)).toEqual([1, 2]);
  });
});

/* -------------------------------------------------------------- extras */

describe("extraRows", () => {
  it("prices each extra the way it is actually charged", () => {
    const out = extraRows(EXTRAS, ["breakfast", "parking", "late"], 3, 5);
    expect(out.map((e) => e.amount)).toEqual([14 * 3 * 5, 12 * 5, 30]);
  });

  it("ignores an id that is not in the catalogue", () => {
    expect(extraRows(EXTRAS, ["nonsense"], 2, 2)).toEqual([]);
  });
});

/* ---------------------------------------------------------------- folio */

describe("folioFor", () => {
  const t = type({ id: "garden", base: 150 });
  const stay = s({
    ref: "R",
    type: "garden",
    arrive: "2026-07-24",
    depart: "2026-07-28",
    guests: 2,
    extras: ["breakfast"],
  });

  const folio = folioFor(stay, t, EXTRAS, 0.08);

  it("adds up nights, extras and charges, then taxes the lot", () => {
    expect(folio.roomTotal).toBe(650);
    expect(folio.extrasTotal).toBe(112);
    expect(folio.subtotal).toBe(762);
    expect(folio.tax).toBe(60.96);
    expect(folio.total).toBe(822.96);
  });

  it("opens the payments with one night held as a deposit", () => {
    expect(folio.deposit).toBe(175);
    expect(folio.payments[0]).toMatchObject({ deposit: true, amount: 175 });
    expect(folio.balance).toBe(647.96);
  });

  it("omits the deposit row entirely for a booking taken at the desk", () => {
    const walkIn = folioFor({ ...stay, noDeposit: true }, t, EXTRAS, 0.08);
    expect(walkIn.payments).toHaveLength(0);
    expect(walkIn.balance).toBe(walkIn.total);
  });

  it("includes charges added mid-stay, and taxes them too", () => {
    const withBar = folioFor(
      { ...stay, charges: [{ date: "2026-07-26", kind: "bar", labelKey: "k", label: "Bar", amount: 18 }] },
      t,
      EXTRAS,
      0.08,
    );
    expect(withBar.subtotal).toBe(780);
    expect(withBar.total).toBe(842.4);
  });
});

describe("checkPayment", () => {
  it("accepts a partial", () => {
    expect(checkPayment(200, 647.96)).toEqual({ ok: true, over: 0 });
  });

  it("accepts the exact balance", () => {
    expect(checkPayment(647.96, 647.96).ok).toBe(true);
  });

  it("refuses an overpayment and names the excess", () => {
    expect(checkPayment(700, 647.96)).toEqual({ ok: false, over: 52.04 });
  });

  it("refuses nothing at all", () => {
    expect(checkPayment(0, 100).ok).toBe(false);
  });
});

/* ---------------------------------------------------------- the machine */

describe("canMoveTo", () => {
  it("walks held → confirmed → in house → departed", () => {
    expect(canMoveTo("held", "confirmed")).toBe(true);
    expect(canMoveTo("confirmed", "in_house")).toBe(true);
    expect(canMoveTo("in_house", "departed")).toBe(true);
  });

  it("allows cancelling only before somebody is in the building", () => {
    expect(canMoveTo("held", "cancelled")).toBe(true);
    expect(canMoveTo("confirmed", "cancelled")).toBe(true);
    expect(canMoveTo("in_house", "cancelled")).toBe(false);
  });

  it("is a dead end once departed or cancelled", () => {
    expect(canMoveTo("departed", "in_house")).toBe(false);
    expect(canMoveTo("cancelled", "confirmed")).toBe(false);
  });
});

/* ------------------------------------------------------- room assignment */

describe("assignableRooms", () => {
  const house = rooms([
    [301, "loft", "ready"],
    [302, "loft", "occupied"],
    [303, "loft", "cleaning"],
    [304, "loft", "oos"],
    [201, "snug", "ready"],
  ]);

  it("offers only READY rooms of the booked type", () => {
    // Not "any free room": a Harbour double is what they paid for.
    expect(assignableRooms(house, "loft").map((r) => r.number)).toEqual([301]);
  });

  it("counts what is being cleaned, for the honest empty state", () => {
    expect(cleaningCount(house, "loft")).toBe(1);
  });
});

describe("checkoutBlock", () => {
  it("blocks a check-out with money still on the folio, and names it", () => {
    expect(checkoutBlock(1291.6)).toEqual({ blocked: true, outstanding: 1291.6 });
  });

  it("lets a settled guest go", () => {
    expect(checkoutBlock(0).blocked).toBe(false);
  });

  it("tolerates a half-penny of rounding", () => {
    expect(checkoutBlock(0.004).blocked).toBe(false);
  });
});

/* ------------------------------------------------------- the cancellation */

describe("cancellationIsFree", () => {
  it("is clean more than 48 hours out", () => {
    expect(cancellationIsFree("2026-07-28", "2026-07-31")).toBe(true);
    expect(cancellationIsFree("2026-07-28", "2026-07-30")).toBe(true);
  });

  it("keeps the deposit inside the window", () => {
    expect(cancellationIsFree("2026-07-28", "2026-07-29")).toBe(false);
    expect(cancellationIsFree("2026-07-28", "2026-07-28")).toBe(false);
  });
});

/* ------------------------------------------------------------- the desk */

describe("dayBoard", () => {
  const today = "2026-07-28";
  const board = dayBoard(STAYS, today);

  it("puts somebody already checked in today under In house, not Arriving", () => {
    expect(board.arriving.map((x) => x.ref)).not.toContain("WH-3284");
    expect(board.inHouse.map((x) => x.ref)).toContain("WH-3284");
  });

  it("finds the five arrivals and the four departures", () => {
    // Four still to arrive plus the one already in — five arrivals today.
    expect(board.arriving).toHaveLength(4);
    expect(board.leaving).toHaveLength(4);
    expect(STAYS.filter((x) => x.arrive === today && isLive(x))).toHaveLength(5);
  });

  it("keeps the leavers out of In house — they are today's work", () => {
    const refs = board.inHouse.map((x) => x.ref);
    for (const leaver of board.leaving) expect(refs).not.toContain(leaver.ref);
  });
});

describe("nightOfStay", () => {
  it("says which night of the stay tonight is", () => {
    const stay = s({ ref: "R", arrive: "2026-07-25", depart: "2026-07-29" });
    expect(nightOfStay(stay, "2026-07-26")).toEqual({ current: 2, total: 4 });
  });

  it("never runs past the last night", () => {
    const stay = s({ ref: "R", arrive: "2026-07-25", depart: "2026-07-27" });
    expect(nightOfStay(stay, "2026-07-27").current).toBe(2);
  });
});

describe("occupancyOn", () => {
  it("measures against SELLABLE rooms, not against every room", () => {
    const house = rooms([
      [1, "garden", "ready"],
      [2, "garden", "ready"],
      [3, "garden", "oos"],
    ]);
    const list = [s({ ref: "A", type: "garden", arrive: "2026-07-28", depart: "2026-07-29" })];
    // Two sellable, one sold — 50%. Counting the broken room would say 33% and
    // nobody in the building would believe it.
    expect(occupancyOn(house, list, ROOM_TYPES, "2026-07-28")).toMatchObject({
      sold: 1,
      sellable: 2,
      pct: 50,
    });
  });

  it("has no average rate when nothing is sold", () => {
    const house = rooms([[1, "garden", "ready"]]);
    expect(occupancyOn(house, [], ROOM_TYPES, "2026-07-28").averageRate).toBeNull();
  });
});

describe("calendarRow", () => {
  it("marks a night as full only when every sellable room is committed", () => {
    const house = rooms([
      [1, "loft", "ready"],
      [2, "loft", "oos"],
    ]);
    const list = [s({ ref: "A", type: "loft", arrive: "2026-07-28", depart: "2026-07-29" })];
    const row = calendarRow(house, list, "loft", "2026-07-28", 2);
    expect(row[0]).toMatchObject({ sold: 1, available: 1, pct: 100, full: true });
    expect(row[1]).toMatchObject({ sold: 0, full: false });
  });
});

describe("movementsOn", () => {
  it("lists that night's arrivals and departures", () => {
    const moves = movementsOn(STAYS, "2026-07-28");
    expect(moves.arriving).toHaveLength(5);
    expect(moves.leaving).toHaveLength(4);
  });
});

describe("findByRef", () => {
  it("finds a guest by reference and surname", () => {
    expect(findByRef(STAYS, "WH-3301", "Grey")?.first).toBe("Ottoline");
  });

  it("forgives case and stray spaces", () => {
    expect(findByRef(STAYS, "  wh-3301 ", "  grey ")?.ref).toBe("WH-3301");
  });

  it("refuses a reference with the wrong surname", () => {
    expect(findByRef(STAYS, "WH-3301", "Waverley")).toBeNull();
  });
});

/* --------------------------------------------------------- the seeded house */

describe("the seeded house", () => {
  const typeOf = (id: string) => ROOM_TYPES.find((t) => t.id === id)!;
  const folio = (stay: Stay) => folioFor(stay, typeOf(stay.type), EXTRAS, TAX_RATE);

  it("pins the clock to the Tuesday morning, mid-departure", () => {
    expect(NOW.date).toBe("2026-07-28");
    expect(weekday(NOW.date)).toBe(2);
    expect(NOW.morning < NOW.departBy).toBe(true);
    expect(NOW.afterCheckout > NOW.departBy).toBe(true);
  });

  it("is 34 rooms over three floors in four types", () => {
    expect(ROOMS).toHaveLength(34);
    expect(new Set(ROOMS.map((r) => r.floor))).toEqual(new Set([1, 2, 3]));
    expect(ROOM_TYPES).toHaveLength(4);
  });

  it("splits them 8 / 14 / 8 / 4", () => {
    const count = (t: string) => ROOMS.filter((r) => r.type === t).length;
    expect([count("snug"), count("garden"), count("harbour"), count("loft")]).toEqual([8, 14, 8, 4]);
  });

  it("has two rooms out of service and three being cleaned", () => {
    expect(ROOMS.filter((r) => r.status === "oos")).toHaveLength(2);
    expect(ROOMS.filter((r) => r.status === "cleaning")).toHaveLength(3);
    for (const r of ROOMS.filter((x) => x.status === "oos")) expect(r.noteKey).not.toBeNull();
  });

  it("has 21 rooms occupied, and every one of them belongs to somebody", () => {
    const occupied = ROOMS.filter((r) => r.status === "occupied");
    expect(occupied).toHaveLength(21);
    const held = STAYS.filter((x) => x.status === "in_house").map((x) => x.room);
    expect(held).toHaveLength(21);
    expect(new Set(held)).toEqual(new Set(occupied.map((r) => r.number)));
  });

  it("puts each guest in a room of the type they booked", () => {
    for (const stay of STAYS.filter((x) => x.room !== null)) {
      const room = ROOMS.find((r) => r.number === stay.room)!;
      expect(room.type, `${stay.ref} in ${room.number}`).toBe(stay.type);
    }
  });

  it("sells 21 of 32 rooms tonight", () => {
    const tonight = occupancyOn(ROOMS, STAYS, ROOM_TYPES, NOW.date);
    expect(tonight).toMatchObject({ sold: 21, sellable: 32, pct: 66 });
    expect(tonight.averageRate).toBeGreaterThan(0);
  });

  it("never over-sells a type on any night of the fortnight", () => {
    for (const t of ROOM_TYPES) {
      const row = calendarRow(ROOMS, STAYS, t.id, NOW.date, 14);
      for (const cell of row) {
        expect(cell.sold, `${t.id} on ${cell.night}`).toBeLessThanOrEqual(cell.available);
      }
    }
  });

  it("commits every loft suite on Saturday 1 August", () => {
    // The one fully-committed night the calendar needs a mark for.
    expect(weekday("2026-08-01")).toBe(6);
    const row = calendarRow(ROOMS, STAYS, "loft", "2026-08-01", 1);
    expect(row[0]).toMatchObject({ sold: 4, available: 4, full: true });
    expect(freeAcross(ROOMS, STAYS, "loft", "2026-08-01", "2026-08-02")).toBe(0);
  });

  it("obeys its own stay-length rules", () => {
    for (const stay of STAYS) {
      expect(stayProblem(stay.arrive, stay.depart), stay.ref).toBeNull();
    }
  });

  it("leaves exactly one departure unable to check out", () => {
    const leaving = dayBoard(STAYS, NOW.date).leaving;
    const blocked = leaving.filter((x) => checkoutBlock(folio(x).balance).blocked);
    expect(blocked.map((x) => x.ref)).toEqual(["WH-3283"]);
  });

  it("names $1,291.60 as the amount that stops them", () => {
    const stay = STAYS.find((x) => x.ref === "WH-3283")!;
    const f = folio(stay);
    expect(f.roomTotal).toBe(1125);
    expect(f.extrasTotal).toBe(270);
    expect(f.total).toBe(1506.6);
    expect(checkoutBlock(f.balance).outstanding).toBe(1291.6);
  });

  it("has the other three departures settled to the penny", () => {
    for (const ref of ["WH-3280", "WH-3281", "WH-3282"]) {
      const stay = STAYS.find((x) => x.ref === ref)!;
      expect(folio(stay).balance, ref).toBe(0);
    }
  });

  it("gives exactly one arrival a note for the desk", () => {
    const noted = STAYS.filter((x) => x.arrive === NOW.date && x.noteKey !== null);
    expect(noted.map((x) => x.ref)).toEqual(["WH-3301"]);
  });

  it("runs its references WH-3280 … WH-3306 with no gaps or repeats", () => {
    const numbers = STAYS.map((x) => Number(x.ref.slice(3))).sort((a, b) => a - b);
    expect(numbers[0]).toBe(3280);
    expect(numbers[numbers.length - 1]).toBe(3306);
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it("keeps every rate inside the $110–$260 the house advertises", () => {
    for (const t of ROOM_TYPES) {
      for (let i = 0; i < 365; i += 1) {
        const rate = rateFor(t, plusDays("2026-01-01", i));
        expect(rate).toBeGreaterThanOrEqual(110);
        expect(rate).toBeLessThanOrEqual(260);
      }
    }
  });

  /*
   * 21 D13, asserted rather than merely documented. If somebody ever adds an
   * owner, a lease, a long stay or a maintenance queue to this app, one of
   * these two is the test that fails first.
   */
  it("holds the scope boundary: no stay is a letting", () => {
    for (const stay of STAYS) {
      expect(nights(stay.arrive, stay.depart), stay.ref).toBeLessThanOrEqual(MAX_NIGHTS);
    }
  });

  it("holds the scope boundary: housekeeping is a flag and nothing else", () => {
    const statuses = new Set(ROOMS.map((r) => r.status));
    expect([...statuses].sort()).toEqual(["cleaning", "occupied", "oos", "ready"]);
  });
});
