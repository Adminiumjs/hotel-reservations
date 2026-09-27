/**
 * The guest site's door into the demo's Adminium: the public API as the
 * house's browser keys answer it — the `customer` key's entries (the house,
 * what is open, reserving, signing in, the signed-in guest's own stays) and the
 * `link` key's (the one stay its own link opens).
 *
 * Each entry reads only its `select`, through its filters, and writes only its
 * writable columns; the refusals are the public API's own codes. The sign-in
 * email is the demo's: its code is 482913 and its link opens at once.
 *
 * DEMO BUILD ONLY — nothing in a real build imports it.
 */
import type { GuestPort, House, NightQuestion, StayWithLines } from "../data/ports.ts";
import { ApiError, type ClaimReply, type ExtraAvailability, type Id, type QuoteReply, type Row, type StayBody, type StayReply, type NightAnswer } from "../data/wire.ts";
import { byPosition, Engine, notFound, randomCode, refusedValue, type Writer } from "./engine.ts";
import { MANIFEST_RULES } from "./rules.ts";

type Entry = (typeof MANIFEST_RULES.publicAccess)[number] & Record<string, unknown>;
const ENTRIES = MANIFEST_RULES.publicAccess as readonly Entry[];
const GUEST: Writer = { origin: "public", name: null, roles: [] };

/** The code and link of the demo's sign-in email. */
export const DEMO_SIGN_IN = { code: "482913", token: "demo-sign-in-link" };

/** The customer key's entry for a table and method (and the `link` key's with `key`). */
function entry(table: string, method: "GET" | "POST" | "PATCH", key?: string, writes?: string): Entry {
  const found = ENTRIES.find(
    (e) =>
      e.table === table &&
      (e.methods as readonly string[]).includes(method) &&
      (e as { key?: string }).key === key &&
      (writes === undefined || ((e["writable"] as readonly string[] | undefined) ?? []).includes(writes)),
  );
  if (found === undefined) throw new Error(`no ${method} entry on ${table}${key === undefined ? "" : ` (${key})`}`);
  return found;
}

/** A row as an entry lets it out: its selected columns, and its key. */
function project(row: Row, select: readonly string[] | undefined): Row {
  if (select === undefined) return { ...row };
  const out: Record<string, unknown> = { id: row.id };
  for (const column of select) out[column] = row[column] ?? null;
  return out as Row;
}

const selectOf = (e: Entry) => e["select"] as readonly string[] | undefined;
const passes = (row: Row, e: Entry) => ((e["filters"] as readonly Record<string, unknown>[] | undefined) ?? []).every((f) => f["op"] !== "eq" || row[String(f["column"])] === f["value"]);

const LINK = /(https?:\/\/|www\.|<a\s)/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[0-9+()\-.\s]{6,32}$/;

/** A pause before an answer, so a page's "Checking…" is seen as it would be. */
export interface Latency {
  read: number;
  quote: number;
  write: number;
}
export const NO_LATENCY: Latency = { read: 0, quote: 0, write: 0 };
export const DEMO_LATENCY: Latency = { read: 120, quote: 450, write: 850 };

/** A fault the demo card arms for the next reserving (the network drops, the room goes, the price moves). */
export type GuestFault = "offline" | "room-gone" | "price-moved" | null;

export class DemoGuest implements GuestPort {
  private linkSession: { stayId: Id } | null = null;
  private signIn: { customerId: Id; at: number } | null = null;
  private challenge: { email: string; tries: number; lockedUntil: number } | null = null;
  private readonly keys = new Map<string, Id>();
  fault: GuestFault = null;
  /** The demo card's "the house does not answer" on a search: the next availability read fails. */
  readsDown = false;

  readonly engine: Engine;
  readonly latency: Latency;
  constructor(engine: Engine, latency: Latency = NO_LATENCY) {
    this.engine = engine;
    this.latency = latency;
  }

  private get world() {
    return this.engine.world;
  }
  private wait(ms: number): Promise<void> {
    return ms <= 0 ? Promise.resolve() : new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ── reads ───────────────────────────────────────────────────────────────────

  async config() {
    await this.wait(this.latency.read);
    return { timezone: this.world.zone, currency: this.world.currency, now: new Date(this.engine.now).toISOString() };
  }

  async house(): Promise<House> {
    await this.wait(this.latency.read);
    const list = (table: "room_types" | "room_type_features" | "rooms" | "extras" | "house_notes") => {
      const e = entry(table, "GET");
      return this.world
        .where(table, (row) => passes(row, e))
        .sort(byPosition)
        .map((row) => project(row, selectOf(e)));
    };
    return {
      settings: project(this.world.settings(), selectOf(entry("settings", "GET"))),
      types: list("room_types"),
      features: list("room_type_features"),
      rooms: list("rooms").sort((a, b) => String(a["number"]).localeCompare(String(b["number"]))),
      extras: list("extras"),
      notes: list("house_notes"),
    };
  }

  async availability(q: NightQuestion): Promise<NightAnswer> {
    await this.wait(this.latency.read);
    if (this.readsDown) {
      this.readsDown = false;
      throw new ApiError(0, "PUBLIC_NETWORK_UNAVAILABLE", "The house did not answer.");
    }
    const exclude = q.exclude !== undefined && this.ownStay(q.exclude, false) !== undefined ? q.exclude : undefined;
    return this.engine.availability({ ...q, ...(exclude === undefined ? {} : { exclude }) });
  }

  async extrasOpen(from: string, to: string): Promise<ExtraAvailability[]> {
    await this.wait(this.latency.read);
    return this.engine.extrasOpen(from, to);
  }

  // ── reserving ────────────────────────────────────────────────────────────────

  /** The stay's own values as the entry lets a guest write them, judged. */
  private values(body: StayBody): Record<string, unknown> {
    const e = entry("stays", "POST");
    const writable = e["writable"] as readonly string[];
    const out: Record<string, unknown> = {};
    for (const [column, value] of Object.entries(body.values)) {
      if (!writable.includes(column)) continue;
      out[column] = typeof value === "string" ? value.trim() : value;
    }
    for (const column of e["requires"] as readonly string[]) if (out[column] === undefined || out[column] === "") throw refusedValue(column, "required");
    const anonymous = e["anonymous"] as { plainText: readonly string[] };
    for (const column of anonymous.plainText) if (typeof out[column] === "string" && LINK.test(out[column])) throw refusedValue(column, "plain-text");
    if (typeof out["email"] === "string") {
      if (!EMAIL.test(out["email"])) throw refusedValue("email", "invalid");
      out["email"] = out["email"].toLowerCase();
    }
    if (typeof out["mobile"] === "string" && out["mobile"] !== "" && !PHONE.test(out["mobile"])) throw refusedValue("mobile", "invalid");
    if (out["mobile"] === "") out["mobile"] = null;
    if (out["note"] === "") out["note"] = null;
    for (const column of ["room_type_id", "guests"]) if (out[column] !== undefined) out[column] = Number(out[column]);
    return out;
  }

  private extrasOf(body: StayBody): Id[] {
    const ids = body.children.stay_extras.map((child) => Number(child.values["extra_id"]));
    if (new Set(ids).size !== ids.length) throw new ApiError(400, "PUBLIC_WRITE_REFUSED", "Each extra once.", { child: "stay_extras", reason: "duplicate" });
    return ids;
  }

  async quote(body: StayBody): Promise<QuoteReply> {
    await this.wait(this.latency.quote);
    const values = this.values({ ...body, values: { first_name: "—", last_name: "—", email: "guest@example.com", ...body.values } });
    const extras = this.extrasOf(body);
    return this.engine.dry(() => {
      const { stay, lines } = this.engine.createStay(values, extras, GUEST);
      return () => ({
        data: project(this.world.get("stays", stay.id)!, selectOf(entry("stays", "POST"))),
        nights: this.engine.nights(stay),
        children: { stay_extras: lines.map((line) => ({ data: { ...this.world.get("stay_extras", line.id)! } })) },
        capacity: [],
        exact: true,
      });
    });
  }

  async reserve(body: StayBody, clientKey: string): Promise<StayReply> {
    await this.wait(this.latency.write);
    const fault = this.fault;
    this.fault = null;
    if (fault === "offline") throw new ApiError(0, "PUBLIC_NETWORK_UNAVAILABLE", "The house did not answer.");
    const known = this.keys.get(clientKey);
    if (known !== undefined) {
      const stay = this.world.get("stays", known)!;
      return { data: project(stay, selectOf(entry("stays", "POST"))), replayed: true };
    }
    if (fault === "room-gone") throw new ApiError(409, "PUBLIC_NO_ROOM", "That has just gone for those nights.", { column: "room_type_id" });
    const values = this.values(body);
    const extras = this.extrasOf(body);
    if (fault === "price-moved") {
      // Another hand moved the rate between the price shown and the save: $5 a night on this type.
      const type = this.world.get("room_types", Number(values["room_type_id"]));
      if (type !== undefined) this.world.update("room_types", type.id, { base_rate: Number(type["base_rate"]) + 5 });
    }
    const made = this.engine.write(() => {
      const customer = this.identify(String(values["email"]), String(values["first_name"] ?? ""), String(values["last_name"] ?? ""));
      const { stay, lines } = this.engine.createStay({ ...values, customer_id: customer.id }, extras, GUEST);
      this.world.settle();
      const expected = body.expect?.total;
      if (expected !== undefined && Math.round(Number(expected) * 100) !== Math.round(Number(stay["total"]) * 100)) {
        // Written nowhere: the guest is asked again at the price now.
        throw new ApiError(409, "PUBLIC_PRICE_CHANGED", "The price has changed.", { total: Number(stay["total"]).toFixed(2), lines: [] });
      }
      return { stay, lines };
    });
    const stay = this.world.get("stays", made.stay.id)!;
    this.keys.set(clientKey, stay.id);
    this.linkSession = { stayId: stay.id };
    return {
      data: project(stay, selectOf(entry("stays", "POST"))),
      children: { stay_extras: made.lines.map((line) => ({ data: { ...this.world.get("stay_extras", line.id)! } })) },
      link: { key: "link", token: String(stay["link_token"]) },
    };
  }

  /** The guest known by their email: found, or made from what they typed. */
  private identify(email: string, first: string, last: string): Row {
    const known = this.world.all("customers").find((c) => c["email"] === email);
    if (known !== undefined) {
      if (empty(known["first_name"])) this.world.update("customers", known.id, { first_name: first, last_name: last });
      return known;
    }
    return this.world.insert("customers", { email, first_name: first, last_name: last, forgotten_at: null, created_at: new Date(this.engine.now).toISOString() });
  }

  // ── the stay's own link ─────────────────────────────────────────────────────

  async openLink(token: string): Promise<ClaimReply> {
    await this.wait(this.latency.read);
    const stay = this.world.all("stays").find((s) => s["link_token"] === token && s["link_stopped"] !== true);
    if (stay === undefined) throw new ApiError(410, "LINK_EXPIRED", "This link does not open anything now.");
    this.linkSession = { stayId: stay.id };
    return { session: `link-${String(stay.id)}`, expiresAt: this.engine.now + 30 * 86_400_000, firstName: String(stay["first_name"]) };
  }

  async linkedStay(): Promise<StayWithLines> {
    await this.wait(this.latency.read);
    const stay = this.linkSession === null ? undefined : this.world.get("stays", this.linkSession.stayId);
    if (stay === undefined || stay["link_stopped"] === true) throw new ApiError(401, "PUBLIC_SESSION_ENDED", "Open the link again.");
    return this.withLines(stay, "link");
  }

  private withLines(stay: Row, key?: string): StayWithLines {
    const e = entry("stays", "GET", key);
    const child = (table: "stay_extras" | "charges" | "stay_credits" | "payments") => {
      const ce = entry(table, "GET", key);
      return this.world.where(table, (row) => row["stay_id"] === stay.id).map((row) => project(row, selectOf(ce)));
    };
    return { stay: project(stay, selectOf(e)), extras: child("stay_extras"), charges: child("charges"), credits: child("stay_credits"), payments: child("payments") };
  }

  // ── signing in ──────────────────────────────────────────────────────────────

  async requestSignIn(email: string): Promise<{ sentTo: string }> {
    await this.wait(this.latency.write);
    const address = email.trim().toLowerCase();
    if (!EMAIL.test(address)) throw refusedValue("email", "invalid");
    const locked = this.challenge?.email === address && this.challenge.lockedUntil > this.engine.now;
    if (!locked) this.challenge = { email: address, tries: 0, lockedUntil: 0 };
    return { sentTo: address };
  }

  async verifyLink(token: string): Promise<ClaimReply> {
    await this.wait(this.latency.write);
    if (token !== DEMO_SIGN_IN.token || this.challenge === null) throw new ApiError(410, "LINK_EXPIRED", "This link has been used or has run out.");
    return this.open(this.challenge.email);
  }

  async verifyCode(email: string, code: string): Promise<ClaimReply> {
    await this.wait(this.latency.write);
    const address = email.trim().toLowerCase();
    if (this.challenge === null || this.challenge.email !== address) throw new ApiError(410, "PUBLIC_CODE_EXPIRED", "Ask for a new code.");
    if (this.challenge.lockedUntil > this.engine.now) throw new ApiError(403, "PUBLIC_CLAIM_LOCKED", "Too many tries.");
    if (code.replace(/\s/g, "") !== DEMO_SIGN_IN.code) {
      this.challenge.tries += 1;
      if (this.challenge.tries >= 5) {
        this.challenge.lockedUntil = this.engine.now + 86_400_000;
        throw new ApiError(403, "PUBLIC_CLAIM_LOCKED", "Too many tries.");
      }
      throw new ApiError(403, "PUBLIC_CODE_WRONG", "That code is not right.", { triesLeft: 5 - this.challenge.tries });
    }
    return this.open(address);
  }

  private open(email: string): ClaimReply {
    const customer = this.world.all("customers").find((c) => c["email"] === email) ?? this.world.insert("customers", { email, first_name: null, last_name: null, forgotten_at: null, created_at: new Date(this.engine.now).toISOString() });
    this.signIn = { customerId: customer.id, at: this.engine.now };
    this.challenge = null;
    return { session: `guest-${String(customer.id)}`, expiresAt: this.engine.now + 30 * 86_400_000, ...(empty(customer["first_name"]) ? {} : { firstName: String(customer["first_name"]) }) };
  }

  async signedIn() {
    await this.wait(this.latency.read);
    const customer = this.signIn === null ? undefined : this.world.get("customers", this.signIn.customerId);
    if (customer === undefined || empty(customer["email"])) return null;
    const name = [customer["first_name"], customer["last_name"]].filter((part) => !empty(part)).join(" ");
    return { email: String(customer["email"]), name: name === "" ? null : name, at: new Date(this.signIn!.at).toISOString() };
  }

  async myStays(): Promise<StayWithLines[]> {
    await this.wait(this.latency.read);
    const customer = this.signedCustomer();
    return this.world
      .where("stays", (s) => s["customer_id"] === customer.id)
      .sort((a, b) => String(a["arrive"]).localeCompare(String(b["arrive"])))
      .map((stay) => this.withLines(stay));
  }

  private signedCustomer(): Row {
    const customer = this.signIn === null ? undefined : this.world.get("customers", this.signIn.customerId);
    if (customer === undefined || empty(customer["email"])) throw new ApiError(401, "PUBLIC_SESSION_ENDED", "Sign in again.");
    return customer;
  }

  /** One of the guest's own stays: through the link that opened it, or as the signed-in guest. */
  private ownStay(id: Id, orThrow = true): Row | undefined {
    const stay = this.world.get("stays", id);
    const mine =
      stay !== undefined &&
      ((this.linkSession?.stayId === id && stay["link_stopped"] !== true) || (this.signIn !== null && stay["customer_id"] === this.signIn.customerId && !empty(this.world.get("customers", this.signIn.customerId)?.["email"])));
    if (!mine) {
      if (orThrow) throw notFound("public");
      return undefined;
    }
    return stay;
  }

  /** The arrival afternoon on the house's clock: the guest's own changes stop then. */
  private arrivalAfternoon(stay: Row): number {
    return this.engine.at(String(stay["arrive"]), String(this.engine.setting("arrive_from")));
  }

  // ── the guest's changes ─────────────────────────────────────────────────────

  async changeStay(id: Id, values: { arrival_time?: string; status?: "cancelled" }): Promise<Row> {
    await this.wait(this.latency.write);
    const stay = this.ownStay(id)!;
    const e = entry("stays", "PATCH", this.linkSession?.stayId === id && stay["customer_id"] !== this.signIn?.customerId ? "link" : undefined, "status");
    const allowed = e["writableValues"] as Record<string, readonly unknown[]>;
    for (const [column, value] of Object.entries(values)) {
      if (!(e["writable"] as readonly string[]).includes(column)) throw refusedValue(column, "not-writable");
      if (allowed[column] !== undefined && !allowed[column]!.includes(value)) throw refusedValue(column, "not-allowed");
    }
    if (stay["status"] !== "booked") throw notFound("public");
    const until = this.arrivalAfternoon(stay);
    if (this.engine.now >= until) throw new ApiError(409, "PUBLIC_TOO_LATE", "Changes are made at the desk now.", { at: new Date(until).toISOString() });
    const write = values.status === "cancelled" ? { ...values, ...(e["defaults"] as Record<string, unknown>) } : values;
    const row = this.engine.write(() => this.engine.updateStay(id, write, GUEST));
    return project(row, selectOf(e));
  }

  async addExtra(stayId: Id, extraId: Id): Promise<Row> {
    await this.wait(this.latency.write);
    const stay = this.ownStay(stayId)!;
    const until = this.arrivalAfternoon(stay);
    if (this.engine.now >= until) throw new ApiError(409, "PUBLIC_TOO_LATE", "Changes are made at the desk now.", { at: new Date(until).toISOString() });
    const line = this.engine.write(() => {
      const added = this.engine.addLine(stay, extraId, GUEST);
      this.engine.judgeExtras(stayId, "public");
      return added;
    });
    return project(this.world.get("stay_extras", line.id)!, selectOf(entry("stay_extras", "GET")));
  }

  async setExtra(lineId: Id, state: "on" | "off"): Promise<Row> {
    await this.wait(this.latency.write);
    const line = this.world.get("stay_extras", lineId);
    if (line === undefined) throw notFound("public");
    const stay = this.ownStay(Number(line["stay_id"]))!;
    const until = this.arrivalAfternoon(stay);
    if (this.engine.now >= until) throw new ApiError(409, "PUBLIC_TOO_LATE", "Changes are made at the desk now.", { at: new Date(until).toISOString() });
    if (line["state"] === state) throw new ApiError(400, "PUBLIC_WRITE_REFUSED", "It is that already.", { reason: "unchanged" });
    const row = this.engine.write(() => {
      this.engine.judgeChildState(stay, "stay_extras");
      const updated = this.world.update("stay_extras", lineId, { state });
      if (state === "on") this.engine.judgeExtras(stay.id, "public");
      return updated;
    });
    return project(row, selectOf(entry("stay_extras", "GET")));
  }

  /** A date change: a signed-in guest's own stay, while it may still be cancelled at no charge. */
  private judgeDateChange(id: Id): Row {
    const customer = this.signedCustomer();
    const stay = this.world.get("stays", id);
    if (stay === undefined || stay["customer_id"] !== customer.id || stay["status"] !== "booked") throw notFound("public");
    const cancelBy = Date.parse(String(stay["cancel_by"]));
    if (!Number.isNaN(cancelBy) && this.engine.now >= cancelBy) throw new ApiError(409, "PUBLIC_TOO_LATE", "Ring us to move the dates now.", { at: new Date(cancelBy).toISOString() });
    return stay;
  }

  async quoteDates(id: Id, arrive: string, depart: string): Promise<QuoteReply> {
    await this.wait(this.latency.quote);
    this.judgeDateChange(id);
    return this.engine.dry(() => {
      const row = this.engine.updateStay(id, { arrive, depart }, GUEST);
      return () => ({
        data: project(this.world.get("stays", row.id)!, selectOf(entry("stays", "PATCH", undefined, "arrive"))),
        nights: this.engine.nights(row),
        children: { stay_extras: this.world.where("stay_extras", (l) => l["stay_id"] === id).map((l) => ({ data: { ...l } })) },
        capacity: [],
        exact: true,
      });
    });
  }

  async moveDates(id: Id, arrive: string, depart: string, expectTotal: string): Promise<Row> {
    await this.wait(this.latency.write);
    this.judgeDateChange(id);
    const row = this.engine.write(() => {
      const updated = this.engine.updateStay(id, { arrive, depart }, GUEST);
      this.world.settle();
      if (Math.round(Number(updated["total"]) * 100) !== Math.round(Number(expectTotal) * 100)) {
        throw new ApiError(409, "PUBLIC_PRICE_CHANGED", "The price has changed.", { total: Number(updated["total"]).toFixed(2) });
      }
      return updated;
    });
    return project(row, selectOf(entry("stays", "PATCH", undefined, "arrive")));
  }

  async newLink(id: Id): Promise<{ sentTo: string }> {
    await this.wait(this.latency.write);
    const customer = this.signedCustomer();
    const stay = this.world.get("stays", id);
    if (stay === undefined || stay["customer_id"] !== customer.id) throw notFound("public");
    this.engine.write(() => this.world.update("stays", id, { link_token: randomCode(16) }));
    if (this.linkSession?.stayId === id) this.linkSession = null;
    return { sentTo: String(customer["email"]) };
  }

  async signOut(): Promise<void> {
    await this.wait(this.latency.write);
    this.signIn = null;
    this.linkSession = null;
  }

  async signOutEverywhere(): Promise<void> {
    await this.wait(this.latency.write);
    this.signIn = null;
  }

  async forget(): Promise<void> {
    await this.wait(this.latency.write);
    const customer = this.signedCustomer();
    if (this.engine.now - this.signIn!.at > 10 * 60_000) throw new ApiError(403, "PUBLIC_CODE_STEP_UP", "Sign in again to do that.");
    this.engine.write(() => {
      this.world.update("customers", customer.id, { email: null, first_name: null, last_name: null, forgotten_at: new Date(this.engine.now).toISOString() });
      // The stays' own links stop too, so a forwarded confirmation opens nothing.
      for (const stay of this.world.where("stays", (s) => s["customer_id"] === customer.id)) this.world.update("stays", stay.id, { link_token: randomCode(16) });
    });
    this.signIn = null;
    this.linkSession = null;
  }
}

const empty = (value: unknown) => value === null || value === undefined || (typeof value === "string" && value.trim() === "");
