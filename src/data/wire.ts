/**
 * What goes over the wire, as Adminium's APIs answer it — the one shape every
 * screen reads, whichever Adminium answers: the real one, or the demo's
 * stand-in (`src/demo/`).
 *
 * Rows are the table's columns by their names (`arrive`, `room_total`), as
 * the entry's `select` lets them out. Instants are ISO strings, dates
 * `YYYY-MM-DD` on the house's calendar, money a decimal string or number. A
 * refusal is an {@link ApiError}: its HTTP status, its code, and its params —
 * the code is the contract, never the message.
 */

export type Id = number;

/** A row as an API answers it. */
export type Row = Record<string, unknown> & { id: Id };

/** A yes/no column, read as a yes: Adminium answers `true`; one older than its yes/no fix answered 1 on SQLite and MySQL. */
export const yes = (value: unknown): boolean => value === true || value === 1;

// ── the public API ──────────────────────────────────────────────────────────

/** `/public/config`: the house's zone and money. */
export interface PublicConfig {
  timezone: string;
  currency: string | null;
  /** The server's clock, when it says it. */
  now?: string;
  /** Offers & gift cards is in use for the house: the guest site shows the code field and the balance page. */
  offers?: boolean;
}

/** One reduction Offers & gift cards took off a stay: an offer, a typed code, or a voucher (by its last four only). */
export interface Applied {
  line: string | null;
  name: string;
  kind: "offer" | "code" | "voucher" | "pack" | "staff";
  amount: string;
  typed: boolean;
  codeLast4?: string;
}

/** An add-on's reductions as a reply carries them, read as the screens read them. */
export function appliedOf(value: unknown): Applied[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((one: Record<string, unknown>) => ({
    line: one["line"] === null || one["line"] === undefined ? null : String(one["line"]),
    name: String(one["name"] ?? ""),
    kind: String(one["kind"] ?? "offer") as Applied["kind"],
    amount: String(one["amount"] ?? "0"),
    typed: one["typed"] === true || one["typed"] === 1,
    ...(typeof one["codeLast4"] === "string" ? { codeLast4: one["codeLast4"] } : {}),
  }));
}

/** Said beside a typed code that was not needed: another offer took more off. */
export interface Told {
  column: string;
  note: string;
  name: string;
}

/** What a gift card would give a stay, as the desk's check answers it: never what else the card holds. */
export interface CardCheck {
  /** What the card pays. */
  amount: string;
  /** What is then still owing on the stay. */
  due: string;
  /** What the card keeps after it. */
  balanceAfter: string;
}

/** What the desk's look-up says a typed code is: its kind, its last four, and — for a card — its state, balance and expiry. */
export interface CodeFound {
  kind: string;
  last4: string | null;
  record: Record<string, unknown>;
}

/** One kind of linen the house sends to the laundry: where it is kept, where it goes, and how much is at each. */
export interface LinenRow {
  itemId: Id;
  name: string;
  storeId: Id;
  store: string;
  awayId: Id;
  away: string;
  /** In the store, and away at the laundry, as Inventory's books hold them. */
  inStore: number;
  atLaundry: number;
}

/** What putting linen back answered: done, or which lines are still to move; and the lines above what the books held. */
export interface LinenReply {
  done: boolean;
  transferId: Id;
  /** The items moved, and those still to move (a failed line: pressing again sends only these). */
  moved: Id[];
  left: Id[];
  /** Per item, how many more than the books held at the laundry. */
  over: { itemId: Id; by: number }[];
}

/**
 * A room type over the searched nights, as the night availability answers it
 * (one per pool the key may read that sleeps the party): open (with what is
 * left when few are), full, or closed by a stay rule (a Saturday arrival for
 * one night, too long, too far ahead). `earliest` is the first later arrival,
 * for as many nights, the type is open from — when it was asked for.
 */
export interface TypeAvailability {
  /** The room type's id, as the pool's key. */
  pool: string;
  state: "open" | "full" | "closed";
  left?: number;
  earliest?: string | null;
}

/** The night availability's answer: each type, and the earliest arrival any of them is open from. */
export interface NightAnswer {
  types: TypeAvailability[];
  earliest: string | null;
}

/** An extra with a limit a night (parking) over the searched nights. */
export interface ExtraAvailability {
  extra_id: Id;
  state: "open" | "full";
  left?: number;
}

/** One child row of a create. */
export interface TreeRow {
  values: Record<string, unknown>;
}

/** A stay with its extras, as a create sends it. */
export interface StayBody {
  values: Record<string, unknown>;
  /** `stay_codes`: the codes typed when the stay is booked, in the order typed. Sent only when one was. */
  children: { stay_extras: TreeRow[]; stay_codes?: { values: { typed: string } }[] };
  /** The total the guest was shown, as a decimal string: a different one writes nothing. */
  expect?: { total: string };
  /** The desk's retry key for this save: sent again after a reply that never came, it answers the stay the first save made. */
  clientKey?: string;
}

/** A written child row. */
export interface TreeReplyRow {
  data: Record<string, unknown>;
}

/** A create's reply: the stay and its extras; `replayed` for a retry of one already made. */
export interface StayReply {
  data: Row;
  children?: { stay_extras?: TreeReplyRow[] };
  replayed?: true;
  /** The stay's own link, answered once, on the first create (never on a replay). */
  link?: { key: string; token: string };
  /** What was taken off, from the save itself. */
  applied?: Applied[];
  told?: Told[];
}

/** One night of a price by the night. */
export interface Night {
  date: string;
  rate: number;
  base: number;
  tags: string[];
}

/** A dry run's reply: every figure a save would write, the nights it is priced by, and how the limits stand. */
export interface QuoteReply {
  data: Record<string, unknown>;
  nights: Night[];
  children?: { stay_extras?: TreeReplyRow[] };
  capacity: { pool: string; state: "available" | "full"; at?: string }[];
  exact: boolean;
  /** What a save would take off, one entry per offer, code or voucher; absent while Offers & gift cards is not in use. */
  applied?: Applied[];
  told?: Told[];
}

/** A session a claim opens (a stay's link, a sign-in). */
export interface ClaimReply {
  session: string;
  expiresAt: number;
  firstName?: string;
}

// ── the staff API ───────────────────────────────────────────────────────────

/**
 * One night of one pool, as the staff counts answer it: a room type's (or an
 * extra's) size that night — the rooms out of service already left out, and
 * counted in `outOfService` — what is taken and what is left. `left` below
 * zero is a night over-sold.
 */
export interface NightCount {
  table: "stays" | "stay_extras";
  /** The room type's id, or the extra's. */
  pool: Id;
  date: string;
  size: number;
  outOfService: number;
  taken: number;
  left: number;
}

/** A change the live stream announces: which row of which table, and how. */
export interface LiveFrame {
  table: string;
  id: Id;
  op: "insert" | "update" | "delete";
}

// ── refusals ────────────────────────────────────────────────────────────────

/** A refusal, as either API answers it: its status, its code, its params. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly params: Readonly<Record<string, unknown>>;
  constructor(status: number, code: string, message: string, params: Record<string, unknown> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.params = params;
  }
}

export const isApiError = (error: unknown): error is ApiError =>
  error instanceof ApiError || (typeof error === "object" && error !== null && (error as { name?: unknown }).name === "ApiError");
