/**
 * The demo's Adminium, whole: one house in memory, its engine, the guest
 * site's door and the desk's, and the clock the demo card moves.
 *
 * DEMO BUILD ONLY — nothing in a real build imports it.
 */
import { DemoDesk } from "./desk.ts";
import { Engine } from "./engine.ts";
import { DemoGuest, NO_LATENCY, type Latency } from "./guest.ts";
import { DEMO_START, World } from "./world.ts";

export class DemoAdminium {
  readonly world: World;
  readonly engine: Engine;
  readonly guest: DemoGuest;
  readonly desk: DemoDesk;
  private clockListeners = new Set<(now: number) => void>();

  constructor(opts: { now?: number; latency?: Latency } = {}) {
    this.world = new World(opts.now ?? DEMO_START);
    this.engine = new Engine(this.world);
    this.guest = new DemoGuest(this.engine, opts.latency ?? NO_LATENCY);
    this.desk = new DemoDesk(this.engine);
  }

  get now(): number {
    return this.world.now;
  }

  /** Moves the clock to `at` (never back), and makes the moves and sends the emails that came due. */
  advanceTo(at: number): void {
    if (at < this.world.now) return;
    this.world.now = at;
    this.engine.runTimed();
    this.engine.write(() => undefined);
    for (const listener of this.clockListeners) listener(at);
  }

  advance(minutes: number): void {
    this.advanceTo(this.world.now + minutes * 60_000);
  }

  onClock(listener: (now: number) => void): () => void {
    this.clockListeners.add(listener);
    return () => this.clockListeners.delete(listener);
  }
}
