/**
 * The app's single store.
 *
 * One zustand store rather than several: the guest's search, the desk's board,
 * the rack, the calendar and every folio all read the same rooms and stays, and
 * splitting them would mean keeping five copies in step. Everything derived —
 * availability, rates, the folio, occupancy, the calendar grid — is computed in
 * `lib/stay.ts` at render time from what lives here, never stored.
 *
 * THE CLOCK LIVES HERE, and it has exactly two positions. `phase` starts at
 * `morning` (09:05, mid-departure) and the dock's "Advance to check-out time"
 * chip moves it to `after` (11:20). That single flip makes departures due,
 * re-sorts the Today board, and is the only thing in the app that moves time.
 */

import { create } from "zustand";

import {
  CHARGE_KINDS,
  DEMO_LOOKUP,
  NEXT_REF,
  REF_PREFIX,
  STAFF,
  TAX_RATE,
} from "../data/demo.ts";
import { source } from "../data/source.ts";
import type {
  ClockPhase,
  Extra,
  Now,
  PayMethod,
  Persona,
  Room,
  RoomType,
  Stay,
  Toast,
  View,
} from "../data/types.ts";
import { HOME_VIEW } from "../data/types.ts";
import { t } from "../i18n/ambient.ts";
import { dateShort, money, typeName } from "../lib/format.ts";
import {
  checkPayment,
  checkoutBlock,
  folioFor,
  nights,
  plusDays,
  round2,
  stayProblem,
} from "../lib/stay.ts";

const THEME_KEY = "hotel-reservations-theme";

export type Theme = "light" | "dark";

/* Reference data never changes during a session. */
export const PINNED: Now = source.now();
export const ROOM_TYPES: RoomType[] = source.roomTypes();
export const EXTRAS: Extra[] = source.extras();
export const DESK_STAFF = STAFF;
export const TAX = TAX_RATE;
export const LOOKUP_HINT = DEMO_LOOKUP;
export const CHARGES = CHARGE_KINDS;

export function typeById(id: string): RoomType | null {
  return ROOM_TYPES.find((t) => t.id === id) ?? null;
}

/** Arrival times a guest can pick, from when rooms are ready to very late. */
export const ARRIVAL_TIMES = [
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
  "22:30",
];

interface SearchDraft {
  arrive: string;
  depart: string;
  guests: number;
}

interface ReserveForm {
  first: string;
  last: string;
  email: string;
  mobile: string;
  arrivalTime: string;
  note: string;
  breakfast: boolean;
  parking: boolean;
  late: boolean;
}

function freshForm(): ReserveForm {
  return {
    first: "",
    last: "",
    email: "",
    mobile: "",
    arrivalTime: "16:00",
    note: "",
    breakfast: false,
    parking: false,
    late: false,
  };
}

function freshData() {
  return {
    rooms: source.rooms(),
    stays: source.stays(),
    seqRef: NEXT_REF,
  };
}

interface State {
  view: View;
  persona: Persona;

  theme: Theme;
  navOpen: boolean;
  dockOpen: boolean;

  now: Now;
  phase: ClockPhase;

  rooms: Room[];
  stays: Stay[];
  seqRef: number;

  /* --- the guest --- */
  search: SearchDraft;
  pickedType: string | null;
  openRates: Record<string, boolean>;
  form: ReserveForm;
  bookedRef: string | null;

  lookupRef: string;
  lookupSurname: string;
  /** The stay the lookup matched, or null. */
  foundRef: string | null;
  lookupMissed: boolean;

  /* --- the desk --- */
  deskQuery: string;
  resFilter: "all" | "arriving" | "inhouse" | "leaving" | "upcoming";
  calDay: string | null;

  checkinRef: string | null;
  pickedRoom: number | null;

  folioRef: string | null;
  chargeOpen: boolean;
  chargeKind: string;
  chargeAmount: string;
  settleOpen: boolean;
  settleAmount: string;
  settleMethod: PayMethod;
  cancelRef: string | null;

  toasts: Toast[];

  /* --- actions --- */
  go: (view: View) => void;
  setPersona: (p: Persona) => void;
  initTheme: () => void;
  toggleTheme: () => void;
  setNavOpen: (open: boolean) => void;
  setDockOpen: (open: boolean) => void;
  advanceClock: () => void;
  reset: () => void;
  escape: () => void;

  setSearch: (patch: Partial<SearchDraft>) => void;
  pickType: (id: string) => void;
  toggleRates: (id: string) => void;
  setForm: (patch: Partial<ReserveForm>) => void;
  reserve: () => void;

  setLookupRef: (v: string) => void;
  setLookupSurname: (v: string) => void;
  runLookup: () => void;
  fillDemoLookup: () => void;
  clearLookup: () => void;
  addExtraToStay: (ref: string, extra: string) => void;
  changeArrivalTime: (ref: string, time: string) => void;
  openCancel: (ref: string | null) => void;
  confirmCancel: () => void;

  setDeskQuery: (q: string) => void;
  setResFilter: (f: State["resFilter"]) => void;
  setCalDay: (day: string | null) => void;

  openCheckin: (ref: string | null) => void;
  pickRoom: (n: number | null) => void;
  confirmCheckin: () => void;

  openFolio: (ref: string | null) => void;
  setChargeOpen: (open: boolean) => void;
  setChargeKind: (kind: string) => void;
  setChargeAmount: (v: string) => void;
  addCharge: () => void;
  setSettleOpen: (open: boolean) => void;
  setSettleAmount: (v: string) => void;
  setSettleMethod: (m: PayMethod) => void;
  settle: () => void;
  checkOut: (ref: string) => void;

  markReady: (room: number) => void;

  toast: (text: string) => void;
}

/** True while an overlay owns a bottom corner, so the dock steps aside. */
export function overlayOpen(s: State): boolean {
  return (
    s.checkinRef !== null ||
    s.chargeOpen ||
    s.settleOpen ||
    s.cancelRef !== null ||
    s.calDay !== null ||
    s.navOpen
  );
}

let toastSeq = 0;

export const useStore = create<State>((set, get) => ({
  view: "home",
  persona: "guest",

  theme: "light",
  navOpen: false,
  dockOpen: true,

  now: PINNED,
  phase: "morning",

  ...freshData(),

  /* The default search is a midweek stay a week out, so the first thing a
   * reader sees is a page with rooms on it rather than a validation message. */
  search: { arrive: "2026-08-03", depart: "2026-08-05", guests: 2 },
  pickedType: null,
  openRates: {},
  form: freshForm(),
  bookedRef: null,

  lookupRef: "",
  lookupSurname: "",
  foundRef: null,
  lookupMissed: false,

  deskQuery: "",
  resFilter: "all",
  calDay: null,

  checkinRef: null,
  pickedRoom: null,

  folioRef: null,
  chargeOpen: false,
  chargeKind: "bar",
  chargeAmount: "18",
  settleOpen: false,
  settleAmount: "",
  settleMethod: "card",
  cancelRef: null,

  toasts: [],

  /* ------------------------------------------------------------- chrome */

  go: (view) => {
    /* Switching views lands at the top of the new one — a folio must open at
     * its header, not mid-ledger (house layout rule 3). */
    set({ view, navOpen: false, calDay: null });
    window.scrollTo({ top: 0, behavior: "auto" });
    document.querySelector(".wh-content")?.scrollTo({ top: 0 });
  },

  setPersona: (persona) =>
    set({ persona, view: HOME_VIEW[persona], navOpen: false, deskQuery: "", calDay: null }),

  initTheme: () => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(THEME_KEY);
    } catch {
      // Storage disabled — fall through to the OS preference.
    }
    const prefersDark =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme: Theme =
      stored === "dark" || stored === "light" ? stored : prefersDark ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    set({ theme });
  },

  toggleTheme: () => {
    const theme: Theme = get().theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Not being able to remember the choice is not a reason to refuse it.
    }
    set({ theme });
  },

  setNavOpen: (navOpen) => set({ navOpen }),
  setDockOpen: (dockOpen) => set({ dockOpen }),

  /**
   * Past check-out. The only thing in the app that moves time, and it moves it
   * once: departures become due and the board re-sorts around them. Rooms flip
   * to being cleaned when somebody actually checks OUT, not when the hour
   * passes — a guest who has not left yet is still in their room.
   */
  advanceClock: () => {
    if (get().phase === "after") return;
    set({ phase: "after" });
    get().toast(t("chrome.toast.advanced"));
  },

  reset: () => {
    set({
      ...freshData(),
      view: HOME_VIEW[get().persona],
      phase: "morning",
      search: { arrive: "2026-08-03", depart: "2026-08-05", guests: 2 },
      pickedType: null,
      openRates: {},
      form: freshForm(),
      bookedRef: null,
      lookupRef: "",
      lookupSurname: "",
      foundRef: null,
      lookupMissed: false,
      deskQuery: "",
      resFilter: "all",
      calDay: null,
      checkinRef: null,
      pickedRoom: null,
      folioRef: null,
      chargeOpen: false,
      settleOpen: false,
      settleAmount: "",
      cancelRef: null,
      toasts: [],
    });
    get().toast(t("chrome.toast.reset"));
  },

  /** Escape closes overlays outermost-first, never all of them at once. */
  escape: () => {
    const s = get();
    if (s.settleOpen) return set({ settleOpen: false });
    if (s.chargeOpen) return set({ chargeOpen: false });
    if (s.cancelRef !== null) return set({ cancelRef: null });
    if (s.checkinRef !== null) return set({ checkinRef: null, pickedRoom: null });
    if (s.calDay !== null) return set({ calDay: null });
    if (s.navOpen) return set({ navOpen: false });
    if (s.deskQuery !== "") return set({ deskQuery: "" });
  },

  /* -------------------------------------------------------------- guest */

  setSearch: (patch) =>
    set((s) => {
      const next = { ...s.search, ...patch };
      /* Moving the arrival past the departure would put the guest in a state
       * they did not ask for, so the departure follows it by a night. */
      if (patch.arrive !== undefined && nights(next.arrive, next.depart) < 1) {
        next.depart = plusDays(next.arrive, 1);
      }
      return { search: next };
    }),

  pickType: (id) => {
    set({ pickedType: id });
    get().go("roomtype");
  },

  toggleRates: (id) =>
    set((s) => ({ openRates: { ...s.openRates, [id]: !s.openRates[id] } })),

  setForm: (patch) => set((s) => ({ form: { ...s.form, ...patch } })),

  /**
   * Make the reservation.
   *
   * The room is deliberately NOT assigned here — it is picked when the guest
   * arrives, and the confirmation says so in as many words. Refusing a search
   * that breaks the length or Saturday rules happens before this is reachable,
   * but it is checked again because a store action should not trust its caller.
   */
  reserve: () => {
    const s = get();
    const type = s.pickedType;
    if (type === null) return;
    if (stayProblem(s.search.arrive, s.search.depart) !== null) return;
    if (s.form.first.trim() === "" || s.form.last.trim() === "") return;

    const ref = `${REF_PREFIX}${s.seqRef}`;
    const extras: string[] = [];
    if (s.form.breakfast) extras.push("breakfast");
    if (s.form.parking) extras.push("parking");
    if (s.form.late) extras.push("late");

    const stay: Stay = {
      ref,
      first: s.form.first.trim(),
      last: s.form.last.trim(),
      email: s.form.email.trim(),
      mobile: s.form.mobile.trim(),
      type,
      room: null,
      arrive: s.search.arrive,
      depart: s.search.depart,
      guests: s.search.guests,
      arrivalTime: s.form.arrivalTime,
      noteKey: null,
      note: s.form.note.trim(),
      extras,
      status: "confirmed",
      checkedInAt: null,
      charges: [],
      payments: [],
    };

    set({ stays: [...s.stays, stay], seqRef: s.seqRef + 1, bookedRef: ref });
    get().go("confirm");
    get().toast(t("chrome.toast.reserved", { ref, date: dateShort(stay.arrive) }));
  },

  setLookupRef: (lookupRef) => set({ lookupRef, lookupMissed: false }),
  setLookupSurname: (lookupSurname) => set({ lookupSurname, lookupMissed: false }),

  runLookup: () => {
    const s = get();
    const r = s.lookupRef.trim().toUpperCase().replace(/\s+/g, "");
    const surname = s.lookupSurname.trim().toLowerCase();
    const hit = s.stays.find(
      (x) => x.ref.toUpperCase().replace(/\s+/g, "") === r && x.last.toLowerCase() === surname,
    );
    set({ foundRef: hit?.ref ?? null, lookupMissed: hit === undefined });
  },

  fillDemoLookup: () =>
    set({
      lookupRef: DEMO_LOOKUP.ref,
      lookupSurname: DEMO_LOOKUP.surname,
      lookupMissed: false,
    }),

  clearLookup: () =>
    set({ lookupRef: "", lookupSurname: "", foundRef: null, lookupMissed: false }),

  addExtraToStay: (ref, extra) => {
    set((s) => ({
      stays: s.stays.map((x) =>
        x.ref === ref && !x.extras.includes(extra)
          ? { ...x, extras: [...x.extras, extra] }
          : x,
      ),
    }));
    get().toast(t("chrome.toast.extraAdded", { ref }));
  },

  changeArrivalTime: (ref, time) => {
    set((s) => ({
      stays: s.stays.map((x) => (x.ref === ref ? { ...x, arrivalTime: time } : x)),
    }));
    get().toast(t("chrome.toast.timeChanged", { time }));
  },

  openCancel: (cancelRef) => set({ cancelRef }),

  confirmCancel: () => {
    const ref = get().cancelRef;
    if (ref === null) return;
    set((s) => ({
      stays: s.stays.map((x) => (x.ref === ref ? { ...x, status: "cancelled" as const } : x)),
      cancelRef: null,
    }));
    get().toast(t("chrome.toast.cancelled", { ref }));
  },

  /* --------------------------------------------------------------- desk */

  setDeskQuery: (deskQuery) => set({ deskQuery }),
  setResFilter: (resFilter) => set({ resFilter }),
  setCalDay: (calDay) => set({ calDay }),

  openCheckin: (checkinRef) => set({ checkinRef, pickedRoom: null }),
  pickRoom: (pickedRoom) => set({ pickedRoom }),

  /**
   * Give an arrival a room.
   *
   * The picker only ever offers Ready rooms of the booked type, so by the time
   * this runs the choice is already sound; it marks the room occupied, moves
   * the guest into the building and opens their folio, which is the next thing
   * the desk needs.
   */
  confirmCheckin: () => {
    const s = get();
    const ref = s.checkinRef;
    const number = s.pickedRoom;
    if (ref === null || number === null) return;
    const stay = s.stays.find((x) => x.ref === ref);
    if (stay === undefined) return;

    set({
      rooms: s.rooms.map((r) => (r.number === number ? { ...r, status: "occupied" as const } : r)),
      stays: s.stays.map((x) =>
        x.ref === ref
          ? { ...x, status: "in_house" as const, room: number, checkedInAt: s.now.morning }
          : x,
      ),
      checkinRef: null,
      pickedRoom: null,
      folioRef: ref,
    });
    get().go("folio");
    get().toast(
      t("chrome.toast.checkedIn", {
        name: `${stay.first} ${stay.last}`,
        room: String(number),
      }),
    );
  },

  openFolio: (folioRef) =>
    set({ folioRef, chargeOpen: false, settleOpen: false, settleAmount: "" }),

  setChargeOpen: (chargeOpen) => set({ chargeOpen }),
  setChargeKind: (chargeKind) =>
    set({
      chargeKind,
      chargeAmount: String(CHARGE_KINDS.find((c) => c.id === chargeKind)?.amount ?? 0),
    }),
  setChargeAmount: (chargeAmount) => set({ chargeAmount }),

  addCharge: () => {
    const s = get();
    const ref = s.folioRef;
    const amount = round2(Number.parseFloat(s.chargeAmount || "0") || 0);
    if (ref === null || amount <= 0) return;
    const kind = CHARGE_KINDS.find((c) => c.id === s.chargeKind);
    if (kind === undefined) return;

    set({
      stays: s.stays.map((x) =>
        x.ref === ref
          ? {
              ...x,
              charges: [
                ...x.charges,
                {
                  date: s.now.date,
                  kind: kind.id,
                  labelKey: kind.labelKey,
                  label: kind.label,
                  amount,
                },
              ],
            }
          : x,
      ),
      chargeOpen: false,
    });
    get().toast(t("chrome.toast.charged", { amount: money(amount), ref }));
  },

  setSettleOpen: (settleOpen) => set({ settleOpen }),
  setSettleAmount: (settleAmount) => set({ settleAmount }),
  setSettleMethod: (settleMethod) => set({ settleMethod }),

  settle: () => {
    const s = get();
    const ref = s.folioRef;
    const stay = s.stays.find((x) => x.ref === ref);
    if (stay === undefined) return;
    const type = typeById(stay.type);
    if (type === null) return;

    const amount = round2(Number.parseFloat(s.settleAmount || "0") || 0);
    const folio = folioFor(stay, type, EXTRAS, TAX);
    /* Partials are welcome; overpayment is refused rather than clamped. */
    if (!checkPayment(amount, folio.balance).ok) return;

    set({
      stays: s.stays.map((x) =>
        x.ref === ref
          ? {
              ...x,
              payments: [
                ...x.payments,
                {
                  date: s.now.date,
                  method: s.settleMethod,
                  labelKey: "data.pay.desk",
                  label: "Taken at the desk",
                  amount,
                },
              ],
            }
          : x,
      ),
      settleOpen: false,
      settleAmount: "",
    });
    get().toast(t("chrome.toast.settled", { amount: money(amount), ref: stay.ref }));
  },

  /**
   * Send somebody on their way.
   *
   * Refused while a balance is outstanding — the guest is standing there and
   * somebody has to be able to say why, so the screen names the amount rather
   * than disabling a button silently. On success the room flips to being
   * cleaned, which is the whole of housekeeping in this product.
   */
  checkOut: (ref) => {
    const s = get();
    const stay = s.stays.find((x) => x.ref === ref);
    if (stay === undefined || stay.room === null) return;
    const type = typeById(stay.type);
    if (type === null) return;

    const folio = folioFor(stay, type, EXTRAS, TAX);
    if (checkoutBlock(folio.balance).blocked) return;

    const room = stay.room;
    set({
      rooms: s.rooms.map((r) => (r.number === room ? { ...r, status: "cleaning" as const } : r)),
      stays: s.stays.map((x) =>
        x.ref === ref ? { ...x, status: "departed" as const } : x,
      ),
      folioRef: null,
    });
    get().go("today");
    get().toast(
      t("chrome.toast.checkedOut", {
        name: `${stay.first} ${stay.last}`,
        room: String(room),
      }),
    );
  },

  markReady: (room) => {
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.number === room && r.status === "cleaning" ? { ...r, status: "ready" as const } : r,
      ),
    }));
    get().toast(t("chrome.toast.markedReady", { room: String(room) }));
  },

  /* ------------------------------------------------------------- toasts */

  toast: (text) => {
    const id = `t${++toastSeq}`;
    set((s) => ({ toasts: [...s.toasts, { id, text }] }));
    window.setTimeout(
      () => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
      3400,
    );
  },
}));

/* ---------------------------------------------------------------- helpers */

/** The clock reading for whichever half of the day the demo is in. */
export function clockNow(now: Now, phase: ClockPhase): string {
  return phase === "morning" ? now.morning : now.afterCheckout;
}

/** A guest's display name. */
export function fullName(stay: Stay): string {
  return `${stay.first} ${stay.last}`;
}

/** The room type a stay booked, named in the reader's language. */
export function stayTypeName(stay: Stay): string {
  return typeName(typeById(stay.type));
}
