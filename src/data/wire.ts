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

// ── the public API ──────────────────────────────────────────────────────────

/** `/public/config`: the house's zone and money. */
export interface PublicConfig {
  timezone: string;
  currency: string | null;
  /** The server's clock, when it says it. */
  now?: string;
}

/**
 * A room type over the searched nights, as the night availability answers
 * it: open (with what is left when few are), full, or closed by a stay rule
 * (a Saturday arrival for one night, too long, too far ahead). A type too
 * small for the party is not listed. `earliest` is the first arrival, for as
 * many nights, the type is open from — when it was asked for.
 */
export interface TypeAvailability {
  room_type_id: Id;
  state: "open" | "full" | "closed";
  left?: number;
  earliest?: { arrive: string; depart: string } | null;
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
  children: { stay_extras: TreeRow[] };
  /** The total the guest was shown, as a decimal string: a different one writes nothing. */
  expect?: { total: string };
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
 * extra's) size that night, what is out of service, what is taken and what
 * is left. `left` below zero is a night over-sold.
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
