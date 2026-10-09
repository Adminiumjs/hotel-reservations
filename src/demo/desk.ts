/**
 * The desk's door into the demo's Adminium: the data API as a signed-in
 * person — Maeve at the front desk, Owen the manager, or housekeeping — each
 * held to their role's grants and limits, as Adminium holds them.
 *
 * DEMO BUILD ONLY — nothing in a real build imports it.
 */
import type { DeskHouse, DeskPerson, DeskPort, Folio, StayWithLines } from "../data/ports.ts";
import { ApiError, type CardCheck, type CodeFound, type LinenReply, type LinenRow, isApiError, type Id, type LiveFrame, type NightCount, type QuoteReply, type Row, type StayBody, type StayReply } from "../data/wire.ts";
import { addDays } from "../lib/venueTime.ts";
import { byPosition, Engine, notFound, refusedValue, type Writer } from "./engine.ts";

/** The people the demo's desk can be. */
export const PEOPLE: Record<"desk" | "manager" | "housekeeping", DeskPerson> = {
  desk: { name: "Maeve R.", roles: ["front-desk"] },
  manager: { name: "Owen Tremayne", roles: ["manager"] },
  housekeeping: { name: "Housekeeping", roles: ["housekeeping"] },
};

const MONEY = /^\d+(\.\d{1,2})?$/;

export class DemoDesk implements DeskPort {
  /** A fault the demo card arms for the next booking: the type goes while the desk saves. */
  fault: "type-gone" | null = null;
  person: DeskPerson = PEOPLE.desk;
  readonly engine: Engine;
  constructor(engine: Engine) {
    this.engine = engine;
  }

  private get world() {
    return this.engine.world;
  }
  private get writer(): Writer {
    return { origin: "staff", name: this.person.name, roles: this.person.roles };
  }
  private reads(table: string): boolean {
    return !this.person.roles.includes("housekeeping") || ["rooms", "room_types", "room_closures", "settings"].includes(table);
  }
  private readable(table: string): void {
    if (!this.reads(table)) throw new ApiError(403, "FORBIDDEN", "Not for your role.", { table, action: "read" });
  }

  async me(): Promise<DeskPerson> {
    return this.person;
  }

  async config() {
    // The demo's house has Invoices & Receipts: its folio prints and emails (the demo sends nothing).
    // …and counts its linen, takes a code and a gift card: the demo's own stand-ins (`offers.ts`), never an add-on.
    return { timezone: this.world.zone, currency: this.world.currency, now: new Date(this.engine.now).toISOString(), folio: true, linen: true, codes: true, giftCards: true };
  }

  async lookUpCode(code: string): Promise<CodeFound | null> {
    const card = this.engine.addOns.balance(code);
    return card === null ? null : { kind: "gift-card", last4: code.replace(/[^A-Za-z0-9]/g, "").slice(-4).toUpperCase(), record: { status: "active", balance: card.balance, expires_on: null } };
  }
  async quoteCard(stayId: Id, code: string): Promise<CardCheck> {
    const stay = this.world.get("stays", stayId);
    if (stay === undefined) throw notFound("staff");
    return this.engine.addOns.check(stay, code);
  }
  async recordCardPayment(stayId: Id, code: string, amount: string): Promise<Row> {
    return this.engine.write(() => {
      this.engine.judgeCreate("payments", this.writer);
      const stay = this.world.get("stays", stayId);
      if (stay === undefined) throw notFound("staff");
      const took = this.engine.addOns.spend(stay, code, amount);
      const row = this.world.insert("payments", { stay_id: stayId, kind: "taken", amount: took.amount, method: "gift_card", reference: null, note: null, voided: false, void_reason: null, voided_at: null, voided_by: null, card_last4: took.last4, card_balance_after: took.balanceAfter, asked: took.amount });
      Object.assign(row, this.engine.stampsFor("payments", null, row, this.writer));
      this.engine.addOns.spent(row.id, code, took.amount);
      return { ...row };
    });
  }
  async giveBackToCard(stayId: Id, paymentId: Id, amount: string, note: string): Promise<Row> {
    return this.engine.write(() => {
      this.engine.judgeCreate("payments", this.writer);
      if (empty(note)) throw refusedValue("note", "required", "staff");
      this.engine.addOns.giveBack(paymentId, amount);
      const row = this.world.insert("payments", { stay_id: stayId, kind: "given_back", amount: Number(amount), method: "gift_card", reference: null, note: note.trim(), voided: false, void_reason: null, voided_at: null, voided_by: null, against_id: paymentId });
      Object.assign(row, this.engine.stampsFor("payments", null, row, this.writer));
      return { ...row };
    });
  }
  async linen(): Promise<LinenRow[]> {
    return this.engine.addOns.linen();
  }
  async putBackLinen(rows: { itemId: Id; qty: number }[]): Promise<LinenReply> {
    const over = this.engine.addOns.putBack(rows);
    return { done: true, transferId: 1, moved: rows.filter((row) => row.qty > 0).map((row) => row.itemId), left: [], over };
  }

  async house(): Promise<DeskHouse> {
    const all = (table: "room_types" | "room_type_features" | "rooms" | "extras" | "house_notes" | "room_closures" | "rate_rules" | "charge_items") =>
      this.reads(table) ? this.world.all(table).map((row) => ({ ...row })).sort(byPosition) : [];
    return {
      settings: { ...this.world.settings() },
      types: all("room_types"),
      features: all("room_type_features"),
      rooms: all("rooms").sort((a, b) => String(a["number"]).localeCompare(String(b["number"]))),
      extras: all("extras"),
      notes: all("house_notes"),
      closures: all("room_closures"),
      rates: all("rate_rules"),
      items: all("charge_items"),
    };
  }

  private lines(stay: Row): StayWithLines {
    const of = (table: "stay_extras" | "charges" | "stay_credits" | "payments") => this.world.where(table, (row) => row["stay_id"] === stay.id).map((row) => ({ ...row }));
    const applied = this.engine.addOns.applied(this.world, stay.id);
    return { stay: { ...stay }, extras: of("stay_extras"), charges: of("charges"), credits: of("stay_credits"), payments: of("payments"), ...(applied === undefined ? {} : { applied }) };
  }

  async stays(): Promise<StayWithLines[]> {
    this.readable("stays");
    return this.world.all("stays").map((stay) => this.lines(stay));
  }

  async folio(id: Id): Promise<Folio> {
    this.readable("stays");
    const stay = this.world.get("stays", id);
    if (stay === undefined) throw notFound("staff");
    return { ...this.lines(stay), nights: this.engine.nights(stay) };
  }

  async guestByEmail(email: string) {
    this.readable("customers");
    const address = email.trim().toLowerCase();
    const customer = this.world.all("customers").find((c) => c["email"] === address);
    if (customer === undefined) return null;
    return { customer: { ...customer }, stays: this.world.where("stays", (s) => s["customer_id"] === customer.id).length };
  }

  async counts(from: string, days: number): Promise<NightCount[]> {
    this.readable("stays");
    return this.engine.counts(from, days);
  }

  // ── bookings and edits ─────────────────────────────────────────────────────

  private bookingValues(values: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = { ...values, channel: "desk" };
    for (const column of ["room_type_id", "room_id", "guests", "customer_id"]) if (out[column] !== undefined && out[column] !== null) out[column] = Number(out[column]);
    if (typeof out["email"] === "string") out["email"] = out["email"].trim().toLowerCase() || null;
    if (empty(out["first_name"])) throw refusedValue("first_name", "required", "staff");
    return out;
  }

  async quote(body: StayBody): Promise<QuoteReply> {
    const values = this.bookingValues({ first_name: "—", ...body.values });
    const extras = body.children.stay_extras.map((c) => Number(c.values["extra_id"]));
    const codes = (body.children.stay_codes ?? []).map((c) => c.values.typed);
    this.engine.addOns.judge(codes, "staff");
    return this.engine.dry(() => {
      this.engine.judgeCreate("stays", this.writer);
      const { stay, lines } = this.engine.createStay(values, extras, this.writer);
      const applied = this.engine.addOns.price(this.world, stay.id, codes);
      return () => ({
        applied,
        told: [],
        data: { ...this.world.get("stays", stay.id)! },
        nights: this.engine.nights(stay),
        children: { stay_extras: lines.map((line) => ({ data: { ...this.world.get("stay_extras", line.id)! } })) },
        capacity: [],
        exact: true,
      });
    });
  }

  async book(body: StayBody): Promise<StayReply> {
    if (this.fault === "type-gone") {
      this.fault = null;
      throw new ApiError(409, "CAPACITY_FULL", "That room type is full on those nights.", { column: "room_type_id" });
    }
    const values = this.bookingValues(body.values);
    const extras = body.children.stay_extras.map((c) => Number(c.values["extra_id"]));
    const codes = (body.children.stay_codes ?? []).map((c) => c.values.typed);
    this.engine.addOns.judge(codes, "staff");
    const made = this.engine.write(() => {
      this.engine.judgeCreate("stays", this.writer);
      const result = this.engine.createStay(values, extras, this.writer);
      this.engine.addOns.price(this.world, result.stay.id, codes);
      this.world.settle();
      const expected = body.expect?.total;
      if (expected !== undefined && Math.round(Number(expected) * 100) !== Math.round(Number(result.stay["total"]) * 100)) {
        throw new ApiError(409, "PRICE_CHANGED", "The price has changed.", { total: Number(result.stay["total"]).toFixed(2) });
      }
      return result;
    });
    this.engine.addOns.keep(made.stay.id, codes);
    return { data: { ...this.world.get("stays", made.stay.id)! }, children: { stay_extras: made.lines.map((l) => ({ data: { ...l } })) } };
  }

  async quoteEdit(id: Id, values: Record<string, unknown>, extras: { extraId: Id; on: boolean }[] = []): Promise<QuoteReply> {
    return this.engine.dry(() => {
      const row = Object.keys(values).length > 0 ? this.engine.updateStay(id, values, this.writer) : this.world.get("stays", id);
      if (row === undefined) throw notFound("staff");
      for (const { extraId, on } of extras) {
        const line = this.world.where("stay_extras", (l) => l["stay_id"] === id && l["extra_id"] === extraId)[0];
        if (on) {
          if (line !== undefined && line["state"] === "off") this.world.update("stay_extras", line.id, { state: "on" });
          else if (line === undefined) this.engine.addLine(this.world.get("stays", id)!, extraId, this.writer);
        } else if (line !== undefined && line["state"] !== "off") this.world.update("stay_extras", line.id, { state: "off" });
      }
      this.engine.addOns.price(this.world, id);
      return () => ({
        data: { ...this.world.get("stays", id)! },
        nights: this.engine.nights(this.world.get("stays", id)!),
        children: { stay_extras: this.world.where("stay_extras", (l) => l["stay_id"] === id).map((l) => ({ data: { ...l } })) },
        capacity: [],
        exact: true,
      });
    });
  }

  async edit(id: Id, values: Record<string, unknown>, expectTotal?: string, extras: { extraId: Id; on: boolean }[] = []): Promise<Row> {
    return this.engine.write(() => {
      const row = Object.keys(values).length > 0 ? this.engine.updateStay(id, values, this.writer) : this.world.get("stays", id);
      if (row === undefined) throw notFound("staff");
      // The extras ticked on or off, in the same write.
      for (const { extraId, on } of extras) {
        const line = this.world.where("stay_extras", (l) => l["stay_id"] === id && l["extra_id"] === extraId)[0];
        if (on) {
          if (line !== undefined && line["state"] === "off") this.world.update("stay_extras", line.id, { state: "on" });
          else if (line === undefined) this.engine.addLine(this.world.get("stays", id)!, extraId, this.writer);
        } else if (line !== undefined && line["state"] !== "off") this.world.update("stay_extras", line.id, { state: "off" });
      }
      if (extras.length > 0) this.engine.judgeExtras(id, "staff");
      this.engine.addOns.price(this.world, id);
      this.world.settle();
      if (expectTotal !== undefined && Math.round(Number(expectTotal) * 100) !== Math.round(Number(row["total"]) * 100)) {
        throw new ApiError(409, "PRICE_CHANGED", "The price has changed.", { total: Number(row["total"]).toFixed(2) });
      }
      return { ...row };
    });
  }

  async setExtra(stayId: Id, extraId: Id, on: boolean): Promise<Row> {
    return this.engine.write(() => {
      const stay = this.world.get("stays", stayId);
      if (stay === undefined) throw notFound("staff");
      const line = this.world.where("stay_extras", (l) => l["stay_id"] === stayId && l["extra_id"] === extraId)[0];
      if (on) {
        const row = line !== undefined && line["state"] === "off" ? this.world.update("stay_extras", line.id, { state: "on" }) : this.engine.addLine(stay, extraId, this.writer);
        this.engine.judgeExtras(stayId, "staff");
        return { ...row };
      }
      if (line === undefined || line["state"] === "off") throw new ApiError(409, "STATE_UNCHANGED", "It is off already.");
      this.engine.judgeChildState(stay, "stay_extras");
      return { ...this.world.update("stay_extras", line.id, { state: "off" }) };
    });
  }

  // ── the stay's moves ───────────────────────────────────────────────────────

  private move(id: Id, values: Record<string, unknown>, from?: string): Row {
    return this.engine.write(() => ({ ...this.engine.updateStay(id, values, this.writer, from === undefined ? {} : { from }) }));
  }

  async checkIn(id: Id, roomId: Id): Promise<Row> {
    return this.move(id, { room_id: roomId, status: "in_house" }, "booked");
  }

  async checkOut(id: Id): Promise<Row> {
    const left = this.move(id, { status: "departed" }, "in_house");
    // The room's linen goes to the laundry, as the demo's own count has it.
    this.engine.addOns.turnover();
    return left;
  }

  async takeOffNights(id: Id, from: string): Promise<Row> {
    return this.engine.write(() => {
      const stay = this.world.get("stays", id);
      if (stay === undefined) throw notFound("staff");
      this.engine.judgeCreate("stay_credits", this.writer);
      this.engine.judgeChildState(stay, "stay_credits");
      if (from <= String(stay["arrive"]) || from >= String(stay["depart"])) throw refusedValue("from_date", "out-of-range", "staff");
      const row = this.world.insert("stay_credits", { stay_id: id, reason: "left_early", from_date: from, to_date: stay["depart"], voided: false });
      Object.assign(row, this.engine.stampsFor("stay_credits", null, row, this.writer));
      return row;
    });
  }

  async quoteTakeOff(id: Id, from: string): Promise<{ total: number; refused: boolean; data: Record<string, unknown>; credit: number; stale?: boolean }> {
    try {
      return this.engine.dry(() => {
        const stay = this.world.get("stays", id);
        if (stay === undefined) throw notFound("staff");
        const credit = this.world.insert("stay_credits", { stay_id: id, reason: "left_early", from_date: from, to_date: stay["depart"], voided: false });
        return () => {
          const after = this.world.get("stays", id)!;
          return { total: Number(after["total"]), refused: false, data: { ...after }, credit: Number(this.world.get("stay_credits", credit.id)!["amount"]) };
        };
      });
    } catch (error) {
      if (isApiError(error) && error.code === "BALANCE_EXCEEDED") {
        const now = this.world.get("stays", id)!;
        return { total: Number(now["total"]), refused: true, data: { ...now }, credit: 0 };
      }
      throw error;
    }
  }

  async cancel(id: Id, code: "guest_asked" | "house"): Promise<Row> {
    return this.move(id, { status: "cancelled", cancel_code: code }, "booked");
  }

  async noShow(id: Id): Promise<Row> {
    return this.move(id, { status: "no_show" }, "booked");
  }

  async cameAfterAll(id: Id, to: { roomId: Id; chargeMissed: boolean } | null): Promise<Row> {
    if (to === null) return this.move(id, { status: "booked" }, "no_show");
    return this.engine.write(() => {
      const stay = this.world.get("stays", id);
      if (stay === undefined) throw notFound("staff");
      const today = this.engine.today();
      if (!to.chargeMissed && String(stay["arrive"]) < today) {
        this.engine.judgeCreate("stay_credits", this.writer);
        this.world.insert("stay_credits", {
          stay_id: id,
          reason: "missed",
          from_date: stay["arrive"],
          to_date: today,
          voided: false,
          ...this.engine.stampsFor("stay_credits", null, { stay_id: id }, this.writer),
        });
      }
      return { ...this.engine.updateStay(id, { room_id: to.roomId, status: "in_house" }, this.writer, { from: "no_show" }) };
    });
  }

  async expectBy(id: Id, day: string | null): Promise<Row> {
    return this.move(id, { expect_by: day });
  }

  async giveRoom(id: Id, roomId: Id | null): Promise<Row> {
    return this.move(id, { room_id: roomId });
  }

  async moveRoom(id: Id, roomId: Id): Promise<Row> {
    return this.move(id, { room_id: roomId });
  }

  // ── the folio's money ──────────────────────────────────────────────────────

  async addCharge(stayId: Id, charge: { itemId: Id; note?: string | null } | { label: string; amount: string; note: string }): Promise<Row> {
    return this.engine.write(() => {
      this.engine.judgeCreate("charges", this.writer);
      const stay = this.world.get("stays", stayId);
      if (stay === undefined) throw notFound("staff");
      this.engine.judgeChildState(stay, "charges");
      let values: Record<string, unknown>;
      if ("itemId" in charge) {
        if (this.world.get("charge_items", charge.itemId) === undefined) throw refusedValue("charge_item_id", "invalid", "staff");
        values = { charge_item_id: charge.itemId, note: empty(charge.note) ? null : charge.note!.trim() };
      } else {
        if (!MONEY.test(charge.amount.trim())) throw refusedValue("amount", "invalid", "staff");
        if (empty(charge.note)) throw refusedValue("note", "required", "staff");
        values = { charge_item_id: null, label: charge.label.trim() || "Something else", amount: Number(charge.amount), note: charge.note.trim() };
      }
      const row = this.world.insert("charges", { stay_id: stayId, voided: false, void_reason: null, voided_at: null, voided_by: null, ...values });
      Object.assign(row, this.engine.stampsFor("charges", null, row, this.writer));
      return row;
    });
  }

  async recordPayment(stayId: Id, payment: { kind: "taken" | "given_back"; amount: string; method: "card" | "cash" | "transfer"; reference?: string | null; note?: string | null }): Promise<Row> {
    return this.engine.write(() => {
      this.engine.judgeCreate("payments", this.writer);
      const stay = this.world.get("stays", stayId);
      if (stay === undefined) throw notFound("staff");
      if (!MONEY.test(payment.amount.trim()) || Number(payment.amount) <= 0) throw refusedValue("amount", "invalid", "staff");
      if (payment.kind === "given_back" && empty(payment.note)) throw refusedValue("note", "required", "staff");
      const row = this.world.insert("payments", {
        stay_id: stayId,
        kind: payment.kind,
        amount: Number(payment.amount),
        method: payment.method,
        reference: empty(payment.reference) ? null : payment.reference,
        note: empty(payment.note) ? null : payment.note,
        voided: false,
        void_reason: null,
        voided_at: null,
        voided_by: null,
      });
      Object.assign(row, this.engine.stampsFor("payments", null, row, this.writer));
      return { ...row };
    });
  }

  async printFolio(_id: Id): Promise<{ url: string | null }> {
    return { url: null };
  }

  async emailFolio(id: Id, soFar: boolean): Promise<Row> {
    const at = new Date(this.engine.now).toISOString();
    return this.move(id, soFar ? { folio_so_far_at: at } : { folio_sent_at: at });
  }

  async voidRow(table: "charges" | "payments" | "stay_credits", id: Id, reason: string): Promise<Row> {
    return this.engine.write(() => {
      const row = this.world.get(table, id);
      if (row === undefined) throw notFound("staff");
      this.engine.judgeLimits(table, { voided: true, void_reason: reason }, this.writer);
      if (table !== "payments") this.engine.judgeChildState(this.world.get("stays", row["stay_id"] as Id)!, table, "change");
      if (row["voided"] === true) throw new ApiError(409, "STATE_UNCHANGED", "It is voided already.", { at: row["voided_at"] });
      if (empty(reason)) throw refusedValue("void_reason", "required", "staff");
      const before = { ...row };
      const updated = this.world.update(table, id, { voided: true, void_reason: reason.trim() });
      Object.assign(updated, this.engine.stampsFor(table, before, updated, this.writer));
      if (table === "payments" && before["method"] === "gift_card" && before["kind"] === "taken") this.engine.addOns.voided(id);
      return { ...updated };
    });
  }

  async quoteVoid(table: "charges" | "payments" | "stay_credits", id: Id): Promise<{ refused: boolean; paid: number; total: number }> {
    const row = this.world.get(table, id);
    if (row === undefined) throw notFound("staff");
    const stayOf = () => this.world.get("stays", row["stay_id"] as Id)!;
    try {
      return this.engine.dry(() => {
        this.world.update(table, id, { voided: true });
        return () => ({ refused: false, paid: Number(stayOf()["paid"]), total: Number(stayOf()["total"]) });
      });
    } catch (error) {
      if (isApiError(error) && error.code === "BALANCE_EXCEEDED") return { refused: true, paid: Number(stayOf()["paid"]), total: Number(stayOf()["total"]) };
      throw error;
    }
  }

  // ── rooms ──────────────────────────────────────────────────────────────────

  async setRoom(id: Id, values: { status?: "ready" | "cleaning" | "occupied"; note?: string | null }): Promise<Row> {
    return this.engine.write(() => {
      this.engine.judgeLimits("rooms", values, this.writer);
      let room = this.world.get("rooms", id);
      if (room === undefined) throw notFound("staff");
      if (values.status !== undefined) room = this.engine.moveRoomState(id, "status", values.status, this.writer);
      if (values.note !== undefined) room = this.world.update("rooms", id, { note: values.note });
      return { ...room };
    });
  }

  async closeRoom(values: { room_id: Id; from_date: string; to_date: string | null; reason: string | null }): Promise<Row> {
    return this.engine.write(() => {
      this.engine.judgeCreate("room_closures", this.writer);
      if (values.to_date !== null && values.to_date < values.from_date) throw refusedValue("to_date", "out-of-range", "staff");
      const row = this.world.insert("room_closures", { ...values, active: true });
      Object.assign(row, this.engine.stampsFor("room_closures", null, row, this.writer));
      return { ...row };
    });
  }

  async endClosure(id: Id): Promise<Row> {
    return this.engine.write(() => {
      this.engine.judgeLimits("room_closures", { active: false }, this.writer);
      const closure = this.world.get("room_closures", id);
      if (closure === undefined) throw notFound("staff");
      const row = this.world.update("room_closures", id, { active: false, to_date: addDays(this.engine.today(), -1) < String(closure["from_date"]) ? closure["from_date"] : addDays(this.engine.today(), -1) });
      // Back from repair, a room is cleaned before anyone sleeps in it.
      const room = this.world.get("rooms", closure["room_id"] as Id);
      if (room !== undefined && room["status"] === "ready") this.world.update("rooms", room.id, { status: "cleaning" });
      return { ...row };
    });
  }

  subscribe(listener: (frame: LiveFrame) => void, onState?: (state: "live" | "reconnecting") => void): () => void {
    onState?.("live");
    return this.world.on(listener);
  }
}

const empty = (value: unknown) => value === null || value === undefined || (typeof value === "string" && value.trim() === "");
