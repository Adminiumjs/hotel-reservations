/**
 * EVERY FIGURE THE DESIGN QUOTES COMES OUT OF THE SAMPLE.
 *
 * The sample is added at 09:05 on Tuesday 28 July 2026 in Bellhaven
 * (America/New_York), resolved the way Adminium resolves it — each night
 * priced from its room type and the rate rules that match it, each extra
 * copied and multiplied out over the stay's nights and guests, the tax (9 %,
 * rounded once, half up), the total, what was paid and what is owing — and
 * each figure the screens, the emails and the Overview show is read back from
 * the rows. A figure that changes here changes on every screen; change the
 * design's copy with it, never this test alone.
 *
 * The figures hold at this clock. Added on another day, the stays keep their
 * shape around "today" and Adminium prices them by the nights they really
 * fall on.
 */
import { describe, expect, it } from "vitest";

import { RULES, pricedNights, resolveSample, type ResolvedRow, type SampleBundleRows } from "../data/sampleRows.ts";
import { DEMO_ZONE, sampleBundle, stayMoney, STAYS } from "./wren-house.ts";

/** 09:05 EDT is 13:05 UTC. */
const AT_0905 = Date.parse("2026-07-28T13:05:00Z");
const rows = resolveSample(sampleBundle() as unknown as SampleBundleRows, { now: AT_0905, zone: DEMO_ZONE, locale: "en-US", currency: "USD" });

const stays = rows["stays"]!;
const rooms = rows["rooms"]!;
const types = rows["room_types"]!;
const closures = rows["room_closures"]!;
const extras = rows["extras"]!;
const stayExtras = rows["stay_extras"]!;
const payments = rows["payments"]!;
const stay = (ref: number) => stays.find((s) => s["ref"] === `WH-S${String(ref)}`)!;
const money = (value: unknown) => (value === null ? null : Number(value).toFixed(2));
const typeName = (id: unknown) => types.find((t) => t["id"] === id)!["name"];
const typeByName = (name: string) => types.find((t) => t["name"] === name)!;
const roomNumber = (id: unknown) => rooms.find((r) => r["id"] === id)?.["number"] ?? null;

/** The house's date and wall time of an instant. */
const local = (iso: unknown) => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: DEMO_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(String(iso)));
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return { day: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
};
const TODAY = "2026-07-28";
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const COUNTED = ["booked", "in_house"];
const sleepsOn = (s: ResolvedRow, night: string) => String(s["arrive"]) <= night && night < String(s["depart"]);

/** Rooms of a type that can be sold on a night: the type's rooms, less those out of service that night. */
function sellable(typeId: unknown, night: string): number {
  return rooms.filter((r) => r["room_type_id"] === typeId && !closures.some((c) => c["room_id"] === r["id"] && c["active"] === true && String(c["from_date"]) <= night && (c["to_date"] === null || night <= String(c["to_date"])))).length;
}
/** Stays of a type counted on a night. */
const sold = (typeId: unknown, night: string) => stays.filter((s) => COUNTED.includes(String(s["status"])) && s["room_type_id"] === typeId && sleepsOn(s, night)).length;

describe("every reservation, as figures.md lists it", () => {
  // ref, guest, type, room, arrive, depart, nights, guests, status, room, extras, charges, subtotal, tax, total, paid, balance
  const TABLE: [number, string, string, string | null, string, string, number, number, string, string, string, string, string, string, string, string, string][] = [
    [3276, "Agnes Pellow", "Harbour double", "310", "2026-07-24", "2026-07-27", 3, 2, "departed", "590.00", "96.00", "0.00", "686.00", "61.74", "747.74", "747.74", "0.00"],
    [3277, "Tomasz Kowal", "Garden double", null, "2026-08-05", "2026-08-07", 2, 2, "cancelled", "340.00", "0.00", "0.00", "340.00", "30.60", "370.60", "0.00", "370.60"],
    [3278, "Lena Hartigan", "Snug single", null, "2026-07-29", "2026-07-31", 2, 1, "cancelled", "220.00", "0.00", "0.00", "220.00", "19.80", "239.80", "0.00", "239.80"],
    [3279, "Rafe Collier", "Snug single", null, "2026-07-27", "2026-07-28", 1, 1, "booked", "110.00", "0.00", "0.00", "110.00", "9.90", "119.90", "0.00", "119.90"],
    [3280, "Iris Waverley", "Garden double", "105", "2026-07-24", "2026-07-28", 4, 2, "in_house", "650.00", "128.00", "0.00", "778.00", "70.02", "848.02", "848.02", "0.00"],
    [3281, "Callum Reece", "Snug single", "101", "2026-07-26", "2026-07-28", 2, 1, "in_house", "220.00", "0.00", "0.00", "220.00", "19.80", "239.80", "239.80", "0.00"],
    [3282, "Marguerite Okafor", "Harbour double", "209", "2026-07-25", "2026-07-28", 3, 2, "in_house", "565.00", "77.00", "0.00", "642.00", "57.78", "699.78", "699.78", "0.00"],
    [3283, "Teodor Blank", "Loft suite", "301", "2026-07-23", "2026-07-28", 5, 3, "in_house", "1125.00", "310.00", "32.00", "1467.00", "132.03", "1599.03", "500.00", "1099.03"],
    [3284, "Noor Hadid", "Garden double", "106", "2026-07-28", "2026-07-31", 3, 2, "in_house", "450.00", "96.00", "0.00", "546.00", "49.14", "595.14", "0.00", "595.14"],
    [3285, "Bram Ellery", "Snug single", "102", "2026-07-27", "2026-07-30", 3, 1, "in_house", "330.00", "0.00", "0.00", "330.00", "29.70", "359.70", "0.00", "359.70"],
    [3286, "Lucia Fenwick", "Garden double", "107", "2026-07-26", "2026-07-29", 3, 2, "in_house", "450.00", "96.00", "0.00", "546.00", "49.14", "595.14", "0.00", "595.14"],
    [3287, "Osian Trelawney", "Garden double", "109", "2026-07-25", "2026-07-31", 6, 2, "in_house", "925.00", "0.00", "0.00", "925.00", "83.25", "1008.25", "0.00", "1008.25"],
    [3288, "Petra Nadeau", "Harbour double", "305", "2026-07-27", "2026-08-01", 5, 2, "in_house", "925.00", "160.00", "0.00", "1085.00", "97.65", "1182.65", "0.00", "1182.65"],
    [3289, "Halvor Sund", "Loft suite", "302", "2026-07-26", "2026-08-02", 7, 4, "in_house", "1575.00", "546.00", "0.00", "2121.00", "190.89", "2311.89", "0.00", "2311.89"],
    [3290, "Amara Sinclair", "Snug single", "104", "2026-07-27", "2026-07-29", 2, 1, "in_house", "220.00", "0.00", "0.00", "220.00", "19.80", "239.80", "0.00", "239.80"],
    [3291, "Devon Marchetti", "Garden double", "110", "2026-07-24", "2026-07-30", 6, 2, "in_house", "950.00", "84.00", "0.00", "1034.00", "93.06", "1127.06", "0.00", "1127.06"],
    [3292, "Rosalind Oyelaran", "Harbour double", "307", "2026-07-26", "2026-07-30", 4, 2, "in_house", "720.00", "0.00", "0.00", "720.00", "64.80", "784.80", "0.00", "784.80"],
    [3293, "Fionn Castellane", "Garden double", "111", "2026-07-27", "2026-08-01", 5, 2, "in_house", "775.00", "160.00", "0.00", "935.00", "84.15", "1019.15", "0.00", "1019.15"],
    [3294, "Sable Whitcombe", "Loft suite", "303", "2026-07-25", "2026-08-03", 9, 4, "in_house", "2050.00", "576.00", "0.00", "2626.00", "236.34", "2862.34", "0.00", "2862.34"],
    [3295, "Emrys Toll", "Snug single", "201", "2026-07-27", "2026-07-31", 4, 1, "in_house", "440.00", "0.00", "0.00", "440.00", "39.60", "479.60", "0.00", "479.60"],
    [3296, "Junie Alvarez", "Garden double", "112", "2026-07-26", "2026-07-29", 3, 2, "in_house", "450.00", "0.00", "0.00", "450.00", "40.50", "490.50", "0.00", "490.50"],
    [3297, "Kester Vane", "Harbour double", "308", "2026-07-27", "2026-07-31", 4, 2, "in_house", "720.00", "56.00", "0.00", "776.00", "69.84", "845.84", "0.00", "845.84"],
    [3298, "Wilda Nkemelu", "Garden double", "206", "2026-07-25", "2026-07-30", 5, 2, "in_house", "775.00", "0.00", "0.00", "775.00", "69.75", "844.75", "0.00", "844.75"],
    [3299, "Corin Ashdown", "Snug single", "202", "2026-07-27", "2026-07-29", 2, 1, "in_house", "220.00", "0.00", "0.00", "220.00", "19.80", "239.80", "0.00", "239.80"],
    [3300, "Marisol Fairbairn", "Garden double", "207", "2026-07-26", "2026-08-02", 7, 2, "in_house", "1120.00", "322.00", "0.00", "1442.00", "129.78", "1571.78", "0.00", "1571.78"],
    [3301, "Ottoline Grey", "Harbour double", null, "2026-07-28", "2026-07-31", 3, 2, "booked", "540.00", "96.00", "0.00", "636.00", "57.24", "693.24", "0.00", "693.24"],
    [3302, "Sorley Mackintosh", "Snug single", null, "2026-07-28", "2026-07-30", 2, 1, "booked", "220.00", "0.00", "0.00", "220.00", "19.80", "239.80", "0.00", "239.80"],
    [3303, "Priya Raman", "Garden double", null, "2026-07-28", "2026-08-02", 5, 2, "booked", "820.00", "230.00", "0.00", "1050.00", "94.50", "1144.50", "0.00", "1144.50"],
    [3304, "Ren Kobayashi", "Loft suite", "304", "2026-07-28", "2026-08-02", 5, 4, "booked", "1145.00", "320.00", "0.00", "1465.00", "131.85", "1596.85", "0.00", "1596.85"],
    [3305, "Nadia Brightwell", "Harbour double", "309", "2026-07-31", "2026-08-03", 3, 2, "booked", "630.00", "96.00", "0.00", "726.00", "65.34", "791.34", "0.00", "791.34"],
    [3306, "Hugo Marlowe", "Loft suite", null, "2026-08-01", "2026-08-03", 2, 3, "booked", "495.00", "28.00", "0.00", "523.00", "47.07", "570.07", "0.00", "570.07"],
    [3307, "Beatrix Onslow", "Loft suite", null, "2026-08-02", "2026-08-06", 4, 2, "booked", "940.00", "128.00", "0.00", "1068.00", "96.12", "1164.12", "0.00", "1164.12"],
    [3308, "Cyrus Penhale", "Loft suite", null, "2026-08-03", "2026-08-05", 2, 4, "booked", "470.00", "0.00", "0.00", "470.00", "42.30", "512.30", "0.00", "512.30"],
    [3309, "Dilys Morgan", "Loft suite", null, "2026-08-03", "2026-08-07", 4, 2, "booked", "940.00", "128.00", "0.00", "1068.00", "96.12", "1164.12", "0.00", "1164.12"],
    [3310, "Ezra Quint", "Loft suite", null, "2026-08-03", "2026-08-06", 3, 3, "booked", "705.00", "42.00", "0.00", "747.00", "67.23", "814.23", "0.00", "814.23"],
    [3311, "Freya Lund", "Harbour double", null, "2026-08-02", "2026-08-05", 3, 2, "booked", "600.00", "96.00", "0.00", "696.00", "62.64", "758.64", "0.00", "758.64"],
    [3312, "Gideon Ashe", "Harbour double", null, "2026-08-03", "2026-08-06", 3, 2, "booked", "600.00", "0.00", "0.00", "600.00", "54.00", "654.00", "0.00", "654.00"],
    [3313, "Hana Sato", "Harbour double", null, "2026-08-01", "2026-08-05", 4, 2, "booked", "825.00", "128.00", "0.00", "953.00", "85.77", "1038.77", "0.00", "1038.77"],
    [3314, "Ivo Brandt", "Harbour double", null, "2026-08-03", "2026-08-08", 5, 2, "booked", "1025.00", "70.00", "0.00", "1095.00", "98.55", "1193.55", "0.00", "1193.55"],
    [3315, "Jonah Keel", "Harbour double", null, "2026-08-04", "2026-08-06", 2, 2, "booked", "400.00", "0.00", "0.00", "400.00", "36.00", "436.00", "0.00", "436.00"],
    [3316, "Kit Lowry", "Garden double", null, "2026-08-03", "2026-08-05", 2, 2, "booked", "340.00", "64.00", "0.00", "404.00", "36.36", "440.36", "0.00", "440.36"],
    [3317, "Mina Farrow", "Garden double", null, "2026-08-02", "2026-08-06", 4, 2, "booked", "680.00", "0.00", "0.00", "680.00", "61.20", "741.20", "0.00", "741.20"],
    [3318, "Niall Draper", "Snug single", null, "2026-08-04", "2026-08-06", 2, 1, "booked", "260.00", "0.00", "0.00", "260.00", "23.40", "283.40", "0.00", "283.40"],
    [3319, "Orla Keane", "Garden double", null, "2026-08-07", "2026-08-09", 2, 2, "booked", "390.00", "64.00", "0.00", "454.00", "40.86", "494.86", "0.00", "494.86"],
    [3320, "Pim de Vries", "Harbour double", null, "2026-08-07", "2026-08-10", 3, 2, "booked", "650.00", "138.00", "0.00", "788.00", "70.92", "858.92", "0.00", "858.92"],
    [3321, "Quinn Arden", "Loft suite", null, "2026-08-07", "2026-08-09", 2, 4, "booked", "520.00", "128.00", "0.00", "648.00", "58.32", "706.32", "0.00", "706.32"],
    [3322, "Saoirse Doyle", "Garden double", "212", "2026-07-29", "2026-08-01", 3, 2, "booked", "475.00", "96.00", "0.00", "571.00", "51.39", "622.39", "0.00", "622.39"],
    [3323, "Tobias Wynn", "Snug single", null, "2026-07-29", "2026-07-31", 2, 1, "booked", "220.00", "0.00", "0.00", "220.00", "19.80", "239.80", "0.00", "239.80"],
  ];

  it("has all 48, and no other", () => {
    expect(stays.map((s) => s["ref"])).toEqual(TABLE.map(([ref]) => `WH-S${String(ref)}`));
  });

  it.each(TABLE)("WH-S%i %s", (ref, guest, type, room, arrive, depart, nights, guests, status, roomTotal, extrasTotal, chargesTotal, subtotal, tax, total, paid, balance) => {
    const s = stay(ref);
    expect([s["guest_name"], typeName(s["room_type_id"]), roomNumber(s["room_id"]), s["arrive"], s["depart"], s["nights"], s["guests"], s["status"]]).toEqual([
      guest,
      type,
      room,
      arrive,
      depart,
      nights,
      guests,
      status,
    ]);
    expect([s["room_total"], s["extras_total"], s["charges_total"], s["subtotal"], s["tax"], s["total"], s["paid"], s["balance"]].map(money)).toEqual([
      roomTotal,
      extrasTotal,
      chargesTotal,
      subtotal,
      tax,
      total,
      paid,
      balance,
    ]);
  });

  it("agrees with the source's own arithmetic, stay by stay", () => {
    for (const source of STAYS) {
      const m = stayMoney(source);
      const s = stay(source.ref);
      expect([money(s["room_total"]), money(s["total"]), money(s["balance"])], String(source.ref)).toEqual([m.room.toFixed(2), m.total.toFixed(2), m.balance.toFixed(2)]);
    }
  });
});

describe("the folios the design opens", () => {
  const rule = RULES.perNights.find((r) => r.table === "stays" && r.column === "room_total")!;
  const nightsOf = (ref: number) => pricedNights(rule, stay(ref), rows, 2)!.map((n) => [n.date, n.rate.toFixed(2), n.tags.join(" · ")]);

  it("WH-S3283 Teodor Blank: five nights, breakfast for three, parking, the bottle of red; $500.00 by card; $1,099.03 owing", () => {
    expect(nightsOf(3283)).toEqual([
      ["2026-07-23", "215.00", ""],
      ["2026-07-24", "240.00", "Weekend"],
      ["2026-07-25", "240.00", "Weekend"],
      ["2026-07-26", "215.00", ""],
      ["2026-07-27", "215.00", ""],
    ]);
    const lines = stayExtras.filter((l) => l["stay_id"] === stay(3283)["id"]).map((l) => [l["label"], money(l["amount"])]);
    expect(lines).toEqual([
      ["Breakfast in the dining room", "240.00"],
      ["A space behind the house", "70.00"],
    ]);
    const charge = rows["charges"]!.find((c) => c["stay_id"] === stay(3283)["id"])!;
    expect([charge["label"], money(charge["amount"]), charge["note"], charge["charged_on"]]).toEqual(["A bottle of the house red", "32.00", "taken in the garden", "2026-07-25"]);
    const paid = payments.filter((p) => p["stay_id"] === stay(3283)["id"]).map((p) => [p["method"], money(p["amount"]), p["paid_on"]]);
    expect(paid).toEqual([["card", "500.00", "2026-07-23"]]);
  });

  it("WH-S3303 Priya Raman: the Friday a weekend night, the Saturday a weekend and an August night", () => {
    expect(nightsOf(3303)).toEqual([
      ["2026-07-28", "150.00", ""],
      ["2026-07-29", "150.00", ""],
      ["2026-07-30", "150.00", ""],
      ["2026-07-31", "175.00", "Weekend"],
      ["2026-08-01", "195.00", "Weekend · August"],
    ]);
  });

  it("the stays' tax is the day's, kept with the stay: 9 % of Taxes and city levy", () => {
    for (const s of stays) expect([Number(s["tax_rate"]), s["tax_label"]]).toEqual([9, "Taxes and city levy"]);
  });
});

describe("Today, at 09:05", () => {
  const tonight = stays.filter((s) => COUNTED.includes(String(s["status"])) && sleepsOn(s, TODAY));
  const sellableTonight = types.reduce((sum, t) => sum + sellable(t["id"], TODAY), 0);

  it("sells 21 of 32 rooms tonight (2 out of service): 66 %", () => {
    expect([tonight.length, sellableTonight, Math.round((tonight.length * 100) / sellableTonight)]).toEqual([21, 32, 66]);
  });

  it("has five arrivals, four still to come, and Rafe Collier due yesterday", () => {
    const arriving = stays.filter((s) => s["arrive"] === TODAY && COUNTED.includes(String(s["status"])));
    expect(arriving.length).toBe(5);
    expect(arriving.filter((s) => s["status"] === "booked").map((s) => s["ref"])).toEqual(["WH-S3301", "WH-S3302", "WH-S3303", "WH-S3304"]);
    expect(stays.filter((s) => s["status"] === "booked" && String(s["arrive"]) < TODAY).map((s) => s["ref"])).toEqual(["WH-S3279"]);
  });

  it("has four leaving, three settled up and Teodor Blank with $1,099.03 to settle", () => {
    const leaving = stays.filter((s) => s["depart"] === TODAY && s["status"] === "in_house");
    expect(leaving.map((s) => [s["ref"], money(s["balance"])])).toEqual([
      ["WH-S3280", "0.00"],
      ["WH-S3281", "0.00"],
      ["WH-S3282", "0.00"],
      ["WH-S3283", "1099.03"],
    ]);
  });

  it("averages $170.11 a night over tonight's stays, and takes $3,265.00 in room income tonight", () => {
    const room = tonight.reduce((sum, s) => sum + Math.round(Number(s["room_total"]) * 100), 0);
    const nights = tonight.reduce((sum, s) => sum + Number(s["nights"]), 0);
    expect((Math.round(room / nights) / 100).toFixed(2)).toBe("170.11");
    const rule = RULES.perNights.find((r) => r.table === "stays")!;
    const rates = tonight.map((s) => pricedNights(rule, s, rows, 2)!.find((n) => n.date === TODAY)!.rate);
    expect(rates.reduce((a, b) => a + b, 0).toFixed(2)).toBe("3265.00");
  });

  it("has 5 of 6 parking spaces taken tonight", () => {
    const parking = extras.find((e) => e["code"] === "PRK")!;
    const taken = stayExtras.filter((l) => l["extra_id"] === parking["id"] && l["state"] === "on" && tonight.some((s) => s["id"] === l["stay_id"]));
    expect([taken.length, parking["spaces"]]).toEqual([5, 6]);
  });

  it("opens Snug 3, Garden 4, Harbour 3, Loft 1 tonight", () => {
    expect(types.map((t) => [t["name"], sellable(t["id"], TODAY) - sold(t["id"], TODAY)])).toEqual([
      ["Snug single", 3],
      ["Garden double", 4],
      ["Harbour double", 3],
      ["Loft suite", 1],
    ]);
  });

  it("tomorrow: 2 in, 4 out, 13 still open, 59 % full", () => {
    const tomorrow = addDays(TODAY, 1);
    const counted = stays.filter((s) => COUNTED.includes(String(s["status"])));
    const soldTomorrow = types.reduce((sum, t) => sum + sold(t["id"], tomorrow), 0);
    const sellTomorrow = types.reduce((sum, t) => sum + sellable(t["id"], tomorrow), 0);
    expect([
      counted.filter((s) => s["arrive"] === tomorrow).length,
      counted.filter((s) => s["depart"] === tomorrow).length,
      sellTomorrow - soldTomorrow,
      Math.round((soldTomorrow * 100) / sellTomorrow),
    ]).toEqual([2, 4, 13, 59]);
  });

  it("racks 21 occupied, 3 being cleaned, 2 out of service and 8 ready", () => {
    const out = closures.filter((c) => String(c["from_date"]) <= TODAY && (c["to_date"] === null || TODAY <= String(c["to_date"]))).map((c) => String(roomNumber(c["room_id"])));
    const byStatus = (status: string) => rooms.filter((r) => r["status"] === status && !out.includes(String(r["number"]))).map((r) => r["number"]);
    expect(byStatus("occupied").length).toBe(21);
    expect(byStatus("cleaning")).toEqual(["103", "205", "306"]);
    expect(out.sort()).toEqual(["108", "210"]);
    expect(byStatus("ready")).toEqual(["203", "204", "208", "211", "212", "304", "309", "310"]);
  });

  it("puts every guest in the house in an occupied room, and none in a room being cleaned", () => {
    for (const s of stays.filter((x) => x["status"] === "in_house")) {
      expect(rooms.find((r) => r["id"] === s["room_id"])!["status"], String(s["ref"])).toBe("occupied");
    }
  });
});

describe("the calendar: 14 nights from Tuesday 28 July, sold of sellable", () => {
  const CALENDAR: Record<string, string[]> = {
    "Snug single": ["5/8", "4/8", "2/8", "0/8", "0/8", "0/8", "0/8", "1/8", "1/8", "0/8", "0/8", "0/8", "0/8", "0/8"],
    "Garden double": ["9/13", "8/13", "6/13", "4/13", "2/13", "1/13", "2/13", "2/13", "1/14", "0/14", "1/14", "1/14", "0/14", "0/14"],
    "Harbour double": ["4/7", "4/7", "3/7", "2/7", "2/7", "3/7", "4/7", "5/7", "3/7", "1/7", "2/7", "1/7", "1/7", "0/7"],
    "Loft suite": ["3/4", "3/4", "3/4", "3/4", "4/4", "3/4", "4/4", "4/4", "3/4", "1/4", "1/4", "1/4", "0/4", "0/4"],
  };
  const HOUSE = ["21/32 66%", "19/32 59%", "14/32 44%", "9/32 28%", "8/32 25%", "7/32 22%", "10/32 31%", "12/32 38%", "8/33 24%", "2/33 6%", "4/33 12%", "3/33 9%", "1/33 3%", "0/33 0%"];
  const nights = Array.from({ length: 14 }, (_, i) => addDays(TODAY, i));

  it.each(Object.keys(CALENDAR))("%s", (name) => {
    const id = typeByName(name)["id"];
    expect(nights.map((n) => `${String(sold(id, n))}/${String(sellable(id, n))}`)).toEqual(CALENDAR[name]);
  });

  it("the whole house, with room 108 back on Wednesday 5 August", () => {
    expect(
      nights.map((n) => {
        const so = types.reduce((sum, t) => sum + sold(t["id"], n), 0);
        const se = types.reduce((sum, t) => sum + sellable(t["id"], n), 0);
        return `${String(so)}/${String(se)} ${String(Math.round((so * 100) / se))}%`;
      }),
    ).toEqual(HOUSE);
  });
});

describe("the guest's search", () => {
  const rule = RULES.perNights.find((r) => r.table === "stays")!;
  const quote = (name: string, arrive: string, depart: string) => {
    const id = typeByName(name)["id"];
    const nights = pricedNights(rule, { room_type_id: id, arrive, depart }, rows, 2)!;
    const sub = nights.reduce((a, n) => a + Math.round(n.rate * 100), 0);
    const tax = Math.round((sub * 9) / 100);
    const left = Math.min(...nights.map((n) => sellable(id, n.date) - sold(id, n.date)));
    return { rates: nights.map((n) => n.rate.toFixed(2)), total: ((sub + tax) / 100).toFixed(2), left };
  };

  it("Mon 3 → Wed 5 Aug for two: Garden $370.60 with 11 left, Harbour $436.00 with 2 left, the Loft gone", () => {
    expect(quote("Garden double", "2026-08-03", "2026-08-05")).toEqual({ rates: ["170.00", "170.00"], total: "370.60", left: 11 });
    expect(quote("Harbour double", "2026-08-03", "2026-08-05")).toEqual({ rates: ["200.00", "200.00"], total: "436.00", left: 2 });
    expect(quote("Loft suite", "2026-08-03", "2026-08-05").left).toBe(0);
    expect(quote("Snug single", "2026-08-03", "2026-08-05").rates).toEqual(["130.00", "130.00"]);
  });

  it("gives the Loft's earliest two nights as Wed 5 → Fri 7 Aug", () => {
    const id = typeByName("Loft suite")["id"];
    let earliest = "";
    for (let k = 1; k <= 45 && earliest === ""; k += 1) {
      const a = addDays("2026-08-03", k);
      if ([0, 1].every((j) => sellable(id, addDays(a, j)) - sold(id, addDays(a, j)) > 0)) earliest = a;
    }
    expect(earliest).toBe("2026-08-05");
  });

  it("spans the band over the open kinds that sleep two: $170 – $200", () => {
    const open = ["Garden double", "Harbour double"].flatMap((name) => quote(name, "2026-08-03", "2026-08-05").rates.map(Number));
    expect([Math.min(...open), Math.max(...open)]).toEqual([170, 200]);
  });

  it("on Saturday 1 August, open for two nights: Snug 8, Garden 11, Harbour 4, Loft 0", () => {
    const sat = "2026-08-01";
    expect(types.map((t) => Math.min(...[0, 1].map((j) => sellable(t["id"], addDays(sat, j)) - sold(t["id"], addDays(sat, j)))))).toEqual([8, 11, 4, 0]);
  });

  it("prices the demo's first reservation, Garden Mon 3 → Wed 5 Aug with breakfast for two: $440.36", () => {
    const q = quote("Garden double", "2026-08-03", "2026-08-05");
    const sub = Math.round(Number(q.rates[0]) * 100) * 2 + 16 * 2 * 2 * 100;
    expect(((sub + Math.round((sub * 9) / 100)) / 100).toFixed(2)).toBe("440.36");
  });
});

describe("the cancel-by moment and the credit for nights not stayed", () => {
  it("is 15:00 two days before the arrival, on the house's clock", () => {
    for (const [ref, day] of [
      [3301, "2026-07-26"],
      [3305, "2026-07-29"],
      [3306, "2026-07-30"],
      [3307, "2026-07-31"],
    ] as const) {
      expect(local(stay(ref)["cancel_by"]), String(ref)).toEqual({ day, time: "15:00" });
    }
  });

  it("flags Lena Hartigan's cancellation late, and Tomasz Kowal's not", () => {
    expect([stay(3278)["late_cancel"], stay(3277)["late_cancel"]]).toEqual([true, false]);
    expect(local(stay(3278)["cancelled_at"])).toEqual({ day: "2026-07-27", time: "18:40" });
  });

  const credit = (ref: number, from: string) => {
    const rule = RULES.perNights.find((r) => r.table === "stay_credits")!;
    const s = stay(ref);
    const nights = pricedNights(rule, { room_type_id: s["room_type_id"], from_date: from, to_date: s["depart"] }, rows, 2)!;
    const amount = nights.reduce((a, n) => a + Math.round(n.rate * 100), 0) + Math.round(Number(s["extras_nightly"] ?? "0") * 100) * nights.length;
    const sub = Math.round(Number(s["subtotal"]) * 100) - amount;
    return { credit: (amount / 100).toFixed(2), total: ((sub + Math.round((sub * 9) / 100)) / 100).toFixed(2) };
  };

  it("Rosalind Oyelaran leaving Tuesday: the nights not stayed come off, $360.00; the total $392.40", () => {
    expect(credit(3292, "2026-07-28")).toEqual({ credit: "360.00", total: "392.40" });
  });

  it("Tobias Wynn leaving on the day he arrived: the first night is charged, Thursday comes off; $119.90", () => {
    expect(credit(3323, "2026-07-30")).toEqual({ credit: "110.00", total: "119.90" });
  });

  it("Priya Raman given a Harbour double at the booked price keeps $1,144.50", () => {
    expect(money(stay(3303)["total"])).toBe("1144.50");
  });
});

describe("the Overview, at 09:05", () => {
  it("in house 21, arriving today 5, leaving today 4, $17,657.22 on their accounts", () => {
    const inHouse = stays.filter((s) => s["status"] === "in_house");
    expect(inHouse.length).toBe(21);
    expect((inHouse.reduce((a, s) => a + Math.round(Number(s["balance"]) * 100), 0) / 100).toFixed(2)).toBe("17657.22");
  });

  it("$3,035.34 recorded in July: $500.00, $747.74 and this morning's three", () => {
    const july = payments.filter((p) => String(p["paid_on"]).startsWith("2026-07"));
    expect(july.map((p) => [p["paid_on"], money(p["amount"])]).sort()).toEqual([
      ["2026-07-23", "500.00"],
      ["2026-07-27", "747.74"],
      ["2026-07-28", "239.80"],
      ["2026-07-28", "699.78"],
      ["2026-07-28", "848.02"],
    ]);
    expect((july.reduce((a, p) => a + Math.round(Number(p["amount"]) * 100), 0) / 100).toFixed(2)).toBe("3035.34");
  });

  it("made per week, from Monday 8 June: 4, 1, 4, 3, 10, 9, 13, 4", () => {
    const weeks = Array.from({ length: 8 }, (_, k) => addDays("2026-06-08", k * 7));
    const counts = weeks.map((start) => stays.filter((s) => local(s["created_at"]).day >= start && local(s["created_at"]).day < addDays(start, 7)).length);
    expect(counts).toEqual([4, 1, 4, 3, 10, 9, 13, 4]);
    expect(stays.every((s) => local(s["created_at"]).day >= "2026-06-08")).toBe(true);
  });

  it("made in the last 30 days: 34 online, 6 at the desk", () => {
    const since = AT_0905 - 30 * 86_400_000;
    const recent = stays.filter((s) => Date.parse(String(s["created_at"])) >= since);
    expect([recent.filter((s) => s["channel"] === "online").length, recent.filter((s) => s["channel"] === "desk").length]).toEqual([34, 6]);
    expect(stays.filter((s) => s["channel"] === "desk").map((s) => s["ref"])).toEqual(["WH-S3281", "WH-S3290", "WH-S3299", "WH-S3302", "WH-S3312", "WH-S3323"]);
  });

  it("next arrivals: Raman 15:00, Grey 16:00, Mackintosh 18:00, Kobayashi 20:00, then Doyle and Wynn on Wednesday", () => {
    const next = stays
      .filter((s) => s["status"] === "booked" && String(s["arrive"]) >= TODAY)
      .sort((a, b) => `${String(a["arrive"])} ${String(a["arrival_time"])}`.localeCompare(`${String(b["arrive"])} ${String(b["arrival_time"])}`))
      .slice(0, 6)
      .map((s) => [s["ref"], s["arrival_time"]]);
    expect(next).toEqual([
      ["WH-S3303", "15:00"],
      ["WH-S3301", "16:00"],
      ["WH-S3302", "18:00"],
      ["WH-S3304", "20:00"],
      ["WH-S3322", "17:00"],
      ["WH-S3323", "19:00"],
    ]);
  });
});

describe("the rows the sample holds", () => {
  it("counts as figures.md does", () => {
    const counts = Object.fromEntries(Object.entries(rows).map(([table, list]) => [table, list.length]));
    expect(counts).toEqual({
      settings: 1,
      house_notes: 3,
      room_types: 4,
      room_type_features: 20,
      rooms: 34,
      room_closures: 2,
      rate_rules: 2,
      extras: 3,
      charge_items: 7,
      customers: 47,
      stays: 48,
      stay_extras: 35,
      charges: 1,
      payments: 5,
    });
  });

  it("gives every guest a distinct mobile in the 555-01 block, and Tobias Wynn no email", () => {
    const mobiles = stays.map((s) => String(s["mobile"]));
    expect(new Set(mobiles).size).toBe(48);
    for (const m of mobiles) expect(m).toMatch(/^\(207\) 555-01\d\d$/);
    expect(stays.filter((s) => s["email"] === null).map((s) => s["ref"])).toEqual(["WH-S3323"]);
  });
});
