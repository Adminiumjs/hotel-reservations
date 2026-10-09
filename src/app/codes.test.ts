/**
 * A code on a stay, a gift card at the desk and the linen sheet, as the app
 * holds them between a press and its answer: a code belongs to the stay it
 * was typed on and to no other; one still in the field is asked about before
 * anything is saved; an answer that comes after its question has gone is not
 * heard; and a save sent again carries the key it was first sent with.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import type { GuestPort } from "../data/ports.ts";
import { ApiError, type Applied, type QuoteReply, type StayBody } from "../data/wire.ts";
import { DemoAdminium } from "../demo/adminium.ts";
import { pairCodes } from "./codes.ts";
import { blankNb, checkCard, linen, openGiveBackToCard, openLinen, openSettle, putBackLinen, saveNb } from "./desk.ts";
import { HouseApp, mintKey } from "./house.ts";
import { renderVals } from "./vals/base.ts";
import { overlayVals } from "./vals/overlays.ts";

const tick = async (times = 6) => {
  for (let i = 0; i < times; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
};
const typedOf = (body: StayBody) => (body.children.stay_codes ?? []).map((c) => c.values.typed);
const row = (name: string, more: Partial<Applied> = {}): Applied => ({ line: null, name, kind: "code", amount: "10.00", typed: true, ...more });
const quoteOf = (applied: Applied[], total = "90.00"): QuoteReply => ({ data: { total, room_total: 100, tax: 0, subtotal: 90 }, nights: [], children: { stay_extras: [] }, capacity: [], exact: true, applied, told: [] });

/** A door that answers only what a check asks; anything else is a refusal the check would notice. */
function door<T extends object>(over: Partial<T>): T {
  // Anything else is never answered: a check that leaned on it would not finish.
  const no = () => new Promise<never>(() => undefined);
  return new Proxy(over as T, { get: (target, name) => (target as Record<string | symbol, unknown>)[name] ?? no });
}

/** The demo's house on the desk's side, started. */
async function deskHouse() {
  const demo = new DemoAdminium();
  const app = new HouseApp({ guest: demo.guest, desk: demo.desk }, "desk");
  await app.start();
  app.world();
  await tick();
  return { demo, app };
}

afterEach(() => vi.restoreAllMocks());

describe("a code belongs to the stay it was typed on", () => {
  it("is let go when the booking form is started again on the same screen, with what was typed and any check still out", async () => {
    const { app } = await deskHouse();
    app.go("newbooking", { editId: null, nb: blankNb(app) });
    app.setState({ codes: ["MIDWEEK"], codeText: "half", codeOpen: true, codeErr: "x" });
    // "Take a booking" pressed again for the next guest: the same view, a fresh form.
    app.go("newbooking", { editId: null, nb: blankNb(app), nbErr: "", nbTouched: false });
    expect([app.state.codes, app.state.codeText, app.state.codeOpen, app.state.codeErr]).toEqual([[], "", false, ""]);
  });

  it("is let go with the payment dialog's card when the dialog opens for another stay", async () => {
    const { app } = await deskHouse();
    openSettle(app, 1);
    const first = app.state.settleKey;
    app.setState({ settleMethod: "gift_card", cardCode: "GC-7K2M-W3HN-Q4XP", cardCheck: { amount: "1.00", due: "0.00", balanceAfter: "0.00" } });
    openSettle(app, 2);
    expect([app.state.cardCode, app.state.cardCheck, app.state.settleAgainst]).toEqual(["", null, null]);
    // Each opening has a retry key of its own.
    expect(app.state.settleKey).not.toBe(first);
    expect(app.state.settleKey).toMatch(/^[0-9a-f]{48}$/);
  });
});

describe("a code typed and not applied", () => {
  const guestWith = (answer: (codes: string[]) => Promise<QuoteReply>) => {
    const reserved: StayBody[] = [];
    const guest = door<GuestPort>({
      config: async () => ({ timezone: "UTC", currency: "USD", offers: true }),
      quote: (body) => answer(typedOf(body)),
      reserve: async (body) => {
        reserved.push(body);
        return { data: { id: 5, ref: "WH-1", total: 90 } };
      },
      openLink: async () => ({ session: "s", expiresAt: 0 }),
    });
    const app = new HouseApp({ guest }, "guest");
    return { app, reserved };
  };
  const filled = { first: "Elin", last: "Marsh", email: "elin@example.com", mobile: "", arrivalTime: "15:00", note: "", extras: {} };

  it("is asked about before the stay is reserved: refused, nothing is reserved and its reason is said", async () => {
    const { app, reserved } = guestWith((codes) => (codes.includes("SUMMER25") ? Promise.reject(new ApiError(400, "PUBLIC_WRITE_REFUSED", "no", { column: "typed", reason: "unknown" })) : Promise.resolve(quoteOf([]))));
    await app.start();
    app.go("reserve", { pickedType: "2", form: filled, rvShown: "100.00" });
    app.setState({ codeText: "SUMMER25" });
    app.tryReserve();
    await tick();
    expect(reserved).toEqual([]);
    expect([app.state.codes, app.state.codeOpen, app.state.codeErr !== ""]).toEqual([[], true, true]);
  });

  it("is applied, and the stay reserved with it at the price the house then answered", async () => {
    const { app, reserved } = guestWith((codes) => Promise.resolve(codes.length === 0 ? quoteOf([], "100.00") : quoteOf([row("Midweek")], "90.00")));
    await app.start();
    app.go("reserve", { pickedType: "2", form: filled, rvShown: "100.00" });
    app.setState({ codeText: "midweek" });
    app.tryReserve();
    await tick();
    expect(reserved.map((body) => [typedOf(body), body.expect])).toEqual([[["midweek"], { total: "90.00" }]]);
  });

  it("is asked about before the desk saves a booking too", async () => {
    const { demo, app } = await deskHouse();
    const book = vi.spyOn(demo.desk, "book");
    const garden = demo.world.all("room_types").find((t) => t["name"] === "Garden double")!;
    app.go("newbooking", { editId: null, nb: { ...blankNb(app), type: String(garden.id), arrive: "2026-08-03", depart: "2026-08-05", first: "Elin", last: "Marsh" } });
    app.setState({ codeText: "SUMMER25" });
    await saveNb(app, false, null, undefined);
    expect(book).not.toHaveBeenCalled();
    expect(app.state.codeErr).not.toBe("");
    // The house's own code, still in the field: applied, then saved with it.
    app.setState({ codeText: "MIDWEEK", codeErr: "" });
    await saveNb(app, false, null, undefined);
    await tick();
    expect(book.mock.calls.map(([body]) => typedOf(body))).toEqual([["MIDWEEK"]]);
    const made = demo.world.all("stays").find((s) => s["first_name"] === "Elin" && s["last_name"] === "Marsh")!;
    expect(Number(made["discount"])).toBeGreaterThan(0);
  });
});

describe("which code is which reduction", () => {
  it("is read from the answer: a voucher by its last four, a code only when one of each is left", () => {
    const voucher = row("Voucher · One night", { kind: "voucher", codeLast4: "7DBW" });
    const one = pairCodes([row("Midweek"), voucher], ["VC-AAAA-BBBB-7DBW", "MIDWEEK"]);
    expect(one.rows.map((r) => r.code)).toEqual(["MIDWEEK", "VC-AAAA-BBBB-7DBW"]);
    expect(one.alone).toEqual([]);
    // Two typed codes and one row for them: nothing is guessed — both stay listed, each with its own Remove.
    const two = pairCodes([row("Midweek")], ["MIDWEEK", "AUTUMN"]);
    expect([two.rows.map((r) => r.code), two.alone]).toEqual([[undefined], ["MIDWEEK", "AUTUMN"]]);
    // An offer nobody typed is never given a typed code.
    const auto = pairCodes([row("Third night on us", { kind: "offer", typed: false })], ["MIDWEEK"]);
    expect([auto.rows.map((r) => r.code), auto.alone]).toEqual([[undefined], ["MIDWEEK"]]);
  });

  it("joins the stay's codes only when the answer has a reduction for it", async () => {
    const guest = door<GuestPort>({ config: async () => ({ timezone: "UTC", currency: "USD", offers: true }) });
    const app = new HouseApp({ guest }, "guest");
    await app.start();
    app.setState({ codeText: "NOTHING" });
    expect(await app.applyCode(async () => quoteOf([]))).toBeNull();
    expect([app.state.codes, app.state.codeErr !== ""]).toEqual([[], true]);
    app.setState({ codeText: "BEATEN", codeErr: "" });
    await app.applyCode(async () => ({ ...quoteOf([row("Third night on us", { kind: "offer", typed: false })]), told: [{ column: "typed", note: "better-offer-applied", name: "Third night on us" }] }));
    expect([app.state.codes, app.state.codeErr]).toEqual([[], "Third night on us is already taking more off."]);
  });

  it("takes a code off, with its reason, when the price is refused because of it after the room or the dates change", async () => {
    const guest = door<GuestPort>({ config: async () => ({ timezone: "UTC", currency: "USD", offers: true }) });
    const app = new HouseApp({ guest }, "guest");
    await app.start();
    app.setState({ codes: ["MIDWEEK"] });
    // A refusal that is not about the code leaves it where it is.
    app.dropRefusedCodes(new ApiError(400, "PUBLIC_WRITE_REFUSED", "no", { column: "guests" }));
    expect(app.state.codes).toEqual(["MIDWEEK"]);
    app.dropRefusedCodes(new ApiError(400, "PUBLIC_WRITE_REFUSED", "no", { column: "typed", reason: "not-for-these-items" }));
    expect([app.state.codes, app.state.codeOpen, app.state.codeErr]).toEqual([[], true, "This code is not for this room."]);
  });
});

describe("an answer that comes after its question has gone", () => {
  it("is not heard: a code checked for one booking never lands on the next", async () => {
    const { app } = await deskHouse();
    app.go("newbooking", { editId: null, nb: blankNb(app) });
    let answer: (reply: QuoteReply) => void = () => undefined;
    app.setState({ codeText: "MIDWEEK" });
    const asked = app.applyCode(() => new Promise<QuoteReply>((resolve) => (answer = resolve)));
    // The form is started again for another guest while the check is out.
    app.go("newbooking", { editId: null, nb: blankNb(app) });
    answer(quoteOf([row("Midweek")]));
    await asked;
    expect([app.state.codes, app.state.codeBusy, app.state.codeText]).toEqual([[], false, ""]);
  });

  it("is not heard: a card checked on a dialog that has closed, or after another code was typed", async () => {
    const { demo, app } = await deskHouse();
    const teodor = demo.world.all("stays").find((s) => s["ref"] === "WH-S3283")!;
    openSettle(app, teodor.id);
    app.setState({ settleMethod: "gift_card", cardCode: "GC-7K2M-W3HN-Q4XP" });
    const first = checkCard(app, teodor.id);
    app.setState({ settleOpen: false });
    await first;
    expect(app.state.cardCheck).toBeNull();
    openSettle(app, teodor.id);
    app.setState({ settleMethod: "gift_card", cardCode: "GC-7K2M-W3HN-Q4XP" });
    const second = checkCard(app, teodor.id);
    app.setState({ cardCode: "GC-9D4T-K8RV-M2LX", cardBusy: false });
    await second;
    expect(app.state.cardCheck).toBeNull();
    // Asked and left alone, it is heard.
    await checkCard(app, teodor.id);
    expect(app.state.cardCheck?.balanceAfter).toBeDefined();
  });

  it("says a voucher or a discount code typed as a gift card is one, from the desk's look-up, and asks no card", async () => {
    const { demo, app } = await deskHouse();
    const teodor = demo.world.all("stays").find((s) => s["ref"] === "WH-S3283")!;
    vi.spyOn(demo.desk, "lookUpCode").mockResolvedValue({ kind: "voucher", last4: "7DBW", record: {} });
    const quoteCard = vi.spyOn(demo.desk, "quoteCard");
    openSettle(app, teodor.id);
    app.setState({ settleMethod: "gift_card", cardCode: "VC-AAAA-BBBB-7DBW" });
    await checkCard(app, teodor.id);
    expect(quoteCard).not.toHaveBeenCalled();
    expect([app.state.cardCheck, app.state.cardErr]).toEqual([null, "That is a voucher, not a gift card. A voucher is typed when the stay is booked."]);
  });
});

describe("a save sent again", () => {
  it("gives money back to a card with the dialog's one key, kept for the second press after an answer that never came", async () => {
    const { demo, app } = await deskHouse();
    const teodor = demo.world.all("stays").find((s) => s["ref"] === "WH-S3283")!;
    const paid = await demo.desk.recordCardPayment(teodor.id, "GC-7K2M-W3HN-Q4XP", "150.00", "pay-key");
    app.forget("desk:");
    for (let i = 0; i < 20 && app.world() === null; i += 1) await tick();
    const real = demo.desk.giveBackToCard.bind(demo.desk);
    const keys: string[] = [];
    let lost = true;
    vi.spyOn(demo.desk, "giveBackToCard").mockImplementation(async (stay, payment, amount, note, key) => {
      keys.push(key);
      const made = await real(stay, payment, amount, note, key);
      if (lost) {
        lost = false;
        // Made, and its answer lost on the way back.
        throw new TypeError("Failed to fetch");
      }
      return made;
    });
    openGiveBackToCard(app, teodor.id, paid.id, 150);
    app.setState({ settleAmount: "20.00", settleNote: "One towel short", settleTouched: true });
    const press = async () => {
      for (let i = 0; i < 20 && app.world() === null; i += 1) await tick();
      (overlayVals(app, app.world()!)["se"] as { confirm(): void }).confirm();
    };
    await press();
    await tick(20);
    // Still open, the account read again; pressed again, the same key goes with it.
    expect(app.state.settleOpen).toBe(true);
    await press();
    await tick(20);
    expect(keys.length).toBe(2);
    expect(keys[0]).toBe(keys[1]);
    expect(app.state.settleOpen).toBe(false);
    // Given back once: the card holds $20.00, not $40.00.
    expect((await demo.guest.cardBalance({ code: "GC-7K2M-W3HN-Q4XP" }))?.balance).toBe("20.00");
  });

  it("puts linen back with the sheet's one key, so pressing again after a lost answer goes on with the same transfer", async () => {
    const { demo, app } = await deskHouse();
    app.go("rack");
    openLinen(app);
    await tick();
    const real = demo.desk.putBackLinen.bind(demo.desk);
    const keys: string[] = [];
    let lost = true;
    vi.spyOn(demo.desk, "putBackLinen").mockImplementation(async (rows, key) => {
      keys.push(key);
      const made = await real(rows, key);
      if (lost) {
        lost = false;
        throw new TypeError("Failed to fetch");
      }
      return made;
    });
    await putBackLinen(app);
    expect([app.state.linenOpen, app.state.linenSent, app.state.linenErr !== ""]).toEqual([true, true, true]);
    await putBackLinen(app);
    expect(keys.length).toBe(2);
    expect(keys[0]).toBe(keys[1]);
    expect(app.state.linenOpen).toBe(false);
    // Put back once: 260 bath towels in the store, not 284.
    expect((await demo.desk.linen()).map((r) => [r.inStore, r.atLaundry])).toEqual([[260, 0], [260, 0], [140, 0]]);
  });

  it("opens the linen sheet on what Today last read, and leaves a count already typed as typed when the fresh read comes", async () => {
    const { demo, app } = await deskHouse();
    app.go("today");
    linen(app);
    await tick();
    let answer: () => void = () => undefined;
    const real = demo.desk.linen.bind(demo.desk);
    vi.spyOn(demo.desk, "linen").mockImplementation(() => new Promise((resolve) => (answer = () => void real().then(resolve))));
    openLinen(app);
    // At once, from what Today read: never "no linen is linked".
    expect(app.state.linenCounts).toEqual({ "1": "24", "2": "24", "3": "12" });
    app.setState({ linenCounts: { ...app.state.linenCounts, "1": "26" } });
    answer();
    await tick();
    expect(app.state.linenCounts).toEqual({ "1": "26", "2": "24", "3": "12" });
  });

  it("mints its keys from the browser's random source, 48 hex characters, each its own", () => {
    const keys = new Set(Array.from({ length: 50 }, () => mintKey()));
    expect(keys.size).toBe(50);
    for (const key of keys) expect(key).toMatch(/^[0-9a-f]{48}$/);
  });
});

describe("the price asked of the house", () => {
  it("is asked again for another guest, and names the guest only while Offers & gift cards is in use", async () => {
    const { demo, app } = await deskHouse();
    const quote = vi.spyOn(demo.desk, "quote");
    app.quote("2", "2026-08-03", "2026-08-05", 2, [], [], { customer_id: 1 });
    app.quote("2", "2026-08-03", "2026-08-05", 2, [], [], { customer_id: 2 });
    app.quote("2", "2026-08-03", "2026-08-05", 2, [], [], { customer_id: 2 });
    await tick();
    expect(quote.mock.calls.map(([body]) => body.values["customer_id"])).toEqual([1, 2]);
    // A booking linked to a guest already on the books, in a house without Offers & gift cards: the question is 0.2's.
    quote.mockClear();
    const known = demo.world.all("customers")[0]!;
    const garden = demo.world.all("room_types").find((t) => t["name"] === "Garden double")!;
    app.codesOn = false;
    app.go("newbooking", { editId: null, nb: { ...blankNb(app), type: String(garden.id), arrive: "2026-08-10", depart: "2026-08-12", email: String(known["email"]), link: "yes" } });
    for (let i = 0; i < 4; i += 1) {
      renderVals(app);
      await tick();
    }
    const asked = quote.mock.calls.map(([body]) => body).filter((body) => body.values["arrive"] === "2026-08-10" && body.values["room_type_id"] === garden.id);
    expect(asked.length).toBeGreaterThan(0);
    for (const body of asked) expect(Object.keys(body.values)).not.toContain("customer_id");
    app.codesOn = true;
    app.forget("quote:");
    quote.mockClear();
    for (let i = 0; i < 4; i += 1) {
      renderVals(app);
      await tick();
    }
    expect(quote.mock.calls.some(([body]) => body.values["arrive"] === "2026-08-10" && body.values["customer_id"] === known.id)).toBe(true);
  });
});

describe("the gift card balance page", () => {
  const pageWith = async (answer: () => Promise<{ balance: string; expiresOn: string | null } | null>) => {
    const app = new HouseApp({ guest: door<GuestPort>({ config: async () => ({ timezone: "UTC", currency: "USD", offers: true }), cardBalance: answer }) }, "guest");
    await app.start();
    await app.cardBalance({ code: "GC-7K2M-W3HN-Q4XP" });
    return app.state.gcAnswer?.kind;
  };

  it("says 'not valid' only of a code the house answered about; one it could not ask about is said as that — by code and by link", async () => {
    expect(await pageWith(async () => null)).toBe("none");
    expect(await pageWith(() => Promise.reject(new ApiError(404, "PUBLIC_REF_NOT_FOUND", "no")))).toBe("none");
    expect(await pageWith(() => Promise.reject(new ApiError(429, "PUBLIC_RATE_LIMITED", "wait")))).toBe("wait");
    expect(await pageWith(() => Promise.reject(new ApiError(503, "PUBLIC_UPSTREAM_UNAVAILABLE", "down")))).toBe("down");
    expect(await pageWith(() => Promise.reject(new ApiError(0, "PUBLIC_NETWORK_UNAVAILABLE", "offline")))).toBe("down");
    expect(await pageWith(() => Promise.reject(new TypeError("Failed to fetch")))).toBe("down");
    const app = new HouseApp({ guest: door<GuestPort>({ config: async () => ({ timezone: "UTC", currency: "USD", offers: true }), cardBalance: () => Promise.reject(new TypeError("Failed to fetch")) }) }, "guest");
    await app.start();
    await app.cardBalance({ token: "tok-41-link-code" });
    expect(app.state.gcAnswer?.kind).toBe("down");
  });
});
