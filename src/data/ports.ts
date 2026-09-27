/**
 * The two doors the screens go through — one per side of the app, each the
 * calls that side makes and nothing else.
 *
 *   GuestPort  the guest site: the public API through the house's browser key
 *              (the house and its rooms, what is open, a price, reserving,
 *              a stay's own link, signing in, the guest's own stays);
 *   DeskPort   the desk's screens: the data API as a signed-in person (the
 *              book, the counts, bookings and edits, check-in and out, the
 *              folio's money, the rooms and what is out of service).
 *
 * Every answer is a wire shape (`wire.ts`) and every refusal an `ApiError`
 * carrying Adminium's code, so a screen has one path whoever answers: the
 * real server, or the demo's stand-in, which plays the same rules.
 */
import type { ClaimReply, ExtraAvailability, Id, LiveFrame, Night, NightAnswer, NightCount, PublicConfig, QuoteReply, Row, StayBody, StayReply } from "./wire.ts";

/** The house as the guest site reads it. */
export interface House {
  settings: Row;
  types: Row[];
  features: Row[];
  rooms: Row[];
  extras: Row[];
  notes: Row[];
}

/** A stay with the rows that hang on it. */
export interface StayWithLines {
  stay: Row;
  extras: Row[];
  charges: Row[];
  credits: Row[];
  payments: Row[];
}

/** What the guest asks the night availability. */
export interface NightQuestion {
  from: string;
  to: string;
  guests: number;
  /** Look this many days on for each type's earliest open arrival. */
  earliest?: number;
  /** Leave one of the signed-in guest's own stays out of the count (a date change). */
  exclude?: Id;
}

export interface GuestPort {
  config(): Promise<PublicConfig>;
  house(): Promise<House>;

  /** Each room type that sleeps the party, over the nights asked. */
  availability(question: NightQuestion): Promise<NightAnswer>;
  /** Each extra with a limit a night (parking), over the nights asked. */
  extrasOpen(from: string, to: string): Promise<ExtraAvailability[]>;

  /** The stay priced by Adminium, written nowhere. */
  quote(body: StayBody): Promise<QuoteReply>;
  /** The stay reserved. `clientKey` makes a retry land on the same stay. */
  reserve(body: StayBody, clientKey: string): Promise<StayReply>;

  /** Opens the stay behind its own link (the code in the link's fragment). */
  openLink(token: string): Promise<ClaimReply>;
  /** The stay the link opened. */
  linkedStay(): Promise<StayWithLines>;

  /** Emails a sign-in link (and a code) to an address; the same answer whoever it is. */
  requestSignIn(email: string, lang?: string): Promise<{ sentTo: string }>;
  verifyLink(token: string): Promise<ClaimReply>;
  verifyCode(email: string, code: string): Promise<ClaimReply>;
  /** Whether this browser holds a sign-in session, and whose. */
  signedIn(): Promise<{ email: string; name: string | null; at: string } | null>;
  /** The signed-in guest's stays. */
  myStays(): Promise<StayWithLines[]>;

  /**
   * A change to a stay the guest may make until the arrival afternoon: the
   * time they will come, or cancelling it. Through the link when the stay was
   * opened by its link, else as the signed-in guest.
   */
  changeStay(id: Id, values: { arrival_time?: string; status?: "cancelled" }): Promise<Row>;
  /** An extra added to the stay, or dropped and put back. */
  addExtra(stayId: Id, extraId: Id): Promise<Row>;
  setExtra(lineId: Id, state: "on" | "off"): Promise<Row>;
  /** The stay's new dates priced (a signed-in guest, while they may still cancel at no charge). */
  quoteDates(id: Id, arrive: string, depart: string): Promise<QuoteReply>;
  moveDates(id: Id, arrive: string, depart: string, expectTotal: string): Promise<Row>;
  /** A new link for one of the signed-in guest's stays: the old one stops. */
  newLink(id: Id): Promise<{ sentTo: string }>;

  signOut(): Promise<void>;
  signOutEverywhere(): Promise<void>;
  /** Empties the guest's account; a sign-in older than ten minutes is asked to sign in again first. */
  forget(): Promise<void>;
}

/** Who is signed in to the desk, and what they may do. */
export interface DeskPerson {
  name: string;
  roles: string[];
}

/** The house as the desk reads it: everything, including what the guest site never sees. */
export interface DeskHouse extends House {
  closures: Row[];
  rates: Row[];
  items: Row[];
}

/** A stay as the folio reads it: its rows and the nights it is priced by. */
export interface Folio extends StayWithLines {
  nights: Night[];
}

export interface DeskPort {
  me(): Promise<DeskPerson>;
  config(): Promise<{ timezone: string | null; currency: string | null; now?: string }>;
  house(): Promise<DeskHouse>;

  /** Every stay on the book, with its extras. */
  stays(): Promise<StayWithLines[]>;
  folio(id: Id): Promise<Folio>;
  /** A guest account by email, and how many stays it has (a desk booking offers to link to it). */
  guestByEmail(email: string): Promise<{ customer: Row; stays: number } | null>;
  /** Each pool's nights from a day: the room types' and the parking's. */
  counts(from: string, days: number): Promise<NightCount[]>;

  /** A booking priced, written nowhere; and made. */
  quote(body: StayBody): Promise<QuoteReply>;
  book(body: StayBody): Promise<StayReply>;
  /** A change to a stay priced, written nowhere; and made. */
  quoteEdit(id: Id, values: Record<string, unknown>): Promise<QuoteReply>;
  edit(id: Id, values: Record<string, unknown>, expectTotal?: string): Promise<Row>;

  checkIn(id: Id, roomId: Id): Promise<Row>;
  checkOut(id: Id): Promise<Row>;
  /**
   * Leaving before the booked last morning: the nights from `from` taken off,
   * priced by Adminium (the stay is checked out after, once it is settled).
   */
  takeOffNights(id: Id, from: string): Promise<Row>;
  cancel(id: Id, code: "guest_asked" | "house"): Promise<Row>;
  noShow(id: Id): Promise<Row>;
  /** They came after all: back to booked, or checked in to a room, the missed night charged or not. */
  cameAfterAll(id: Id, to: { roomId: Id; chargeMissed: boolean } | null): Promise<Row>;
  expectBy(id: Id, day: string | null): Promise<Row>;
  /** A room given ahead, or the guest moved to another room. */
  giveRoom(id: Id, roomId: Id | null): Promise<Row>;
  moveRoom(id: Id, roomId: Id): Promise<Row>;

  addCharge(stayId: Id, charge: { itemId: Id } | { label: string; amount: string; note: string }): Promise<Row>;
  recordPayment(stayId: Id, payment: { kind: "taken" | "given_back"; amount: string; method: "card" | "cash" | "transfer"; reference?: string | null; note?: string | null }): Promise<Row>;
  /** A manager's: a charge, a payment or a credit voided, with the reason. */
  voidRow(table: "charges" | "payments" | "stay_credits", id: Id, reason: string): Promise<Row>;

  setRoom(id: Id, values: { status?: "ready" | "cleaning" | "occupied"; note?: string | null }): Promise<Row>;
  closeRoom(values: { room_id: Id; from_date: string; to_date: string | null; reason: string | null }): Promise<Row>;
  endClosure(id: Id): Promise<Row>;

  /** Every change the live stream announces; returns the unsubscribe. */
  subscribe(listener: (frame: LiveFrame) => void, onState?: (state: "live" | "reconnecting") => void): () => void;
}
