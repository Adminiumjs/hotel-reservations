/**
 * WITH THE ADD-ONS AWAY, HALF THERE, OR UNABLE TO ANSWER — ON EVERY ENGINE.
 *
 * (With neither add-on installed at all, the house is `contract.test.ts`: the
 * whole of 0.2's contract, run on this build.)
 *
 * Here Inventory and Offers & gift cards are INSTALLED beside the house and
 * not connected to it; then each is connected; then switched off for the
 * house; then on again. At every step: what the screens are told, what a save
 * does, and that what was recorded before still reads.
 *
 *   - installed, not connected: nothing shown, nothing asked; a stay booked,
 *     paid and checked out as 0.2 did; a code or a gift card sent anyway is
 *     refused and writes nothing;
 *   - Offers & gift cards connected: a code and a gift card work, linen still
 *     does not show; one $100.00 card spent on two stays at once pays one;
 *   - Inventory connected too: check-out posts;
 *   - Offers & gift cards switched off for the house: it cannot answer, so no
 *     stay is saved — with no code either — and no card pays; the stay made
 *     before still reads, with what was taken off it;
 *   - Inventory switched off: a guest is still checked out;
 *   - switched on again: as before.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { AdminiumDesk } from "../data/adminiumDesk.ts";
import { ApiError, type Row, type StayBody } from "../data/wire.ts";
import { ENGINES, missing, missingAddOn, ok, PORTS_PER_ENGINE, type Engine } from "./harness.ts";
import { standUp, type Stand } from "./stand.ts";

const why = missing() ?? missingAddOn("offers") ?? missingAddOn("inventory");
const REQUIRED = process.env["ADMINIUM_REQUIRE_CONTRACT"] === "1";
if (why !== null && REQUIRED) throw new Error(`the absent-and-partial contract must run here, and cannot: ${why}`);
const PORT_BASE = Number(process.env["CONTRACT_PORT_BASE"] ?? 8470) + 30;

const cents = (value: unknown) => Number(value ?? 0).toFixed(2);
/** A retry key of the dialog's kind: a new one for each save. */
let keys = 0;
const key = () => `contract-key-${String(Date.now())}-${String((keys += 1)).padStart(6, "0")}`;

async function refusal(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error("expected a refusal, and it was written");
}

describe.skipIf(why !== null)(`with the add-ons away, half there, or unable to answer${why === null ? "" : ` — skipped: ${why}`}`, () => {
  ENGINES.forEach(([engine, available], index) => {
    describe.skipIf(!available)(`on ${engine}`, () => {
      let stand: Stand;
      let garden: Row;
      const mail = (who: string) => `${who}.absent.${engine}@wren-guests.dev`;
      /** The desk as its screens boot: a fresh door reads the config again (what is connected now). */
      const deskNow = async (): Promise<AdminiumDesk> => (await stand.deskOf()).desk;

      beforeAll(async () => {
        stand = await standUp(engine as Engine, PORT_BASE + index * PORTS_PER_ENGINE, `hotel_absent_${engine}${process.env["CONTRACT_DB_SUFFIX"] ?? ""}`, { beside: ["inventory", "offers"] });
        garden = (await stand.rows("room_types")).find((type) => type["name"] === "Garden double")!;
      }, 600_000);

      afterAll(async () => {
        await stand?.server.stop();
      });

      const body = (values: Record<string, unknown>, codes: string[] = [], dates: [string, string] = ["2026-10-05", "2026-10-07"]): StayBody => ({
        values: { room_type_id: garden.id, arrive: dates[0], depart: dates[1], guests: 2, language: "en-US", ...values },
        children: { stay_extras: [], ...(codes.length === 0 ? {} : { stay_codes: codes.map((typed) => ({ values: { typed } })) }) },
      });
      const figures = (data: Record<string, unknown>) => ["room_total", "discount", "subtotal", "tax", "total"].map((column) => cents(data[column]));
      const receipts = async (addOn: string) => (await stand.rows(`${addOn}_postings`)).filter((receipt) => String(receipt["source_table"]).startsWith("hotel:"));
      const cardWith = async (amount: string): Promise<{ id: number; code: string }> => {
        const actions = await stand.relation("offers_card_actions", "card_id");
        const made = ok(await stand.staff.post<{ data: Row }>(stand.data("offers_gift_cards"), { values: { kind: "card" }, children: { [actions]: [{ values: { action: "issue", amount, reason: "Sold at the desk", paid_by: "cash" } }] } }), 201).data;
        return { id: made.id, code: String((await stand.one("offers_gift_cards", made.id))["code"]) };
      };
      const balanceOf = async (id: number) => cents((await stand.one("offers_gift_cards", id))["balance"]);
      /** A Garden double from today, checked in and settled in cash: ready to leave. */
      const readyToLeave = async (desk: AdminiumDesk, first: string): Promise<number> => {
        const made = await desk.book({ ...body({ first_name: first, last_name: "Tregear" }, [], ["2026-07-28", "2026-07-29"]), clientKey: `${first}-${engine}-${"z".repeat(30)}` });
        const closed = new Set((await stand.rows("room_closures")).map((closure) => closure["room_id"]));
        const taken = new Set((await stand.rows("stays")).filter((stay) => ["booked", "in_house"].includes(String(stay["status"])) && stay["room_id"] !== null).map((stay) => stay["room_id"]));
        const room = (await stand.rows("rooms")).find((one) => one["room_type_id"] === garden.id && one["status"] === "ready" && !closed.has(one.id) && !taken.has(one.id))!;
        // A room a guest left today is being cleaned: housekeeping makes it ready again.
        for (const cleaning of (await stand.rows("rooms")).filter((one) => one["room_type_id"] === garden.id && one["status"] === "cleaning" && !closed.has(one.id))) await desk.setRoom(cleaning.id, { status: "ready" });
        const free = room ?? (await stand.rows("rooms")).find((one) => one["room_type_id"] === garden.id && one["status"] === "ready" && !closed.has(one.id) && !taken.has(one.id))!;
        await desk.checkIn(made.data.id, free.id);
        await desk.recordPayment(made.data.id, { kind: "taken", amount: cents(made.data["total"]), method: "cash" });
        return made.data.id;
      };
      const attach = async (key: string) => {
        const reply = await stand.staff.post(`/api/v1/add-ons/${key}/attachments`, { app: "hotel", publicAccess: true });
        expect(reply.status, JSON.stringify(reply.body).slice(0, 800)).toBe(200);
      };
      // Switched back on, the house's browser key may hold the add-on's own public entries again: the owner says so.
      const switchFor = async (key: string, enabled: boolean) => ok(await stand.staff.patch(`/api/v1/add-ons/${key}`, { attachedTo: "hotel", enabled, ...(enabled ? { publicAccess: true } : {}) }));

      // ── installed, not connected ────────────────────────────────────────────

      it("installed and not connected: nothing is shown, and a stay is booked, paid and checked out as it always was", async () => {
        const desk = await deskNow();
        const config = await desk.config();
        expect([config.linen, config.codes, config.giftCards]).toEqual([false, false, false]);
        expect(await desk.linen()).toEqual([]);
        const guest = await stand.guestOf();
        expect((await guest.config()).offers).toBe(false);
        expect(await guest.cardBalance({ code: "GC-7K2M-W3HN-Q4XP" })).toBeNull();
        const asked = body({ first_name: "Ana", last_name: "Pascoe", email: mail("ana") });
        const quote = await guest.quote(asked);
        expect(figures(quote.data)).toEqual(["300.00", "0.00", "300.00", "27.00", "327.00"]);
        expect(quote.applied ?? []).toEqual([]);
        const made = await guest.reserve({ ...asked, expect: { total: "327.00" } }, `ana-${engine}-${"a".repeat(30)}`);
        const stored = await stand.one("stays", made.data.id);
        // Nothing is decided where nobody answers: no reduction is written.
        expect([stored["discount"] ?? null, stored["room_discount"] ?? null, cents(stored["total"])]).toEqual([null, null, "327.00"]);
        const leaving = await readyToLeave(desk, "Bryok");
        expect((await desk.checkOut(leaving))["status"]).toBe("departed");
        expect(await receipts("inventory")).toEqual([]);
        expect(await receipts("offers")).toEqual([]);
      }, 240_000);

      it("installed and not connected: a code or a gift card sent anyway is refused, and writes nothing", async () => {
        const desk = await deskNow();
        const guest = await stand.guestOf();
        const before = (await stand.rows("stays")).length;
        const coded = await refusal(guest.reserve(body({ first_name: "Cai", last_name: "Pascoe", email: mail("cai") }, ["MIDWEEK"]), `cai-${engine}-${"c".repeat(30)}`));
        expect(coded.status >= 400 && coded.status < 500, JSON.stringify([coded.code, coded.params])).toBe(true);
        const atDesk = await refusal(desk.book({ ...body({ first_name: "Cai", last_name: "Pascoe" }, ["MIDWEEK"]), clientKey: `cai-desk-${engine}-${"c".repeat(26)}` }));
        expect(atDesk.status >= 400 && atDesk.status < 500, JSON.stringify([atDesk.code, atDesk.params])).toBe(true);
        expect((await stand.rows("stays")).length).toBe(before);
        expect(await stand.rows("stay_codes")).toEqual([]);
        const card = await cardWith("50.00");
        const stay = (await stand.rows("stays")).find((one) => one["email"] === mail("ana"))!;
        // A gift card's payment sent anyway (no screen offers one): nothing looks the code up, so the row names no card —
        // and a card's payment counts only once its card has answered. No card is debited and the stay owes what it owed.
        const owed = cents((await stand.one("stays", stay.id))["balance"]);
        const sent = await desk.recordCardPayment(stay.id, card.code, "50.00", key()).then((row) => row, (error: unknown) => error as ApiError);
        if (!(sent instanceof ApiError)) expect([sent["card_id"] ?? null, cents(sent["signed"]), sent["card_balance_after"] ?? null]).toEqual([null, "0.00", null]);
        expect(await balanceOf(card.id)).toBe("50.00");
        expect(cents((await stand.one("stays", stay.id))["balance"])).toBe(owed);
        // Money back "to a card" names a payment a card made: there is none, and none can be named.
        const back = await refusal(desk.giveBackToCard(stay.id, 999_999, "5.00", "No such payment", key()));
        expect(back.status >= 400 && back.status < 500).toBe(true);
      }, 240_000);

      it("installed and not connected: the front desk cannot write what an add-on decides — a stay's reduction is nobody's to type", async () => {
        const maeve = await stand.person("hotel-front-desk", mail("maeve"), "Maeve R.");
        const before = (await stand.rows("stays")).length;
        for (const column of ["discount", "room_discount", "customer_proved"]) {
          const made = await maeve.caller.post(stand.data("stays"), { values: { room_type_id: garden.id, arrive: "2026-10-26", depart: "2026-10-28", guests: 2, first_name: "Kit", last_name: "Pascoe", channel: "desk", [column]: column === "customer_proved" ? true : 50 } });
          expect([column, made.status >= 400 && made.status < 500], JSON.stringify(made.body).slice(0, 300)).toEqual([column, true]);
        }
        expect((await stand.rows("stays")).length).toBe(before);
        const old = (await stand.rows("stays")).find((one) => one["email"] === mail("ana"))!;
        for (const column of ["discount", "room_discount"]) {
          const changed = await maeve.caller.patch(`${stand.data("stays")}/${String(old.id)}`, { values: { [column]: 50 } });
          expect([column, changed.status >= 400 && changed.status < 500], JSON.stringify(changed.body).slice(0, 300)).toEqual([column, true]);
        }
        const extra = await maeve.caller.post(stand.data("payments"), { values: { stay_id: old.id, kind: "taken", method: "cash", amount: 5, card_balance_after: 99 } });
        expect(extra.status >= 400 && extra.status < 500).toBe(true);
        const now = await stand.one("stays", old.id);
        expect([now["discount"] ?? null, now["room_discount"] ?? null, cents(now["total"])]).toEqual([null, null, "327.00"]);
      }, 240_000);

      // ── Offers & gift cards connected ───────────────────────────────────────

      let coded = 0;
      it("with Offers & gift cards connected and Inventory not: a code and a gift card work, and no linen shows", async () => {
        await attach("offers");
        const offer = ok(await stand.staff.post<{ data: Row }>(stand.data("offers_offers"), { values: { name: "Midweek", public_name: { "en-US": "Midweek" }, gives: "percent", value: 10, trigger: "code", applies_to: "order", starts_on: "2026-01-01" } }), 201).data;
        ok(await stand.staff.post(stand.data("offers_codes"), { values: { offer_id: offer.id, code: "MIDWEEK", active: true } }), 201);
        ok(await stand.staff.patch(`${stand.data("offers_offers")}/${String(offer.id)}`, { values: { status: "active" } }));
        const desk = await deskNow();
        const config = await desk.config();
        expect([config.linen, config.codes, config.giftCards]).toEqual([false, true, true]);
        expect(await desk.linen()).toEqual([]);
        const guest = await stand.guestOf();
        expect((await guest.config()).offers).toBe(true);
        const asked = body({ first_name: "Demelza", last_name: "Pascoe", email: mail("demelza") }, ["MIDWEEK"]);
        const quote = await guest.quote(asked);
        expect(figures(quote.data)).toEqual(["300.00", "30.00", "270.00", "24.30", "294.30"]);
        const made = await guest.reserve({ ...asked, expect: { total: "294.30" } }, `demelza-${engine}-${"d".repeat(26)}`);
        coded = made.data.id;
        const card = await cardWith("50.00");
        expect(await guest.cardBalance({ code: card.code })).toEqual({ balance: expect.stringMatching(/^50(\.0+)?$/), expiresOn: null });
        const check = await desk.quoteCard(coded, card.code);
        expect([cents(check.amount), cents(check.due), cents(check.balanceAfter)]).toEqual(["50.00", "244.30", "0.00"]);
        await desk.recordCardPayment(coded, card.code, check.amount, key());
        expect(cents((await stand.one("stays", coded))["balance"])).toBe("244.30");
        // A stay from before it was connected is as it was: nothing was taken off it, and it still reads.
        const old = (await stand.rows("stays")).find((one) => one["email"] === mail("ana"))!;
        expect([old["discount"] ?? null, cents(old["total"])]).toEqual([null, "327.00"]);
      }, 300_000);

      it("spends one $100.00 card on two stays at once: one takes it, the other is told it is empty", async () => {
        const desk = await deskNow();
        const card = await cardWith("100.00");
        const stays: number[] = [];
        for (const first of ["Elowen", "Ferris"]) stays.push((await desk.book({ ...body({ first_name: first, last_name: "Pascoe" }, [], ["2026-10-12", "2026-10-14"]), clientKey: `${first}-${engine}-${"e".repeat(28)}` })).data.id);
        const tried = await Promise.all(stays.map((id) => desk.recordCardPayment(id, card.code, "100.00", key()).then(() => "paid", (error: unknown) => `${String((error as ApiError).code)}:${String((error as ApiError).params?.["reason"] ?? "")}`)));
        expect(tried.filter((one) => one === "paid").length, JSON.stringify(tried)).toBe(1);
        // The loser is told the card has nothing left (or, when the two met on the same lock, to try again — and then it is told so).
        const lost = tried.find((one) => one !== "paid")!;
        if (lost !== "POSTING_REFUSED:empty") {
          const again = await refusal(desk.recordCardPayment(stays[tried.indexOf(lost)]!, card.code, "100.00", key()));
          expect([again.code, again.params["reason"]]).toEqual(["POSTING_REFUSED", "empty"]);
        }
        expect(await balanceOf(card.id)).toBe("0.00");
        const paid = await Promise.all(stays.map(async (id) => cents((await stand.one("stays", id))["paid"])));
        expect(paid.sort()).toEqual(["0.00", "100.00"]);
      }, 240_000);

      // ── Inventory connected too ─────────────────────────────────────────────

      it("with Inventory connected too: a check-out is handed to it, and goes through whatever it holds", async () => {
        await attach("inventory");
        const desk = await deskNow();
        expect((await desk.config()).linen).toBe(true);
        // No kit is linked to a room type here (the house has not set its linen up): nothing to count, nothing to show.
        expect(await desk.linen()).toEqual([]);
        const leaving = await readyToLeave(desk, "Gerren");
        // Nothing is linked, so nothing leaves the books; the check-out is the same save it always was.
        expect((await desk.checkOut(leaving))["status"]).toBe("departed");
      }, 300_000);

      // ── attached, and unable to answer ──────────────────────────────────────

      it("with Offers & gift cards switched off for the house: no stay is saved, with no code either, and no card pays; what was recorded still reads", async () => {
        await switchFor("offers", false);
        const desk = await deskNow();
        const config = await desk.config();
        expect([config.codes, config.giftCards]).toEqual([false, false]);
        const guest = await stand.guestOf();
        expect((await guest.config()).offers).toBe(false);
        const before = (await stand.rows("stays")).length;
        const plain = await refusal(guest.reserve(body({ first_name: "Hedra", last_name: "Pascoe", email: mail("hedra") }), `hedra-${engine}-${"h".repeat(28)}`));
        expect(plain.status >= 400 && plain.status < 500, JSON.stringify([plain.code, plain.params])).toBe(true);
        const atDesk = await refusal(desk.book({ ...body({ first_name: "Hedra", last_name: "Pascoe" }), clientKey: `hedra-desk-${engine}-${"h".repeat(24)}` }));
        expect([atDesk.status, atDesk.params["reason"]], JSON.stringify([atDesk.code, atDesk.params])).toEqual([409, "add-on-unavailable"]);
        expect((await stand.rows("stays")).length).toBe(before);
        const card = await cardWith("20.00");
        const owed = cents((await stand.one("stays", coded))["balance"]);
        const sent = await desk.recordCardPayment(coded, card.code, "20.00", key()).then((row) => row, (error: unknown) => error as ApiError);
        if (!(sent instanceof ApiError)) expect([sent["card_id"] ?? null, cents(sent["signed"])]).toEqual([null, "0.00"]);
        expect(await balanceOf(card.id)).toBe("20.00");
        expect(cents((await stand.one("stays", coded))["balance"])).toBe(owed);
        // The stay booked with MIDWEEK keeps its figures, and a cash payment on it still settles.
        const kept = await stand.one("stays", coded);
        expect(figures(kept)).toEqual(["300.00", "30.00", "270.00", "24.30", "294.30"]);
        await desk.recordPayment(coded, { kind: "taken", amount: "44.30", method: "cash" });
        expect(cents((await stand.one("stays", coded))["balance"])).toBe("200.00");
        const folio = await desk.folio(coded);
        expect(folio.payments.filter((payment) => Number(payment["signed"]) > 0).length).toBe(2);
      }, 300_000);

      it("with Inventory switched off for the house: it cannot answer, and a check-out is refused by name until it is on again", async () => {
        // Booked while Offers & gift cards could answer.
        await switchFor("offers", true);
        const desk = await deskNow();
        const leaving = await readyToLeave(desk, "Inira");
        await switchFor("inventory", false);
        expect((await (await deskNow()).config()).linen).toBe(false);
        // Nothing of this house is linked to a stock item, so there is nothing Inventory lets go on without it:
        // the save is refused, saying which kind of thing is in the way, and the guest is still in the house.
        const refused = await refusal(desk.checkOut(leaving));
        expect([refused.status, refused.code, refused.params["reason"]], JSON.stringify(refused.params)).toEqual([409, "POSTING_REFUSED", "add-on-unavailable"]);
        expect((await stand.one("stays", leaving))["status"]).toBe("in_house");
        await switchFor("inventory", true);
        expect((await desk.checkOut(leaving))["status"]).toBe("departed");
      }, 300_000);

      it("switched on again: a code is taken as before, and a guest's own page reads the reduction of the stay made earlier", async () => {
        const guest = await stand.guestOf();
        expect((await guest.config()).offers).toBe(true);
        const quote = await guest.quote(body({ first_name: "Jago", last_name: "Pascoe", email: mail("jago") }, ["MIDWEEK"], ["2026-10-19", "2026-10-21"]));
        expect(figures(quote.data)).toEqual(["300.00", "30.00", "270.00", "24.30", "294.30"]);
        const folio = await (await deskNow()).folio(coded);
        expect((folio.applied ?? []).map((one) => [one.name, cents(one.amount)])).toEqual([["Midweek", "30.00"]]);
      }, 240_000);
    });
  });
});
