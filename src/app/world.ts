/**
 * The house as the screens read it, made from the rows Adminium answers.
 *
 * The rows come through the ports (`../data/ports.ts`) — the real APIs, or the
 * demo's stand-in — and are turned here into the shapes the screens' logic
 * reads: a room type with its colours and features, a room with what is out of
 * service, a stay with its extras, charges, credits and payments. Every figure
 * of money on a stay is Adminium's own (`room_total`, `tax`, `total`, `paid`,
 * `balance`); nothing here prices anything.
 */
import type { DeskHouse, House, StayWithLines } from "../data/ports.ts";
import { yes, type Applied, type Id, type Row } from "../data/wire.ts";
import { venueDay, venueMinutes } from "../lib/venueTime.ts";
import { tr } from "../i18n/tr.ts";
import { fsi } from "./fmt.ts";

/** The house's own words, as it wrote them: one run in their own direction wherever the page reads right to left. */
const own = (v: unknown): string => (v === null || v === undefined || v === "" ? "" : fsi(String(v)));

export type StateKey = "booked" | "in" | "out" | "cancelled" | "noshow";

export interface TypeV {
  id: string;
  code: string;
  name: string;
  sleeps: number;
  base: number;
  flat: string;
  tint: string;
  icon: string;
  line: string;
  long: string;
  has: string[];
}
export interface ClosureV {
  id: Id;
  from: string;
  to: string | null;
  reason: string | null;
}
export interface RoomV {
  id: Id;
  n: string;
  floor: number;
  type: string;
  status: "ready" | "occupied" | "cleaning";
  note: string | null;
  sleeps: number;
  closures: ClosureV[];
}
export interface ExtraV {
  id: string;
  code: string;
  label: string;
  short: string;
  how: string;
  icon: string;
  amount: number;
  per: "person_night" | "night" | "stay";
  spaces: number | null;
}
export interface ItemV {
  id: string;
  label: string;
  detail: string;
  amount: number;
  icon: string;
  extra: string | null;
}
export interface LineV {
  id: Id;
  extra: string;
  on: boolean;
  label: string;
  per: string;
  each: number;
  nights: number;
  guests: number;
  amount: number;
}
export interface ChargeV {
  id: Id;
  date: string;
  label: string;
  note: string;
  amount: number;
  by: string;
  voided: boolean;
  voidReason: string;
}
export interface CreditV {
  id: Id;
  from: string;
  to: string;
  nights: number;
  amount: number;
  reason: "left_early" | "missed";
  voided: boolean;
  voidReason: string;
  date: string;
}
export interface PayV {
  id: Id;
  kind: "taken" | "given_back";
  date: string;
  method: string;
  amount: number;
  by: string;
  voided: boolean;
  voidReason: string;
  refNo: string;
  note: string;
  /** A gift card's payment: the last four of its code. Empty for any other. */
  last4: string;
  /** Money given back to a card: the card payment it went back to. */
  against: Id | null;
}
export interface Moment {
  date: string;
  time: string;
}
export interface StV {
  id: Id;
  ref: string;
  first: string;
  last: string;
  name: string;
  email: string;
  mobile: string;
  type: string;
  room: string | null;
  roomId: Id | null;
  given: boolean;
  arrive: string;
  depart: string;
  guests: number;
  nightsN: number;
  arrivalTime: string;
  note: string;
  language: string | null;
  state: StateKey;
  late: boolean;
  cancelCode: string | null;
  expectBy: string | null;
  channel: string;
  created: Moment | null;
  checkedIn: Moment | null;
  checkedOut: Moment | null;
  cancelled: Moment | null;
  noShow: Moment | null;
  cancelBy: number | null;
  customerId: Id | null;
  extras: string[];
  lines: LineV[];
  charges: ChargeV[];
  credits: CreditV[];
  pays: PayV[];
  m: { room: number; extras: number; charges: number; credits: number; discount: number; sub: number; tax: number; total: number; paid: number; balance: number; taxRate: number; taxLabel: string };
  /** What codes and vouchers took off, by name, as Adminium answered it; empty when nothing was, or it does not say. */
  applied: Applied[];
}

/** The house's settings, as the screens read them. */
export interface HouseV {
  name: string;
  address: string;
  town: string;
  phone: string;
  tel: string;
  email: string;
  since: number | null;
  about: string;
  finding: string;
  morning: string;
  train: string;
  car: string;
  foot: string;
  breakfastHours: string;
  lateArrival: string;
  arriveFrom: string;
  leaveBy: string;
  lateUntil: string;
  noShowAt: string;
  cancelDays: number;
  maxNights: number;
  taxRate: number;
  taxLabel: string;
  emailsOn: boolean;
}

export interface WorldV {
  H: HouseV;
  types: TypeV[];
  typeById: Record<string, TypeV>;
  rooms: RoomV[];
  extras: ExtraV[];
  items: ItemV[];
  notes: { icon: string; text: string }[];
  stays: StV[];
}

const str = (v: unknown): string => (v === null || v === undefined ? "" : String(v));
const n = (v: unknown): number => Number(v ?? 0);
const ymd = (v: unknown): string => str(v).slice(0, 10);

/** The design's darker end of a type's colour: the flat colour at a little over half its light. */
function tintOf(flat: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(flat);
  if (m === null) return flat;
  const x = parseInt(m[1]!, 16);
  const dark = [(x >> 16) & 255, (x >> 8) & 255, x & 255].map((c) => Math.round(c * 0.53).toString(16).padStart(2, "0")).join("");
  return `radial-gradient(110% 85% at 18% 8%, rgba(255,255,255,.22), rgba(255,255,255,0) 62%), linear-gradient(135deg,${flat},#${dark})`;
}

export function houseOf(settings: Row): HouseV {
  const phone = str(settings["phone"]);
  return {
    name: str(settings["name"]),
    address: str(settings["address"]),
    town: str(settings["town"]),
    phone,
    tel: `tel:${phone.replace(/[^0-9+]/g, "")}`,
    email: str(settings["email"]),
    since: settings["since"] === null || settings["since"] === undefined ? null : n(settings["since"]),
    about: own(settings["about"]),
    finding: own(settings["finding"]),
    morning: own(settings["morning"]),
    train: own(settings["directions_train"]),
    car: own(settings["directions_car"]),
    foot: own(settings["directions_foot"]),
    breakfastHours: str(settings["breakfast_hours"]),
    lateArrival: own(settings["late_arrival_note"]),
    arriveFrom: str(settings["arrive_from"]) || "15:00",
    leaveBy: str(settings["leave_by"]) || "11:00",
    lateUntil: str(settings["late_until"]) || "14:00",
    noShowAt: str(settings["no_show_at"]) || "11:00",
    cancelDays: n(settings["cancel_days"] ?? 2),
    maxNights: n(settings["max_nights"] ?? 14),
    taxRate: n(settings["tax_rate"]),
    taxLabel: str(settings["tax_label"]),
    emailsOn: settings["guest_emails_on"] !== false,
  };
}

const STATE: Record<string, StateKey> = { booked: "booked", in_house: "in", departed: "out", cancelled: "cancelled", no_show: "noshow" };

/** An instant as the house's date and wall time. */
function momentOf(v: unknown, zone: string): Moment | null {
  if (v === null || v === undefined || v === "") return null;
  const minutes = venueMinutes(String(v), zone);
  return { date: venueDay(String(v), zone), time: `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}` };
}

export function worldOf(house: House | DeskHouse, stays: StayWithLines[], zone: string): WorldV {
  const types = house.types.map((t): TypeV => {
    const flat = str(t["color"]) || "#6b6b76";
    return {
      id: String(t.id),
      code: str(t["code"]),
      name: str(t["name"]),
      sleeps: n(t["sleeps"]),
      base: n(t["base_rate"]),
      flat,
      tint: tintOf(flat),
      icon: str(t["icon"]) || "bed-double",
      line: own(t["blurb"]),
      long: own(t["description"]),
      has: house.features.filter((f) => f["room_type_id"] === t.id).sort((a, b) => n(a["position"]) - n(b["position"])).map((f) => own(f["feature"])),
    };
  });
  const closures = "closures" in house ? house.closures : [];
  const rooms = house.rooms.map((r): RoomV => ({
    id: r.id,
    n: str(r["number"]),
    floor: n(r["floor"]),
    type: String(r["room_type_id"]),
    status: (str(r["status"]) || "ready") as RoomV["status"],
    note: r["note"] === null || r["note"] === undefined || r["note"] === "" ? null : str(r["note"]),
    sleeps: n(r["sleeps"] ?? 0),
    closures: closures
      .filter((c) => c["room_id"] === r.id && c["active"] !== false)
      .map((c) => ({ id: c.id, from: ymd(c["from_date"]), to: c["to_date"] === null || c["to_date"] === undefined ? null : ymd(c["to_date"]), reason: c["reason"] === null ? null : str(c["reason"]) })),
  }));
  const extras = house.extras.map((e): ExtraV => ({
    id: String(e.id),
    code: str(e["code"]),
    label: str(e["label"]),
    short: str(e["short"]) || str(e["label"]),
    how: own(e["how"]),
    icon: str(e["icon"]) || "sparkles",
    amount: n(e["amount"]),
    per: (str(e["per"]) || "night") as ExtraV["per"],
    spaces: e["spaces"] === null || e["spaces"] === undefined ? null : n(e["spaces"]),
  }));
  const items = ("items" in house ? house.items : [])
    .filter((i) => i["active"] !== false)
    .map((i): ItemV => ({ id: String(i.id), label: str(i["label"]), detail: str(i["detail"]), amount: n(i["amount"]), icon: str(i["icon"]) || "tag", extra: i["extra_id"] === null || i["extra_id"] === undefined ? null : String(i["extra_id"]) }));
  const roomNumber = (id: unknown) => rooms.find((r) => r.id === id)?.n ?? null;
  const staysV = stays.map((w): StV => {
    const s = w.stay;
    const state = STATE[str(s["status"])] ?? "booked";
    const lines = w.extras.map((l): LineV => ({
      id: l.id,
      extra: String(l["extra_id"]),
      on: l["state"] !== "off",
      label: str(l["label"]),
      per: str(l["per"]),
      each: n(l["each"]),
      nights: n(l["nights"]),
      guests: n(l["guests"]),
      amount: n(l["amount"]),
    }));
    const first = str(s["first_name"]);
    const last = str(s["last_name"]);
    return {
      id: s.id,
      ref: str(s["ref"]),
      first,
      last,
      name: str(s["guest_name"]) || `${first} ${last}`.trim(),
      email: str(s["email"]),
      mobile: str(s["mobile"]),
      type: String(s["room_type_id"]),
      room: roomNumber(s["room_id"]),
      roomId: s["room_id"] === null || s["room_id"] === undefined ? null : (s["room_id"] as Id),
      given: state === "booked" && s["room_id"] !== null && s["room_id"] !== undefined,
      arrive: ymd(s["arrive"]),
      depart: ymd(s["depart"]),
      guests: n(s["guests"]),
      nightsN: n(s["nights"]),
      arrivalTime: str(s["arrival_time"]),
      note: str(s["note"]),
      language: s["language"] === null || s["language"] === undefined ? null : str(s["language"]),
      state,
      // A cancellation by the house is never late (the house moved, not the guest).
      late: yes(s["late_cancel"]) && s["cancel_code"] !== "house",
      cancelCode: s["cancel_code"] === null || s["cancel_code"] === undefined ? null : str(s["cancel_code"]),
      expectBy: s["expect_by"] === null || s["expect_by"] === undefined ? null : ymd(s["expect_by"]),
      channel: str(s["channel"]) || "online",
      created: momentOf(s["created_at"], zone),
      checkedIn: momentOf(s["checked_in_at"], zone),
      checkedOut: momentOf(s["checked_out_at"], zone),
      cancelled: momentOf(s["cancelled_at"], zone),
      noShow: momentOf(s["no_show_marked_at"], zone),
      cancelBy: s["cancel_by"] === null || s["cancel_by"] === undefined ? null : Date.parse(str(s["cancel_by"])),
      customerId: s["customer_id"] === null || s["customer_id"] === undefined ? null : (s["customer_id"] as Id),
      extras: lines.filter((l) => l.on).map((l) => l.extra),
      lines,
      charges: w.charges.map((c) => ({
        id: c.id,
        date: ymd(c["charged_on"]),
        label: str(c["label"]),
        note: str(c["note"]),
        amount: n(c["amount"]),
        by: str(c["recorded_by"]),
        voided: yes(c["voided"]),
        voidReason: str(c["void_reason"]),
      })),
      credits: w.credits.map((c) => ({
        id: c.id,
        from: ymd(c["from_date"]),
        to: ymd(c["to_date"]),
        nights: n(c["nights"]),
        amount: n(c["amount"]),
        reason: (str(c["reason"]) || "left_early") as CreditV["reason"],
        voided: yes(c["voided"]),
        voidReason: str(c["void_reason"]),
        date: momentOf(c["created_at"], zone)?.date ?? ymd(c["from_date"]),
      })),
      pays: w.payments.map((p) => ({
        id: p.id,
        kind: (str(p["kind"]) || "taken") as PayV["kind"],
        date: ymd(p["paid_on"]),
        method: str(p["method"]),
        amount: n(p["amount"]),
        by: str(p["recorded_by"]),
        voided: yes(p["voided"]),
        voidReason: str(p["void_reason"]),
        refNo: str(p["reference"]),
        note: str(p["note"]),
        last4: str(p["card_last4"]),
        against: p["against_id"] === null || p["against_id"] === undefined ? null : Number(p["against_id"]),
      })),
      applied: w.applied ?? [],
      m: {
        room: n(s["room_total"]),
        extras: n(s["extras_total"]),
        charges: n(s["charges_total"]),
        credits: n(s["credits_total"]),
        discount: n(s["discount"]),
        sub: n(s["subtotal"]),
        tax: n(s["tax"]),
        total: n(s["total"]),
        paid: n(s["paid"]),
        balance: n(s["balance"]),
        taxRate: n(s["tax_rate"]),
        taxLabel: str(s["tax_label"]),
      },
    };
  });
  const byId: Record<string, TypeV> = Object.fromEntries(types.map((t) => [t.id, t]));
  // A stay of a type the house no longer offers (a guest reads only offered types) is still drawn: as a plain room.
  for (const st of staysV) if (byId[st.type] === undefined) byId[st.type] = { id: st.type, code: "", name: tr("Room"), sleeps: st.guests, base: 0, flat: "#6b6b76", tint: tintOf("#6b6b76"), icon: "bed-double", line: "", long: "", has: [] };
  return {
    H: houseOf(house.settings),
    types,
    typeById: byId,
    rooms,
    extras,
    items,
    notes: house.notes.map((x) => ({ icon: str(x["icon"]) || "info", text: own(x["text"]) })),
    stays: staysV,
  };
}
