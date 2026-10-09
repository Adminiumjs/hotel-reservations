/**
 * LINEN AND SUPPLIES, ON EVERY ENGINE.
 *
 * This repo's manifest installed on a BUILT Adminium with Inventory connected
 * and its sample in (the linen store, the laundry, the "Room turnover" kit the
 * app's own sample links each room type to), on SQLite, Postgres and MySQL,
 * through the desk's own door:
 *
 *   - Today's count: 236 bath towels, 236 hand towels and 128 sheet sets in
 *     the Linen store; 24, 24 and 12 at the laundry;
 *   - "Back from the laundry": 24, 24 and 12 put back — 260, 260 and 140 in
 *     the store, nothing at the laundry; two more than the books held is
 *     allowed and said; a transfer that stopped half-way is finished by
 *     pressing again;
 *   - checking a Garden double out after two nights for two: 2 bath towels,
 *     2 hand towels and 1 sheet set go to the laundry; 1 amenity kit, 2 soaps
 *     and 2 tea boxes are used;
 *   - a guest is checked out though an item of the kit has nothing on the
 *     books: never stopped for linen or amenities;
 *   - housekeeping moves linen and reads its counts, and nothing else of
 *     Inventory: no cost, no movement, no receipt; nothing of a stay's money.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { AdminiumDesk } from "../data/adminiumDesk.ts";
import type { Row } from "../data/wire.ts";
import { ENGINES, missing, missingAddOn, ok, PORTS_PER_ENGINE, type Engine } from "./harness.ts";
import { standUp, type Stand } from "./stand.ts";

const why = missing() ?? missingAddOn("inventory");
const REQUIRED = process.env["ADMINIUM_REQUIRE_CONTRACT"] === "1";
if (why !== null && REQUIRED) throw new Error(`the linen contract must run here, and cannot: ${why}`);
const PORT_BASE = Number(process.env["CONTRACT_PORT_BASE"] ?? 8470) + 20;

describe.skipIf(why !== null)(`linen and supplies on a built Adminium${why === null ? "" : ` — skipped: ${why}`}`, () => {
  ENGINES.forEach(([engine, available], index) => {
    describe.skipIf(!available)(`on ${engine}`, () => {
      let stand: Stand;
      let desk: AdminiumDesk;

      beforeAll(async () => {
        stand = await standUp(engine as Engine, PORT_BASE + index * PORTS_PER_ENGINE, `hotel_linen_${engine}${process.env["CONTRACT_DB_SUFFIX"] ?? ""}`, { addOns: ["inventory"], addOnSamples: ["inventory"] });
        desk = (await stand.deskOf()).desk;
      }, 600_000);

      afterAll(async () => {
        await stand?.server.stop();
      });

      /** What the books hold of an item at a place, by their names. */
      const held = async () => {
        const points = await stand.rows("inventory_stock_points");
        return (item: string, place: string) => Number(points.find((point) => point["item_name"] === item && point["place_name"] === place)?.["on_hand"] ?? 0);
      };
      const counts = async () => (await desk.linen()).map((row) => [row.name, row.store, row.inStore, row.away, row.atLaundry]).sort();
      /** A Garden double for two, booked from today, checked in and settled: ready to leave. */
      const guestReadyToLeave = async (first: string, nights: number): Promise<number> => {
        const house = await desk.house();
        const garden = house.types.find((type) => type["name"] === "Garden double")!;
        const depart = `2026-07-${String(28 + nights)}`;
        const made = await desk.book({ values: { room_type_id: garden.id, arrive: "2026-07-28", depart, guests: 2, first_name: first, last_name: "Penrose", language: "en-US" }, children: { stay_extras: [] }, clientKey: `${first}-${engine}-${"k".repeat(30)}` });
        const closed = new Set((await stand.rows("room_closures")).map((closure) => closure["room_id"]));
        const taken = new Set((await stand.rows("stays")).filter((stay) => ["booked", "in_house"].includes(String(stay["status"])) && stay["room_id"] !== null).map((stay) => stay["room_id"]));
        const room = (await stand.rows("rooms")).find((one) => one["room_type_id"] === garden.id && one["status"] === "ready" && !closed.has(one.id) && !taken.has(one.id))!;
        // A room a guest left today is being cleaned: housekeeping makes it ready again.
        for (const cleaning of (await stand.rows("rooms")).filter((one) => one["room_type_id"] === garden.id && one["status"] === "cleaning" && !closed.has(one.id))) await desk.setRoom(cleaning.id, { status: "ready" });
        const free = room ?? (await stand.rows("rooms")).find((one) => one["room_type_id"] === garden.id && one["status"] === "ready" && !closed.has(one.id) && !taken.has(one.id))!;
        await desk.checkIn(made.data.id, free.id);
        await desk.recordPayment(made.data.id, { kind: "taken", amount: Number(made.data["total"]).toFixed(2), method: "cash" });
        return made.data.id;
      };

      it("counts the linen for Today: what is in the Linen store and what is at the laundry", async () => {
        expect((await desk.config()).linen).toBe(true);
        expect(await counts()).toEqual([
          ["Bath towel", "Linen store", 236, "At the laundry", 24],
          ["Hand towel", "Linen store", 236, "At the laundry", 24],
          ["Sheet set, double", "Linen store", 128, "At the laundry", 12],
        ]);
      }, 120_000);

      it("puts 24, 24 and 12 back in the Linen store: 260, 260 and 140 there, nothing at the laundry", async () => {
        const linen = await desk.linen();
        const reply = await desk.putBackLinen(linen.map((row) => ({ itemId: row.itemId, qty: row.atLaundry })));
        expect([reply.done, reply.left, reply.over, reply.moved.length]).toEqual([true, [], [], 3]);
        expect(await counts()).toEqual([
          ["Bath towel", "Linen store", 260, "At the laundry", 0],
          ["Hand towel", "Linen store", 260, "At the laundry", 0],
          ["Sheet set, double", "Linen store", 140, "At the laundry", 0],
        ]);
        const transfer = await stand.one("inventory_transfers", reply.transferId);
        expect(transfer["status"]).toBe("done");
      }, 180_000);

      it("allows two more than the books held, and says so", async () => {
        const bath = (await desk.linen()).find((row) => row.name === "Bath towel")!;
        const reply = await desk.putBackLinen([{ itemId: bath.itemId, qty: 2 }, { itemId: 0, qty: 5 }]);
        expect([reply.done, reply.over]).toEqual([true, [{ itemId: bath.itemId, by: 2 }]]);
        const at = await held();
        expect(at("Bath towel", "Linen store")).toBe(262);
      }, 180_000);

      it("finishes a transfer that stopped half-way when the button is pressed again", async () => {
        const linen = await desk.linen();
        const hand = linen.find((row) => row.name === "Hand towel")!;
        const rel = await stand.relation("inventory_transfer_lines", "transfer_id");
        // A transfer whose header moved on and whose line did not: what a lost connection leaves behind.
        const stuck = ok(await stand.staff.post<{ data: Row }>(stand.data("inventory_transfers"), { values: { from_place_id: hand.awayId, to_place_id: hand.storeId }, children: { [rel]: [{ values: { item_id: hand.itemId, qty: 1 } }] } }), 201).data;
        ok(await stand.staff.patch(`${stand.data("inventory_transfers")}/${String(stuck.id)}`, { values: { status: "posting" }, from: "draft" }));
        const reply = await desk.putBackLinen([], stuck.id);
        expect([reply.done, reply.transferId, reply.left]).toEqual([true, stuck.id, []]);
        expect((await stand.one("inventory_transfers", stuck.id))["status"]).toBe("done");
        expect((await held())("Hand towel", "Linen store")).toBe(261);
      }, 180_000);

      it("checks a Garden double out after two nights: 2 bath towels, 2 hand towels and 1 sheet set go to the laundry; 1 amenity kit, 2 soaps and 2 tea boxes are used", async () => {
        const id = await guestReadyToLeave("Wenna", 2);
        const before = await held();
        const left = await desk.checkOut(id);
        expect(left["status"]).toBe("departed");
        const after = await held();
        const moved = (item: string, place: string) => after(item, place) - before(item, place);
        expect([
          moved("Bath towel", "Linen store"), moved("Bath towel", "At the laundry"),
          moved("Hand towel", "Linen store"), moved("Hand towel", "At the laundry"),
          moved("Sheet set, double", "Linen store"), moved("Sheet set, double", "At the laundry"),
          moved("Amenity kit", "Linen store"), moved("Soap bar 30 g", "Linen store"), moved("Tea selection box", "Linen store"),
        ]).toEqual([-2, 2, -2, 2, -1, 1, -1, -2, -2]);
        // One receipt for the stay, and its room sent to be cleaned as before.
        const receipts = (await stand.rows("inventory_postings", { column: "source_row", op: "eq", value: String(id) })).filter((receipt) => receipt["source_table"] === "hotel:stays");
        expect(receipts.map((receipt) => [receipt["posting"], receipt["phase"], receipt["state"]])).toEqual([["turnover", "post", "planned"]]);
        const room = await stand.one("rooms", left["room_id"]);
        expect(room["status"]).toBe("cleaning");
      }, 240_000);

      it("checks a guest out with an item of the kit that has nothing on the books: never stopped for linen or amenities", async () => {
        const each = (await stand.rows("inventory_units"))[0]!;
        const mitt = ok(await stand.staff.post<{ data: Row }>(stand.data("inventory_items"), { values: { name: "Shoe mitt", sku: "MITT", unit_id: each.id } }), 201).data;
        const kit = (await stand.rows("inventory_kits")).find((one) => one["name"] === "Room turnover")!;
        ok(await stand.staff.post(stand.data("inventory_kit_lines"), { values: { kit_id: kit.id, item_id: mitt.id, qty: 1, per: "unit", action: "use" } }), 201);
        const id = await guestReadyToLeave("Morwenna", 1);
        const left = await desk.checkOut(id);
        expect(left["status"]).toBe("departed");
        // The stay has its receipt all the same: what could not be taken is the stock manager's to look at, not the desk's.
        const receipts = (await stand.rows("inventory_postings", { column: "source_row", op: "eq", value: String(id) })).filter((receipt) => receipt["source_table"] === "hotel:stays");
        expect(receipts.map((receipt) => [receipt["posting"], receipt["phase"]])).toEqual([["turnover", "post"]]);
      }, 240_000);

      it("with Inventory switched off for the house, a guest is still checked out: what it would have taken is caught up later", async () => {
        const id = await guestReadyToLeave("Kerensa", 1);
        ok(await stand.staff.patch("/api/v1/add-ons/inventory", { attachedTo: "hotel", enabled: false }));
        try {
          const left = await desk.checkOut(id);
          expect(left["status"]).toBe("departed");
        } finally {
          ok(await stand.staff.patch("/api/v1/add-ons/inventory", { attachedTo: "hotel", enabled: true }));
        }
      }, 240_000);

      it("holds housekeeping to the linen: a transfer and the linen's counts, no cost, no movement, no receipt, nothing of a stay's money", async () => {
        const jory = await stand.person("hotel-housekeeping", `jory.linen.${engine}@wren-guests.dev`, "Jory");
        const linen = await jory.desk.linen();
        expect(linen.map((row) => row.name).sort()).toEqual(["Bath towel", "Hand towel", "Sheet set, double"]);
        const sheets = linen.find((row) => row.name === "Sheet set, double")!;
        const reply = await jory.desk.putBackLinen([{ itemId: sheets.itemId, qty: 1 }]);
        expect(reply.done).toBe(true);
        const read = async (table: string) => jory.caller.get<{ data?: Row[] }>(`${stand.data(table)}?limit=5`);
        // What it reads of an item: its name and unit, never what it cost.
        const items = ok(await read("inventory_items")).data!;
        expect(Object.keys(items[0]!)).toEqual(expect.arrayContaining(["id", "name", "unit", "decimals"]));
        for (const column of ["cost_avg", "supplier_cost", "value", "on_hand", "sku", "barcode", "note"]) expect(Object.keys(items[0]!), column).not.toContain(column);
        const points = ok(await read("inventory_stock_points")).data!;
        expect(Object.keys(points[0]!)).toEqual(expect.arrayContaining(["id", "item_id", "place_id", "on_hand"]));
        for (const column of ["cost_avg", "value", "reorder_level", "reserved", "on_order"]) expect(Object.keys(points[0]!), column).not.toContain(column);
        for (const table of ["inventory_movements", "inventory_postings", "inventory_receipts", "inventory_counts", "inventory_suppliers", "inventory_purchase_orders", "payments", "customers"]) {
          expect([table, (await read(table)).status]).toEqual([table, 403]);
        }
        // No other write of Inventory: not a receipt, not a count, not an item.
        for (const [table, values] of [["inventory_receipts", { place_id: sheets.storeId, kind: "delivery" }], ["inventory_items", { name: "Mine" }], ["inventory_uses", { item_id: sheets.itemId, qty: 1, kind: "used" }]] as const) {
          expect([table, (await jory.caller.post(stand.data(table), { values })).status]).toEqual([table, 403]);
        }
        // A transfer's line goes forward only: taking it back is a manager's.
        const lines = await stand.rows("inventory_transfer_lines", { column: "transfer_id", op: "eq", value: reply.transferId });
        const back = await jory.caller.patch(`${stand.data("inventory_transfer_lines")}/${String(lines[0]!.id)}`, { values: { status: "reversed" } });
        expect(back.status).toBeGreaterThanOrEqual(400);
      }, 240_000);
    });
  });
});
