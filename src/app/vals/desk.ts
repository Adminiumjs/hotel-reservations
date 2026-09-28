/**
 * What the desk shows: the board, the room rack, the calendar, the
 * reservations, taking a booking or changing one, and a stay's folio. The
 * values are the design's; a night's rooms sold and open are Adminium's night
 * counts, every price its dry run, every figure on a stay its own.
 */
import type { NightCount, QuoteReply } from "../../data/wire.ts";
import type { Id } from "../../data/wire.ts";
import { LOCALE_TAGS } from "../../i18n/locales.ts";
import { tr } from "../../i18n/tr.ts";
import { dow, fD, fDW, fLong, fT, fWd, guestsW, fsi, iso, money, nights, nightsOf, pct, plus, runMoney, strip, taxWords } from "../fmt.ts";
import { okEmail, type HouseApp, type View } from "../house.ts";
import type { RoomV, StV, WorldV } from "../world.ts";
import { creditLabel, extraDetail, pillOf, timeOptions } from "./guest.ts";
import { blankNb, cameAfterAll, counts, emailFolio, folio as folioOf, markNoShow, nbChanged, openCheckin, openEdit, openFolio, openRoom, openSettle, printFolio, saveNb, setRoomStatus, signOutStaff } from "../desk.ts";

type V = Record<string, unknown>;
export type RoomState = "ready" | "occupied" | "cleaning" | "oos";

export const statusWord = (k: RoomState): string =>
  k === "ready" ? tr("Ready") : k === "occupied" ? tr("Occupied") : k === "cleaning" ? tr("Being cleaned") : tr("Out of service");
export const STATUS_COLOR: Record<RoomState, string> = { ready: "var(--pos)", occupied: "var(--accent)", cleaning: "var(--warn)", oos: "var(--fg-subtle)" };

/** A room's state inside a sentence ("12 ready of 34"). */
export const statusInLine = (k: RoomState): string =>
  k === "ready" ? tr("ready") : k === "occupied" ? tr("occupied") : k === "cleaning" ? tr("being cleaned") : tr("out of service");
/** How strongly a calendar night takes its type's colour: a little when empty, most of it when full. */
const alphaOf = (ratio: number) => 0.07 + 0.7 * Math.min(1, ratio);
/**
 * The ink that reads better on a colour laid over the theme's surface: white or black — one of the two always
 * clears 4.5:1 (the theme's own near-black text does not on a mid-tone like a lilac room type).
 */
function inkOn(rgb: readonly number[], alpha: number, theme: "light" | "dark"): string {
  const surface = theme === "dark" ? [20, 20, 25] : [255, 255, 255];
  const text = [0, 0, 0];
  const lum = (c: readonly number[]) => {
    const [r, g, b] = c.map((v) => {
      const x = v / 255;
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const bg = [0, 1, 2].map((i) => alpha * rgb[i]! + (1 - alpha) * surface[i]!);
  const ratio = (a: readonly number[], b: readonly number[]) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
    return (hi + 0.05) / (lo + 0.05);
  };
  return ratio([255, 255, 255], bg) >= ratio(text, bg) ? "#ffffff" : "#000000";
}

/** How many rooms of the rack are in one state, as a whole sentence for each state. */
export function rackCount(k: RoomState, n: number, all: number): string {
  if (k === "ready") return tr("{n} of {all} ready|{n} of {all} ready", { n, all });
  if (k === "occupied") return tr("{n} of {all} occupied|{n} of {all} occupied", { n, all });
  if (k === "cleaning") return tr("{n} of {all} being cleaned|{n} of {all} being cleaned", { n, all });
  return tr("{n} of {all} out of service|{n} of {all} out of service", { n, all });
}
/** A floor inside a sentence ("Room 203 · second floor"). */
export function floorInLine(fl: number): string {
  if (fl === 1) return tr("first floor");
  if (fl === 2) return tr("second floor");
  if (fl === 3) return tr("third floor");
  return tr("floor {n}", { n: fl });
}
export function floorName(fl: number): string {
  if (fl === 1) return tr("First floor");
  if (fl === 2) return tr("Second floor");
  if (fl === 3) return tr("Third floor");
  return tr("Floor {n}", { n: fl });
}
export const holds = (x: StV) => x.state === "booked" || x.state === "in";
export const covers = (x: { arrive: string; depart: string }, night: string) => x.arrive <= night && night < x.depart;
const overlaps = (a: { arrive: string; depart: string }, b: { arrive: string; depart: string }) => a.arrive < b.depart && b.arrive < a.depart;
export const closedOn = (r: RoomV, night: string) => r.closures.some((c) => c.from <= night && (c.to === null || night <= c.to));
export function firstClosed(r: RoomV, a: string, d: string): string | null {
  for (let x = a; x < d; x = plus(x, 1)) if (closedOn(r, x)) return x;
  return null;
}
export const roomStatus = (r: RoomV, today: string): RoomState => (closedOn(r, today) ? "oos" : r.status);
export function extraId(w: WorldV, code: string): string | null {
  return w.extras.find((e) => e.code === code)?.id ?? null;
}
export const hasExtra = (w: WorldV, x: StV, code: string) => {
  const id = extraId(w, code);
  return id !== null && x.extras.includes(id);
};
/** The stay another guest holds on a room over some nights: a room given ahead, or someone in it. */
export function heldForOther(w: WorldV, roomId: Id, span: { id?: Id; arrive: string; depart: string }): StV | null {
  return w.stays.find((o) => o.id !== span.id && o.roomId === roomId && holds(o) && overlaps(o, span)) ?? null;
}
export const inRoom = (w: WorldV, roomId: Id) => w.stays.find((x) => x.state === "in" && x.roomId === roomId) ?? null;

/** What housekeeping is told of a room's day, with no names: leaving (late or not) or someone arriving. */
export function roomFact(w: WorldV, roomId: Id, today: string): string | null {
  const leaving = w.stays.find((x) => x.state === "in" && x.roomId === roomId && x.depart === today);
  if (leaving !== undefined) return hasExtra(w, leaving, "LATE") ? tr("Late leaving · until {time}", { time: strip(fT(w.H.lateUntil)) }) : tr("Leaving today");
  return w.stays.some((x) => x.state === "booked" && x.roomId === roomId && x.arrive === today) ? tr("Arriving today") : null;
}
const hexRgb = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
/** Money as a person typed it: a decimal comma read as the point. */
export function parseMoney(raw: string): number {
  let s = String(raw).replace(/[\s  '’]/g, "").replace(/[^0-9.,-]/g, "");
  if (s.includes(",") && !s.includes(".")) s = /,\d{1,2}$/.test(s) ? s.replace(",", ".") : s.replace(/,/g, "");
  else if (s.includes(",") && s.includes(".")) s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  return parseFloat(s);
}

/** The night figures Adminium counts, for a pool on a night: what can be sold and what is sold. */
export function nightFig(app: HouseApp, w: WorldV, typeId: string, night: string, except?: Id | null): { cap: number; sold: number } {
  const c = (counts(app) ?? []).find((x: NightCount) => x.table === "stays" && String(x.pool) === typeId && x.date === night);
  const own = except == null ? 0 : w.stays.filter((x) => x.id === except && holds(x) && x.type === typeId && covers(x, night)).length;
  // The size already leaves out the rooms out of service that night.
  if (c !== undefined) return { cap: c.size, sold: c.taken - own };
  // Past what the counts answered: the rows on the book.
  const cap = w.rooms.filter((r) => r.type === typeId && !closedOn(r, night)).length;
  const sold = w.stays.filter((x) => x.id !== except && holds(x) && x.type === typeId && covers(x, night)).length;
  return { cap, sold };
}
export function freeAcross(app: HouseApp, w: WorldV, typeId: string, a: string, d: string, except?: Id | null): number {
  const n = nightsOf(a, d);
  if (n < 1) return 0;
  let free = 99;
  for (let i = 0; i < n; i += 1) {
    const f = nightFig(app, w, typeId, plus(a, i), except);
    free = Math.min(free, f.cap - f.sold);
  }
  return Math.max(0, free);
}
function parkingOn(app: HouseApp, w: WorldV, night: string): { taken: number; spaces: number } {
  const e = w.extras.find((x) => x.code === "PRK");
  if (e === undefined) return { taken: 0, spaces: 0 };
  const c = (counts(app) ?? []).find((x: NightCount) => x.table === "stay_extras" && String(x.pool) === e.id && x.date === night);
  if (c !== undefined) return { taken: c.taken, spaces: c.size };
  return { taken: w.stays.filter((x) => holds(x) && covers(x, night) && x.extras.includes(e.id)).length, spaces: e.spaces ?? 0 };
}

/** What was paid and is to go back: all of it on a cancelled stay or a no-show, else what was paid over the total. */
export const toGiveBack = (x: StV): number => (x.state === "cancelled" || x.state === "noshow" ? x.m.paid : Math.max(0, -x.m.balance));
/** The days a late guest's room can be kept to: the day after arrival (or today) up to the stay's last night. */
export const keepDays = (today: string, st: StV): boolean => {
  const first = plus(st.arrive, 1) < today ? today : plus(st.arrive, 1);
  return first <= plus(st.depart, -1);
};
/** A stay may be marked as a no-show from the morning after the night it was kept for. */
export function noShowFrom(app: HouseApp, w: WorldV, st: StV): boolean {
  return app.nowMin() >= app.mins(plus(st.expectBy ?? st.arrive, 1), w.H.noShowAt);
}
export const nightsLeft = (today: string, st: StV) => nightsOf(st.arrive > today ? st.arrive : today, st.depart);

export function deskPill(app: HouseApp, x: StV): { label: string; bg: string; fg: string } {
  const today = app.day;
  let k = "plain";
  let label = tr("Booked");
  if (x.state === "cancelled") [k, label] = ["danger", tr("Cancelled")];
  else if (x.state === "noshow") [k, label] = ["danger", tr("No-show")];
  else if (x.state === "out") [k, label] = ["mute", tr("Checked out")];
  else if (x.state === "in" && x.depart === today) [k, label] = ["warn", tr("Leaving today")];
  else if (x.state === "in") [k, label] = ["pos", tr("In house")];
  else if (x.state === "booked" && x.expectBy !== null && x.expectBy > x.arrive && x.expectBy >= today && x.arrive <= today) [k, label] = ["info", tr("Expected {day}", { day: strip(fDW(x.expectBy)) })];
  else if (x.arrive < today) [k, label] = ["warn", tr("Due {day}", { day: strip(fD(x.arrive)) })];
  else if (x.arrive === today) [k, label] = ["info", tr("Arriving today")];
  const c = pillOf(k);
  return { label, bg: c[0], fg: c[1] };
}

export function staffRole(app: HouseApp): string {
  const roles = app.me().roles;
  if (roles.includes("manager")) return tr("Manager");
  if (roles.includes("housekeeping")) return tr("Housekeeping");
  return tr("Front desk");
}
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

export function deskVals(app: HouseApp, w: WorldV): V {
  const s = app.state;
  const H = w.H;
  const today = app.day;
  const narrow = app.narrow();
  const view = s.view;
  const stays = w.stays;
  const rooms = w.rooms;
  const time = app.time;
  const past = time >= H.leaveBy;
  const hk = app.isHousekeeping();

  const tonight = w.types.map((t) => nightFig(app, w, t.id, today));
  const sellAll = tonight.reduce((a, f) => a + f.cap, 0);
  const soldN = tonight.reduce((a, f) => a + f.sold, 0);
  const oosN = rooms.filter((r) => closedOn(r, today)).length;
  const sold = stays.filter((x) => holds(x) && covers(x, today));
  const due = stays.filter((x) => x.state === "booked" && x.arrive < today);
  const arrivingNow = stays.filter((x) => x.state === "booked" && x.arrive === today);
  const arrivalsAll = stays.filter((x) => x.arrive === today && (x.state === "booked" || x.state === "in" || x.state === "out"));
  const inHouse = stays.filter((x) => x.state === "in" && x.depart > today);
  const leavingAll = stays.filter((x) => (x.state === "in" && x.depart === today) || (x.state === "out" && x.checkedOut?.date === today));
  const leavingIn = leavingAll.filter((x) => x.state === "in");
  const lateIn = leavingIn.filter((x) => hasExtra(w, x, "LATE"));
  const normIn = leavingIn.filter((x) => !hasExtra(w, x, "LATE"));
  const pastLate = time >= H.lateUntil;
  const depParts: string[] = [];
  // Once the late leaving has passed too, everyone still due out is counted together.
  const dueNow = pastLate ? leavingIn.length : past ? normIn.length : 0;
  if (pastLate) {
    if (leavingIn.length) depParts.push(tr("{n} due now", { n: leavingIn.length }));
  } else {
    if (normIn.length) depParts.push(past ? tr("{n} due now", { n: normIn.length }) : tr("{n} by {time}", { n: normIn.length, time: strip(fT(H.leaveBy)) }));
    if (lateIn.length) depParts.push(tr("{n} by {time}", { n: lateIn.length, time: strip(fT(H.lateUntil)) }));
  }
  let rsum = 0;
  let rn = 0;
  for (const x of sold) {
    rsum += x.m.room;
    rn += x.nightsN || nightsOf(x.arrive, x.depart);
  }
  const park = parkingOn(app, w, today);
  const me = app.me();

  const v: V = {
    showToday: view === "today",
    showRack: view === "rack",
    showCal: view === "calendar",
    showRes: view === "reservations",
    showFolio: view === "folio" && s.folioId !== null && app.stay(s.folioId) !== null,
    showNew: view === "newbooking" && s.nb !== null,
    show404desk: view === "404",
    goToday: () => app.go("today"),
    pastCheckout: past && dueNow > 0,
    pastLine: tr("Past {time} — {n} departure is due|Past {time} — {n} departures are due", { time: strip(fT(H.leaveBy)), n: dueNow }),
    h1Size: narrow ? "23px" : "27px",
    boardCols: narrow ? "1fr" : "repeat(auto-fit,minmax(260px,1fr))",
    staffName: me.name,
    reconnecting: app.state.reconnecting,
    staffIni: initials(me.name),
    staffRole: staffRole(app),
    staffMenu: s.staffMenu,
    staffExpanded: s.staffMenu ? "true" : "false",
    toggleStaff: () => app.setState({ staffMenu: !app.state.staffMenu }),
    signOutStaff: () => signOutStaff(app),
  };

  const navCount: Record<string, number> = { today: due.length + arrivingNow.length + leavingIn.length, rack: rooms.filter((r) => roomStatus(r, today) === "cleaning").length };
  const NAV: { id: View; label: string; icon: string }[] = hk
    ? [{ id: "rack", label: tr("Room rack"), icon: "grid-3x3" }]
    : [
        { id: "today", label: tr("Today"), icon: "layout-dashboard" },
        { id: "rack", label: tr("Room rack"), icon: "grid-3x3" },
        { id: "calendar", label: tr("Calendar"), icon: "calendar-days" },
        { id: "reservations", label: tr("Reservations"), icon: "book-open" },
        { id: "newbooking", label: tr("Take a booking"), icon: "square-pen" },
      ];
  v["deskNav"] = NAV.map((n) => {
    const on = view === n.id;
    const c = navCount[n.id] ?? 0;
    return {
      id: n.id,
      label: n.label,
      icon: n.icon,
      current: on ? "page" : "false",
      go: () => (n.id === "newbooking" ? app.go("newbooking", { editId: null, nb: blankNb(app), nbErr: "", nbTouched: false }) : app.go(n.id)),
      bg: on ? "var(--accent-soft)" : "transparent",
      fg: on ? "var(--accent)" : "var(--fg-muted)",
      weight: on ? "700" : "600",
      hasCount: c > 0,
      count: String(c),
      countFg: on ? "var(--accent)" : "var(--fg-subtle)",
    };
  });

  // ── Today
  v["kpis"] = [
    { id: "k1", label: tr("Occupancy tonight"), value: sellAll ? pct(soldN / sellAll) : iso("—"), sub: tr("of the {n} room we can sell|of the {n} rooms we can sell", { n: sellAll }), fg: "var(--accent)" },
    { id: "k2", label: tr("Rooms sold"), value: fsi(tr("{sold} of {n}", { sold: soldN, n: sellAll })), sub: tr("{n} out of service", { n: oosN }), fg: "var(--fg)" },
    { id: "k3", label: tr("Arrivals"), value: iso(String(arrivalsAll.length)), sub: tr("{n} still to come|{n} still to come", { n: arrivingNow.length }), fg: "var(--fg)" },
    {
      id: "k4",
      label: tr("Departures"),
      value: iso(String(leavingIn.length)),
      sub: leavingAll.length && !leavingIn.length ? tr("all gone") : depParts.length ? depParts.join(" · ") : tr("by {time}", { time: strip(fT(H.leaveBy)) }),
      fg: "var(--fg)",
    },
    { id: "k5", label: tr("Average rate"), value: rn ? money(Math.round((rsum / rn) * 100) / 100) : iso("—"), sub: tr("a night, over tonight's stays"), fg: "var(--fg)" },
  ];
  v["parkingTonight"] = fsi(tr("{taken} of {spaces}", { taken: park.taken, spaces: park.spaces }));
  const cardOf = (st: StV, kind: "due" | "arriving" | "inhouse" | "leaving") => {
    const t = w.typeById[st.type]!;
    const n = nightsOf(st.arrive, st.depart);
    const bal = st.m.balance;
    const gone = st.state === "out";
    const lateKey = kind === "arriving" && st.arrivalTime === "22:30" && !st.given;
    const c: V = {
      id: st.ref,
      tint: t.tint,
      icon: t.icon,
      name: st.name,
      opacity: gone ? ".6" : "1",
      noteOn: !!st.note,
      note: st.note,
      openFolio: () => openFolio(app, st.id, "today"),
      hasPrimary: !gone,
      primaryBg: "var(--accent)",
      primaryFg: "var(--accent-fg)",
      isNew: st.id === s.newId,
      // a late arrival with no room given yet: the key is left out, so a room is given ahead.
      keyOn: lateKey,
      keyLine: tr("Key left out — give a room ahead"),
      giveAhead: () => app.setState({ moveId: st.id, movePick: null, moveUp: null }),
      // a guest who rang to say they will be late.
      lateOn: (kind === "due" || kind === "arriving") && keepDays(today, st),
      lateLabel: tr("They will be late…"),
      late: () => app.setState({ expectId: st.id, expectPick: st.expectBy }),
    };
    if (kind === "due") {
      const p = deskPill(app, st);
      return {
        ...c,
        sub: iso(`${st.ref} · ${strip(nights(n))}`),
        pill: p.label,
        pillBg: p.bg,
        pillFg: p.fg,
        meta: tr("{type} · {guests} · was due {day}", { type: t.name, guests: strip(guestsW(st.guests)), day: strip(fDW(st.arrive)) }),
        primaryLabel: tr("Check in"),
        primary: () => openCheckin(app, st.id),
      };
    }
    if (kind === "arriving") {
      const k = pillOf("info");
      const expected = st.expectBy !== null && st.expectBy > st.arrive;
      return {
        ...c,
        sub: iso(`${st.ref} · ${strip(nights(n))}`),
        pill: expected
          ? tr("Expected {day}", { day: strip(fDW(st.expectBy!)) })
          : st.arrivalTime === "22:30" ? tr("After 22:00") : st.arrivalTime === H.arriveFrom ? fsi(tr("From {time}", { time: strip(fT(st.arrivalTime)) })) : fsi(tr("Said {time}", { time: strip(fT(st.arrivalTime)) })),
        pillBg: k[0],
        pillFg: k[1],
        meta:
          tr("{type} · {guests} · leaves {day}", { type: t.name, guests: strip(guestsW(st.guests)), day: strip(fD(st.depart)) }) +
          (st.given && st.room !== null ? ` · ${tr("room {room} given ahead", { room: st.room })}` : ""),
        primaryLabel: tr("Check in"),
        primary: () => openCheckin(app, st.id),
      };
    }
    if (kind === "inhouse") {
      return {
        ...c,
        sub: fsi(tr("Room {room} · night {i} of {n}", { room: st.room ?? "—", i: Math.max(1, nightsOf(st.arrive, today) + 1), n })),
        pill: runMoney(bal),
        pillBg: "var(--surface-3)",
        pillFg: "var(--fg-muted)",
        meta: tr("{type} · leaves {day}", { type: t.name, day: strip(fDW(st.depart)) }),
        primaryLabel: tr("Check out"),
        primaryBg: "var(--surface-3)",
        primaryFg: "var(--fg-muted)",
        primary: () => app.setState({ checkoutId: st.id, coMode: "booked" }),
      };
    }
    const late = hasExtra(w, st, "LATE");
    const by = late ? H.lateUntil : H.leaveBy;
    const overdue = time >= by;
    const k = gone ? pillOf("mute") : overdue ? pillOf("danger") : pillOf("warn");
    return {
      ...c,
      lateOn: false,
      sub: fsi(tr("Room {room} · {ref}", { room: st.room ?? "—", ref: st.ref })),
      pill: gone ? fsi(tr("Checked out at {time}", { time: strip(fT(st.checkedOut?.time ?? "")) })) : overdue ? tr("Due now") : fsi(tr("By {time}", { time: strip(fT(by)) })),
      pillBg: k[0],
      pillFg: k[1],
      meta: `${t.name} · ${bal > 0.004 ? tr("{amount} to settle", { amount: strip(money(bal)) }) : tr("settled up")}`,
      primaryLabel: bal > 0.004 ? tr("Settle and check out") : tr("Check out"),
      primary: () => app.setState({ checkoutId: st.id, coMode: "booked" }),
    };
  };
  const colA = {
    id: "arriving",
    title: tr("Arriving"),
    dot: "var(--info)",
    count: String(due.length + arrivingNow.length),
    cards: due.map((x) => cardOf(x, "due")).concat(arrivingNow.slice().sort((p, q) => p.arrivalTime.localeCompare(q.arrivalTime)).map((x) => cardOf(x, "arriving"))),
    empty: due.length + arrivingNow.length === 0,
    emptyText: tr("Nobody else is expected today."),
  };
  const colI = {
    id: "inhouse",
    title: tr("In house"),
    dot: "var(--pos)",
    count: String(inHouse.length),
    cards: inHouse
      .slice()
      .sort((p, q) => p.depart.localeCompare(q.depart) || String(p.room).localeCompare(String(q.room), undefined, { numeric: true }))
      .map((x) => cardOf(x, "inhouse")),
    empty: inHouse.length === 0,
    emptyText: tr("Nobody staying on."),
  };
  const colL = {
    id: "leaving",
    title: tr("Leaving"),
    dot: past ? "var(--danger)" : "var(--warn)",
    count: String(leavingIn.length),
    cards: leavingAll
      .slice()
      .sort((p, q) => Number(p.state === "out") - Number(q.state === "out") || q.m.balance - p.m.balance)
      .map((x) => cardOf(x, "leaving")),
    empty: leavingAll.length === 0,
    emptyText: tr("Everyone due out has gone."),
  };
  // A room given ahead that has since been closed: the stay needs another.
  const needs = stays.filter((x) => {
    if (x.state !== "booked" || x.roomId === null) return false;
    const r = rooms.find((y) => y.id === x.roomId);
    return r !== undefined && firstClosed(r, x.arrive < today ? today : x.arrive, x.depart) !== null;
  });
  const colN = {
    id: "needs",
    title: tr("Needs a room"),
    dot: "var(--danger)",
    count: String(needs.length),
    cards: needs
      .slice()
      .sort((p, q) => p.arrive.localeCompare(q.arrive))
      .map((x) => ({
        ...cardOf(x, "arriving"),
        sub: iso(`${x.ref} · ${strip(fDW(x.arrive))} → ${strip(fDW(x.depart))}`),
        meta: tr("Room {room} is out of service on their nights.", { room: x.room ?? "" }),
        keyOn: false,
        lateOn: false,
        primaryLabel: tr("Give a room ahead…"),
        primary: () => app.setState({ moveId: x.id, movePick: null, moveUp: null }),
      })),
    empty: false,
    emptyText: "",
  };
  const cols = past ? [colL, colA, colI] : [colA, colI, colL];
  v["columns"] = needs.length > 0 ? [colN, ...cols] : cols;
  const tmr = plus(today, 1);
  const tmrF = w.types.map((t) => nightFig(app, w, t.id, tmr));
  const tmrSell = tmrF.reduce((a, f) => a + f.cap, 0);
  const tmrSold = tmrF.reduce((a, f) => a + f.sold, 0);
  v["tomorrow"] = {
    label: iso(fLong(tmr)),
    arrivals: iso(String(stays.filter((x) => x.state === "booked" && x.arrive === tmr).length)),
    departures: iso(String(stays.filter((x) => holds(x) && x.depart === tmr).length)),
    open: iso(String(Math.max(0, tmrSell - tmrSold))),
    pct: pct(tmrSell ? tmrSold / tmrSell : 0),
    goCal: () => app.go("calendar"),
  };

  // ── search over names, references and emails
  const q = s.deskQuery.trim().toLowerCase();
  const match = (x: StV, needle: string) => x.name.toLowerCase().includes(needle) || x.ref.toLowerCase().includes(needle) || x.email.toLowerCase().includes(needle);
  const hitsAll = q.length < 2 ? [] : stays.filter((x) => match(x, q));
  v["deskQuery"] = s.deskQuery;
  v["refExample"] = stays.slice().sort((p, q) => q.arrive.localeCompare(p.arrive))[0]?.ref ?? "";
  v["onDeskQuery"] = (e: { target: { value: string } }) => app.setState({ deskQuery: e.target.value });
  v["onDeskQueryKey"] = (e: { key: string }) => {
    if (e.key === "Escape") app.setState({ deskQuery: "" });
  };
  v["searchHits"] = hitsAll.slice(0, 8).map((x) => {
    const p = deskPill(app, x);
    return { id: x.ref, name: x.name, tint: w.typeById[x.type]!.tint, sub: iso(`${x.ref} · ${strip(fD(x.arrive))}–${strip(fD(x.depart))}`), pill: p.label, pillBg: p.bg, pillFg: p.fg, go: () => openFolio(app, x.id, view ?? "today") };
  });
  v["hasResults"] = hitsAll.length > 0;
  v["noResults"] = q.length >= 2 && hitsAll.length === 0;
  v["hitsMore"] = hitsAll.length > 8 ? tr("See all {n} in Reservations", { n: hitsAll.length }) : tr("See all in Reservations");
  v["seeAll"] = () => app.go("reservations", { resQuery: app.state.deskQuery.trim(), resFilter: "all", resLimit: 50 });

  // ── take a booking / change a stay
  v["nb"] = nbVals(app, w);

  // ── the rack
  v["hk"] = hk;
  v["notHk"] = !hk;
  const statusOf = (r: RoomV) => roomStatus(r, today);
  v["rackLegend"] = (["ready", "occupied", "cleaning", "oos"] as RoomState[]).map((k) => {
    const on = s.rackFilter === k;
    return {
      id: k,
      label: statusWord(k),
      color: STATUS_COLOR[k],
      count: String(rooms.filter((r) => statusOf(r) === k).length),
      pressed: on ? "true" : "false",
      pick: () => app.setState({ rackFilter: on ? null : k }),
      border: on ? STATUS_COLOR[k] : "var(--border-strong)",
      bg: on ? "var(--surface-3)" : "var(--surface)",
      weight: on ? "800" : "700",
    };
  });
  v["rackFiltered"] = s.rackFilter !== null;
  v["rackFilterNote"] =
    s.rackFilter !== null
      ? fsi(rackCount(s.rackFilter as RoomState, rooms.filter((r) => statusOf(r) === s.rackFilter).length, rooms.length))
      : fsi(tr("{n} room|{n} rooms", { n: rooms.length }));
  v["clearRackFilter"] = () => app.setState({ rackFilter: null });
  const floors = [...new Set(rooms.map((r) => r.floor))].sort((a, b) => a - b);
  v["rackFloors"] = floors.map((fl) => {
    const rs = rooms.filter((r) => r.floor === fl && (s.rackFilter === null || statusOf(r) === s.rackFilter));
    return {
      id: `f${String(fl)}`,
      title: floorName(fl),
      display: rs.length === 0 ? "none" : "block",
      sub: s.rackFilter !== null ? fsi(tr("{n} of them here", { n: rs.length })) : fsi(tr("{n} room · {ready} ready|{n} rooms · {ready} ready", { n: rs.length, ready: rs.filter((r) => statusOf(r) === "ready").length })),
      rooms: rs.map((r) => {
        const t = w.typeById[r.type]!;
        const k = statusOf(r);
        const who = inRoom(w, r.id);
        const fact = hk ? roomFact(w, r.id, today) : null;
        const cl = r.closures.find((c) => c.from <= today && (c.to === null || today <= c.to));
        return {
          id: `r${r.n}`,
          n: r.n,
          typeName: t.name,
          icon: t.icon,
          tintFlat: t.flat,
          statusColor: STATUS_COLOR[k],
          statusLabel: statusWord(k),
          border: k === "occupied" ? "var(--border-strong)" : "var(--border)",
          // Out of service reads as set aside, not faded: its words keep their contrast.
          bg: k === "oos" ? "var(--surface-3)" : "var(--surface)",
          opacity: "1",
          hasWho: (!hk && who !== null) || fact !== null,
          who: fact ?? (who === null ? "" : tr("{name} · to {day}", { name: who.last || who.name, day: strip(fD(who.depart)) })),
          hasReason: cl !== undefined,
          reason: cl === undefined ? "" : (cl.reason ?? tr("Out of service")) + (cl.to !== null ? " · " + tr("back {day}", { day: strip(fD(plus(cl.to, 1))) }) : ""),
          hasNote: cl === undefined && r.note !== null && k === "ready" && !hk,
          note: r.note ?? "",
          label: tr("Room {room}, {type}, {status}", { room: r.n, type: t.name, status: statusInLine(k) }),
          canReady: k === "cleaning",
          canClean: hk && k === "ready",
          open: () => {
            if (!app.isHousekeeping()) openRoom(app, r.n);
          },
          tileCursor: hk ? "default" : "pointer",
          markReady: () => void setRoomStatus(app, r.n, "ready"),
          markClean: () => void setRoomStatus(app, r.n, "cleaning"),
        };
      }),
    };
  });

  // ── the calendar
  const days: string[] = [];
  for (let i = 0; i < 14; i += 1) days.push(plus(today, i));
  v["calCols"] = narrow ? "126px repeat(14,78px)" : "150px repeat(14,minmax(60px,1fr))";
  v["calMin"] = narrow ? "1240px" : "auto";
  v["calDays"] = days.map((dd) => {
    const wd = dow(dd);
    const isT = dd === today;
    const we = wd === 5 || wd === 6;
    const first = new Date(`${dd}T12:00:00Z`).getUTCDate() === 1;
    return {
      id: dd,
      wd: fWd(dd).toUpperCase(),
      dm: first ? strip(fD(dd)) : String(new Date(`${dd}T12:00:00Z`).getUTCDate()),
      wdFg: isT ? "var(--accent)" : we ? "var(--fg-muted)" : "var(--fg-subtle)",
      dmFg: isT ? "var(--accent)" : "var(--fg)",
    };
  });
  v["calRows"] = w.types.map((t) => ({
    id: t.id,
    name: t.name,
    flat: t.flat,
    cells: days.map((dd) => {
      const f = nightFig(app, w, t.id, dd);
      const ratio = f.cap ? f.sold / f.cap : 0;
      const rgb = hexRgb(t.flat);
      return {
        id: t.id + dd,
        label: f.cap ? iso(`${String(f.sold)}/${String(f.cap)}`) : iso("—"),
        aria: f.cap ? tr("{type}, {day}: {sold} of {n} sold", { type: t.name, day: strip(fDW(dd)), sold: f.sold, n: f.cap }) : tr("{type}, {day}: no room to sell", { type: t.name, day: strip(fDW(dd)) }),
        bg: f.cap ? `rgba(${String(rgb[0])},${String(rgb[1])},${String(rgb[2])},${alphaOf(ratio).toFixed(2)})` : "var(--surface-3)",
        border: f.cap && f.sold >= f.cap ? "var(--danger)" : dd === s.calDay ? "var(--accent)" : "var(--border)",
        // The house's own colour, however full: the figure in whichever ink reads better on it.
        fg: f.cap ? inkOn(rgb, alphaOf(ratio), s.theme) : "var(--fg-subtle)",
        full: f.cap > 0 && f.sold >= f.cap,
        go: () => app.setState({ calDay: app.state.calDay === dd ? null : dd }),
      };
    }),
  }));
  v["calTotals"] = days.map((dd) => {
    const fs = w.types.map((t) => nightFig(app, w, t.id, dd));
    const cap = fs.reduce((a, f) => a + f.cap, 0);
    const sd = fs.reduce((a, f) => a + f.sold, 0);
    const ratio = cap ? sd / cap : 0;
    const full = cap > 0 && sd >= cap;
    return {
      id: `t${dd}`,
      label: cap ? iso(`${String(sd)}/${String(cap)}`) : iso("—"),
      pct: pct(ratio),
      bg: full ? "var(--danger-soft)" : ratio >= 0.85 ? "var(--warn-soft)" : "var(--surface-3)",
      fg: full ? "var(--danger)" : ratio >= 0.85 ? "var(--warn)" : "var(--fg-muted)",
      border: dd === s.calDay ? "var(--accent)" : "var(--border)",
      go: () => app.setState({ calDay: app.state.calDay === dd ? null : dd }),
    };
  });
  v["dayOpen"] = s.calDay !== null;
  if (s.calDay !== null) {
    const dd = s.calDay;
    const fs = w.types.map((t) => nightFig(app, w, t.id, dd));
    const cap = fs.reduce((a, f) => a + f.cap, 0);
    const sd = fs.reduce((a, f) => a + f.sold, 0);
    // Leaving that day: only guests who are (or will by then be) in the house, or who checked out that day.
    const arr = stays.filter((x) => holds(x) && x.arrive === dd);
    const dep = stays.filter((x) => (x.state === "out" && x.checkedOut?.date === dd) || (x.depart === dd && (x.state === "in" || (x.state === "booked" && x.arrive >= today))));
    const p = parkingOn(app, w, dd);
    v["day"] = {
      label: fLong(dd),
      sold: String(sd),
      sellable: String(cap),
      pct: pct(cap ? sd / cap : 0),
      cols: narrow ? "1fr" : "1fr 1fr",
      arrCount: String(arr.length),
      depCount: String(dep.length),
      parking: fsi(tr("{taken} of {spaces}", { taken: p.taken, spaces: p.spaces })),
      arrivals: arr.map((x) => ({ id: x.ref, name: x.name, flat: w.typeById[x.type]!.flat, sub: iso(`${x.ref} · ${strip(nights(nightsOf(x.arrive, x.depart)))} · ${w.typeById[x.type]!.code}`), go: () => openFolio(app, x.id, "calendar") })),
      departures: dep.map((x) => ({
        id: x.ref,
        name: x.name,
        flat: w.typeById[x.type]!.flat,
        sub: iso(`${x.ref} · ${x.arrive > today ? tr("arrives {day}", { day: strip(fDW(x.arrive)) }) : tr("in since {day}", { day: strip(fD(x.arrive)) })}`),
        go: () => openFolio(app, x.id, "calendar"),
      })),
      noArrivals: arr.length === 0,
      noDepartures: dep.length === 0,
      turnNote: tr("A stay counts the nights from arrival up to but not including departure, so a room given up in the morning is open again that same night."),
      close: () => app.setState({ calDay: null }),
    };
  } else v["day"] = { arrivals: [], departures: [] };

  // ── reservations
  const filters: { id: string; label: string; fn: (x: StV) => boolean; empty: string }[] = [
    { id: "all", label: tr("Everything"), fn: () => true, empty: tr("Nothing on the books.") },
    { id: "arriving", label: tr("Arriving today"), fn: (x) => x.state === "booked" && x.arrive === today, empty: tr("Nobody else is arriving today.") },
    { id: "inhouse", label: tr("In house"), fn: (x) => x.state === "in", empty: tr("Nobody in the house.") },
    { id: "leaving", label: tr("Leaving today"), fn: (x) => (x.state === "in" && x.depart === today) || (x.state === "out" && x.checkedOut?.date === today), empty: tr("Nobody leaving today.") },
    { id: "soon", label: tr("Still to come"), fn: (x) => x.state === "booked" && x.arrive > today, empty: tr("Nothing still to come.") },
    { id: "cancelled", label: tr("Cancelled"), fn: (x) => x.state === "cancelled", empty: tr("No cancellations.") },
    { id: "noshow", label: tr("No-shows"), fn: (x) => x.state === "noshow", empty: tr("No no-shows.") },
    { id: "giveback", label: tr("To give back"), fn: (x) => toGiveBack(x) > 0.004, empty: tr("Nothing to give back.") },
  ];
  const rq = s.resQuery.toLowerCase();
  const pool = rq ? stays.filter((x) => match(x, rq)) : stays;
  v["resFilters"] = filters.map((f) => {
    const on = s.resFilter === f.id;
    return {
      id: f.id,
      label: f.label,
      count: String(pool.filter(f.fn).length),
      pressed: on ? "true" : "false",
      go: () => app.setState({ resFilter: f.id, resLimit: 50 }),
      bg: on ? "var(--accent)" : "var(--surface)",
      fg: on ? "var(--accent-fg)" : "var(--fg-muted)",
      border: on ? "var(--accent)" : "var(--border-strong)",
    };
  });
  const af = filters.find((f) => f.id === s.resFilter) ?? filters[0]!;
  const shown = pool.filter(af.fn).sort((p, q2) => (p.id === s.newId ? -1 : q2.id === s.newId ? 1 : 0) || p.arrive.localeCompare(q2.arrive) || p.ref.localeCompare(q2.ref));
  v["resQueryOn"] = !!s.resQuery;
  v["resQuery"] = s.resQuery;
  v["clearResQuery"] = () => app.setState({ resQuery: "" });
  v["resCols"] = narrow ? "minmax(0,1fr) 96px 84px 74px" : "minmax(0,1.5fr) 168px minmax(0,1fr) 128px 92px";
  v["resRows"] = shown.slice(0, s.resLimit).map((x) => {
    const t = w.typeById[x.type]!;
    const p = deskPill(app, x);
    const dead = x.state === "cancelled" || x.state === "noshow";
    const back = toGiveBack(x);
    const bal = dead ? -back : x.m.balance;
    return {
      id: x.ref,
      name: x.name,
      ref: x.ref,
      flat: t.flat,
      typeName: t.name,
      range: iso(`${strip(fD(x.arrive))}–${strip(fD(x.depart))}`),
      pill: p.label,
      pillBg: p.bg,
      pillFg: p.fg,
      lateOn: x.state === "cancelled" && x.late,
      balance: dead && Math.abs(bal) < 0.005 ? iso("—") : runMoney(bal),
      balFg: dead && Math.abs(bal) < 0.005 ? "var(--fg-subtle)" : bal > 0.004 ? "var(--fg)" : bal < -0.004 ? "var(--warn)" : "var(--pos)",
      isNew: x.id === s.newId,
      rowBg: x.id === s.newId ? "var(--accent-soft)" : "transparent",
      go: () => openFolio(app, x.id, "reservations"),
    };
  });
  v["resEmpty"] = shown.length === 0;
  v["resEmptyText"] = rq ? tr("Nobody matching “{q}” here.", { q: s.resQuery }) : af.empty;
  v["resMore"] = shown.length > s.resLimit;
  v["showMore"] = () => app.setState({ resLimit: app.state.resLimit + 50 });
  v["resCount"] = fsi(tr("{shown} of {n} shown · {all} on the books", { shown: Math.min(shown.length, s.resLimit), n: shown.length, all: stays.length }));

  // ── the folio
  const fst = app.stay(s.folioId);
  v["fo"] = fst === null ? { rows: [], chips: [], actions: [] } : folioVals(app, w, fst);
  return v;
}

/** Take a booking, or change one. */
function nbVals(app: HouseApp, w: WorldV): V {
  const s = app.state;
  const nb = s.nb;
  if (nb === null) return { types: [], extras: [], times: [], nightRows: [], extraLines: [], languages: [] };
  const today = app.day;
  const narrow = app.narrow();
  const ed = s.editId === null ? null : app.stay(s.editId);
  const inStay = ed !== null && ed.state === "in";
  const nbN = nightsOf(nb.arrive, nb.depart);
  const nbProblem = app.problemOf(nb.arrive, nb.depart, true);
  const picked = app.pickedExtras(nb);
  const type = inStay ? ed.type : nb.type;
  const t = type === null ? null : w.typeById[type] ?? null;

  // What Adminium would write: a new stay's price, or the change to this one.
  let draft: QuoteReply | undefined;
  let draftErr: unknown;
  if (t !== null && nbProblem === null) {
    if (ed === null) {
      const a = app.quote(t.id, nb.arrive, nb.depart, nb.guests, picked);
      draft = a.value;
      draftErr = a.error;
    } else {
      const changed = nbChanged(ed, nb);
      const toggles = w.extras.filter((e) => !!nb.extras[e.id] !== ed.extras.includes(e.id)).map((e) => ({ extraId: Number(e.id), on: !!nb.extras[e.id] }));
      const a = app.ask(`quote-edit:${String(ed.id)}:${JSON.stringify(changed)}:${JSON.stringify(toggles)}`, () => app.ports.desk!.quoteEdit(ed.id, changed, toggles));
      draft = a.value;
      draftErr = a.error;
    }
  }
  // Someone already on the books under this email, not yet asked about.
  const em = nb.email.trim().toLowerCase();
  const knownAsk = okEmail(em) && !(ed !== null && ed.email.toLowerCase() === em) ? app.ask(`guest-by-email:${em}`, () => app.ports.desk!.guestByEmail(em)).value : null;
  const known = knownAsk ?? null;
  const knownFirst = known === null ? "" : String(known.customer["first_name"] ?? "");
  const knownName = known === null ? "" : `${knownFirst} ${String(known.customer["last_name"] ?? "")}`.trim();
  const linkWait = known !== null && nb.link === null;
  // More guests than the room sleeps: Adminium refuses the quote, and the desk says it in its own words.
  const refused = draftErr as { code?: string; params?: Record<string, unknown> } | undefined;
  const small = t !== null && refused?.code === "VALIDATION_FAILED" && refused.params?.["column"] === "guests" && refused.params?.["reason"] === "too-many";
  const nbStop = small ? tr("A {type} sleeps {n}.", { type: t.name, n: t.sleeps }) : draftErr !== undefined ? app.refused(draftErr) : "";
  const saveOk = draft !== undefined && nbProblem === null && !s.nbBusy && !nbStop && !linkWait;
  const setN = (k: keyof typeof nb) => (e: { target: { value: string } }) => {
    const cur = app.state.nb!;
    app.setState({ nb: { ...cur, [k]: e.target.value, ...(k === "email" ? { link: null } : {}) } });
  };
  const nbFirstErr = s.nbTouched && !nb.first.trim() ? tr("Their first name") : "";
  const nbLastErr = s.nbTouched && !nb.last.trim() ? tr("Their surname") : "";
  const total = draft === undefined ? undefined : Number(draft.data["total"]).toFixed(2);
  const lines = (draft?.children?.stay_extras ?? [])
    .map((c) => c.data as Record<string, unknown>)
    .filter((d) => d["state"] !== "off")
    .map((d, i) => ({ id: `x${String(i)}`, label: String(d["label"]), amount: money(d["amount"]), detail: extraDetail(String(d["per"]), Number(d["guests"]), Number(d["nights"]), w.H.lateUntil) }));
  return {
    title: ed !== null ? tr("Change {ref}", { ref: ed.ref }) : tr("Take a booking"),
    intro:
      ed !== null
        ? tr("The stay as it is on the books. Change what you need. The nights are priced again only when the dates or the room type change.")
        : tr("Someone on the telephone, or standing at the desk. Same rooms, same rates as the site — the whole account is settled on the day they leave."),
    editing: ed !== null,
    notEditing: ed === null,
    cols: narrow ? "1fr" : "minmax(0,1fr) minmax(280px,340px)",
    typeCols: "repeat(auto-fit,minmax(220px,1fr))",
    fieldCols: "repeat(auto-fit,minmax(200px,1fr))",
    arrive: nb.arrive,
    depart: nb.depart,
    guests: String(nb.guests),
    minDate: inStay ? nb.arrive : today,
    minDepart: plus(nb.arrive, 1),
    arriveLocked: inStay,
    onArrive: (e: { target: { value: string } }) => {
      const cur = app.state.nb!;
      const a = e.target.value || cur.arrive;
      app.setState({ nb: { ...cur, arrive: a, depart: nightsOf(a, cur.depart) < 1 ? plus(a, 1) : cur.depart } });
    },
    onDepart: setN("depart"),
    onGuests: (e: { target: { value: string } }) => app.setState({ nb: { ...app.state.nb!, guests: Number(e.target.value) } }),
    problemOn: nbProblem !== null,
    problem: nbProblem?.msg ?? "",
    typeLocked: inStay,
    // an in-house stay leaves early by checking out.
    earlyNote: inStay && nb.depart < ed.depart ? tr("To leave early, use Check out.") : "",
    types: w.types.map((x) => {
      const tooSmall = nb.guests > x.sleeps;
      const left = nbProblem !== null || tooSmall ? 0 : freeAcross(app, w, x.id, nb.arrive, nb.depart, s.editId);
      const q = left > 0 && nbN >= 1 ? app.quote(x.id, nb.arrive, nb.depart, nb.guests).value : undefined;
      const on = type === x.id;
      const ok = !inStay && left > 0;
      return {
        id: x.id,
        name: x.name,
        tintFlat: x.flat,
        icon: x.icon,
        sleeps: tr("sleeps {n}", { n: x.sleeps }),
        pressed: on ? "true" : "false",
        left: tooSmall ? tr("too small for {n}", { n: nb.guests }) : left > 0 ? tr("{n} open", { n: left }) : tr("nothing open"),
        leftFg: left > 0 && !tooSmall ? (on ? "var(--fg)" : "var(--pos)") : "var(--fg-subtle)",
        total: q !== undefined ? money(q.data["room_total"]) : iso("—"),
        pick: () => {
          if (ok) app.setState({ nb: { ...app.state.nb!, type: x.id }, nbErr: "" });
        },
        border: on ? "var(--accent)" : "var(--border-strong)",
        bg: on ? "var(--accent-soft)" : "var(--surface)",
        opacity: on || ok ? "1" : ".5",
        cursor: ok ? "pointer" : "not-allowed",
        disabled: !ok && !on,
      };
    }),
    first: nb.first,
    last: nb.last,
    email: nb.email,
    mobile: nb.mobile,
    note: nb.note,
    onFirst: setN("first"),
    onLast: setN("last"),
    onEmail: setN("email"),
    onMobile: setN("mobile"),
    onNote: setN("note"),
    onTime: setN("arrivalTime"),
    // the language their emails are written in.
    language: nb.language,
    onLanguage: setN("language"),
    languages: LOCALE_TAGS.map((tag) => ({ value: tag, label: new Intl.DisplayNames([tag], { type: "language" }).of(tag) ?? tag })),
    firstErrOn: !!nbFirstErr,
    firstErr: nbFirstErr,
    firstInv: nbFirstErr ? "true" : "false",
    firstBorder: nbFirstErr ? "var(--danger)" : "var(--border-strong)",
    lastErrOn: !!nbLastErr,
    lastErr: nbLastErr,
    lastInv: nbLastErr ? "true" : "false",
    lastBorder: nbLastErr ? "var(--danger)" : "var(--border-strong)",
    times: timeOptions(nb.arrivalTime, w.H.lateArrival),
    arrivalTime: nb.arrivalTime,
    extras: w.extras.map((e) => {
      const on = !!nb.extras[e.id];
      return {
        id: e.id,
        label: e.label,
        how: e.how,
        icon: e.icon,
        pressed: on ? "true" : "false",
        toggle: () => {
          const cur = app.state.nb!;
          app.setState({ nb: { ...cur, extras: { ...cur.extras, [e.id]: !on } } });
        },
        border: on ? "var(--accent)" : "var(--border-strong)",
        bg: on ? "var(--accent-soft)" : "var(--surface-2)",
        knobBg: on ? "var(--accent)" : "var(--border-strong)",
        knobX: on ? "16px" : "2px",
      };
    }),
    chosen: draft !== undefined,
    nothingChosen: draft === undefined,
    typeName: t?.name ?? "",
    range: iso(`${strip(fDW(nb.arrive))} → ${strip(fDW(nb.depart))}`),
    nightsLabel: nbN >= 1 ? nights(nbN) : iso("—"),
    nightRows: (draft?.nights ?? []).map((r) => ({ id: r.date, label: iso(strip(fDW(r.date)) + (r.tags.length ? ` · ${r.tags.join(" · ")}` : "")), amount: money(r.rate) })),
    roomSub: draft === undefined ? "" : money(draft.data["room_total"]),
    extraLines: lines,
    knownOn: known !== null,
    knownLine: known === null ? "" : tr("{name} already stays with us ({n} reservation)|{name} already stays with us ({n} reservations)", { name: knownName, n: known.stays }),
    linkYesLabel: known === null ? "" : tr("Link to {first}", { first: knownFirst }),
    linkYes: () => app.setState({ nb: { ...app.state.nb!, link: "yes" } }),
    linkNo: () => app.setState({ nb: { ...app.state.nb!, link: "no" } }),
    linkYesPressed: nb.link === "yes" ? "true" : "false",
    linkNoPressed: nb.link === "no" ? "true" : "false",
    linkYesBg: nb.link === "yes" ? "var(--accent)" : "var(--surface)",
    linkYesFg: nb.link === "yes" ? "var(--accent-fg)" : "var(--fg)",
    linkNoBg: nb.link === "no" ? "var(--accent)" : "var(--surface)",
    linkNoFg: nb.link === "no" ? "var(--accent-fg)" : "var(--fg)",
    stopOn: !!nbStop,
    stop: nbStop,
    taxLabel: taxWords(w.H.taxLabel, w.H.taxRate),
    tax: draft === undefined ? "" : money(draft.data["tax"]),
    total: draft === undefined ? "" : money(draft.data["total"]),
    oldTotal: ed === null ? "" : money(ed.m.total),
    compare: ed !== null && draft !== undefined,
    errOn: !!s.nbErr,
    err: s.nbErr,
    canSave: saveOk,
    cantSave: !saveOk,
    busy: s.nbBusy,
    btnBg: saveOk ? "var(--accent)" : "var(--surface-3)",
    btnFg: saveOk ? "var(--accent-fg)" : "var(--fg-subtle)",
    btnCursor: saveOk ? "pointer" : "not-allowed",
    btnLabel: s.nbBusy
      ? tr("Saving…")
      : linkWait
        ? tr("Link them or book without linking")
        : ed !== null
          ? tr("Save the changes")
          : draft !== undefined
            ? tr("Put it in the book")
            : tr("Pick a room type first"),
    showCheckIn: ed === null && draft !== undefined && nb.arrive === today && nbProblem === null,
    confirm: () => {
      if (saveOk) void saveNb(app, false, known === null ? null : { customerId: known.customer.id }, total);
      else if (!nb.first.trim() || !nb.last.trim()) void saveNb(app, false, null, total);
    },
    confirmCheckIn: () => {
      if (saveOk) void saveNb(app, true, known === null ? null : { customerId: known.customer.id }, total);
    },
    refLine: ed !== null ? ed.ref : tr("Given when you save"),
    foot: ed !== null ? tr("Changing the dates or the room type prices the nights again at today's rates.") : tr("The reference is given when you save."),
    emailHint: tr("Without an email we cannot send a confirmation."),
    cancelEdit: () => {
      const id = app.state.editId;
      app.setState({ editId: null, nb: null });
      if (id !== null) openFolio(app, id, app.state.folioBack);
    },
  };
}

/** A stay's folio: every line, its running balance, and what the desk can do next. */
export function folioVals(app: HouseApp, w: WorldV, fst: StV): V {
  const s = app.state;
  const today = app.day;
  const narrow = app.narrow();
  const t = w.typeById[fst.type]!;
  const folio = folioOf(app, fst.id);
  const rows: V[] = [];
  let run = 0;
  const r2 = (x: number) => Math.round(x * 100) / 100;
  const row = (o: V) =>
    rows.push({ hasDetail: !!o["detail"], weight: "600", labelFg: "var(--fg)", amountFg: "var(--fg)", rowBg: "transparent", strike: "none", menu: false, menuOpen: false, lockOn: false, tipOpen: false, ...o });
  const boss = app.isManager();
  // Voids are a manager's: the desk sees why there is no menu on hover or focus.
  const voidable = (key: string, target: NonNullable<typeof s.voidT>) => ({
    menu: boss,
    menuOpen: boss && s.rowMenu === key,
    menuKey: key,
    lockOn: !boss,
    tipOpen: !boss && s.tipKey === key,
    showTip: () => {
      if (app.state.tipKey !== key) app.setState({ tipKey: key });
    },
    hideTip: () => {
      if (app.state.tipKey === key) app.setState({ tipKey: null });
    },
    toggleMenu: () => app.setState({ rowMenu: app.state.rowMenu === key ? null : key }),
    askVoid: () => app.setState({ rowMenu: null, voidT: target, voidReason: "", voidTouched: false }),
  });
  const nl = folio?.nights ?? [];
  nl.forEach((r, i) => {
    run = r2(run + r.rate);
    row({ id: `n${String(i)}`, label: strip(fDW(r.date)), detail: r.tags.join(" · "), amount: money(r.rate), balance: money(run) });
  });
  row({ id: "ns", label: strip(nights(nl.length || fst.nightsN)), detail: "", amount: money(fst.m.room), balance: money(run), weight: "800", labelFg: "var(--fg-muted)", amountFg: "var(--fg-muted)", rowBg: "var(--surface-2)" });
  fst.lines
    .filter((l) => l.on)
    .forEach((l) => {
      run = r2(run + l.amount);
      row({ id: `x${String(l.id)}`, label: l.label, detail: extraDetail(l.per, l.guests, l.nights, w.H.lateUntil), amount: money(l.amount), balance: money(run) });
    });
  fst.charges.forEach((c) => {
    if (!c.voided) run = r2(run + c.amount);
    const key = `charge:${String(c.id)}`;
    row({
      id: `c${String(c.id)}`,
      label: c.label + (c.note && c.note !== c.label ? ` — ${c.note}` : ""),
      amount: money(c.amount),
      balance: runMoney(run),
      detail: c.voided ? tr("Voided — {reason}", { reason: c.voidReason }) : tr("{day} · added by {name}", { day: strip(fDW(c.date)), name: c.by }),
      strike: c.voided ? "line-through" : "none",
      labelFg: c.voided ? "var(--fg-subtle)" : "var(--fg)",
      amountFg: c.voided ? "var(--fg-subtle)" : "var(--fg)",
      ...(c.voided ? {} : voidable(key, { table: "charges", id: c.id, amount: c.amount, what: c.label, isPay: false, stay: fst.id })),
    });
  });
  // the nights not stayed are Adminium's own line, with no front-desk menu.
  fst.credits.forEach((c) => {
    if (!c.voided) run = r2(run - c.amount);
    row({
      id: `k${String(c.id)}`,
      label: creditLabel(c),
      amount: iso(`− ${strip(money(c.amount))}`),
      balance: runMoney(run),
      detail: c.voided ? tr("Voided — {reason}", { reason: c.voidReason }) : strip(fDW(c.date)),
      strike: c.voided ? "line-through" : "none",
      labelFg: c.voided ? "var(--fg-subtle)" : "var(--fg)",
      amountFg: c.voided ? "var(--fg-subtle)" : "var(--pos)",
      ...(c.voided || !boss ? {} : { ...voidable(`credit:${String(c.id)}`, { table: "stay_credits", id: c.id, amount: c.amount, what: creditLabel(c), isPay: false, stay: fst.id }), lockOn: false }),
    });
  });
  run = r2(run + fst.m.tax);
  row({ id: "tx", label: taxWords(fst.m.taxLabel || w.H.taxLabel, fst.m.taxRate || w.H.taxRate), detail: "", amount: money(fst.m.tax), balance: money(run), labelFg: "var(--fg-muted)", amountFg: "var(--fg-muted)" });
  const dead = fst.state === "cancelled" || fst.state === "noshow";
  const paid = fst.m.paid;
  if (dead) {
    for (const x of rows) {
      x["labelFg"] = "var(--fg-subtle)";
      x["amountFg"] = "var(--fg-subtle)";
    }
    // A cancelled stay or a no-show keeps its figures as booked; none of it is charged.
    const off = r2(run);
    if (off > 0.004) {
      run = r2(run - off);
      const label =
        fst.state === "noshow" ? tr("No-show — nothing is charged") : fst.cancelCode === "house" ? tr("Cancelled by the house — nothing is charged") : tr("Cancelled — nothing is charged");
      row({ id: "cx", label, detail: "", amount: iso(`− ${strip(money(off))}`), balance: money(run), weight: "800", rowBg: "var(--surface-2)" });
    }
  }
  fst.pays.forEach((p) => {
    const back = p.kind === "given_back";
    if (!p.voided) run = r2(back ? run + p.amount : run - p.amount);
    const how = p.method === "cash" ? tr("Cash") : p.method === "transfer" ? tr("Transfer") : tr("Card");
    row({
      id: `p${String(p.id)}`,
      // money given back is its own line.
      label: back ? tr("Given back · {how} · recorded by {name}", { how, name: p.by }) : tr("{how} · recorded by {name}", { how, name: p.by }),
      amount: back ? iso(`+ ${strip(money(p.amount))}`) : iso(`− ${strip(money(p.amount))}`),
      balance: runMoney(run),
      detail: p.voided ? tr("Voided — {reason}", { reason: p.voidReason }) : strip(fDW(p.date)) + (p.refNo ? ` · ${tr("ref {ref}", { ref: p.refNo })}` : "") + (p.note ? ` · ${p.note}` : ""),
      strike: p.voided ? "line-through" : "none",
      amountFg: p.voided ? "var(--fg-subtle)" : back ? "var(--warn)" : "var(--pos)",
      labelFg: p.voided ? "var(--fg-subtle)" : "var(--fg)",
      rowBg: "var(--surface-2)",
      ...(p.voided ? {} : voidable(`pay:${String(p.id)}`, { table: "payments", id: p.id, amount: p.amount, what: p.method === "cash" ? tr("cash") : p.method === "transfer" ? tr("transfer") : tr("card"), isPay: true, stay: fst.id })),
    });
  });
  const bal = fst.m.balance;
  const p = deskPill(app, fst);
  const rm = fst.roomId === null ? null : w.rooms.find((r) => r.id === fst.roomId) ?? null;
  const A: V[] = [];
  const act = (id: string, label: string, icon: string, fn: () => void, primary = false) => A.push({ id, label, icon, go: fn, primary, secondary: !primary });
  const charge = () => app.setState({ chargeOpen: true, chargePick: null, chargeNote: "", chargeAmt: "", chargeTouched: false });
  const giveBack = dead ? paid : Math.max(0, -bal);
  if (fst.state === "booked") {
    if (fst.arrive <= today) act("ci", tr("Check in"), "log-in", () => openCheckin(app, fst.id), true);
    act("ch", tr("Change"), "pencil", () => openEdit(app, fst));
    if (fst.arrive <= plus(today, 1) && keepDays(today, fst)) act("lt", tr("They will be late…"), "clock", () => app.setState({ expectId: fst.id, expectPick: fst.expectBy }));
    act("cx", tr("Cancel"), "calendar-x", () => app.askCancel(fst.id, "desk"));
    if (fst.arrive <= today && noShowFrom(app, w, fst)) act("ns", tr("Mark as a no-show"), "user-x", () => void markNoShow(app, fst));
    act("ac", tr("Add a charge"), "plus", charge);
    act("rp", tr("Record a payment"), "wallet", () => openSettle(app, fst.id));
  } else if (fst.state === "in") {
    act("ac", tr("Add a charge"), "plus", charge);
    act("rp", tr("Record a payment"), "wallet", () => openSettle(app, fst.id));
    act("mv", tr("Move to another room"), "arrow-left-right", () => app.setState({ moveId: fst.id, movePick: null, moveUp: null }));
    act("ch", tr("Change"), "pencil", () => openEdit(app, fst));
    act("co", tr("Check out"), "log-out", () => app.setState({ checkoutId: fst.id, coMode: "booked" }), true);
  } else if (fst.state === "noshow" && nightsLeft(today, fst) >= 1) {
    act("ca", tr("They came after all"), "undo-2", () => void cameAfterAll(app, fst));
  }
  // Checked out, with Invoices & Receipts: the folio printed or emailed.
  if (fst.state === "out" && app.folioOn) {
    // Printing opens Adminium's document page, which a screens-only role cannot reach yet: a manager prints.
    if (app.canPrint()) act("pr", tr("Print the folio"), "printer", () => void printFolio(app, fst));
    act("em", tr("Email the folio"), "mail", () => void emailFolio(app, fst));
  }
  if (giveBack > 0.004 && fst.state !== "in" && fst.state !== "booked") act("gb", tr("Record money given back"), "wallet", () => openSettle(app, fst.id, giveBack.toFixed(2), giveBack, "given_back"));
  A.sort((x, y) => Number(x["primary"]) - Number(y["primary"]));
  const backs: Partial<Record<View, string>> = { reservations: tr("All reservations"), calendar: tr("The calendar"), rack: tr("The room rack"), newbooking: tr("Take a booking") };
  const liveCharges = fst.charges.filter((c) => !c.voided).length;
  const late = hasExtra(w, fst, "LATE");
  return {
    back: () => app.go(app.state.folioBack),
    backLabel: backs[s.folioBack] ?? tr("The board"),
    tint: t.tint,
    icon: t.icon,
    name: fst.name,
    ref: fst.ref,
    pill: p.label,
    pillBg: p.bg,
    pillFg: p.fg,
    range: iso(`${strip(fDW(fst.arrive))} → ${strip(fDW(fst.depart))}`),
    nightsLabel: nights(nightsOf(fst.arrive, fst.depart)),
    roomLine:
      fst.room !== null
        ? tr("Room {room} · {floor}", { room: fst.room, floor: rm === null ? "" : floorInLine(rm.floor) }) + (fst.given && fst.state === "booked" ? ` · ${tr("given ahead")}` : "")
        : fst.state === "booked"
          ? tr("No room given yet — the desk gives one when they arrive")
          : t.name,
    rowCols: narrow ? "minmax(0,1fr) 92px 28px" : "minmax(0,1fr) 110px 110px 28px",
    rows,
    chips: [
      { id: "c1", label: tr("Nights"), value: iso(String(nl.length || fst.nightsN)) },
      { id: "c2", label: tr("Extras and charges"), value: iso(String(fst.lines.filter((l) => l.on).length + liveCharges)) },
      { id: "c3", label: tr("Payments"), value: iso(String(fst.pays.filter((q) => !q.voided).length)) },
    ],
    onTheDay:
      fst.state === "cancelled"
        ? tr("Cancelled on {day}", { day: strip(fDW(fst.cancelled?.date ?? today)) }) + (fst.late ? ` · ${tr("late")}` : "")
        : fst.state === "noshow"
          ? tr("Marked as a no-show on {day} {time}", { day: strip(fDW(fst.noShow?.date ?? today)), time: strip(fT(fst.noShow?.time ?? "")) })
          : fst.state === "out"
            ? tr("Checked out {day} at {time}.", { day: strip(fDW(fst.checkedOut?.date ?? today)), time: strip(fT(fst.checkedOut?.time ?? "")) })
            : fst.depart === today
              ? tr("Leaving today by {time}.", { time: strip(fT(late ? w.H.lateUntil : w.H.leaveBy)) })
              : fst.state === "in"
                ? tr("In the house until {day}.", { day: strip(fDW(fst.depart)) })
                : fst.expectBy !== null && fst.expectBy >= today
                  ? tr("Expected {day} — the room is kept.", { day: strip(fDW(fst.expectBy)) })
                  : tr("Arrives {day}, from {time}.", { day: strip(fDW(fst.arrive)), time: strip(fT(w.H.arriveFrom)) }),
    dueLabel: dead ? (paid > 0.004 ? tr("To give back") : tr("Nothing owing")) : bal > 0.004 ? tr("Balance to settle") : bal < -0.004 ? tr("To give back") : tr("Nothing owing"),
    balance: dead ? (paid > 0.004 ? fsi(tr("{amount} to give back", { amount: strip(money(paid)) })) : money(0)) : bal < -0.004 ? fsi(tr("{amount} to give back", { amount: strip(money(-bal)) })) : money(Math.max(0, bal)),
    dueAmount: dead ? money(paid) : money(Math.abs(bal)),
    balFg: dead ? (paid > 0.004 ? "var(--warn)" : "var(--pos)") : bal > 0.004 ? (fst.depart === today ? "var(--danger)" : "var(--fg)") : bal < -0.004 ? "var(--warn)" : "var(--pos)",
    giveBackOn: giveBack > 0.004 && fst.state !== "in" && fst.state !== "booked",
    giveBack: tr("{amount} was recorded — record it as given back when it goes back to them.", { amount: strip(money(giveBack)) }),
    actions: A,
    hasActions: A.length > 0,
    blocked: s.blockId === fst.id && bal > 0.004,
    blockTitle: tr("There is still {amount} on this account.", { amount: strip(money(bal)) }),
    blockBody: tr("We do not check anybody out with a balance. Record the payment — card, cash or a transfer — and this will go straight through. Nothing about the room changes until it does."),
  };
}
