/**
 * THE DEMO'S ADMINIUM DECIDES WHAT THE REAL ONE DECIDES.
 *
 * Every check here is a rule the product leaves to Adminium — a price, a
 * night pool, a move and what it waits for, a late flag, the room a move takes
 * along, money that cannot run backwards — played by the demo's stand-in on
 * the sample house at the design's clock (Tuesday 28 July 2026, 09:05 in
 * Bellhaven), with the refusal codes the real APIs answer.
 */
import { describe, expect, it } from "vitest";

import { isApiError, type Id, type Row } from "../data/wire.ts";
import { DemoAdminium } from "./adminium.ts";
import { PEOPLE } from "./desk.ts";
import { DEMO_SIGN_IN } from "./guest.ts";

const EDT = (day: string, time: string) => Date.parse(`${day}T${time}:00-04:00`);

/** The sample house at the design's clock, moved on to `at` when given (the demo always starts at 09:05). */
function house(at?: string) {
  const a = new DemoAdminium();
  if (at !== undefined) a.advanceTo(Date.parse(at));
  const stay = (ref: string) => a.world.all("stays").find((s) => s["ref"] === ref)!;
  const room = (number: string) => a.world.all("rooms").find((r) => r["number"] === number)!;
  const type = (name: string) => a.world.all("room_types").find((t) => t["name"] === name)!;
  const extra = (code: string) => a.world.all("extras").find((e) => e["code"] === code)!;
  return { a, stay, room, type, extra };
}

/** The code a refusal carries (and its params), or "ok". */
async function outcome(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
    return "ok";
  } catch (error) {
    if (isApiError(error)) return error.code;
    throw error;
  }
}
async function refusal(run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    if (isApiError(error)) return { code: error.code, params: error.params };
    throw error;
  }
  throw new Error("it was not refused");
}

const money = (value: unknown) => Number(value).toFixed(2);
const garden = (h: ReturnType<typeof house>, extras: Id[] = []) => ({
  values: { room_type_id: h.type("Garden double").id, arrive: "2026-08-03", depart: "2026-08-05", guests: 2, first_name: "Elin", last_name: "Marsh", email: "elin.marsh@example.com", arrival_time: "16:00" },
  children: { stay_extras: extras.map((extra_id) => ({ values: { extra_id } })) },
});

describe("what the guest is told is open", () => {
  it("Mon 3 → Wed 5 Aug for two: Garden open, Harbour 2 left, the Loft full (earliest Wed 5 Aug), no Snug", async () => {
    const h = house();
    const answer = await h.a.guest.availability({ from: "2026-08-03", to: "2026-08-05", guests: 2, earliest: 42 });
    const byName = Object.fromEntries(answer.types.map((x) => [h.a.world.get("room_types", Number(x.pool))!["name"], x]));
    expect(Object.keys(byName)).toEqual(["Garden double", "Harbour double", "Loft suite"]);
    expect(byName["Garden double"]).toMatchObject({ state: "open" });
    expect(byName["Garden double"]!.left).toBeUndefined();
    expect(byName["Harbour double"]).toMatchObject({ state: "open", left: 2 });
    expect(byName["Loft suite"]).toMatchObject({ state: "full", earliest: "2026-08-05" });
  });

  it("closes every type for one Saturday night, a stay over fourteen nights, and a past arrival", async () => {
    const h = house();
    for (const [from, to] of [
      ["2026-08-01", "2026-08-02"],
      ["2026-08-03", "2026-08-18"],
      ["2026-07-27", "2026-07-29"],
    ] as const) {
      const answer = await h.a.guest.availability({ from, to, guests: 1 });
      expect(answer.types.every((x) => x.state === "closed"), `${from} → ${to}`).toBe(true);
    }
  });

  it("parking: five of six spaces tonight", async () => {
    const h = house();
    expect(await h.a.guest.extrasOpen("2026-07-28", "2026-07-29")).toEqual([{ extra_id: h.extra("PRK").id, state: "open", left: 1 }]);
  });
});

describe("reserving", () => {
  it("prices Elin's Garden double with breakfast for two at $440.36, night by night, written nowhere", async () => {
    const h = house();
    const quote = await h.a.guest.quote(garden(h, [h.extra("BRK").id]));
    expect(quote.nights.map((n) => [n.date, n.rate, n.tags])).toEqual([
      ["2026-08-03", 170, ["August"]],
      ["2026-08-04", 170, ["August"]],
    ]);
    expect([money(quote.data["room_total"]), money(quote.data["extras_total"]), money(quote.data["tax"]), money(quote.data["total"])]).toEqual(["340.00", "64.00", "36.36", "440.36"]);
    expect(h.a.world.all("stays").length).toBe(48);
  });

  it("reserves WH-1001, with its extras, its own link and a cancel-by of 15:00 two days before", async () => {
    const h = house();
    const reply = await h.a.guest.reserve({ ...garden(h, [h.extra("BRK").id]), expect: { total: "440.36" } }, "k".repeat(43));
    expect(reply.data["ref"]).toBe("WH-1001");
    expect(reply.children?.stay_extras?.length).toBe(1);
    expect(reply.link?.token).toMatch(/^[0-9A-Z]{16}$/);
    expect(reply.data["cancel_by"]).toBe(new Date(EDT("2026-08-01", "15:00")).toISOString());
    expect(reply.data).not.toHaveProperty("late_cancel");
    const made = h.a.world.all("messages").filter((m) => m["stay_id"] === reply.data.id).map((m) => [m["kind"], m["status"]]);
    expect(made).toEqual([["stay-made", "sent"]]);
  });

  it("lands a retry on the same stay, without its link", async () => {
    const h = house();
    const first = await h.a.guest.reserve(garden(h), "r".repeat(43));
    const again = await h.a.guest.reserve(garden(h), "r".repeat(43));
    expect([again.data.id, again.replayed, again.link]).toEqual([first.data.id, true, undefined]);
    expect(h.a.world.all("stays").length).toBe(49);
  });

  it("writes nothing at a price other than the one the guest saw", async () => {
    const h = house();
    const r = await refusal(() => h.a.guest.reserve({ ...garden(h), expect: { total: "300.00" } }, "p".repeat(43)));
    expect(r).toEqual({ code: "PUBLIC_PRICE_CHANGED", params: { total: "370.60", lines: [] } });
    expect(h.a.world.all("stays").length).toBe(48);
  });

  it("refuses three in a Garden double, a Saturday night alone, and the last Loft twice", async () => {
    const h = house();
    const g = garden(h);
    expect(await refusal(() => h.a.guest.reserve({ ...g, values: { ...g.values, guests: 3 } }, "a".repeat(43)))).toEqual({ code: "PUBLIC_WRITE_REFUSED", params: { column: "guests", reason: "too-many" } });
    expect(await refusal(() => h.a.guest.reserve({ ...g, values: { ...g.values, arrive: "2026-08-01", depart: "2026-08-02" } }, "b".repeat(43)))).toEqual({
      code: "PUBLIC_WRITE_REFUSED",
      params: { column: "depart", reason: "out-of-range" },
    });
    const loft = { ...g, values: { ...g.values, room_type_id: h.type("Loft suite").id, arrive: "2026-08-01", depart: "2026-08-03" } };
    expect(await refusal(() => h.a.guest.reserve(loft, "c".repeat(43)))).toEqual({ code: "PUBLIC_NO_ROOM", params: { column: "room_type_id" } });
  });

  it("refuses a seventh car on a night parking is full", async () => {
    const h = house();
    const tonight = { ...garden(h, [h.extra("PRK").id]), values: { ...garden(h).values, arrive: "2026-07-28", depart: "2026-07-29" } };
    await h.a.guest.reserve(tonight, "d".repeat(43));
    const r = await refusal(() => h.a.guest.reserve({ ...tonight, values: { ...tonight.values, email: "someone.else@example.com" } }, "e".repeat(43)));
    expect(r.code).toBe("PUBLIC_NO_ROOM");
    expect(r.params).toMatchObject({ child: "stay_extras", column: "extra_id" });
  });
});

describe("the guest's own stay", () => {
  it("cancels at no charge before the cancel-by moment, and is marked late after it", async () => {
    const h = house();
    const nadia = h.stay("WH-S3305");
    await h.a.guest.requestSignIn("nadia.brightwell@example.com");
    await h.a.guest.verifyCode("nadia.brightwell@example.com", DEMO_SIGN_IN.code);
    await h.a.guest.changeStay(nadia.id, { status: "cancelled" });
    expect([h.stay("WH-S3305")["late_cancel"], h.stay("WH-S3305")["cancel_code"], h.stay("WH-S3305")["cancelled_by"]]).toEqual([false, "self", "guest"]);

    const late = house(new Date(EDT("2026-07-30", "18:00")).toISOString());
    const hugo = late.stay("WH-S3306");
    await late.a.guest.requestSignIn("hugo.marlowe@example.com");
    await late.a.guest.verifyCode("hugo.marlowe@example.com", DEMO_SIGN_IN.code);
    await late.a.guest.changeStay(hugo.id, { status: "cancelled" });
    expect(late.stay("WH-S3306")["late_cancel"]).toBe(true);
    expect(late.a.world.all("messages").filter((m) => m["stay_id"] === hugo.id).map((m) => m["kind"])).toEqual(["stay-cancelled-self-late"]);
  });

  it("stops the guest's own changes at 15:00 on the arrival day", async () => {
    const h = house(new Date(EDT("2026-07-28", "15:10")).toISOString());
    const priya = h.stay("WH-S3303");
    await h.a.guest.requestSignIn("priya.raman@example.com");
    await h.a.guest.verifyCode("priya.raman@example.com", DEMO_SIGN_IN.code);
    expect(await outcome(() => h.a.guest.changeStay(priya.id, { arrival_time: "18:00" }))).toBe("PUBLIC_TOO_LATE");
    expect(await outcome(() => h.a.guest.addExtra(priya.id, h.extra("LATE").id))).toBe("PUBLIC_TOO_LATE");
  });

  it("moves WH-S3305's dates, keeping room 309 and pricing every night again", async () => {
    const h = house();
    const nadia = h.stay("WH-S3305");
    await h.a.guest.requestSignIn("nadia.brightwell@example.com");
    await h.a.guest.verifyCode("nadia.brightwell@example.com", DEMO_SIGN_IN.code);
    const quote = await h.a.guest.quoteDates(nadia.id, "2026-07-30", "2026-08-02");
    expect(quote.nights.map((n) => n.rate)).toEqual([180, 205, 225]);
    const stored = h.stay("WH-S3305");
    const before = { arrive: stored["arrive"], depart: stored["depart"], total: stored["total"] };
    await h.a.guest.moveDates(nadia.id, "2026-07-30", "2026-08-02", money(quote.data["total"]));
    expect([h.stay("WH-S3305")["arrive"], h.room("309").id === h.stay("WH-S3305")["room_id"]]).toEqual(["2026-07-30", true]);
    expect(h.stay("WH-S3305")["cancel_by"]).toBe(new Date(EDT("2026-07-28", "15:00")).toISOString());
    // The guest is told, with the dates and the total before the change; a second change is told again.
    const told = () => h.a.world.where("messages", (m) => m["kind"] === "stay-dates-changed" && m["stay_id"] === nadia.id);
    expect(told().map((m) => JSON.parse(String(m["was"])))).toEqual([before]);
    const again = await h.a.guest.quoteDates(nadia.id, "2026-07-30", "2026-08-01");
    await h.a.guest.moveDates(nadia.id, "2026-07-30", "2026-08-01", money(again.data["total"]));
    expect(told().length).toBe(2);
  });

  it("makes a signed-in guest a new link: the old one opens nothing, and the new one is emailed to them", async () => {
    const h = house();
    const reply = await h.a.guest.reserve(garden(h), "h".repeat(43));
    await h.a.guest.requestSignIn("elin.marsh@example.com");
    await h.a.guest.verifyCode("elin.marsh@example.com", DEMO_SIGN_IN.code);
    expect(await h.a.guest.newLink(h.stay("WH-1001").id)).toEqual({ sentTo: "elin.marsh@example.com" });
    const sent = h.a.world.where("messages", (m) => m["kind"] === "stay-new-link");
    expect(sent.map((m) => m["to_address"])).toEqual(["elin.marsh@example.com"]);
    expect(await outcome(() => h.a.guest.openLink(reply.link!.token))).toBe("LINK_EXPIRED");
  });

  it("refuses a date change once the cancel-by moment has passed, however late the new dates", async () => {
    const h = house();
    const saoirse = h.stay("WH-S3322");
    await h.a.guest.requestSignIn("saoirse.doyle@example.com");
    await h.a.guest.verifyCode("saoirse.doyle@example.com", DEMO_SIGN_IN.code);
    expect(await outcome(() => h.a.guest.quoteDates(saoirse.id, "2026-08-05", "2026-08-08"))).toBe("PUBLIC_TOO_LATE");
  });

  it("opens a stay by its own link only; another guest's stay is not found", async () => {
    const h = house();
    const reply = await h.a.guest.reserve(garden(h), "f".repeat(43));
    await h.a.guest.signOut();
    await h.a.guest.openLink(reply.link!.token);
    expect((await h.a.guest.linkedStay()).stay["ref"]).toBe("WH-1001");
    expect(await outcome(() => h.a.guest.changeStay(h.stay("WH-S3305").id, { arrival_time: "18:00" }))).toBe("PUBLIC_REF_NOT_FOUND");
  });

  it("counts five wrong codes, then locks", async () => {
    const h = house();
    await h.a.guest.requestSignIn("priya.raman@example.com");
    const codes = [];
    for (let i = 0; i < 5; i += 1) codes.push((await refusal(() => h.a.guest.verifyCode("priya.raman@example.com", "000000"))).code);
    expect(codes).toEqual(["PUBLIC_CODE_WRONG", "PUBLIC_CODE_WRONG", "PUBLIC_CODE_WRONG", "PUBLIC_CODE_WRONG", "PUBLIC_CLAIM_LOCKED"]);
  });

  it("deletes the guest's details only after a fresh sign-in, and stops their links", async () => {
    const h = house();
    const reply = await h.a.guest.reserve(garden(h), "g".repeat(43));
    await h.a.guest.requestSignIn("elin.marsh@example.com");
    await h.a.guest.verifyCode("elin.marsh@example.com", DEMO_SIGN_IN.code);
    h.a.advance(11);
    expect(await outcome(() => h.a.guest.forget())).toBe("PUBLIC_CODE_STEP_UP");
    await h.a.guest.requestSignIn("elin.marsh@example.com");
    await h.a.guest.verifyCode("elin.marsh@example.com", DEMO_SIGN_IN.code);
    await h.a.guest.forget();
    expect(await outcome(() => h.a.guest.openLink(reply.link!.token))).toBe("LINK_EXPIRED");
    expect(h.stay("WH-1001")["email"]).toBe("elin.marsh@example.com");
  });
});

describe("the desk's day", () => {
  it("checks Ren Kobayashi in to room 304 and makes it occupied; not to a room being cleaned; not before the arrival day", async () => {
    const h = house();
    expect(await refusal(() => h.a.desk.checkIn(h.stay("WH-S3302").id, h.room("103").id))).toEqual({
      code: "STATE_MOVE_REFUSED",
      params: { from: "booked", to: "in_house", requires: "linked", via: "room_id" },
    });
    expect((await refusal(() => h.a.desk.checkIn(h.stay("WH-S3305").id, h.room("309").id))).params).toMatchObject({ requires: "time", bound: "after" });
    await h.a.desk.checkIn(h.stay("WH-S3304").id, h.room("304").id);
    expect([h.stay("WH-S3304")["status"], h.room("304")["status"], h.stay("WH-S3304")["checked_in_by"]]).toEqual(["in_house", "occupied", "Maeve R."]);
  });

  it("refuses to give room 204 to two stays", async () => {
    const h = house();
    await h.a.desk.checkIn(h.stay("WH-S3302").id, h.room("204").id);
    const r = await refusal(() => h.a.desk.giveRoom(h.stay("WH-S3323").id, h.room("204").id));
    expect(r.code).toBe("CAPACITY_FULL");
    expect(r.params).toMatchObject({ kind: "night", column: "room_id" });
  });

  it("will not check Teodor Blank out owing $1,099.03; takes the balance, and no cent more; then the room goes to be cleaned", async () => {
    const h = house();
    const teodor = h.stay("WH-S3283");
    expect((await refusal(() => h.a.desk.checkOut(teodor.id))).params).toMatchObject({ requires: "balance" });
    expect((await refusal(() => h.a.desk.recordPayment(teodor.id, { kind: "taken", amount: "1100.00", method: "card" }))).code).toBe("BALANCE_EXCEEDED");
    await h.a.desk.recordPayment(teodor.id, { kind: "taken", amount: "1099.03", method: "card" });
    await h.a.desk.checkOut(teodor.id);
    expect([h.stay("WH-S3283")["status"], h.room("301")["status"], money(h.stay("WH-S3283")["balance"])]).toEqual(["departed", "cleaning", "0.00"]);
  });

  it("takes Rosalind Oyelaran's last two nights off at Adminium's price: $392.40, and the nights go back on sale", async () => {
    const h = house();
    const rosalind = h.stay("WH-S3292");
    const credit = await h.a.desk.takeOffNights(rosalind.id, "2026-07-28");
    expect(money(h.a.world.get("stay_credits", credit.id)!["amount"])).toBe("360.00");
    expect(money(h.stay("WH-S3292")["total"])).toBe("392.40");
    await h.a.desk.recordPayment(rosalind.id, { kind: "taken", amount: "392.40", method: "cash" });
    await h.a.desk.checkOut(rosalind.id);
    const harbour = h.type("Harbour double").id;
    expect((await h.a.desk.counts("2026-07-28", 2)).filter((c) => c.table === "stays" && c.pool === harbour).map((c) => c.taken)).toEqual([3, 3]);
  });

  it("charges Tobias Wynn's first night when he leaves the day he came: $119.90", async () => {
    const h = house(new Date(EDT("2026-07-29", "20:00")).toISOString());
    const tobias = h.stay("WH-S3323");
    await h.a.desk.checkIn(tobias.id, h.room("203").id);
    await h.a.desk.takeOffNights(tobias.id, "2026-07-30");
    expect(money(h.stay("WH-S3323")["total"])).toBe("119.90");
  });

  it("refuses a credit that would leave more paid than the stay costs", async () => {
    const h = house();
    const iris = h.stay("WH-S3280");
    expect((await refusal(() => h.a.desk.takeOffNights(iris.id, "2026-07-26"))).code).toBe("BALANCE_EXCEEDED");
  });

  it("cancels at the guest's request or the house's, saying who", async () => {
    const h = house();
    await h.a.desk.cancel(h.stay("WH-S3306").id, "house");
    expect([h.stay("WH-S3306")["cancel_code"], h.stay("WH-S3306")["cancelled_by"]]).toEqual(["house", "Maeve R."]);
    expect(h.a.world.all("messages").filter((m) => m["stay_id"] === h.stay("WH-S3306").id).map((m) => m["kind"])).toEqual(["stay-cancelled-house"]);
  });

  it("marks a no-show from the time the guest said: Priya at 15:10, not Ottoline until 16:00", async () => {
    const h = house(new Date(EDT("2026-07-28", "15:10")).toISOString());
    expect(await outcome(() => h.a.desk.noShow(h.stay("WH-S3303").id))).toBe("ok");
    const r = await refusal(() => h.a.desk.noShow(h.stay("WH-S3301").id));
    expect(r.params).toMatchObject({ requires: "time", bound: "after", at: new Date(EDT("2026-07-28", "16:00")).toISOString() });
  });

  it("marks Rafe Collier a no-show at 11:00 by itself; a guest expected on Wednesday keeps the room", async () => {
    const h = house();
    await h.a.desk.expectBy(h.stay("WH-S3303").id, "2026-07-29");
    h.a.advanceTo(EDT("2026-07-28", "11:01"));
    expect(h.stay("WH-S3279")["status"]).toBe("no_show");
    expect(h.a.world.all("messages").filter((m) => m["stay_id"] === h.stay("WH-S3279").id).map((m) => m["kind"])).toEqual(["stay-no-show"]);
    h.a.advanceTo(EDT("2026-07-29", "11:01"));
    expect(h.stay("WH-S3303")["status"]).toBe("booked");
    h.a.advanceTo(EDT("2026-07-30", "11:01"));
    expect(h.stay("WH-S3303")["status"]).toBe("no_show");
  });

  it("brings a two-night no-show in after all, the missed night charged or not; never once the stay is over", async () => {
    const h = house(new Date(EDT("2026-07-27", "10:00")).toISOString());
    const made = await h.a.desk.book({
      values: { room_type_id: h.type("Garden double").id, arrive: "2026-07-27", depart: "2026-07-29", guests: 2, first_name: "Sorcha", last_name: "Lane" },
      children: { stay_extras: [] },
    });
    h.a.advanceTo(EDT("2026-07-28", "11:20"));
    expect(h.a.world.get("stays", made.data.id)!["status"]).toBe("no_show");
    await h.a.desk.cameAfterAll(made.data.id, { roomId: h.room("208").id, chargeMissed: false });
    const s = h.a.world.get("stays", made.data.id)!;
    expect([s["status"], money(s["credits_total"]), money(s["total"])]).toEqual(["in_house", "150.00", "163.50"]);
    h.a.advanceTo(EDT("2026-07-28", "11:30"));
    expect(h.a.world.get("stays", made.data.id)!["status"]).toBe("in_house");
    expect(await outcome(() => h.a.desk.cameAfterAll(h.stay("WH-S3279").id, null))).toBe("STATE_MOVE_REFUSED");
  });

  it("voids only as a manager; voiding the bottle on a paid-up folio is refused", async () => {
    const h = house();
    const teodor = h.stay("WH-S3283");
    const bottle = h.a.world.all("charges").find((c) => c["stay_id"] === teodor.id)!;
    expect(await outcome(() => h.a.desk.voidRow("charges", bottle.id, "Wrong room"))).toBe("FORBIDDEN");
    await h.a.desk.recordPayment(teodor.id, { kind: "taken", amount: "1099.03", method: "card" });
    h.a.desk.person = PEOPLE.manager;
    expect(await outcome(() => h.a.desk.voidRow("charges", bottle.id, "Wrong room"))).toBe("BALANCE_EXCEEDED");
    const card = h.a.world.all("payments").find((p) => p["stay_id"] === teodor.id && Number(p["amount"]) === 500)!;
    await h.a.desk.voidRow("payments", card.id, "Recorded twice");
    expect(money(h.stay("WH-S3283")["balance"])).toBe("500.00");
    expect(h.a.world.get("payments", card.id)!["voided_by"]).toBe("Owen Tremayne");
  });

  it("gives money back as its own row", async () => {
    const h = house();
    h.a.desk.person = PEOPLE.desk;
    const agnes = h.stay("WH-S3276");
    await h.a.desk.recordPayment(agnes.id, { kind: "given_back", amount: "35.00", method: "card", note: "The late leaving was not used" });
    expect([money(h.stay("WH-S3276")["paid"]), money(h.stay("WH-S3276")["balance"])]).toEqual(["712.74", "35.00"]);
  });

  it("prices a charge from the list itself, and takes 'something else' only with a note", async () => {
    const h = house();
    const priya = h.stay("WH-S3303");
    const wine = h.a.world.all("charge_items").find((i) => i["label"] === "A glass of house wine")!;
    const charge = await h.a.desk.addCharge(priya.id, { itemId: wine.id });
    expect([h.a.world.get("charges", charge.id)!["label"], money(h.a.world.get("charges", charge.id)!["amount"])]).toEqual(["A glass of house wine", "9.00"]);
    expect(await outcome(() => h.a.desk.addCharge(priya.id, { label: "Flowers", amount: "20.00", note: "" }))).toBe("VALIDATION_FAILED");
  });

  it("lets housekeeping mark rooms ready or being cleaned, and nothing of a guest", async () => {
    const h = house();
    h.a.desk.person = PEOPLE.housekeeping;
    await h.a.desk.setRoom(h.room("103").id, { status: "ready" });
    expect(h.room("103")["status"]).toBe("ready");
    expect(await outcome(() => h.a.desk.setRoom(h.room("103").id, { status: "occupied" }))).toBe("COLUMN_FORBIDDEN");
    expect(await outcome(() => h.a.desk.stays())).toBe("FORBIDDEN");
  });

  it("counts the Garden doubles with room 108 out of service to Tue 4 Aug", async () => {
    const h = house();
    const g = (await h.a.desk.counts("2026-08-04", 2)).filter((c) => c.table === "stays" && c.pool === h.type("Garden double").id);
    expect(g.map((c) => [c.date, c.taken, c.size, c.outOfService])).toEqual([
      ["2026-08-04", 2, 13, 1],
      ["2026-08-05", 1, 14, 0],
    ]);
  });

  it("brings a room back from repair to be cleaned", async () => {
    const h = house();
    const closure = h.a.world.all("room_closures").find((c) => c["room_id"] === h.room("210").id)!;
    await h.a.desk.endClosure(closure.id);
    expect(h.room("210")["status"]).toBe("cleaning");
  });

  it("finds Priya's guest account for a desk booking", async () => {
    const h = house();
    const found = await h.a.desk.guestByEmail("Priya.Raman@example.com");
    expect([found?.customer["first_name"], found?.stays]).toEqual(["Priya", 1]);
  });

  it("says when another desk changed the stay a moment ago", async () => {
    const h = house();
    h.a.engine.staleNext = true;
    expect(await outcome(() => h.a.desk.checkIn(h.stay("WH-S3304").id, h.room("304").id))).toBe("WRITE_CONFLICT");
    expect(h.stay("WH-S3304")["status"]).toBe("booked");
  });
});

describe("a refused write leaves nothing behind", () => {
  it("puts every row back and announces nothing", async () => {
    const h = house();
    const frames: unknown[] = [];
    h.a.world.on((f) => frames.push(f));
    const before = JSON.stringify(h.a.world.all("stays"));
    await outcome(() => h.a.desk.recordPayment(h.stay("WH-S3283").id, { kind: "taken", amount: "5000.00", method: "card" }));
    expect(JSON.stringify(h.a.world.all("stays"))).toBe(before);
    expect(frames).toEqual([]);
  });
});

export type { Row };
