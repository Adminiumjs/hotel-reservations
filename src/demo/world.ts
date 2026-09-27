/**
 * The demo's house: the app's REAL sample — the very bundle an operator adds
 * from Adminium (`seeds/hotel.sample.json`) — resolved at the demo's moment by
 * the same loader the tests hold to Adminium's, held in memory.
 *
 * The sample's references carry an `S` (`WH-S3283`) and no running number, so
 * a real house's first reservation is never one of them; the demo's own new
 * reservations start the house's series at its first number (`WH-1001`).
 *
 * DEMO BUILD ONLY — nothing in a real build imports it.
 */
import bundleJson from "../../seeds/hotel.sample.json" with { type: "json" };
import { resolveSample, settle, type SampleBundleRows } from "../data/sampleRows.ts";
import type { Id, LiveFrame, Row } from "../data/wire.ts";
import { randomCode } from "./engine.ts";

export const DEMO_BUNDLE = bundleJson as unknown as SampleBundleRows;

/** Tuesday 28 July 2026, 09:05 in Bellhaven. */
export const DEMO_START = Date.parse("2026-07-28T13:05:00Z");
export const DEMO_ZONE = "America/New_York";
export const DEMO_CURRENCY = "USD";

/** Every table the app declares, in the order a sample loads them. */
export const TABLES = [
  "settings",
  "house_notes",
  "room_types",
  "room_type_features",
  "rooms",
  "room_closures",
  "rate_rules",
  "extras",
  "charge_items",
  "customers",
  "stays",
  "stay_extras",
  "charges",
  "stay_credits",
  "payments",
  "messages",
] as const;
export type Table = (typeof TABLES)[number];

export class World {
  now: number;
  readonly zone = DEMO_ZONE;
  readonly currency = DEMO_CURRENCY;
  private rows: Record<Table, Row[]>;
  private nextIds: Record<Table, number>;
  private listeners = new Set<(frame: LiveFrame) => void>();
  /** Frames of a write still being made: announced when it commits, dropped when it is refused. */
  private held: LiveFrame[] | null = null;

  constructor(now = DEMO_START) {
    this.now = now;
    const resolved = resolveSample(DEMO_BUNDLE, { now, zone: DEMO_ZONE, locale: "en-US", currency: DEMO_CURRENCY });
    this.rows = Object.fromEntries(TABLES.map((t) => [t, ((resolved[t] ?? []) as Row[]).map((row) => ({ ...row }))])) as Record<Table, Row[]>;
    // A stay's link code is minted as the row goes in, the sample's rows as much as any.
    for (const stay of this.rows.stays) if (stay["link_token"] === null || stay["link_token"] === undefined) stay["link_token"] = randomCode(16);
    this.nextIds = Object.fromEntries(TABLES.map((t) => [t, Math.max(0, ...this.rows[t].map((r) => r.id)) + 1])) as Record<Table, number>;
  }

  /** Every table's rows, as the loader's rules read them. */
  get tables(): Readonly<Record<string, Row[]>> {
    return this.rows;
  }

  all(table: Table): Row[] {
    return this.rows[table];
  }

  get(table: Table, id: Id): Row | undefined {
    return this.rows[table].find((row) => row.id === id);
  }

  where(table: Table, test: (row: Row) => boolean): Row[] {
    return this.rows[table].filter(test);
  }

  /** The one settings row. */
  settings(): Row {
    return this.rows.settings[0]!;
  }

  insert(table: Table, values: Record<string, unknown>): Row {
    const row = { ...values, id: this.nextIds[table]++ } as Row;
    this.rows[table].push(row);
    this.emit({ table, id: row.id, op: "insert" });
    return row;
  }

  update(table: Table, id: Id, values: Record<string, unknown>): Row {
    const row = this.get(table, id);
    if (row === undefined) throw new Error(`no ${table} ${String(id)}`);
    Object.assign(row, values);
    this.emit({ table, id, op: "update" });
    return row;
  }

  remove(table: Table, id: Id): void {
    this.rows[table] = this.rows[table].filter((row) => row.id !== id);
    this.emit({ table, id, op: "delete" });
  }

  /** Every figure Adminium works out, worked out again from the rows that feed it. */
  settle(): void {
    settle(this.rows as unknown as Record<string, Row[]>, { currency: this.currency });
  }

  /** A copy of every row, to put back when a write is refused half way. */
  snapshot(): Record<Table, Row[]> {
    return Object.fromEntries(TABLES.map((t) => [t, this.rows[t].map((row) => ({ ...row }))])) as Record<Table, Row[]>;
  }

  restore(snapshot: Record<Table, Row[]>): void {
    this.rows = snapshot;
  }

  /** One write, all or nothing: its rows put back and its frames dropped when it throws. */
  transaction<T>(write: () => T): T {
    const before = this.snapshot();
    const ids = { ...this.nextIds };
    const outer = this.held;
    this.held = [];
    try {
      const result = write();
      const frames = this.held;
      this.held = outer;
      for (const frame of frames) this.emit(frame);
      return result;
    } catch (error) {
      this.held = outer;
      this.rows = before;
      this.nextIds = ids;
      throw error;
    }
  }

  on(listener: (frame: LiveFrame) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(frame: LiveFrame): void {
    if (this.held !== null) {
      this.held.push(frame);
      return;
    }
    for (const listener of this.listeners) listener(frame);
  }
}
