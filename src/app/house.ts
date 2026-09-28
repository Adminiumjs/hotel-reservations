/**
 * The house's screens, as one controller: what is on screen (`state`), what
 * Adminium answered (`ask`), and what a button does (the actions below). The
 * values the screens draw are worked out from these by `vals/*.ts`.
 *
 * Everything the design's own logic decided — a price, what is open, a
 * reference, whether a move is allowed — is Adminium's here: the controller
 * asks through the ports (`../data/ports.ts`) and shows the answer, or the
 * refusal's words.
 */
import type { DeskPort, GuestPort, StayWithLines } from "../data/ports.ts";
import { isApiError, type Id, type LiveFrame, type NightAnswer, type QuoteReply, type StayBody } from "../data/wire.ts";
import { tr, setLocale } from "../i18n/tr.ts";
import { venueDay, venueMinutes } from "../lib/venueTime.ts";
import { fDW, money, nightsOf, plus, setCurrency, strip } from "./fmt.ts";
import { worldOf, type StV, type WorldV } from "./world.ts";

import type { View } from "./views.ts";
export type { View };

export interface Form {
  first: string;
  last: string;
  email: string;
  mobile: string;
  arrivalTime: string;
  note: string;
  extras: Record<string, boolean>;
}
/** A retry key a form mints once: 48 random characters. */
export const mintKey = () => crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 16);

export interface Nb extends Form {
  /** The form's retry key: a save sent again after a reply that never came lands on the same stay. */
  key: string;
  arrive: string;
  depart: string;
  guests: number;
  type: string | null;
  link: "yes" | "no" | null;
  language: string;
}
export interface Auth {
  stage: "form" | "sent" | "link" | "expired";
  email: string;
  /** The sign-in link's own code, while its page waits for Continue. */
  token: string | null;
  busy: boolean;
  sentAt: number;
  code: string[];
  tries: number;
  err: string;
  emailErr: string;
  /** Why the guest is signing in again: their session was ended elsewhere. */
  ended: string;
}
export interface Toast {
  id: string;
  msg: string;
  kind: "ok" | "info" | "warn";
}

const CODE0 = ["", "", "", "", "", ""];
export const blankForm = (): Form => ({ first: "", last: "", email: "", mobile: "", arrivalTime: "15:00", note: "", extras: {} });
export const blankAuth = (): Auth => ({ stage: "form", email: "", token: null, busy: false, sentAt: 0, code: CODE0.slice(), tries: 5, err: "", emailErr: "", ended: "" });

export function fresh(day: string) {
  return {
    view: null as View | null,
    navOpen: false,
    search: { arrive: plus(day, 6), depart: plus(day, 8), guests: 2 },
    searched: false,
    pickedType: null as string | null,
    openRates: {} as Record<string, boolean>,
    form: blankForm(),
    formErr: false,
    rvBusy: false,
    rvAnswer: null as null | { kind: "gone" | "price" | "rule" | "down"; msg?: string; total?: string; was?: string },
    rvShown: null as string | null,
    booking: null as null | { id: Id; nights: QuoteReply["nights"]; email: string; first: string; refs: string[] },
    /** Two rooms for a party no one room sleeps: reserved one after the other, the details kept. */
    pair: null as null | { types: [string, string]; guests: [number, number]; step: 0 | 1; refs: string[] },
    auth: blankAuth(),
    signedIn: null as string | null,
    signedAt: 0,
    linkStay: null as Id | null,
    oneId: null as Id | null,
    listMenu: false,
    ddOpen: false,
    extraBusy: null as string | null,
    extraRefused: "",
    chg: null as null | { id: Id; arrive: string; depart: string; busy: boolean; moved: boolean; shown: string | null; err: string },
    cancelId: null as Id | null,
    cancelVoice: "guest" as "guest" | "desk",
    cancelWho: "guest_asked" as "guest_asked" | "house",
    checkinId: null as Id | null,
    pickedRoom: null as string | null,
    ciAlt: false,
    ciType: null as string | null,
    ciUp: false,
    ciErr: "",
    ciBusy: false,
    ciMissed: "charge" as "charge" | "free",
    checkoutId: null as Id | null,
    coMode: "booked" as "booked" | "stayed",
    coBusy: false,
    folioId: null as Id | null,
    folioBack: "today" as View,
    blockId: null as Id | null,
    chargeOpen: false,
    chargePick: null as string | null,
    chargeNote: "",
    chargeAmt: "",
    chargeTouched: false,
    settleOpen: false,
    settleId: null as Id | null,
    settleCap: null as number | null,
    settleAmount: "",
    settleMethod: "card" as "card" | "cash" | "transfer",
    settleRefNo: "",
    settleTouched: false,
    settleKind: "taken" as "taken" | "given_back",
    settleNote: "",
    voidT: null as null | { table: "charges" | "payments" | "stay_credits"; id: Id; amount: number; what: string; isPay: boolean; stay: Id },
    voidReason: "",
    voidTouched: false,
    rowMenu: null as string | null,
    tipKey: null as string | null,
    moveId: null as Id | null,
    movePick: null as string | null,
    moveUp: null as string | null,
    expectId: null as Id | null,
    expectPick: null as string | null,
    deskQuery: "",
    resFilter: "all",
    resQuery: "",
    resLimit: 50,
    calDay: null as string | null,
    nb: null as Nb | null,
    nbBusy: false,
    nbErr: "",
    nbTouched: false,
    editId: null as Id | null,
    newId: null as Id | null,
    roomN: null as string | null,
    rmMsg: "",
    oos: { from: day, to: "", reason: "" },
    oosTried: false,
    rackFilter: null as string | null,
    staffMenu: false,
    /** The sheet whose write is on its way: its button waits. */
    sheetBusy: null as string | null,
    /** The desk's live stream is down and being opened again. */
    reconnecting: false,
  };
}
export type State = ReturnType<typeof fresh> & {
  theme: "light" | "dark";
  lang: string;
  isNarrow: boolean;
  toasts: Toast[];
  loadError: boolean;
};

interface Cached {
  value?: unknown;
  error?: unknown;
  loading: boolean;
  done?: Promise<void>;
}

export interface Ports {
  guest?: GuestPort;
  desk?: DeskPort;
}

export class HouseApp {
  readonly ports: Ports;
  persona: "guest" | "desk";
  state: State;
  zone = "UTC";
  /** Invoices & Receipts is attached: the folio prints and emails. */
  folioOn = false;
  now = Date.now();
  private skew = 0;
  private version = 0;
  private listeners = new Set<() => void>();
  private cache = new Map<string, Cached>();
  private worldMemo: { key: unknown; w: WorldV } | null = null;
  /** Set by the demo build: a clock the demo card moves, and a fault it arms. */
  demo: { onClock?: (fn: (now: number) => void) => () => void } | null = null;

  constructor(ports: Ports, persona: "guest" | "desk", opts: { lang?: string; theme?: "light" | "dark" } = {}) {
    this.ports = ports;
    this.persona = persona;
    this.state = {
      ...fresh(venueDay(Date.now(), "UTC")),
      theme: opts.theme ?? "light",
      lang: opts.lang ?? "en-US",
      isNarrow: typeof window !== "undefined" && window.innerWidth < 900,
      toasts: [],
      loadError: false,
    };
    setLocale(this.state.lang);
  }

  // ── the React side ──────────────────────────────────────────────────────

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  snapshot = (): number => this.version;
  private bump(): void {
    this.version += 1;
    for (const fn of this.listeners) fn();
  }
  setState(patch: Partial<State> | ((s: State) => Partial<State>)): void {
    const p = typeof patch === "function" ? patch(this.state) : patch;
    this.state = { ...this.state, ...p };
    if (p.lang !== undefined) setLocale(p.lang);
    this.bump();
  }

  // ── Adminium's answers, asked once and kept until something is written ──

  /** The answer to a question, asked in the background the first time it is wanted. */
  ask<T>(key: string, fn: () => Promise<T>): { value: T | undefined; error: unknown; loading: boolean } {
    let c = this.cache.get(key);
    if (c === undefined) {
      c = { loading: true };
      this.cache.set(key, c);
      const entry = c;
      entry.done = fn().then(
        (value) => {
          if (this.cache.get(key) !== entry) return;
          entry.value = value;
          entry.loading = false;
          this.bump();
        },
        (error: unknown) => {
          if (this.cache.get(key) !== entry) return;
          entry.error = error;
          entry.loading = false;
          // The desk's session is gone: nothing more can be read — sign in again and come back.
          if (this.persona === "desk" && isApiError(error) && (error.status === 401 || error.code === "UNAUTHENTICATED")) this.ports.desk?.signInAgain?.();
          // The guest's list is gone with their session (it timed out): sign in again, and say so.
          if (this.persona === "guest" && key.startsWith("guest:mine") && isApiError(error) && error.code === "PUBLIC_REF_NOT_FOUND") setTimeout(() => this.sessionEnded("idle"), 0);
          this.bump();
        },
      );
    }
    return { value: c.value as T | undefined, error: c.error, loading: c.loading };
  }
  /** Forget what Adminium answered (everything, or the keys starting with `prefix`): the next read asks again. */
  forget(prefix = ""): void {
    for (const key of [...this.cache.keys()]) if (key.startsWith(prefix)) this.cache.delete(key);
    this.bump();
  }
  /** Forget answers and the last ones kept on screen: what was signed out of must not linger. */
  drop(prefix: string): void {
    for (const key of [...this.stale.keys()]) if (key.startsWith(prefix)) this.stale.delete(key);
    this.forget(prefix);
  }
  /** After a write: ask again (everything, or the answers `which` names), keeping what is on screen until the answers come. */
  private refresh(which: (key: string) => boolean = () => true): void {
    // Keep the last answer on screen while the new one comes: a list never flashes empty.
    for (const [key, c] of [...this.cache]) {
      if (!which(key)) continue;
      this.cache.delete(key);
      if (!c.loading && c.value !== undefined) this.stale.set(key, c.value);
    }
    this.bump();
  }
  private stale = new Map<string, unknown>();
  /** An answer, or the last one while the next is on its way. */
  get<T>(key: string, fn: () => Promise<T>): T | undefined {
    const a = this.ask(key, fn);
    if (a.value !== undefined) {
      this.stale.delete(key);
      return a.value;
    }
    return this.stale.get(key) as T | undefined;
  }

  /** What Adminium last answered to a question, without asking it. */
  peek<T>(key: string): T | undefined {
    const c = this.cache.get(key);
    return (c?.value ?? this.stale.get(key)) as T | undefined;
  }

  // ── the clock and the house ─────────────────────────────────────────────

  async start(): Promise<void> {
    try {
      const config = this.persona === "desk" ? await this.ports.desk!.config() : await this.ports.guest!.config();
      this.zone = config.timezone ?? "UTC";
      this.folioOn = "folio" in config && config.folio === true;
      setCurrency(config.currency);
      if (config.now) this.skew = Date.parse(config.now) - Date.now();
      this.now = Date.now() + this.skew;
      const today = this.day;
      const roles = this.persona === "desk" ? (await this.ports.desk!.me()).roles : [];
      const view: View = this.persona === "desk" ? (onlyHousekeeping(roles) ? "rack" : "today") : "home";
      this.setState({ ...fresh(today), view, loadError: false });
    } catch {
      this.setState({ loadError: true });
    }
    // The clock and the stream start once, however many times the house is loaded again.
    if (this.ticking) return;
    this.ticking = true;
    if (this.demo?.onClock) this.demo.onClock((now) => this.setClock(now));
    // The desk hears every change on its stream: its clock only moves the time, and the day's answers at midnight.
    else if (this.persona === "desk") setInterval(() => this.tick(Date.now() + this.skew), 30_000);
    else setInterval(() => this.setClock(Date.now() + this.skew), 30_000);
    // Signed out elsewhere (or the details deleted): nothing of theirs stays on this screen.
    if (this.persona === "guest") this.ports.guest?.onSessionEnded?.((reason) => this.sessionEnded(reason));
    if (this.persona === "desk" && this.ports.desk)
      this.ports.desk.subscribe(
        (frame: LiveFrame) => this.onFrame(frame),
        (state) => {
          if ((state === "reconnecting") !== this.state.reconnecting) this.setState({ reconnecting: state === "reconnecting" });
        },
      );
  }
  private ticking = false;
  /** The desk's clock: the time moves on; at a new day, every answer is asked again. */
  private tick(now: number): void {
    const dayBefore = this.day;
    this.now = now;
    if (this.day !== dayBefore) {
      this.refresh();
      this.setState({ calDay: null });
    } else this.bump();
  }
  /** The clock moved (the demo card, or time passing): what Adminium answered may have moved with it. */
  setClock(now: number): void {
    const dayBefore = this.day;
    this.now = now;
    this.refresh();
    if (this.day !== dayBefore) this.setState({ calDay: null });
  }
  /** Changes heard on the stream, gathered for a moment: a check-in is a stay and a room at once. */
  private heard = new Set<string>();
  private hearing: ReturnType<typeof setTimeout> | null = null;
  private onFrame(frame: LiveFrame): void {
    this.heard.add(frame.table);
    if (this.hearing !== null) return;
    this.hearing = setTimeout(() => {
      const tables = [...this.heard];
      this.heard.clear();
      this.hearing = null;
      this.refresh((key) => answersOf(key, tables));
    }, 250);
  }
  get day(): string {
    return venueDay(this.now, this.zone);
  }
  get time(): string {
    const m = venueMinutes(this.now, this.zone);
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  }
  /** Minutes since the epoch at a wall time of a day of the house (compared with `nowMin`). */
  mins(day: string, hhmm: string): number {
    const [h, m] = hhmm.split(":").map(Number) as [number, number];
    return Date.parse(`${day}T00:00:00Z`) / 60_000 + h * 60 + m;
  }
  nowMin(): number {
    return this.mins(this.day, this.time);
  }

  /** The house and — at the desk — every stay on the book, as the screens read them. */
  world(): WorldV | null {
    const house = this.persona === "desk" ? this.get("desk:house", () => this.ports.desk!.house()) : this.get("guest:house", () => this.ports.guest!.house());
    if (house === undefined) return null;
    let stays: StayWithLines[] = [];
    if (this.persona === "desk") {
      // The door reads only what the person may: housekeeping, a stay's room, dates and status.
      const all = this.get("desk:stays", () => this.ports.desk!.stays());
      if (all === undefined) return null;
      stays = all;
    } else {
      stays = [...(this.mine() ?? []), ...(this.linked() ? [this.linked()!] : [])];
    }
    const key = [house, stays];
    if (this.worldMemo !== null && this.worldMemo.key instanceof Array && this.worldMemo.key[0] === house && this.worldMemo.key[1] === stays) return this.worldMemo.w;
    const w = worldOf(house, stays, this.zone);
    this.worldMemo = { key, w };
    return w;
  }
  /** The reader's language: the screens' words, dates and money follow it. */
  setLang(tag: string): void {
    this.setState({ lang: tag });
    this.forget("");
  }
  /** Which side of the house is on screen (the demo card switches it). */
  setPersona(p: "guest" | "desk"): void {
    if (p === this.persona) return;
    this.persona = p;
    this.worldMemo = null;
    const keep = { theme: this.state.theme, lang: this.state.lang, isNarrow: this.state.isNarrow, toasts: this.state.toasts, loadError: false };
    this.setState({ ...fresh(this.day), ...keep, view: p === "desk" ? (this.isHousekeeping() ? "rack" : "today") : "home" });
  }
  me() {
    return this.get("desk:me", () => this.ports.desk!.me()) ?? { name: "", roles: [] as string[] };
  }
  isManager(): boolean {
    return this.me().roles.includes("manager");
  }
  /** Housekeeping and nothing else: a person who also holds the desk works the desk. */
  isHousekeeping(): boolean {
    return onlyHousekeeping(this.me().roles);
  }
  /** Whether this person may open a printed document: a screens-only role cannot yet. */
  canPrint(): boolean {
    return this.folioOn && this.isManager();
  }
  /** One write at a time from a sheet: a second press while the first is on its way does nothing. */
  async once(name: string, run: () => Promise<unknown>): Promise<void> {
    if (this.state.sheetBusy !== null) return;
    this.setState({ sheetBusy: name });
    try {
      await run();
    } finally {
      this.setState({ sheetBusy: null });
    }
  }
  private mine(): StayWithLines[] | undefined {
    if (this.state.signedIn === null) return [];
    return this.get(`guest:mine:${this.state.signedIn}`, () => this.ports.guest!.myStays());
  }
  private linked(): StayWithLines | null {
    if (this.state.linkStay === null) return null;
    return this.get(`guest:linked:${String(this.state.linkStay)}`, () => this.ports.guest!.linkedStay()) ?? null;
  }
  stay(id: Id | null): StV | null {
    if (id === null) return null;
    return this.world()?.stays.find((x) => x.id === id) ?? null;
  }

  // ── moving about ────────────────────────────────────────────────────────

  go(view: View, patch: Partial<State> = {}): void {
    this.setState({ view, navOpen: false, deskQuery: "", calDay: null, rowMenu: null, staffMenu: false, listMenu: false, newId: null, ...patch });
    this.scrollTop();
    this.announce(view);
  }
  scrollTop(): void {
    try {
      window.scrollTo(0, 0);
    } catch {
      // not in a browser
    }
  }
  /** A new screen: its heading takes focus, so a screen reader says where it is. */
  private announce(_view: View): void {
    setTimeout(() => {
      const h = document.querySelector<HTMLElement>("main h1, section h1");
      if (h !== null) {
        if (!h.hasAttribute("tabindex")) h.setAttribute("tabindex", "-1");
        h.focus({ preventScroll: true });
        const house = this.world()?.H.name ?? "";
        document.title = house === "" ? h.textContent ?? "" : `${h.textContent ?? ""} — ${house}`;
        // Said once, politely, for a screen reader that did not follow the focus.
        const said = document.getElementById("wh-said");
        if (said !== null) said.textContent = document.title;
      }
    }, 60);
  }
  toast(msg: string, kind: Toast["kind"] = "ok"): void {
    const id = `t${String(Date.now())}${String(Math.random())}`;
    this.setState((s) => ({ toasts: [...s.toasts, { id, msg, kind }] }));
    setTimeout(() => this.setState((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 3600);
  }
  focusSoon(sel: string): void {
    setTimeout(() => document.querySelector<HTMLElement>(sel)?.focus(), 40);
  }
  narrow(): boolean {
    return this.state.isNarrow;
  }
  closeTop(): void {
    const s = this.state as unknown as Record<string, unknown>;
    const K: [string, unknown][] = [
      ["rowMenu", null], ["voidT", null], ["settleOpen", false], ["chargeOpen", false], ["cancelId", null], ["ddOpen", false], ["expectId", null],
      ["moveId", null], ["blockId", null], ["checkinId", null], ["checkoutId", null], ["chg", null], ["roomN", null],
      ["calDay", null], ["navOpen", false], ["staffMenu", false], ["listMenu", false], ["deskQuery", ""],
    ];
    for (const [k, off] of K) {
      if (!s[k]) continue;
      this.setState({ [k]: off } as Partial<State>);
      return;
    }
  }

  /** A refusal in the house's words, and a toast; a bare error says the house did not answer. */
  refused(error: unknown): string {
    if (!isApiError(error)) return tr("The house did not answer. Try again in a moment.");
    const p = error.params as Record<string, unknown>;
    switch (error.code) {
      case "WRITE_CONFLICT":
      case "STATE_UNCHANGED":
      case "RECORD_LOCKED":
        return tr("Someone changed this a moment ago — here it is now.");
      case "STATE_MOVE_REFUSED":
        if (p["roles"] !== undefined) return tr("That is not for your role.");
        if (p["requires"] === "time") return tr("Not yet — that can be done later in the day.");
        if (p["requires"] === "balance") return tr("Not while money is owing.");
        return tr("Someone changed this a moment ago — here it is now.");
      case "BALANCE_EXCEEDED":
        return tr("That would leave more paid than the stay costs.");
      case "CAPACITY_FULL":
      case "PUBLIC_NO_ROOM":
        return p["column"] === "room_id" ? tr("That room is taken on those nights.") : tr("There is no room of that type on those nights.");
      case "PRICE_CHANGED":
      case "PUBLIC_PRICE_CHANGED":
        return tr("The price has changed since it was shown — look at it again.");
      case "PUBLIC_TOO_LATE":
        return tr("Changes are made at the desk now.");
      case "FORBIDDEN":
      case "COLUMN_FORBIDDEN":
      case "TABLE_FORBIDDEN":
      case "APP_SCREENS_ONLY":
        return tr("That is not for your role.");
      case "UNIQUE_VIOLATION":
        return tr("That is recorded already.");
      case "VALIDATION_FAILED":
      case "PUBLIC_WRITE_REFUSED":
        return tr("Some of that is not something the house can take — look at it again.");
      case "RATE_LIMITED":
      case "PUBLIC_RATE_LIMITED":
        return tr("Too many tries at once — wait a moment and try again.");
      case "UNAUTHENTICATED":
      case "PUBLIC_REF_NOT_FOUND":
        return this.persona === "desk" ? tr("You are signed out — sign in again.") : tr("Please sign in again.");
      case "PUBLIC_NETWORK_UNAVAILABLE":
      case "PUBLIC_UPSTREAM_UNAVAILABLE":
        return tr("The house did not answer. Try again in a moment.");
      default:
        // Adminium's own words are for the console, never the screen: they are English and name its tables.
        if (typeof console !== "undefined") console.warn(error.code, error.message);
        return tr("That did not go through. Try again in a moment.");
    }
  }
  /** Until every answer on its way has come. */
  private async settled(): Promise<void> {
    await Promise.allSettled([...this.cache.values()].filter((c) => c.loading && c.done !== undefined).map((c) => c.done));
  }
  /** One write: busy while it runs, everything asked again after (and answered before `done` reads it), a refusal said. */
  async write<T>(run: () => Promise<T>, done?: (result: T) => void, failed?: (error: unknown) => void): Promise<T | undefined> {
    try {
      const result = await run();
      this.refresh();
      this.world();
      await this.settled();
      done?.(result);
      return result;
    } catch (error) {
      this.refresh();
      this.world();
      await this.settled();
      if (failed) failed(error);
      else this.toast(this.refused(error), "warn");
      return undefined;
    }
  }

  // ── the guest's side: what is open, and what it costs ──────────────────

  /** The night availability for the search (or any dates and party). */
  avail(arrive: string, depart: string, guests: number, exclude?: Id) {
    return this.ask(`avail:${arrive}:${depart}:${String(guests)}:${String(exclude ?? "")}`, () =>
      this.ports.guest!.availability({ from: arrive, to: depart, guests, earliest: 42, ...(exclude === undefined ? {} : { exclude }) }),
    ) as { value: NightAnswer | undefined; error: unknown; loading: boolean };
  }
  /** Adminium's price for a stay of a type, with extras, written nowhere. */
  quote(type: string, arrive: string, depart: string, guests: number, extras: string[] = []) {
    const body: StayBody = {
      values: { room_type_id: Number(type), arrive, depart, guests },
      children: { stay_extras: extras.map((extra_id) => ({ values: { extra_id: Number(extra_id) } })) },
    };
    return this.ask(`quote:${type}:${arrive}:${depart}:${String(guests)}:${extras.join(",")}`, () =>
      this.persona === "desk" ? this.ports.desk!.quote(body) : this.ports.guest!.quote(body),
    ) as { value: QuoteReply | undefined; error: unknown; loading: boolean };
  }

  // ── the guest's side: reserving ────────────────────────────────────────

  pickedExtras(f: Form): string[] {
    return Object.entries(f.extras)
      .filter(([, on]) => on)
      .map(([id]) => id);
  }
  tryReserve(): void {
    const f = this.state.form;
    if (!f.first.trim() || !f.last.trim() || !okEmail(f.email)) {
      this.setState({ formErr: true });
      this.focusSoon(!f.first.trim() ? "#rv-first" : !f.last.trim() ? "#rv-last" : "#rv-email");
      return;
    }
    void this.reserve(false);
  }
  private clientKey = "";
  async reserve(accepted: boolean): Promise<void> {
    const s = this.state;
    const t = s.pickedType;
    if (t === null) return;
    if (!this.clientKey) this.clientKey = mintKey();
    const f = s.form;
    const shown = accepted ? s.rvAnswer?.total ?? s.rvShown : s.rvShown;
    this.setState({ rvBusy: true, rvAnswer: null, formErr: false });
    const body: StayBody = {
      values: {
        room_type_id: Number(t),
        arrive: s.search.arrive,
        depart: s.search.depart,
        guests: s.pair === null ? s.search.guests : s.pair.guests[s.pair.step],
        first_name: f.first.trim(),
        last_name: f.last.trim(),
        email: f.email.trim(),
        mobile: f.mobile.trim(),
        arrival_time: f.arrivalTime,
        note: f.note.trim(),
        language: this.state.lang,
        client_key: this.clientKey,
      },
      children: { stay_extras: this.pickedExtras(f).map((extra_id) => ({ values: { extra_id: Number(extra_id) } })) },
      ...(shown ? { expect: { total: shown } } : {}),
    };
    try {
      const reply = await this.ports.guest!.reserve(body, this.clientKey);
      this.clientKey = "";
      const guests = s.pair === null ? s.search.guests : s.pair.guests[s.pair.step];
      const quote = this.quote(t, s.search.arrive, s.search.depart, guests, this.pickedExtras(f)).value;
      const ref = String(reply.data["ref"]);
      // The stay is made whatever happens next: its own link opens here if it can, and the email carries it anyway.
      const linked = reply.link === undefined ? false : await this.ports.guest!.openLink(reply.link.token).then(() => true, () => false);
      this.forget("guest:linked");
      this.forget("avail:");
      if (s.pair !== null && s.pair.step === 0) {
        // The first of two rooms: the same details go on the second.
        this.setState({ linkStay: linked ? reply.data.id : this.state.linkStay, rvBusy: false, rvShown: null, pair: { ...s.pair, step: 1, refs: [ref] }, pickedType: s.pair.types[1] });
        this.go("reserve");
        this.toast(tr("Reserved — {ref}. Now the second room.", { ref }));
        return;
      }
      const refs = s.pair === null ? [ref] : [...s.pair.refs, ref];
      this.setState({ linkStay: linked ? reply.data.id : this.state.linkStay, rvBusy: false, booking: { id: reply.data.id, nights: quote?.nights ?? [], email: f.email.trim(), first: f.first.trim(), refs }, form: blankForm(), rvShown: null, pair: null });
      this.go("conf");
      this.toast(tr("Reserved — {ref}.", { ref: refs.join(" · ") }));
    } catch (error) {
      const code = isApiError(error) ? error.code : "";
      if (code === "PUBLIC_PRICE_CHANGED") {
        const total = String((error as { params: Record<string, unknown> }).params["total"]);
        this.setState({ rvBusy: false, rvAnswer: { kind: "price", total, was: shown ?? "" } });
        this.forget("quote:");
      } else if (code === "PUBLIC_NO_ROOM") {
        this.clientKey = "";
        this.forget("avail:");
        this.setState({ rvBusy: false, rvAnswer: { kind: "gone" } });
      } else if (code === "PUBLIC_WRITE_REFUSED") {
        this.clientKey = "";
        this.setState({ rvBusy: false, rvAnswer: { kind: "rule", msg: this.ruleWords(error) } });
      } else {
        // The house did not answer: the retry key is kept, so trying again cannot make a second stay.
        this.setState({ rvBusy: false, rvAnswer: { kind: "down" } });
      }
    }
  }
  ruleWords(error: unknown): string {
    const p = isApiError(error) ? (error.params as Record<string, unknown>) : {};
    if (p["column"] === "guests") return tr("That room type does not sleep that many.");
    const s = this.state.search;
    return this.problemOf(s.arrive, s.depart)?.msg ?? tr("Those dates are not ones we can take.");
  }
  /** The stay rules, said before anything is asked. */
  problemOf(a: string, d: string, desk = false): { kind: "len" | "sat"; msg: string } | null {
    const n = nightsOf(a, d);
    const most = this.world()?.H.maxNights ?? 14;
    if (n < 1) return { kind: "len", msg: tr("Leaving has to be at least one night after arriving.") };
    if (n > most)
      return {
        kind: "len",
        msg: desk ? tr("A stay is one to {most} nights — this is {n}.", { most, n }) : tr("A stay here runs from one night to {most} — that is {n}. Shorten it a touch and we will sort you out.", { most, n }),
      };
    if (new Date(`${a}T12:00:00Z`).getUTCDay() === 6 && n < 2)
      return { kind: "sat", msg: desk ? tr("A Saturday arrival needs at least two nights.") : tr("A Saturday arrival needs at least two nights — we would rather you had the whole weekend.") };
    return null;
  }

  // ── the guest's side: signing in ───────────────────────────────────────

  setAuth(patch: Partial<Auth>): void {
    this.setState({ auth: { ...this.state.auth, ...patch } });
  }
  async sendLink(resend: boolean): Promise<void> {
    const em = this.state.auth.email.trim();
    if (!okEmail(em)) {
      this.setAuth({ emailErr: tr("An email we can write to") });
      this.focusSoon("#au-email");
      return;
    }
    this.setAuth({ busy: true, emailErr: "" });
    try {
      await this.ports.guest!.requestSignIn(em, this.state.lang);
      this.setAuth({ stage: "sent", busy: false, sentAt: Date.now(), code: CODE0.slice(), tries: 5, err: "" });
      if (resend) this.toast(tr("A new link is on its way."), "info");
      this.focusSoon('[data-code="0"]');
    } catch (error) {
      this.setAuth({ busy: false, emailErr: isApiError(error) && error.code === "PUBLIC_RATE_LIMITED" ? tr("Too many links asked for — try again in a few minutes.") : tr("The house did not answer. Try again in a moment.") });
    }
  }
  codeInput(i: number, raw: string): void {
    const a = this.state.auth;
    if (a.tries <= 0) return;
    const digits = String(raw).replace(/\D/g, "");
    const code = a.code.slice();
    if (digits.length > 1) for (let k = 0; k < 6; k += 1) code[k] = digits[k] ?? "";
    else code[i] = digits;
    this.setAuth({ code, err: "" });
    if (digits.length === 1 && i < 5) this.focusSoon(`[data-code="${String(i + 1)}"]`);
    if (code.every((c) => c !== "")) setTimeout(() => void this.checkCode(code.join("")), 60);
  }
  codeKey(i: number, e: { key: string }): void {
    if (e.key === "Backspace" && !this.state.auth.code[i] && i > 0) this.focusSoon(`[data-code="${String(i - 1)}"]`);
  }
  async checkCode(c: string): Promise<void> {
    const a = this.state.auth;
    try {
      await this.ports.guest!.verifyCode(a.email.trim(), c);
      this.signedIn(a.email.trim().toLowerCase());
    } catch (error) {
      const code = isApiError(error) ? error.code : "";
      const left = isApiError(error) && typeof error.params["triesLeft"] === "number" ? (error.params["triesLeft"] as number) : 0;
      const tries = code === "PUBLIC_CODE_WRONG" ? left : 0;
      this.setAuth({
        tries,
        code: CODE0.slice(),
        err:
          code === "PUBLIC_CODE_EXPIRED"
            ? tr("That code has run out. Send yourself a new link.")
            : tries > 0
              ? tr("That code is not right — {n} try left.|That code is not right — {n} tries left.", { n: tries })
              : tr("Too many tries. You can ask for a new link tomorrow — or ring us on {phone}.", { phone: this.world()?.H.phone ?? "" }),
      });
      if (tries > 0) this.focusSoon('[data-code="0"]');
    }
  }
  /**
   * Where a guest's page was opened from: a sign-in link (`c#<code>`) waits for Continue; a stay's own link
   * (`r#<code>`) opens that stay; otherwise a session this tab kept brings the guest back as they were.
   */
  async arrive(place: "c" | "r" | null, token: string | null): Promise<void> {
    const guest = this.ports.guest;
    if (guest === undefined) return;
    if (place === "c" && token !== null) {
      this.setState({ auth: { ...blankAuth(), stage: "link", token } });
      this.go("signin");
      return;
    }
    if (place === "r" && token !== null) {
      try {
        await guest.openLink(token);
        const opened = await guest.linkedStay();
        this.setState({ linkStay: opened.stay.id });
        this.openOne(opened.stay.id);
      } catch {
        this.setState({ auth: { ...blankAuth(), stage: "expired" } });
        this.go("signin");
      }
      return;
    }
    const [who, linked] = await Promise.all([guest.signedIn().catch(() => null), guest.linkedStay().catch(() => null)]);
    if (who !== null) this.setState({ signedIn: who.email.toLowerCase(), signedAt: Date.parse(who.at) });
    if (linked !== null) this.setState({ linkStay: linked.stay.id });
  }
  /** Continue, on a sign-in link's page: the link is used, once, and the guest is in. */
  async continueLink(): Promise<void> {
    const a = this.state.auth;
    const guest = this.ports.guest!;
    if (a.token === null) {
      this.signedIn(a.email.trim().toLowerCase());
      return;
    }
    this.setAuth({ busy: true });
    try {
      await guest.verifyLink(a.token);
      const who = await guest.signedIn();
      if (who === null) throw new Error("no session");
      this.signedIn(who.email.toLowerCase());
    } catch {
      this.setAuth({ ...blankAuth(), stage: "expired" });
    }
  }
  signedIn(em: string): void {
    this.setState({ signedIn: em, signedAt: Date.now(), auth: blankAuth() });
    this.forget("guest:mine");
    this.go("list");
  }
  /** Adminium ended this browser's session: back to signing in, with a line saying why. */
  sessionEnded(reason: "elsewhere" | "forgotten" | "idle"): void {
    if (this.state.signedIn === null && this.state.linkStay === null) return;
    const why = reason === "forgotten" ? tr("Your details were deleted, so you were signed out.") : reason === "idle" ? tr("You were signed out after a while away.") : tr("You were signed out on every device.");
    // A link-opened stay outlives a timed-out sign-in: only the signed-in half goes.
    const linkStay = reason === "idle" ? this.state.linkStay : null;
    this.setState({ signedIn: null, linkStay, listMenu: false, ddOpen: false, chg: null, auth: { ...blankAuth(), ended: why } });
    this.drop("guest:");
    if (this.state.view === "list" || this.state.view === "one") this.go("signin");
  }
  async signOut(all: boolean): Promise<void> {
    await (all ? this.ports.guest!.signOutEverywhere() : this.ports.guest!.signOut());
    this.setState({ signedIn: null, linkStay: null, listMenu: false, auth: blankAuth() });
    this.drop("guest:");
    this.go("signin");
    this.toast(all ? tr("Signed out on every device.") : tr("Signed out."), "info");
  }
  async deleteDetails(): Promise<void> {
    try {
      await this.ports.guest!.forget();
      this.setState({ ddOpen: false, signedIn: null, signedAt: 0, linkStay: null, auth: blankAuth() });
      this.drop("guest:");
      this.go("signin");
      this.toast(tr("Your account is deleted. You are signed out everywhere, and your confirmation links have stopped."), "info");
    } catch (error) {
      if (isApiError(error) && error.code === "PUBLIC_CODE_STEP_UP") this.setState({ signedAt: 0 });
      else this.toast(this.refused(error), "warn");
    }
  }
  openOne(id: Id): void {
    this.go("one", { oneId: id, extraRefused: "", chg: null });
  }

  // ── the guest's side: one reservation ──────────────────────────────────

  async toggleExtra(st: StV, extraId: string, on: boolean): Promise<void> {
    if (this.state.extraBusy) return;
    const w = this.world();
    const e = w?.extras.find((x) => x.id === extraId);
    this.setState({ extraBusy: extraId, extraRefused: "" });
    const before = st.m.total;
    const line = st.lines.find((l) => l.extra === extraId);
    await this.write(
      () => (line !== undefined ? this.ports.guest!.setExtra(line.id, on ? "off" : "on", st.id) : this.ports.guest!.addExtra(st.id, Number(extraId))),
      async () => {
        this.setState({ extraBusy: null });
        const after = this.stay(st.id)?.m.total ?? before;
        this.toast(on ? tr("{extra} taken off.", { extra: e?.short ?? "" }) : tr("{extra} added — {amount} on the account.", { extra: e?.short ?? "", amount: strip(money(after - before)) }));
      },
      (error) => this.setState({ extraBusy: null, extraRefused: isApiError(error) && error.code === "PUBLIC_TOO_LATE" ? tr("Changes are made at the desk now.") : this.refused(error) }),
    );
  }
  async changeTime(st: StV, t: string): Promise<void> {
    await this.write(
      () => this.ports.guest!.changeStay(st.id, { arrival_time: t }),
      () => this.toast(t === "22:30" ? tr("Noted — we will look for you after 22:00.") : tr("Noted — we will look for you about {time}.", { time: t })),
    );
  }
  openChg(st: StV): void {
    this.setState({ chg: { id: st.id, arrive: st.arrive, depart: st.depart, busy: false, moved: false, shown: null, err: "" } });
  }
  async confirmChg(total: string): Promise<void> {
    const c = this.state.chg;
    if (c === null || c.busy) return;
    this.setState({ chg: { ...c, busy: true } });
    await this.write(
      () => this.ports.guest!.moveDates(c.id, c.arrive, c.depart, total),
      () => {
        this.setState({ chg: null });
        this.toast(tr("Your dates are changed — {from} → {to}.", { from: strip(fDW(c.arrive)), to: strip(fDW(c.depart)) }));
      },
      (error) => {
        const moved = isApiError(error) && error.code === "PUBLIC_PRICE_CHANGED";
        this.forget("quote-dates");
        this.setState({ chg: { ...c, busy: false, moved, err: moved ? "" : this.refused(error) } });
      },
    );
  }
  askCancel(id: Id, voice: "guest" | "desk"): void {
    this.setState({ cancelId: id, cancelVoice: voice, cancelWho: "guest_asked" });
  }
  async doCancel(): Promise<void> {
    const s = this.state;
    const st = this.stay(s.cancelId);
    if (st === null) return;
    const run = () => (s.cancelVoice === "desk" ? this.ports.desk!.cancel(st.id, s.cancelWho) : this.ports.guest!.changeStay(st.id, { status: "cancelled", cancel_code: "self" }));
    await this.write(run, () => {
      this.setState({ cancelId: null });
      this.toast(tr("{ref} is cancelled.", { ref: st.ref }));
    }, (error) => {
      this.setState({ cancelId: null });
      this.toast(this.refused(error), "warn");
    });
  }
  async relink(st: StV): Promise<void> {
    await this.write(() => this.ports.guest!.newLink(st.id), (r) => this.toast(tr("A new link is on its way to {email}.", { email: r.sentTo || (this.state.signedIn ?? "") }), "info"));
  }

  // ── the desk ───────────────────────────────────────────────────────────

}

/** Housekeeping and no desk role. */
export function onlyHousekeeping(roles: readonly string[]): boolean {
  return roles.includes("housekeeping") && !roles.includes("front-desk") && !roles.includes("manager");
}

/** The tables whose rows each answer is made of: a change heard on one of them asks that answer again. */
const BOOK = ["stays", "stay_extras", "charges", "stay_credits", "payments", "customers"];
const HOUSE = ["rooms", "room_closures", "room_types", "rate_rules", "extras"];
function answersOf(key: string, tables: readonly string[]): boolean {
  if (tables.includes("*")) return true;
  const book = tables.some((t) => BOOK.includes(t));
  const house = tables.some((t) => HOUSE.includes(t));
  if (key === "desk:me") return false;
  if (key === "desk:house") return house;
  // Counts, the book, a folio and every quote read both: a stay's rows and the rooms and rates that price them.
  return book || house;
}

export const okEmail = (e: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || "").trim());
