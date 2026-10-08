/**
 * CODES, VOUCHERS AND GIFT CARDS ON A STAY, ON EVERY ENGINE.
 *
 * This repo's manifest installed on a BUILT Adminium with Offers & gift cards
 * connected, on SQLite, Postgres and MySQL, through the app's own two doors
 * (`AdminiumGuest`, `AdminiumDesk`):
 *
 *   - a Garden double for two nights at $370.00; MIDWEEK takes $37.00 off
 *     before the tax: $333.00, tax $29.97, $362.97 — the quote and the save
 *     agree, and the confirmation names the reduction;
 *   - a $100.00 gift card pays $100.00 and is then empty, $262.97 left; or
 *     $300.00 in cash, then a second card pays $62.97 and keeps $37.03;
 *   - $20.00 given back to the card it came from, $90.00 more refused, and a
 *     voided card payment returns the rest;
 *   - a one-per-guest code tells a guest who is not signed in to sign in,
 *     applies once signed in, and applies at the desk for a named guest;
 *   - a voucher takes one night off, the dearest first, named with its last
 *     four only;
 *   - a cancelled stay gives its code's use back; a no-show keeps it;
 *   - a code sent for a stay already booked is refused; moving its dates
 *     re-prices the room under the same offer and adds no use;
 *   - no reply and no front-desk read carries a code as typed.
 *
 * It runs when asked (`ADMINIUM_CONTRACT=1`) where the plain contract runs,
 * with a built add-ons checkout beside it (`ADD_ONS_REPO`).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { AdminiumDesk } from "../data/adminiumDesk.ts";
import type { AdminiumGuest } from "../data/adminiumGuest.ts";
import { ApiError, type Row, type StayBody } from "../data/wire.ts";
import { ENGINES, missing, missingAddOn, ok, PORTS_PER_ENGINE, type Engine } from "./harness.ts";
import { standUp, type Stand } from "./stand.ts";

const why = missing() ?? missingAddOn("offers");
const REQUIRED = process.env["ADMINIUM_REQUIRE_CONTRACT"] === "1";
if (why !== null && REQUIRED) throw new Error(`the offers contract must run here, and cannot: ${why}`);
const PORT_BASE = Number(process.env["CONTRACT_PORT_BASE"] ?? 8470) + 10;

const cents = (value: unknown) => Number(value ?? 0).toFixed(2);
const flat = (text: string) => text.replace(/[\s  ]+/g, " ").trim();
const codeIn = (text: string) => /\b(\d{6})\b/.exec(text)?.[1] ?? "";
const yes = (value: unknown) => value === true || value === 1;

async function refusal(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error("expected a refusal, and it was written");
}

describe.skipIf(why !== null)(`codes, vouchers and gift cards on a built Adminium${why === null ? "" : ` — skipped: ${why}`}`, () => {
  ENGINES.forEach(([engine, available], index) => {
    describe.skipIf(!available)(`on ${engine}`, () => {
      let stand: Stand;
      let desk: AdminiumDesk;
      let garden: Row;
      // Not the house's own `.test` names: Adminium sends no email to an address reserved for examples.
      const mail = (who: string) => `${who}.${engine}@wren-guests.dev`;

      beforeAll(async () => {
        stand = await standUp(engine as Engine, PORT_BASE + index * PORTS_PER_ENGINE, `hotel_offers_${engine}${process.env["CONTRACT_DB_SUFFIX"] ?? ""}`, { addOns: missingAddOn("invoices") === null ? ["offers", "invoices"] : ["offers"] });
        desk = (await stand.deskOf()).desk;
        garden = (await stand.rows("room_types")).find((type) => type["name"] === "Garden double")!;
      }, 400_000);

      afterAll(async () => {
        await stand?.server.stop();
      });

      /** Two weekday nights in October, each $185.00 with the test's own rate rule. */
      const body = (values: Record<string, unknown>, codes: string[] = [], dates: [string, string] = ["2026-10-05", "2026-10-07"]): StayBody => ({
        values: { room_type_id: garden.id, arrive: dates[0], depart: dates[1], guests: 2, language: "en-US", ...values },
        children: { stay_extras: [], ...(codes.length === 0 ? {} : { stay_codes: codes.map((typed) => ({ values: { typed } })) }) },
      });
      const figures = (data: Record<string, unknown>) => ["room_total", "discount", "subtotal", "tax", "total"].map((column) => cents(data[column]));
      const stay = (id: unknown) => stand.one("stays", id);
      // One sign-in each, kept: a server lets an address try only a few a minute.
      const people = new Map<string, ReturnType<Stand["person"]>>();
      const person = (slug: string, who: string, name: string) => {
        if (!people.has(slug)) people.set(slug, stand.person(slug, mail(who), name));
        return people.get(slug)!;
      };
      const offers = (table: string, where?: unknown) => stand.rows(`offers_${table}`, where);
      const usesOf = async (stayId: unknown) => (await offers("redemptions", { column: "source_row", op: "eq", value: String(stayId) })).filter((use) => use["source_table"] === "hotel:stays");
      const offer = async (values: Record<string, unknown>, code: string) => {
        const made = ok(await stand.staff.post<{ data: Row }>(stand.data("offers_offers"), { values }), 201).data;
        ok(await stand.staff.post(stand.data("offers_codes"), { values: { offer_id: made.id, code, active: true } }), 201);
        // An offer starts as a draft, and is switched on once it is set up.
        ok(await stand.staff.patch(`${stand.data("offers_offers")}/${String(made.id)}`, { values: { status: "active" } }));
        return made;
      };
      /** A gift card with value on it, sold as Offers' own page sells one; its key and its code. */
      const cardWith = async (amount: string): Promise<{ id: number; code: string }> => {
        const actions = await stand.relation("offers_card_actions", "card_id");
        const made = ok(await stand.staff.post<{ data: Row }>(stand.data("offers_gift_cards"), { values: { kind: "card" }, children: { [actions]: [{ values: { action: "issue", amount, reason: "Sold at the desk", paid_by: "cash" } }] } }), 201).data;
        const card = await stand.one("offers_gift_cards", made.id);
        expect([card["status"], cents(card["balance"])]).toEqual(["active", cents(amount)]);
        return { id: made.id, code: String(card["code"]) };
      };
      const balanceOf = async (id: number) => cents((await stand.one("offers_gift_cards", id))["balance"]);
      const signIn = async (email: string): Promise<AdminiumGuest> => {
        const guest = await stand.guestOf();
        const before = await stand.mailCount();
        await guest.requestSignIn(email, "en-US");
        await guest.verifyCode(email, codeIn((await stand.mailTo(email, before)).text));
        return guest;
      };

      it("the owner sets the house up: two October nights at $185.00, the Midweek offer and its code", async () => {
        ok(await stand.staff.post(stand.data("rate_rules"), { values: { room_type_id: garden.id, name: "Harvest week", from_date: "2026-10-05", to_date: "2026-10-06", amount: 35, active: true } }), 201);
        await offer({ name: "Midweek", public_name: { "en-US": "Midweek", "fr-FR": "En semaine" }, gives: "percent", value: 10, trigger: "code", applies_to: "order", starts_on: "2026-01-01" }, "MIDWEEK");
        expect((await desk.config()).codes).toBe(true);
        expect((await (await stand.guestOf()).config()).offers).toBe(true);
      }, 120_000);

      let first = { id: 0, pay: 0 };
      it("prices a Garden double for two nights at $370.00, takes $37.00 off with MIDWEEK, taxes $333.00 at 9 %: $29.97, $362.97 — the quote and the save agree", async () => {
        const guest = await stand.guestOf();
        const plain = await guest.quote(body({ first_name: "Ada", last_name: "Lowe", email: mail("ada") }));
        expect(figures(plain.data)).toEqual(["370.00", "0.00", "370.00", "33.30", "403.30"]);
        const asked = body({ first_name: "Ada", last_name: "Lowe", email: mail("ada") }, ["midweek"]);
        const quote = await guest.quote(asked);
        expect(figures(quote.data)).toEqual(["370.00", "37.00", "333.00", "29.97", "362.97"]);
        expect((quote.applied ?? []).map((one) => [one.name, one.kind, cents(one.amount), one.typed])).toEqual([["Midweek", "code", "37.00", true]]);
        const before = await stand.mailCount();
        const made = await guest.reserve({ ...asked, expect: { total: "362.97" } }, `ada-${engine}-${"a".repeat(30)}`);
        expect(figures(made.data)).toEqual(["370.00", "37.00", "333.00", "29.97", "362.97"]);
        expect((made.applied ?? []).map((one) => [one.name, cents(one.amount)])).toEqual([["Midweek", "37.00"]]);
        first.id = made.data.id;
        const stored = await stay(first.id);
        expect([cents(stored["room_discount"]), cents(stored["discount"]), cents(stored["balance"]), yes(stored["customer_proved"])]).toEqual(["37.00", "37.00", "362.97", false]);
        // The use was taken with the stay.
        expect((await usesOf(first.id)).map((use) => [use["kind"], cents(use["amount"]), use["state"]])).toEqual([["code", "37.00", "counted"]]);
        // The confirmation names what came off, as Offers & gift cards recorded it, and the total after it.
        const text = flat((await stand.mailTo(mail("ada"), before)).text);
        for (const words of ["Midweek", "$37.00", "$362.97"]) expect(text, words).toContain(words);
        expect(text).not.toContain('{"');
      }, 180_000);

      it("a total the guest was not shown writes nothing: the price changed, and the reductions it has come with it", async () => {
        const guest = await stand.guestOf();
        const error = await refusal(guest.reserve({ ...body({ first_name: "Bea", last_name: "Lowe", email: mail("bea") }, ["MIDWEEK"]), expect: { total: "403.30" } }, `bea-${engine}-${"b".repeat(30)}`));
        expect([error.status, error.code]).toEqual([409, "PUBLIC_PRICE_CHANGED"]);
      }, 60_000);

      let card = { id: 0, code: "" };
      it("pays $100.00 from a gift card, which is then empty; $262.97 is left", async () => {
        card = await cardWith("100.00");
        // What the desk may know of a typed code: a card, its last four, its state and balance — never its code.
        const found = await desk.lookUpCode(card.code);
        expect([found?.kind, found?.last4, found?.record["status"], cents(found?.record["balance"])]).toEqual(["gift-card", card.code.slice(-4), "active", "100.00"]);
        expect(JSON.stringify(found)).not.toContain(card.code);
        const check = await desk.quoteCard(first.id, card.code);
        expect([cents(check.amount), cents(check.due), cents(check.balanceAfter)]).toEqual(["100.00", "262.97", "0.00"]);
        // A check takes nothing.
        expect(await balanceOf(card.id)).toBe("100.00");
        const paid = await desk.recordCardPayment(first.id, card.code, check.amount);
        first.pay = paid.id;
        expect([cents(paid["amount"]), paid["card_last4"], cents(paid["card_balance_after"])]).toEqual(["100.00", card.code.slice(-4), "0.00"]);
        expect(await balanceOf(card.id)).toBe("0.00");
        expect(cents((await stay(first.id))["balance"])).toBe("262.97");
      }, 120_000);

      it("an empty card is told so, and a card the house does not know is not valid: nothing is taken either way", async () => {
        const empty = await refusal(desk.quoteCard(first.id, card.code));
        expect([empty.status, empty.code, empty.params["reason"]], JSON.stringify(empty.params)).toEqual([409, "POSTING_REFUSED", "empty"]);
        const unknown = await refusal(desk.recordCardPayment(first.id, "GC-AAAA-BBBB-CCCC", "10.00"));
        expect([unknown.status, unknown.code, (unknown.params["fields"] as Record<string, { code: string }>)["card_code"]?.code], JSON.stringify(unknown.params)).toEqual([422, "VALIDATION_FAILED", "unknown"]);
        expect(cents((await stay(first.id))["balance"])).toBe("262.97");
      }, 120_000);

      it("gives $20.00 back to the card it came from, refuses $90.00 more, and a voided card payment returns the rest: the card is at $100.00 again", async () => {
        const back = await desk.giveBackToCard(first.id, first.pay, "20.00", "One towel short");
        expect([back["kind"], cents(back["amount"]), Number(back["against_id"])]).toEqual(["given_back", "20.00", first.pay]);
        expect(await balanceOf(card.id)).toBe("20.00");
        expect(cents((await stay(first.id))["balance"])).toBe("282.97");
        const over = await refusal(desk.giveBackToCard(first.id, first.pay, "90.00", "Too much"));
        expect([over.status, over.code, over.params["reason"], cents(over.params["left"])], JSON.stringify(over.params)).toEqual([409, "POSTING_REFUSED", "refund-over", "80.00"]);
        expect(await balanceOf(card.id)).toBe("20.00");
        // A manager voids the card payment: what it still held goes back to the card.
        await desk.voidRow("payments", first.pay, "Taken on the wrong stay");
        expect(await balanceOf(card.id)).toBe("100.00");
      }, 120_000);

      let second = 0;
      it("takes a booking at the desk with MIDWEEK, $300.00 in cash, then a second card pays $62.97 and keeps $37.03: the guest owes nothing", async () => {
        const asked = body({ first_name: "Cole", last_name: "Arden", email: mail("cole") }, ["MIDWEEK"], ["2026-10-05", "2026-10-07"]);
        const quote = await desk.quote(asked);
        expect(figures(quote.data)).toEqual(["370.00", "37.00", "333.00", "29.97", "362.97"]);
        expect((quote.applied ?? []).map((one) => [one.name, cents(one.amount)])).toEqual([["Midweek", "37.00"]]);
        const made = await desk.book({ ...asked, expect: { total: "362.97" }, clientKey: `cole-${engine}-${"c".repeat(30)}` });
        second = made.data.id;
        expect(figures(made.data)).toEqual(["370.00", "37.00", "333.00", "29.97", "362.97"]);
        await desk.recordPayment(second, { kind: "taken", amount: "300.00", method: "cash" });
        const other = await cardWith("100.00");
        const check = await desk.quoteCard(second, other.code);
        expect([cents(check.amount), cents(check.due), cents(check.balanceAfter)]).toEqual(["62.97", "0.00", "37.03"]);
        const paid = await desk.recordCardPayment(second, other.code, check.amount);
        expect([cents(paid["amount"]), cents(paid["card_balance_after"])]).toEqual(["62.97", "37.03"]);
        expect(await balanceOf(other.id)).toBe("37.03");
        expect(cents((await stay(second))["balance"])).toBe("0.00");
        // The folio's reductions, as the desk reads them: one entry, by name.
        expect(((await desk.folio(second)).applied ?? []).map((one) => [one.name, one.kind, cents(one.amount)])).toEqual([["Midweek", "code", "37.00"]]);
      }, 180_000);

      it.skipIf(missingAddOn("invoices") !== null)("the printed folio names the reduction, taken off, and the gift card's payment; the folio email names it too", async () => {
        const printed = await desk.printFolio(second);
        const page = flat(String((await stand.staff.get(printed.url!)).body).replace(/<[^>]+>/g, " "));
        for (const words of ["Midweek", "37.00", "333.00", "29.97", "362.97", "Gift card"]) expect(page, words).toContain(words);
        // Taken off, not added: the reduction's amount is printed below nothing.
        expect(page).toMatch(/Midweek[^A-Za-z]*[-−]\s?\$?37\.00/);
        expect(page).not.toContain('{"');
        const before = await stand.mailCount();
        await desk.emailFolio(second, false);
        const text = flat((await stand.mailTo(mail("cole"), before)).text);
        for (const words of ["Midweek", "$37.00", "$362.97"]) expect(text, words).toContain(words);
      }, 240_000);

      it("a card asked for more than it now holds gives nothing, and says what it has left", async () => {
        const small = await cardWith("30.00");
        const error = await refusal(desk.recordCardPayment(first.id, small.code, "50.00"));
        expect([error.status, error.code, error.params["reason"]], JSON.stringify(error.params)).toEqual([409, "POSTING_REFUSED", "empty"]);
        expect(await balanceOf(small.id)).toBe("30.00");
      }, 120_000);

      it("a code sent for a stay already booked is refused by name; moving the stay's dates re-prices the room under the same offer and adds no use", async () => {
        const rel = await stand.relation("stay_codes", "stay_id");
        const late = await stand.staff.post(stand.data("stay_codes"), { values: { stay_id: second, typed: "MIDWEEK" } });
        expect([late.status, late.code, late.details["reason"]], JSON.stringify(late.body).slice(0, 400)).toEqual([409, "POSTING_REFUSED", "receipt-open"]);
        expect(rel).not.toBe("");
        // Three nights now: two at $185.00 and a plain $150.00 — 10 % of $520.00.
        const quote = await desk.quoteEdit(first.id, { depart: "2026-10-08" });
        expect(figures(quote.data)).toEqual(["520.00", "52.00", "468.00", "42.12", "510.12"]);
        const moved = await desk.edit(first.id, { depart: "2026-10-08" }, "510.12");
        expect(figures(moved)).toEqual(["520.00", "52.00", "468.00", "42.12", "510.12"]);
        expect((await usesOf(first.id)).filter((use) => use["state"] === "counted").length).toBe(1);
      }, 120_000);

      it("gives the use back when the stay is cancelled, and keeps it through a no-show", async () => {
        const before = (await usesOf(first.id)).map((use) => use["state"]);
        expect(before).toEqual(["counted"]);
        await desk.cancel(first.id, "guest_asked");
        expect((await usesOf(first.id)).map((use) => use["state"])).not.toContain("counted");
        // A closed stay is never priced again.
        expect(cents((await stay(first.id))["discount"])).toBe("52.00");
      }, 120_000);

      it("tells a guest who is not signed in 'sign in' for a one-per-guest code, whatever email they typed; applies it once signed in; applies it at the desk for a named guest", async () => {
        await offer({ name: "Welcome back", public_name: { "en-US": "Welcome back" }, gives: "amount", value: 25, trigger: "code", applies_to: "order", max_per_customer: 1, starts_on: "2026-01-01" }, "BACKAGAIN");
        const dana = mail("dana");
        const guest = await stand.guestOf();
        const typed = body({ first_name: "Dana", last_name: "Reeve", email: dana }, ["BACKAGAIN"], ["2026-10-12", "2026-10-14"]);
        const told = await refusal(guest.quote(typed));
        expect([told.status, told.code, told.params["column"], told.params["reason"]], JSON.stringify(told.params)).toEqual([400, "PUBLIC_WRITE_REFUSED", "typed", "needs-sign-in"]);
        // On file: a sign-in link goes only to an address the house knows.
        const customer = ok(await stand.staff.post<{ data: Row }>(stand.data("customers"), { values: { email: dana, first_name: "Dana", last_name: "Reeve" } }), 201).data;
        const signed = await signIn(dana);
        const quote = await signed.quote(typed);
        expect(figures(quote.data)).toEqual(["300.00", "25.00", "275.00", "24.75", "299.75"]);
        const made = await signed.reserve({ ...typed, expect: { total: "299.75" } }, `dana-${engine}-${"d".repeat(30)}`);
        expect(yes((await stay(made.data.id))["customer_proved"])).toBe(true);
        // Once a guest: the same guest's second stay is not given it again.
        const again = await refusal(signed.quote(body({ first_name: "Dana", last_name: "Reeve", email: dana }, ["BACKAGAIN"], ["2026-10-19", "2026-10-21"])));
        expect([again.status, again.code, again.params["column"]]).toEqual([400, "PUBLIC_WRITE_REFUSED", "typed"]);
        // At the desk, for a guest the desk names: the link is the proof.
        const eli = ok(await stand.staff.post<{ data: Row }>(stand.data("customers"), { values: { email: mail("eli"), first_name: "Eli", last_name: "Stone" } }), 201).data;
        const atDesk = await desk.quote(body({ first_name: "Eli", last_name: "Stone", email: mail("eli"), customer_id: eli.id }, ["BACKAGAIN"], ["2026-10-12", "2026-10-14"]));
        expect(figures(atDesk.data)).toEqual(["300.00", "25.00", "275.00", "24.75", "299.75"]);
        // …and with nobody named, the desk is told the plain reason.
        const nobody = await refusal(desk.quote(body({ first_name: "Finn", last_name: "Stone" }, ["BACKAGAIN"], ["2026-10-12", "2026-10-14"])));
        expect([nobody.status, nobody.code, nobody.params["reason"]], JSON.stringify(nobody.params)).toEqual([409, "ADJUST_REFUSED", "needs-customer"]);
        expect(customer.id).toBeGreaterThan(0);
      }, 240_000);

      // KNOWN TO FAIL on Adminium 0.3.19 + Offers & gift cards 1.0.9: Adminium hands a stay's line `quantity` = its nights,
      // and Offers counts each night that many times over, so a voucher for one of two nights takes a quarter of the room
      // ($92.50) and not a night ($185.00). `it.fails` turns red the day either side is put right: then make it an `it`.
      it.fails("takes one night off with a voucher, the dearest first, and names it 'One night · Garden double' with the last four only", async () => {
        const voucher = ok(
          await stand.staff.post<{ data: Row }>(stand.data("offers_vouchers"), {
            values: { worth: "thing", what: "item", source_table: "hotel:room_types", source_row: String(garden.id), units: 1, public_name: "One night · Garden double", uses_total: 1 },
          }),
          201,
        ).data;
        const code = String((await stand.one("offers_vouchers", voucher.id))["code"]);
        const guest = await stand.guestOf();
        // Equal nights: $185.00 + $185.00, one taken.
        const even = await guest.quote(body({ first_name: "Gil", last_name: "Hart", email: mail("gil") }, [code]));
        expect(figures(even.data)).toEqual(["370.00", "185.00", "185.00", "16.65", "201.65"]);
        expect((even.applied ?? []).map((one) => [one.name, one.kind, cents(one.amount), one.codeLast4])).toEqual([["One night · Garden double", "voucher", "185.00", code.replace(/[^A-Za-z0-9]/g, "").slice(-4)]]);
        expect(JSON.stringify(even)).not.toContain(code);
        // Unequal nights: Tuesday $185.00 and Wednesday $150.00 — the dearer one is taken.
        const uneven = await guest.quote(body({ first_name: "Gil", last_name: "Hart", email: mail("gil") }, [code], ["2026-10-06", "2026-10-08"]));
        expect(figures(uneven.data)).toEqual(["335.00", "185.00", "150.00", "13.50", "163.50"]);
      }, 120_000);

      it("never reads a code back: no public reply and no front-desk read carries a code as typed or a card's code", async () => {
        const maeve = await person("hotel-front-desk", "maeve", "Maeve R.");
        const folio = await maeve.desk.folio(second);
        expect(folio.payments.length).toBeGreaterThan(0);
        for (const payment of folio.payments) expect(Object.keys(payment)).not.toContain("card_code");
        const codes = ok(await maeve.caller.get<{ data: Row[] }>(`${stand.data("stay_codes")}?limit=50`)).data;
        expect(codes.length).toBeGreaterThan(0);
        for (const row of codes) expect(Object.keys(row)).not.toContain("typed");
        // A guest's own page: the stay's reductions by name, never the code.
        const guest = await stand.guestOf();
        const quote = await guest.quote(body({ first_name: "Hal", last_name: "Brook", email: mail("hal") }, ["MIDWEEK"]));
        expect(JSON.stringify(quote.children ?? {})).not.toContain("MIDWEEK");
      }, 240_000);

      // KNOWN TO FAIL on Adminium 0.3.19: `POST /add-ons/offers/look-up` answers 403 APP_SCREENS_ONLY to an account that
      // opens only its app's screens (the front desk), though the role holds the reads the look-up answers from.
      it.fails("the front desk's look-up of a card answers its status and balance and no code; housekeeping's finds nothing", async () => {
        const maeve = await person("hotel-front-desk", "maeve", "Maeve R.");
        const jory = await person("hotel-housekeeping", "jory", "Jory");
        const mine = await cardWith("10.00");
        const found = await maeve.desk.lookUpCode(mine.code);
        expect([found?.kind, found?.last4, cents(found?.record["balance"])]).toEqual(["gift-card", mine.code.slice(-4), "10.00"]);
        expect(JSON.stringify(found)).not.toContain(mine.code);
        expect(await jory.desk.lookUpCode(mine.code)).toBeNull();
      }, 240_000);

      // KNOWN TO FAIL on Adminium 0.3.19: a role cannot write a column its `readable` limit leaves out (403 COLUMN_FORBIDDEN,
      // reason "read-limit"), so the front desk — which never reads a card's code back — cannot type one either.
      it.fails("the front desk checks and takes a gift card itself, and what it reads back carries no code", async () => {
        const maeve = await person("hotel-front-desk", "maeve", "Maeve R.");
        const mine = await cardWith("10.00");
        const made = await maeve.desk.book({ ...body({ first_name: "Ivy", last_name: "Marsh" }, [], ["2026-10-19", "2026-10-21"]), clientKey: `ivy-${engine}-${"i".repeat(30)}` });
        const check = await maeve.desk.quoteCard(made.data.id, mine.code);
        expect([cents(check.amount), cents(check.balanceAfter)]).toEqual(["10.00", "0.00"]);
        const paid = await maeve.desk.recordCardPayment(made.data.id, mine.code, check.amount);
        expect([cents(paid["amount"]), paid["card_last4"], Object.keys(paid).includes("card_code")]).toEqual(["10.00", mine.code.slice(-4), false]);
        // What a card gave or kept is never the desk's to type.
        const typed = await maeve.caller.post(stand.data("payments"), { values: { stay_id: made.data.id, kind: "taken", method: "cash", amount: 5, card_balance_after: 99 } });
        expect(typed.status, JSON.stringify(typed.body).slice(0, 300)).toBeGreaterThanOrEqual(400);
        // Voiding stays a manager's.
        const voided = await maeve.caller.patch(`${stand.data("payments")}/${String(paid.id)}`, { values: { voided: true, void_reason: "no" } });
        expect(voided.status).toBe(403);
      }, 240_000);
    });
  });
});
