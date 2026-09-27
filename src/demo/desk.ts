/**
 * The desk's door into the demo's Adminium: the data API as a signed-in
 * person — Maeve at the front desk, Owen the manager, or housekeeping — each
 * held to their role's grants and limits, as Adminium holds them.
 *
 * DEMO BUILD ONLY — nothing in a real build imports it.
 */
import type { DeskHouse, DeskPerson, DeskPort, Folio, StayWithLines } from "../data/ports.ts";
import { ApiError, type Id, type LiveFrame, type NightCount, type QuoteReply, type Row, type StayBody, type StayReply } from "../data/wire.ts";
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
    return { timezone: this.world.zone, currency: this.world.currency, now: new Date(this.engine.now).toISOString() };
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
    return { stay: { ...stay }, extras: of("stay_extras"), charges: of("charges"), credits: of("stay_credits"), payments: of("payments") };
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
    return this.engine.dry(() => {
      this.engine.judgeCreate("stays", this.writer);
      const { stay, lines } = this.engine.createStay(values, extras, this.writer);
      return () => ({
        data: { ...this.world.get("stays", stay.id)! },
        nights: this.engine.nights(stay),
        children: { stay_extras: lines.map((line) => ({ data: { ...this.world.get("stay_extras", line.id)! } })) },
        capacity: [],
        exact: true,
      });
    });
  }

  async book(body: StayBody): Promise<StayReply> {
    const values = this.bookingValues(body.values);
    const extras = body.children.stay_extras.map((c) => Number(c.values["extra_id"]));
    const made = this.engine.write(() => {
      this.engine.judgeCreate("stays", this.writer);
      const result = this.engine.createStay(values, extras, this.writer);
      this.world.settle();
      const expected = body.expect?.total;
      if (expected !== undefined && Math.round(Number(expected) * 100) !== Math.round(Number(result.stay["total"]) * 100)) {
        throw new ApiError(409, "PRICE_CHANGED", "The price has changed.", { total: Number(result.stay["total"]).toFixed(2) });
      }
      return result;
    });
    return { data: { ...this.world.get("stays", made.stay.id)! }, children: { stay_extras: made.lines.map((l) => ({ data: { ...l } })) } };
  }

  async quoteEdit(id: Id, values: Record<string, unknown>): Promise<QuoteReply> {
    return this.engine.dry(() => {
      const row = this.engine.updateStay(id, values, this.writer);
      return () => ({ data: { ...this.world.get("stays", row.id)! }, nights: this.engine.nights(row), capacity: [], exact: true });
    });
  }

  async edit(id: Id, values: Record<string, unknown>, expectTotal?: string): Promise<Row> {
    return this.engine.write(() => {
      const row = this.engine.updateStay(id, values, this.writer);
      this.world.settle();
      if (expectTotal !== undefined && Math.round(Number(expectTotal) * 100) !== Math.round(Number(row["total"]) * 100)) {
        throw new ApiError(409, "PRICE_CHANGED", "The price has changed.", { total: Number(row["total"]).toFixed(2) });
      }
      return { ...row };
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
    return this.move(id, { status: "departed" }, "in_house");
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

  async addCharge(stayId: Id, charge: { itemId: Id } | { label: string; amount: string; note: string }): Promise<Row> {
    return this.engine.write(() => {
      this.engine.judgeCreate("charges", this.writer);
      const stay = this.world.get("stays", stayId);
      if (stay === undefined) throw notFound("staff");
      this.engine.judgeChildState(stay, "charges");
      let values: Record<string, unknown>;
      if ("itemId" in charge) {
        if (this.world.get("charge_items", charge.itemId) === undefined) throw refusedValue("charge_item_id", "invalid", "staff");
        values = { charge_item_id: charge.itemId, note: null };
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

  async voidRow(table: "charges" | "payments" | "stay_credits", id: Id, reason: string): Promise<Row> {
    return this.engine.write(() => {
      const row = this.world.get(table, id);
      if (row === undefined) throw notFound("staff");
      this.engine.judgeLimits(table, { voided: true, void_reason: reason }, this.writer);
      if (row["voided"] === true) throw new ApiError(409, "STATE_UNCHANGED", "It is voided already.", { at: row["voided_at"] });
      if (empty(reason)) throw refusedValue("void_reason", "required", "staff");
      const before = { ...row };
      const updated = this.world.update(table, id, { voided: true, void_reason: reason.trim() });
      Object.assign(updated, this.engine.stampsFor(table, before, updated, this.writer));
      return { ...updated };
    });
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
