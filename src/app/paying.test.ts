/**
 * Paying online, as the screens hold it: with payments off — or the house
 * asking nothing — the reserve card and the confirmation read exactly as they
 * did; once the house takes payments, the guest pays one night or the whole
 * stay as they reserve (if they want, or first), and comes back to what the
 * stay now says: paid, not finished, or the room gone with nothing taken. At
 * the desk, money paid online carries its chip, goes back only by a two-step
 * refund for someone who may refund, and a cancellation says whether it is
 * owed back or kept.
 *
 * Played on the demo's house (Tuesday 28 July 2026, 09:05), whose stand-in
 * pay page takes the payment at once, and on a stand-in door for the way back
 * from the real one.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import type { GuestPort, StayWithLines } from "../data/ports.ts";
import type { QuoteReply, Row } from "../data/wire.ts";
import { DemoAdminium } from "../demo/adminium.ts";
import { HouseApp } from "./house.ts";
import { renderVals } from "./vals/base.ts";
import { overlayVals } from "./vals/overlays.ts";
import { depositOf } from "./vals/guest.ts";
import { PEOPLE } from "../demo/desk.ts";
import { refundNext, doRefund } from "./desk.ts";

const tick = async (times = 8) => {
  for (let i = 0; i < times; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
};
type V = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** The demo's guest site, on the reserve card for a Garden double, Mon 3 → Wed 5 Aug, two people, the form filled. */
async function reserving(settings: Record<string, unknown> = {}, payments?: { online: boolean; test: boolean }) {
  const demo = new DemoAdminium();
  const s = demo.world.settings();
  demo.world.update("settings", s.id, settings);
  if (payments !== undefined) demo.guest.payments = async () => payments;
  const app = new HouseApp({ guest: demo.guest }, "guest");
  await app.start();
  await tick();
  const garden = demo.world.all("room_types").find((t) => t["name"] === "Garden double")!;
  app.setState({ search: { arrive: "2026-08-03", depart: "2026-08-05", guests: 2 }, pickedType: String(garden.id), form: { ...app.state.form, first: "Elin", last: "Marsh", email: "elin.marsh@example.com" } });
  app.go("reserve");
  // The price, asked in the background, answered.
  for (let i = 0; i < 6; i += 1) {
    renderVals(app);
    await tick();
  }
  return { demo, app, rv: () => renderVals(app)["rv"] as V, cf: () => renderVals(app)["cf"] as V };
}

describe("the refund sheet", () => {
  it("is closed while the house is still loading, so no screen reads a sheet that is not there", () => {
    const demo = new DemoAdminium();
    const app = new HouseApp({ guest: demo.guest, desk: demo.desk }, "desk");
    expect(renderVals(app)["rf"]).toEqual({ open: false });
  });
});

describe("the reserve card, payments off or asking nothing", () => {
  it("reads as it always has when the house takes no payments online", async () => {
    const { rv } = await reserving({ pay_at_booking: "required" }, { online: false, test: false });
    expect([rv()["todayOn"], rv()["chooseOn"], rv()["askOn"], rv()["payOn"], rv()["payBand"]]).toEqual([true, false, false, false, false]);
    expect(rv()["payNote"]).toBe("Nothing is taken online. You settle at the desk.");
    expect(rv()["btnLabel"]).toBe("Reserve the room");
  });

  it("reads as it always has when the house takes payments but asks nothing as guests book (the default)", async () => {
    const { rv } = await reserving({ pay_at_booking: "none" });
    expect([rv()["todayOn"], rv()["chooseOn"], rv()["askOn"]]).toEqual([true, false, false]);
    expect(rv()["btnLabel"]).toBe("Reserve the room");
  });
});

describe("paying as the guest reserves", { timeout: 20_000 }, () => {
  it("offers now or at the desk, the whole stay at Adminium's price; at the desk, it is today's reservation", async () => {
    const { rv, app } = await reserving({ pay_at_booking: "optional", pay_how_much: "whole_stay" });
    expect(rv()["chooseOn"]).toBe(true);
    expect((rv()["payOpts"] as V[]).map((o) => [o.title, o.sub, o.checked])).toEqual([
      ["Pay $370.60 now", "You’ll pay on the Stripe or PayPal page.", "true"],
      ["Pay at the desk", "Nothing is taken online. You settle at the desk.", "false"],
    ]);
    expect([rv()["btnLabel"], rv()["payOn"], rv()["todayOn"]]).toEqual(["Pay $370.60 now", true, false]);
    (rv()["payOpts"] as V[])[1]!.go();
    expect([rv()["btnLabel"], rv()["payOn"]]).toEqual(["Reserve the room", false]);
    expect(app.state.payPick).toBe("desk");
  });

  it("prices one night with its tax: $185.30 of the $370.60 stay", async () => {
    const { rv } = await reserving({ pay_at_booking: "optional", pay_how_much: "one_night" });
    expect(rv()["btnLabel"]).toBe("Pay $185.30 now");
  });

  it("asks first, keeping the room a few minutes, with no choice of the desk", async () => {
    const { rv } = await reserving({ pay_at_booking: "required", pay_how_much: "whole_stay" });
    expect([rv()["askOn"], rv()["chooseOn"], rv()["whereOn"], rv()["askTitle"], rv()["btnLabel"]]).toEqual([true, false, true, "Pay $370.60 now", "Pay $370.60 now"]);
  });

  it("says once, above the card, that someone who manages payments is rehearsing it", async () => {
    const { rv } = await reserving({ pay_at_booking: "optional" }, { online: true, test: true });
    expect(rv()["payBand"]).toBe(true);
  });

  it("goes to the pay page and comes back paid in full, the stay booked once", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { demo, app, rv, cf } = await reserving({ pay_at_booking: "required", pay_how_much: "whole_stay" });
    const before = demo.world.all("stays").length;
    void app.reserve(false);
    await vi.advanceTimersByTimeAsync(50);
    expect(rv()["btnLabel"]).toBe("Taking you to the secure payment page…");
    await vi.advanceTimersByTimeAsync(2_000);
    await tick();
    expect(app.state.view).toBe("conf");
    expect(demo.world.all("stays").length).toBe(before + 1);
    const made = demo.world.all("stays").at(-1)!;
    expect([made["status"], Number(made["paid_online"]).toFixed(2), Number(made["balance"]).toFixed(2)]).toEqual(["booked", "370.60", "0.00"]);
    for (let i = 0; i < 6; i += 1) {
      renderVals(app);
      await tick();
    }
    expect([cf()["okOn"], cf()["paidOn"], cf()["paidChip"], cf()["paidNote"], cf()["offOn"]]).toEqual([true, true, "Paid in full", "", false]);
  });

  it("says what was paid of one night, and that the rest is settled at the desk", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { app, cf } = await reserving({ pay_at_booking: "optional", pay_how_much: "one_night" });
    void app.reserve(false);
    await vi.advanceTimersByTimeAsync(2_000);
    await tick();
    for (let i = 0; i < 6; i += 1) {
      renderVals(app);
      await tick();
    }
    expect([cf()["paidChip"], cf()["paidNote"]]).toEqual(["Paid", "Paid $185.30 online. The rest is settled at the desk."]);
  });
});

/** A door back from the real pay page: the stay the tab was paying for, as it reads after each look. */
function backDoor(reads: Row[], states?: string[]): GuestPort {
  let n = 0;
  let m = 0;
  const stay = () => reads[Math.min(n++, reads.length - 1)]!;
  const lines = (row: Row): StayWithLines => ({ stay: row, extras: [], charges: [], credits: [], payments: [] });
  return new Proxy({} as GuestPort, {
    get: (_t, name) => {
      if (name === "config") return async () => ({ timezone: "UTC", currency: "USD" });
      if (name === "house") return async () => new DemoAdminium().guest.house();
      if (name === "linkedStay") return async () => lines(stay());
      if (name === "signedIn" || name === "myStays") return async () => (name === "myStays" ? [] : null);
      if (name === "startPay") return async () => "https://pay.example/p/again";
      if (name === "paymentState" && states !== undefined) return async () => ({ state: states[Math.min(m++, states.length - 1)], test: false });
      return undefined;
    },
  });
}
const waiting: Row = { id: 9, ref: "WH-1009", status: "pending_payment", room_type_id: 1, arrive: "2026-08-03", depart: "2026-08-05", guests: 2, first_name: "Elin", last_name: "Marsh", email: "elin.marsh@example.com", paid_online: 0, pay_due: 370.6, pay_lapsed: false };

describe("back from the pay page", () => {
  const mark = (how: "choice" | "first") => sessionStorage.setItem("wh.paying", JSON.stringify({ id: 9, how, at: Date.now(), booking: { id: 9, nights: [], email: "elin.marsh@example.com", first: "Elin", refs: ["WH-1009"] } }));
  const store = new Map<string, string>();
  vi.stubGlobal("sessionStorage", { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) });

  it("checks, then says the payment did not finish while the room is still held, and offers to pay again — never the desk", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mark("first");
    const app = new HouseApp({ guest: backDoor([waiting]) }, "guest");
    await app.start();
    const back = app.arrive("p", null);
    for (let i = 0; i < 6; i += 1) {
      renderVals(app);
      await vi.advanceTimersByTimeAsync(5);
    }
    expect(app.state.payBack?.stage).toBe("checking");
    expect((renderVals(app)["cf"] as V)["checkingOn"]).toBe(true);
    await vi.advanceTimersByTimeAsync(20_000);
    await back;
    const cf = renderVals(app)["cf"] as V;
    expect([cf["holdOn"], cf["checkingOn"], cf["retryLabel"]]).toEqual([true, false, "Pay $370.60 now"]);
    // Nothing kept for the way back once it was read.
    expect(store.has("wh.paying")).toBe(false);
  });

  it("shows the reserve card again, for the same room and dates, once the hold ended with nothing taken", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mark("first");
    const app = new HouseApp({ guest: backDoor([{ ...waiting, status: "cancelled", pay_lapsed: true }]) }, "guest");
    await app.start();
    await app.arrive("p", null);
    expect([app.state.view, app.state.rvAnswer?.kind, app.state.search.arrive, app.state.form.first]).toEqual(["reserve", "unpaid", "2026-08-03", "Elin"]);
  });

  it("is paid once the stay says money was taken online", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mark("first");
    const app = new HouseApp({ guest: backDoor([waiting, { ...waiting, status: "booked", paid_online: 370.6, pay_due: 0 }]) }, "guest");
    await app.start();
    const back = app.arrive("p", null);
    await vi.advanceTimersByTimeAsync(5_000);
    await back;
    expect(app.state.payBack?.stage).toBe("paid");
  });

  it("says at once that it did not finish when Adminium says the payment failed or ran out — no waiting on the stay", async () => {
    for (const state of ["failed", "expired", "none"]) {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      mark("choice");
      const app = new HouseApp({ guest: backDoor([{ ...waiting, status: "booked" }], [state]) }, "guest");
      await app.start();
      await app.arrive("p", null);
      expect([state, app.state.payBack?.stage]).toEqual([state, "failed"]);
      vi.useRealTimers();
    }
  });

  it("says the bank is confirming it, the room kept, and not to pay again — on its own card for a stay still waiting", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mark("first");
    const app = new HouseApp({ guest: backDoor([waiting], ["confirming"]) }, "guest");
    await app.start();
    await app.arrive("p", null);
    for (let i = 0; i < 6; i += 1) {
      renderVals(app);
      await vi.advanceTimersByTimeAsync(5);
    }
    const cf = renderVals(app)["cf"] as V;
    expect([app.state.payBack?.stage, cf["bankOn"], cf["bankCardOn"], cf["holdOn"], cf["checkingOn"]]).toEqual(["bank", true, true, false, false]);
  });

  it("keeps checking while the service has not said, then is paid once the stay says so", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mark("first");
    const paid = { ...waiting, status: "booked", paid_online: 370.6, pay_due: 0 };
    const app = new HouseApp({ guest: backDoor([waiting, waiting, paid], ["open", "open", "paid"]) }, "guest");
    await app.start();
    const back = app.arrive("p", null);
    await vi.advanceTimersByTimeAsync(100);
    expect(app.state.payBack?.stage).toBe("checking");
    await vi.advanceTimersByTimeAsync(10_000);
    await back;
    expect(app.state.payBack?.stage).toBe("paid");
  });

  it("is any other arrival when the tab kept nothing", async () => {
    store.clear();
    const app = new HouseApp({ guest: backDoor([waiting]) }, "guest");
    await app.start();
    await app.arrive("p", null);
    expect(app.state.payBack).toBeNull();
  });
});

describe("what a guest pays as they reserve, when a door does not say", () => {
  const q = (data: Record<string, unknown>): QuoteReply => ({ data, nights: [], children: { stay_extras: [] }, capacity: [], exact: true });
  const w = (payHowMuch: "one_night" | "whole_stay") => ({ H: { payHowMuch } }) as never;
  it("is the price's own figure when it says one", () => {
    expect(depositOf(w("one_night"), q({ deposit: "185.30", total: 370.6 }))).toBe(185.3);
  });
  it("is one night of the room, less its reduction, with its tax — never more than the stay", () => {
    expect(depositOf(w("one_night"), q({ total: 370.6, room_total: 340, room_discount: 0, nights: 2, tax_rate: 9 }))).toBe(185.3);
    expect(depositOf(w("one_night"), q({ total: 50, room_total: 340, nights: 2, tax_rate: 9 }))).toBe(50);
    expect(depositOf(w("whole_stay"), q({ total: 370.6, room_total: 340, nights: 2, tax_rate: 9 }))).toBe(370.6);
  });
});

describe("online money at the desk", { timeout: 20_000 }, () => {
  /** The demo's desk on a stay paid online in full as it was booked (Elin, Garden double, Mon 3 → Wed 5 Aug). */
  async function paidStay(as: "manager" | "front-desk" = "manager") {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { demo, app: guest } = await reserving({ pay_at_booking: "required", pay_how_much: "whole_stay" });
    void guest.reserve(false);
    await vi.advanceTimersByTimeAsync(2_000);
    await tick();
    const stay = demo.world.all("stays").at(-1)!;
    demo.desk.person = as === "manager" ? PEOPLE.manager : PEOPLE.desk;
    const app = new HouseApp({ guest: demo.guest, desk: demo.desk }, "desk");
    await app.start();
    app.world();
    await tick();
    app.go("folio", { folioId: stay.id });
    for (let i = 0; i < 6; i += 1) {
      renderVals(app);
      await tick();
    }
    const fo = () => renderVals(app)["fo"] as V;
    const online = () => (fo()["rows"] as V[]).find((r) => r["chip"] !== undefined && r["label"] === "Online")!;
    return { demo, app, stay, fo, online };
  }

  it("carries its chip, says it was paid when booking, and is never voided", async () => {
    const { online } = await paidStay();
    expect([online()["chip"], online()["canVoid"], String(online()["detail"]).endsWith("paid when booking")]).toEqual(["Online", false, true]);
  });

  it("goes back only for someone who may refund, in two steps, as the house's own given-back row", async () => {
    const { app, demo, stay, online } = await paidStay();
    expect(online()["refundOn"]).toBe(true);
    online()["refund"]();
    let rf = overlayVals(app, app.world()!)["rf"] as V;
    expect([rf["open"], rf["step1"], rf["title"], rf["amount"], rf["help"]]).toEqual([true, true, "Refund to the card", "370.60", "Up to $370.60."]);
    // No reason yet: said under the field, and nothing goes.
    refundNext(app);
    rf = overlayVals(app, app.world()!)["rf"] as V;
    expect([rf["step1"], rf["reasonErr"], rf["amountErr"]]).toEqual([true, "Say why, in a few words.", ""]);
    app.setState({ rf: { ...app.state.rf!, amount: "50", reason: "The lift was out on Saturday." } });
    refundNext(app);
    rf = overlayVals(app, app.world()!)["rf"] as V;
    expect([rf["step2"], rf["sentence"]]).toEqual([true, `Refund $50.00 to the card Elin Marsh paid with, for ${String(stay["ref"])}. Reason: The lift was out on Saturday.`]);
    await doRefund(app);
    await tick();
    const back = demo.world.all("payments").filter((p) => p["stay_id"] === stay.id && p["kind"] === "given_back");
    expect(back.map((p) => [p["method"], Number(p["amount"]).toFixed(2), p["refund_of"] !== null, p["against_id"] ?? null])).toEqual([["online", "50.00", true, null]]);
    expect(Number(demo.world.get("stays", stay.id)!["paid_online"]).toFixed(2)).toBe("320.60");
    expect(app.state.rf).toBeNull();
  });

  it("offers no refund to the front desk", async () => {
    const { online } = await paidStay("front-desk");
    expect(online()["refundOn"]).toBe(false);
  });

  it("says a cancellation in time owes it back — 'Refund owed', all of it to give back — and a late one keeps it", async () => {
    const { app, demo, stay, fo } = await paidStay();
    demo.engine.write(() => {
      demo.world.update("stays", stay.id, { status: "cancelled", cancel_code: "guest_asked", late_cancel: false });
      demo.world.settle();
    });
    app.forget("");
    for (let i = 0; i < 6; i += 1) {
      renderVals(app);
      await tick();
    }
    expect([fo()["owedOn"], fo()["owedLabel"], fo()["dueLabel"], fo()["balance"]]).toEqual([true, "Refund owed", "To give back", "⁨$370.60 to give back⁩"]);
    demo.engine.write(() => demo.world.update("stays", stay.id, { late_cancel: true }));
    app.forget("");
    for (let i = 0; i < 6; i += 1) {
      renderVals(app);
      await tick();
    }
    const kept = (fo()["rows"] as V[]).find((r) => r["id"] === "kp");
    expect([fo()["owedOn"], fo()["dueLabel"], kept?.["label"]]).toEqual([false, "Nothing owing", "Late cancellation — payment kept"]);
  });
});
