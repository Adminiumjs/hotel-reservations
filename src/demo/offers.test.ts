/**
 * THE DEMO SHOWS THE NEW PIECES WITH ITS OWN FIGURES, AND ASKS NO ADD-ON.
 *
 * The demo's house takes one code, two gift cards and counts its linen —
 * stand-ins of its own (`offers.ts`). Every other figure is the demo
 * engine's, from the manifest's rules: the reduction comes off before the
 * tax, a card's payment settles the stay, and money never runs backwards.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { isApiError } from "../data/wire.ts";
import { DemoAdminium } from "./adminium.ts";
import { PEOPLE } from "./desk.ts";

const money = (value: unknown) => Number(value).toFixed(2);

function house() {
  const a = new DemoAdminium();
  const type = (name: string) => a.world.all("room_types").find((t) => t["name"] === name)!;
  const stay = (ref: string) => a.world.all("stays").find((s) => s["ref"] === ref)!;
  const body = (codes: string[] = []) => ({
    values: { room_type_id: type("Garden double").id, arrive: "2026-08-03", depart: "2026-08-05", guests: 2, first_name: "Elin", last_name: "Marsh", email: "elin.marsh@example.com", arrival_time: "16:00", language: "en-US" },
    children: { stay_extras: [], ...(codes.length === 0 ? {} : { stay_codes: codes.map((typed) => ({ values: { typed } })) }) },
  });
  return { a, type, stay, body };
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

afterEach(() => vi.unstubAllGlobals());

describe("the demo's own code", () => {
  it("takes a tenth off the room before the tax, at the guest site and at the desk, and names it", async () => {
    const h = house();
    const plain = await h.a.guest.quote(h.body());
    const coded = await h.a.guest.quote(h.body(["midweek"]));
    const room = Number(plain.data["room_total"]);
    expect(money(coded.data["discount"])).toBe(money(room / 10));
    expect(money(coded.data["subtotal"])).toBe(money(room - room / 10));
    expect(money(coded.data["tax"])).toBe(money(Math.round((room - room / 10) * Number(coded.data["tax_rate"])) / 100));
    expect(coded.applied?.map((one) => [one.name, one.kind, one.amount])).toEqual([["Midweek", "code", money(room / 10)]]);
    // A quote keeps nothing: the plain price is still the plain price.
    expect(money((await h.a.guest.quote(h.body())).data["total"])).toBe(money(plain.data["total"]));
    const atDesk = await h.a.desk.quote(h.body(["MIDWEEK"]));
    expect(money(atDesk.data["total"])).toBe(money(coded.data["total"]));
  });

  it("is saved with the stay at the price shown, read back by name, and priced again under it when the dates move", async () => {
    const h = house();
    const quote = await h.a.guest.quote(h.body(["MIDWEEK"]));
    const made = await h.a.guest.reserve({ ...h.body(["MIDWEEK"]), expect: { total: money(quote.data["total"]) } }, "k".repeat(43));
    expect(money(made.data["total"])).toBe(money(quote.data["total"]));
    expect(made.applied?.map((one) => one.name)).toEqual(["Midweek"]);
    const folio = await h.a.desk.folio(made.data.id);
    expect(folio.applied?.map((one) => [one.name, one.amount])).toEqual([["Midweek", money(quote.data["discount"])]]);
    const moved = await h.a.desk.quoteEdit(made.data.id, { depart: "2026-08-06" });
    expect(money(moved.data["discount"])).toBe(money(Number(moved.data["room_total"]) / 10));
  });

  it("refuses any other code: 'not valid' to a guest, plainly to the desk — and nothing is written", async () => {
    const h = house();
    const before = h.a.world.all("stays").length;
    expect(await refusal(() => h.a.guest.quote(h.body(["SUMMER25"])))).toMatchObject({ code: "PUBLIC_WRITE_REFUSED", params: { column: "typed", reason: "unknown" } });
    expect(await refusal(() => h.a.guest.reserve(h.body(["SUMMER25"]), "j".repeat(43)))).toMatchObject({ code: "PUBLIC_WRITE_REFUSED" });
    expect(await refusal(() => h.a.desk.quote(h.body(["SUMMER25"])))).toMatchObject({ code: "ADJUST_REFUSED", params: { reason: "unknown" } });
    expect(h.a.world.all("stays").length).toBe(before);
  });
});

describe("the demo's own gift cards", () => {
  it("pays what the card holds of what is owing, gives part back to it, and returns the rest when the payment is voided", async () => {
    const h = house();
    h.a.desk.person = PEOPLE.desk;
    const teodor = h.stay("WH-S3283");
    const owed = Number(teodor["balance"]);
    const check = await h.a.desk.quoteCard(teodor.id, "gc-7k2m-w3hn-q4xp");
    expect([check.amount, check.balanceAfter, check.due]).toEqual(["150.00", "0.00", money(owed - 150)]);
    const paid = await h.a.desk.recordCardPayment(teodor.id, "GC-7K2M-W3HN-Q4XP", check.amount, "k1");
    // The same save sent again is the same payment: the card is debited once.
    expect((await h.a.desk.recordCardPayment(teodor.id, "GC-7K2M-W3HN-Q4XP", check.amount, "k1")).id).toBe(paid.id);
    expect([money(paid["amount"]), paid["card_last4"], paid["method"]]).toEqual(["150.00", "Q4XP", "gift_card"]);
    expect(money(h.stay("WH-S3283")["balance"])).toBe(money(owed - 150));
    expect((await h.a.guest.cardBalance({ code: "GC-7K2M-W3HN-Q4XP" }))?.balance).toBe("0.00");
    // Empty now: said so, and nothing is taken.
    expect(await refusal(() => h.a.desk.quoteCard(teodor.id, "GC-7K2M-W3HN-Q4XP"))).toMatchObject({ code: "POSTING_REFUSED", params: { reason: "empty" } });
    const back = await h.a.desk.giveBackToCard(teodor.id, paid.id, "20.00", "One towel short", "k2");
    expect((await h.a.desk.giveBackToCard(teodor.id, paid.id, "20.00", "One towel short", "k2")).id).toBe(back.id);
    expect((await h.a.guest.cardBalance({ code: "GC-7K2M-W3HN-Q4XP" }))?.balance).toBe("20.00");
    expect(await refusal(() => h.a.desk.giveBackToCard(teodor.id, paid.id, "500.00", "Too much", "k3"))).toMatchObject({ code: "POSTING_REFUSED", params: { reason: "refund-over", left: "130.00" } });
    h.a.desk.person = PEOPLE.manager;
    // Voiding what was given back takes it off the card again, as the live house does,
    await h.a.desk.voidRow("payments", back.id, "Given back by mistake");
    expect((await h.a.guest.cardBalance({ code: "GC-7K2M-W3HN-Q4XP" }))?.balance).toBe("0.00");
    // and the payment can give it back once more.
    const second = await h.a.desk.giveBackToCard(teodor.id, paid.id, "20.00", "One towel short", "k4");
    await h.a.desk.voidRow("payments", paid.id, "Wrong stay");
    expect((await h.a.guest.cardBalance({ code: "GC-7K2M-W3HN-Q4XP" }))?.balance).toBe("150.00");
    // In the other order too the card ends whole: a give-back voided after its payment moves nothing.
    await h.a.desk.voidRow("payments", second.id, "Its payment was voided");
    expect((await h.a.guest.cardBalance({ code: "GC-7K2M-W3HN-Q4XP" }))?.balance).toBe("150.00");
  });

  it("refuses a card asked for more than is now owing as the live house does", async () => {
    const h = house();
    const teodor = h.stay("WH-S3283");
    const owed = Number(teodor["balance"]);
    const check = await h.a.desk.quoteCard(teodor.id, "GC-9D4T-K8RV-M2LX");
    // Somebody pays most of it in cash between the check and the take.
    await h.a.desk.recordPayment(teodor.id, { kind: "taken", amount: (owed - 10).toFixed(2), method: "cash" });
    expect(await refusal(() => h.a.desk.recordCardPayment(teodor.id, "GC-9D4T-K8RV-M2LX", check.amount, "k9"))).toMatchObject({ code: "POSTING_REFUSED", params: { reason: "not-allowed" } });
    expect((await h.a.guest.cardBalance({ code: "GC-9D4T-K8RV-M2LX" }))?.balance).toBe("1200.00");
  });

  it("covers a whole account from the bigger card and keeps the rest; a card it does not know is refused by its field", async () => {
    const h = house();
    const teodor = h.stay("WH-S3283");
    const owed = Number(teodor["balance"]);
    const check = await h.a.desk.quoteCard(teodor.id, "GC-9D4T-K8RV-M2LX");
    expect([check.amount, check.due, check.balanceAfter]).toEqual([money(owed), "0.00", money(1200 - owed)]);
    expect(await refusal(() => h.a.desk.quoteCard(teodor.id, "GC-0000-0000-0000"))).toMatchObject({ code: "VALIDATION_FAILED", params: { fields: { card_code: { code: "unknown" } } } });
    expect(await h.a.guest.cardBalance({ code: "GC-0000-0000-0000" })).toBeNull();
  });
});

describe("the demo's own linen", () => {
  it("counts it, sends a room's to the laundry at check-out, and puts it back — saying when more came back than was there", async () => {
    const h = house();
    const count = async () => (await h.a.desk.linen()).map((row) => [row.name, row.inStore, row.atLaundry]);
    expect(await count()).toEqual([["Bath towel", 236, 24], ["Hand towel", 236, 24], ["Sheet set, double", 128, 12]]);
    const reply = await h.a.desk.putBackLinen([{ itemId: 1, qty: 26 }, { itemId: 2, qty: 24 }, { itemId: 3, qty: 12 }], "sheet");
    // Pressed again with the same key: nothing is put back twice.
    await h.a.desk.putBackLinen([{ itemId: 1, qty: 26 }, { itemId: 2, qty: 24 }, { itemId: 3, qty: 12 }], "sheet");
    expect([reply.done, reply.over]).toEqual([true, [{ itemId: 1, by: 2 }]]);
    expect(await count()).toEqual([["Bath towel", 262, 0], ["Hand towel", 260, 0], ["Sheet set, double", 140, 0]]);
  });
});

describe("the demo asks nobody", () => {
  it("makes no network call for any of it", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", (input: unknown) => {
      calls.push(String(input));
      return Promise.reject(new Error("the demo must not call out"));
    });
    const h = house();
    expect((await h.a.desk.config()).codes).toBe(true);
    expect((await h.a.guest.config()).offers).toBe(true);
    await h.a.guest.quote(h.body(["MIDWEEK"]));
    await h.a.desk.quoteCard(h.stay("WH-S3283").id, "GC-9D4T-K8RV-M2LX");
    await h.a.desk.linen();
    await h.a.guest.cardBalance({ code: "GC-9D4T-K8RV-M2LX" });
    expect(calls).toEqual([]);
  });
});
