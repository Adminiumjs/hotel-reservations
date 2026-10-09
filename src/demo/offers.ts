/**
 * The demo's own stand-ins for what the two add-ons do — nothing here speaks
 * to an add-on, and none of it is an add-on's sample. A visitor trying the
 * demo sees the code field, the gift card and the linen work with the demo's
 * own figures:
 *
 *   - one code, MIDWEEK: 10 % off the room and the extras, before the tax;
 *   - two gift cards: one holding $150.00, one holding $1,200.00;
 *   - the linen: 236 bath towels, 236 hand towels and 128 sheet sets in the
 *     Linen store; 24, 24 and 12 at the laundry.
 *
 * The rest of the house — prices, tax, what is owing — is the demo engine's,
 * from the manifest's own rules.
 */
import { ApiError, type Applied, type CardCheck, type Id, type LinenRow, type Row } from "../data/wire.ts";
import type { World } from "./world.ts";

export const DEMO_CODE = "MIDWEEK";
const DEMO_CODE_NAME = "Midweek";
const PERCENT = 10;

const cents = (value: unknown) => Math.round(Number(value ?? 0) * 100);
const plain = (code: string) => code.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

export class DemoAddOns {
  /** The codes each stay was booked with. */
  private readonly codes = new Map<Id, string[]>();
  /** The demo's gift cards, by their code without its dashes. */
  readonly cards = new Map<string, { balance: number }>([
    [plain("GC-7K2M-W3HN-Q4XP"), { balance: 15_000 }],
    [plain("GC-9D4T-K8RV-M2LX"), { balance: 120_000 }],
  ]);
  /** What each card payment took, for money given back to it. */
  private readonly spends = new Map<Id, { card: string; left: number; voided: boolean }>();
  /** What each give-back row put back on a card, so that voiding it takes it off again. */
  private readonly backs = new Map<Id, { payment: Id; amount: number }>();
  /** Saves answered once, by the retry key they came with. */
  readonly saved = new Map<string, Row>();
  private linenRows: LinenRow[] = [
    { itemId: 1, name: "Bath towel", storeId: 1, store: "Linen store", awayId: 2, away: "At the laundry", inStore: 236, atLaundry: 24 },
    { itemId: 2, name: "Hand towel", storeId: 1, store: "Linen store", awayId: 2, away: "At the laundry", inStore: 236, atLaundry: 24 },
    { itemId: 3, name: "Sheet set, double", storeId: 1, store: "Linen store", awayId: 2, away: "At the laundry", inStore: 128, atLaundry: 12 },
  ];

  // ── a code on a stay ──────────────────────────────────────────────────────

  /** The codes a body carries, judged: the demo knows one. A guest is told only "not valid"; the desk the same, plainly. */
  judge(codes: string[], origin: "public" | "staff"): void {
    for (const code of codes) {
      if (plain(code) === DEMO_CODE) continue;
      throw origin === "public"
        ? new ApiError(400, "PUBLIC_WRITE_REFUSED", "That code is not valid.", { column: "typed", reason: "unknown" })
        : new ApiError(409, "ADJUST_REFUSED", "That code is not valid.", { reason: "unknown" });
    }
  }

  /** What the stay's codes take off, written to the stay and its extras as Adminium would; the caller settles after. */
  price(world: World, stayId: Id, codes?: string[]): Applied[] {
    const held = (codes ?? this.codes.get(stayId) ?? []).filter((code) => plain(code) === DEMO_CODE).slice(0, 1);
    const stay = world.get("stays", stayId);
    if (stay === undefined || held.length === 0) return [];
    // The room and the extras as they stand, each brought down by the same tenth.
    world.settle();
    const room = Math.round((cents(stay["room_total"]) * PERCENT) / 100);
    let total = room;
    for (const line of world.where("stay_extras", (row) => row["stay_id"] === stayId)) {
      const off = line["state"] === "off" ? 0 : Math.round((cents(line["amount"]) * PERCENT) / 100);
      world.update("stay_extras", line.id, { discount: off / 100 });
      total += off;
    }
    world.update("stays", stayId, { room_discount: room / 100, discount: total / 100 });
    return [{ line: null, name: DEMO_CODE_NAME, kind: "code", amount: (total / 100).toFixed(2), typed: true }];
  }

  /** A stay saved with its codes: kept, so a change of its dates is priced under them again. */
  keep(stayId: Id, codes: string[]): void {
    const held = codes.filter((code) => plain(code) === DEMO_CODE).slice(0, 1);
    if (held.length > 0) this.codes.set(stayId, held);
  }

  /** What was taken off a stay, as its folio and its own page name it. */
  applied(world: World, stayId: Id): Applied[] | undefined {
    const stay = world.get("stays", stayId);
    if (stay === undefined || (this.codes.get(stayId) ?? []).length === 0 || !(Number(stay["discount"] ?? 0) > 0)) return undefined;
    return [{ line: null, name: DEMO_CODE_NAME, kind: "code", amount: Number(stay["discount"]).toFixed(2), typed: true }];
  }

  // ── a gift card ───────────────────────────────────────────────────────────

  private card(code: string): { balance: number } {
    const card = this.cards.get(plain(code));
    if (card === undefined) throw new ApiError(422, "VALIDATION_FAILED", "Some values were refused.", { fields: { card_code: { code: "unknown" } } });
    return card;
  }

  check(stay: Row, code: string): CardCheck {
    const card = this.card(code);
    const due = Math.max(0, cents(stay["balance"]));
    if (due <= 0) throw new ApiError(409, "POSTING_REFUSED", "Nothing is owing.", { ledger: "value", reason: "not-allowed" });
    if (card.balance <= 0) throw new ApiError(409, "POSTING_REFUSED", "The card is empty.", { ledger: "value", reason: "empty", left: "0.00" });
    const amount = Math.min(card.balance, due);
    return { amount: (amount / 100).toFixed(2), due: ((due - amount) / 100).toFixed(2), balanceAfter: ((card.balance - amount) / 100).toFixed(2) };
  }

  /** The card gives exactly what was asked, or nothing. */
  spend(stay: Row, code: string, asked: string): { amount: number; last4: string; balanceAfter: number } {
    const card = this.card(code);
    const ask = cents(asked);
    const due = Math.max(0, cents(stay["balance"]));
    // As the add-on answers: nothing owing, an empty card, more asked than is owing, more asked than the card holds.
    if (due <= 0) throw new ApiError(409, "POSTING_REFUSED", "Nothing is owing.", { ledger: "value", reason: "not-allowed" });
    if (card.balance <= 0) throw new ApiError(409, "POSTING_REFUSED", "The card is empty.", { ledger: "value", reason: "empty", left: "0.00" });
    if (ask <= 0 || ask > due) throw new ApiError(409, "POSTING_REFUSED", "More than is owing.", { ledger: "value", reason: "not-allowed" });
    if (card.balance < ask) throw new ApiError(409, "POSTING_REFUSED", "The card is empty.", { ledger: "value", reason: "empty", left: (card.balance / 100).toFixed(2) });
    card.balance -= ask;
    return { amount: ask / 100, last4: plain(code).slice(-4), balanceAfter: card.balance / 100 };
  }
  spent(paymentId: Id, code: string, amount: number): void {
    this.spends.set(paymentId, { card: plain(code), left: cents(amount), voided: false });
  }

  /** Money back to the card a payment came from, up to what that payment can still return. */
  giveBack(paymentId: Id, amount: string): void {
    const spend = this.spends.get(paymentId);
    const back = cents(amount);
    if (spend === undefined || back > spend.left) throw new ApiError(409, "POSTING_REFUSED", "More than this payment took.", { ledger: "value", reason: "refund-over", left: ((spend?.left ?? 0) / 100).toFixed(2) });
    spend.left -= back;
    this.cards.get(spend.card)!.balance += back;
  }
  /** The give-back row a `giveBack` was saved as. */
  gaveBack(rowId: Id, paymentId: Id, amount: number): void {
    this.backs.set(rowId, { payment: paymentId, amount: cents(amount) });
  }
  /** A voided card payment returns what it still holds. */
  voided(paymentId: Id): void {
    const spend = this.spends.get(paymentId);
    if (spend === undefined || spend.voided) return;
    this.cards.get(spend.card)!.balance += spend.left;
    spend.left = 0;
    spend.voided = true;
  }
  /**
   * A voided give-back: the card returns what it was given, and the payment can give it back again. Once the payment
   * itself is voided the card already holds all of it, and nothing more moves — in either order the card ends whole.
   */
  voidedBack(rowId: Id): void {
    const back = this.backs.get(rowId);
    const spend = back === undefined ? undefined : this.spends.get(back.payment);
    if (back === undefined || spend === undefined) return;
    this.backs.delete(rowId);
    if (spend.voided) return;
    this.cards.get(spend.card)!.balance -= back.amount;
    spend.left += back.amount;
  }

  balance(code: string): { balance: string; expiresOn: string | null } | null {
    const card = this.cards.get(plain(code).replace(/^GC/, "GC"));
    return card === undefined ? null : { balance: (card.balance / 100).toFixed(2), expiresOn: null };
  }

  // ── linen ─────────────────────────────────────────────────────────────────

  linen(): LinenRow[] {
    return this.linenRows.map((row) => ({ ...row }));
  }

  /** A stay checked out: two bath towels, two hand towels and one sheet set go to the laundry. */
  turnover(): void {
    const each: Record<number, number> = { 1: 2, 2: 2, 3: 1 };
    this.linenRows = this.linenRows.map((row) => ({ ...row, inStore: row.inStore - (each[row.itemId] ?? 0), atLaundry: row.atLaundry + (each[row.itemId] ?? 0) }));
  }

  putBack(rows: { itemId: Id; qty: number }[]): { itemId: Id; by: number }[] {
    const over: { itemId: Id; by: number }[] = [];
    this.linenRows = this.linenRows.map((row) => {
      const qty = rows.find((one) => one.itemId === row.itemId)?.qty ?? 0;
      if (qty > row.atLaundry) over.push({ itemId: row.itemId, by: qty - row.atLaundry });
      return { ...row, inStore: row.inStore + qty, atLaundry: Math.max(0, row.atLaundry - qty) };
    });
    return over;
  }
}
