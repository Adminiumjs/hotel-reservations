/**
 * What the guest site shows: the home page and its search, the rooms, finding
 * the house, what is open for the dates and what it costs, one room type,
 * reserving, the confirmation, signing in, the guest's reservations and one of
 * them. The values are the design's; what is open comes from Adminium's night
 * availability and every price from its dry run.
 */
import type { NightAnswer, QuoteReply, TypeAvailability } from "../../data/wire.ts";
import { key, locale, tr } from "../../i18n/tr.ts";
import { days, dow, fD, fDW, fT, guestsW, fsi, iso, money, money0, nights, nightsOf, people, plus, strip, taxWords } from "../fmt.ts";
import { okEmail, type HouseApp } from "../house.ts";
import type { ExtraV, StV, TypeV, WorldV } from "../world.ts";

type V = Record<string, unknown>;

export function pillOf(kind: string): [string, string] {
  const P: Record<string, [string, string]> = {
    info: ["var(--info-soft)", "var(--info)"],
    pos: ["var(--pos-soft)", "var(--pos)"],
    warn: ["var(--warn-soft)", "var(--warn)"],
    danger: ["var(--danger-soft)", "var(--danger)"],
    mute: ["var(--surface-3)", "var(--fg-subtle)"],
    plain: ["var(--surface-3)", "var(--fg-muted)"],
  };
  return P[kind] ?? P["plain"]!;
}

/** A feature's icon, from what it says. */
export function hasIcon(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("sofa") || l.includes("sitting")) return "sofa";
  if (l.includes("bed")) return "bed-double";
  if (l.includes("bath") || l.includes("shower")) return "shower-head";
  if (l.includes("wifi")) return "wifi";
  if (l.includes("tea")) return "coffee";
  if (l.includes("desk") || l.includes("lamp")) return "lamp-desk";
  if (l.includes("garden")) return "trees";
  if (l.includes("water")) return "waves";
  if (l.includes("robe")) return "shirt";
  if (l.includes("window")) return "sun";
  return "check";
}

export const sleepsLine = (n: number) => tr("Sleeps {n}", { n });

/** The house in figures: each counted by its own plural, as a list. */
function houseFacts(rooms: number, floors: number, kinds: number): string {
  return [tr("{n} room|{n} rooms", { n: rooms }), tr("{n} floor|{n} floors", { n: floors }), tr("{n} kind of room|{n} kinds of room", { n: kinds })].map(strip).join(" · ");
}

/** Floors a list of rooms is spread over, said as a sentence. */
export function floorSpread(floors: number[]): string {
  const fs = [...new Set(floors)].sort((a, b) => a - b);
  if (fs.length === 1) return tr("On floor {a}", { a: fs[0]! });
  if (fs.length === 2) return tr("On floors {a} and {b}", { a: fs[0]!, b: fs[1]! });
  return tr("On every floor");
}

/** The times a guest may say they will come. */
export function timeOptions(current: string, lateNote = "") {
  const list = ["15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "22:30"];
  if (current && !list.includes(current)) list.push(current);
  list.sort();
  return list.map((t) => ({ value: t, label: t === "22:30" ? lateNote || tr("After 22:00 — we will leave your key") : t === "15:00" ? tr("{time} — as early as we can", { time: strip(fT(t)) }) : strip(fT(t)) }));
}

/** An extra's line: what it is and how it adds up on a stay. */
export function extraDetail(per: string, guests: number, n: number, lateUntil: string): string {
  if (per === "person_night") return `${strip(people(guests))} × ${strip(nights(n))}`;
  if (per === "night") return strip(nights(n));
  return tr("the room until {time}", { time: strip(fT(lateUntil)) });
}

/** The nightly rates of a quote, as the rate lists draw them. */
export function nightList(q: QuoteReply | undefined) {
  return (q?.nights ?? []).map((n) => ({ date: fDW(n.date), rate: money(n.rate), hasTags: n.tags.length > 0, tags: n.tags.join(" · ") }));
}

/** What a type has left over the searched nights: a count when few are, Infinity when the house does not say. */
const leftOf = (a: TypeAvailability | undefined): number => (a === undefined || a.state !== "open" ? 0 : a.left ?? Number.POSITIVE_INFINITY);

export function cancelMoment(app: HouseApp, arrive: string, cancelBy?: number | null): { day: string; time: string } {
  const H = app.world()!.H;
  if (cancelBy != null && !Number.isNaN(cancelBy)) {
    const d = new Date(cancelBy);
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: app.zone }).format(d);
    const hm = new Intl.DateTimeFormat("en-GB", { timeZone: app.zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
    return { day, time: hm };
  }
  return { day: plus(arrive, -H.cancelDays), time: H.arriveFrom };
}
/** Where "now" is against a stay's cancel line: before it, inside it, or past the arrival afternoon. */
export function cancelStage(app: HouseApp, arrive: string, cancelBy?: number | null): "outside" | "inside" | "desk" {
  const H = app.world()!.H;
  const now = app.nowMin();
  if (now >= app.mins(arrive, H.arriveFrom)) return "desk";
  const m = cancelMoment(app, arrive, cancelBy);
  if (now >= app.mins(m.day, m.time)) return "inside";
  return "outside";
}
export function momentWords(app: HouseApp, arrive: string, cancelBy?: number | null): string {
  const m = cancelMoment(app, arrive, cancelBy);
  return fsi(tr("{time} on {day}", { time: strip(fT(m.time)), day: strip(fDW(m.day)) }));
}
export function cancelNote(app: HouseApp, arrive: string, booked: boolean, cancelBy?: number | null): string {
  const H = app.world()!.H;
  const stage = cancelStage(app, arrive, cancelBy);
  if (stage === "desk") return booked ? tr("Changes are made at the desk now.") : tr("Once reserved, changes are made at the desk.");
  if (stage === "inside") {
    const p = { time: strip(fT(H.arriveFrom)), day: strip(fDW(arrive)) };
    return booked
      ? tr("You are inside the notice we ask for: you can cancel until {time} on {day}; it is marked as a late cancellation. Nothing is charged.", p)
      : tr("You would be inside the notice we ask for: you can cancel until {time} on {day}; it is marked as a late cancellation. Nothing is charged.", p);
  }
  return tr("Cancel at no charge until {moment}.", { moment: strip(momentWords(app, arrive, cancelBy)) });
}

export function guestVals(app: HouseApp, w: WorldV): V {
  const s = app.state;
  const H = w.H;
  const narrow = app.narrow();
  const view = s.view;
  const sr = s.search;
  const n = nightsOf(sr.arrive, sr.depart);
  const problem = app.problemOf(sr.arrive, sr.depart);
  const guests = Number(sr.guests);
  const today = app.day;
  const rooms = w.rooms;
  const floors = new Set(rooms.map((r) => r.floor)).size;
  const kinds = w.types.length;
  const ex = (code: string) => w.extras.find((e) => e.code === code);
  const signedOk = view === "list" ? s.signedIn !== null : view === "one" ? canSee(app, s.oneId) : true;
  const parking = ex("PRK");

  // What is open for the search, asked of Adminium once the guest has searched.
  const wantAvail = ["results", "type", "reserve", "rooms"].includes(view ?? "") && (s.searched || view === "reserve") && problem === null && n >= 1;
  const availAsk = wantAvail ? app.avail(sr.arrive, sr.depart, guests) : { value: undefined, error: undefined, loading: false };
  const answer: NightAnswer | undefined = availAsk.value;
  const byType = new Map((answer?.types ?? []).map((a) => [a.pool, a]));

  const v: V = {
    showHome: view === "home",
    showRooms: view === "rooms",
    showFind: view === "find",
    showResults: view === "results",
    showType: view === "type" && s.pickedType !== null,
    showReserve: view === "reserve" && s.pickedType !== null,
    showConf: view === "conf" && s.booking !== null,
    showSignin: view === "signin" || ((view === "list" || view === "one") && !signedOk),
    showList: view === "list" && signedOk,
    showOne: view === "one" && signedOk,
    show404: view === "404",
    showLookup: false,
    h1Size: narrow ? "24px" : "29px",
    heroPad: narrow ? "26px 20px 54px" : "40px 34px 62px",
    heroH: narrow ? "230px" : "300px",
    heroSize: narrow ? "38px" : "58px",
    searchCols: narrow ? "1fr" : "1fr 1fr .8fr auto",
    triCols: narrow ? "1fr" : "repeat(3,1fr)",
    minDate: today,
    minDepart: plus(sr.arrive, 1),
    sArrive: sr.arrive,
    sDepart: sr.depart,
    sGuests: String(sr.guests),
    searchNights: n >= 1 ? nights(n) : iso("—"),
    onArrive: (e: { target: { value: string } }) => {
      const a = e.target.value || sr.arrive;
      app.setState({ search: { ...sr, arrive: a, depart: nightsOf(a, sr.depart) < 1 ? plus(a, 1) : sr.depart } });
    },
    onDepart: (e: { target: { value: string } }) => app.setState({ search: { ...sr, depart: e.target.value || sr.depart } }),
    onGuests: (e: { target: { value: string } }) => app.setState({ search: { ...sr, guests: Number(e.target.value) } }),
    searchMsgOn: problem !== null,
    searchMsg: problem?.msg ?? "",
    searchBad: n < 1,
    searchBtnBg: n < 1 ? "var(--surface-3)" : "var(--accent)",
    searchBtnFg: n < 1 ? "var(--fg-subtle)" : "var(--accent-fg)",
    searchCursor: n < 1 ? "not-allowed" : "pointer",
    doSearch: () => {
      const q = app.state.search;
      if (nightsOf(q.arrive, q.depart) >= 1) app.go("results", { searched: true });
    },
    goRooms: () => app.go("rooms"),
    goFind: () => app.go("find"),
    goSearch: () => app.go("home"),
    goSearchFocus: () => {
      app.go("home");
      app.focusSoon("#s-arrive");
    },
    backToResults: () => app.go("results", { searched: true }),
    backToType: () => app.go("type"),
    houseName: H.name,
    maxNights: String(H.maxNights),
    morningLine: H.morning,
    heroMark: H.since === null ? H.name.toUpperCase() : tr("{name} · EST {since}", { name: H.name.toUpperCase(), since: H.since }),
    // The counts are the house's rooms; the words about it are its own (settings), never this app's.
    heroLine: `${houseFacts(rooms.length, floors, kinds)}.${H.about ? ` ${H.about}` : ""}`,
    houseLine: `${houseFacts(rooms.length, floors, kinds)}.`,
    breakfastHow: ex("BRK") === undefined ? "" : tr("{price} per person, per night", { price: strip(money0(ex("BRK")!.amount)) }),
    findingLine: H.finding,
    roomsIntro: tr("{kinds} kinds of room over {floors} floors. Rates move with the night, so the numbers here are where a quiet weeknight starts. Put your dates in and we will show you the real ones.", { kinds, floors }),
    roomsSearchLine: tr("Know your dates? The search on the front page checks all {kinds} at once.", { kinds }),
    trainLine: H.train,
    carLine: `${H.car}${parking?.spaces != null ? ` ${tr("{spaces} spaces behind the house at {price} a night — say the word and we will keep one.", { spaces: parking.spaces, price: strip(money0(parking.amount)) })}` : ""}`,
    footLine2: H.foot,
    lateLine: ex("LATE") === undefined ? "" : tr("A late leaving until {time} can be added to your reservation for {price}.", { time: strip(fT(H.lateUntil)), price: strip(money0(ex("LATE")!.amount)) }),
    breakfastHours: iso(H.breakfastHours),
    address: H.address,
    notes: w.notes,
    typeChips: w.types.map((t) => ({ flat: t.flat, label: `${t.name} ×${String(rooms.filter((r) => r.type === t.id).length)}` })),
    resRange: iso(`${strip(fDW(sr.arrive))} → ${strip(fDW(sr.depart))}`),
    resNights: nights(n),
    resGuests: guestsW(guests),
    satRuleOn: problem?.kind === "sat",
    satFix: fDW(plus(sr.arrive, 2)),
    satFixGo: () => app.setState({ search: { ...app.state.search, depart: plus(app.state.search.arrive, 2) } }),
    lenRuleOn: problem?.kind === "len",
    lenRuleMsg: problem?.kind === "len" ? problem.msg : "",
    cancelLine: w.stays === undefined ? "" : cancelNote(app, sr.arrive, false),
    cancelBy: momentWords(app, sr.arrive),
  };

  // ── the rooms
  v["roomsCols"] = narrow ? "1fr" : "300px 1fr";
  v["roomsList"] = w.types.map((t) => {
    const mine = rooms.filter((r) => r.type === t.id);
    const left = problem !== null ? 0 : leftOf(byType.get(t.id));
    const range = `${strip(fDW(sr.arrive))} → ${strip(fDW(sr.depart))}`;
    return {
      name: t.name,
      tint: t.tint,
      icon: t.icon,
      code: t.code,
      long: t.long,
      sleeps: sleepsLine(t.sleeps),
      count: fsi(tr("{n} of them", { n: mine.length })),
      from: money0(t.base),
      fromNote: tr("on a quiet weeknight — weekends and some seasons are dearer"),
      has: t.has.map((h) => ({ label: h, icon: hasIcon(h) })),
      hasOpenNote: s.searched && problem === null && answer !== undefined && byType.has(t.id),
      openNote:
        left === Number.POSITIVE_INFINITY
          ? fsi(tr("Open for {range}", { range }))
          : left > 0
            ? fsi(tr("{n} left for {range}", { n: left, range }))
            : fsi(tr("Nothing open for {range}", { range })),
      numbers: iso(mine.map((r) => r.n).join("   ")),
      floors: floorSpread(mine.map((r) => r.floor)),
      goType: () => app.go("type", { pickedType: t.id }),
    };
  });

  // On a Saturday the least anyone can book is two nights, so that is what counts as open tonight.
  const span = dow(today) === 6 ? 2 : 1;
  v["openTonightLabel"] = span === 2 ? tr("Open tonight · for two nights") : tr("Open tonight");
  const tonight = view === "home" ? app.avail(today, plus(today, span), 1).value : undefined;
  const tonightBy = new Map((tonight?.types ?? []).map((a) => [a.pool, a]));
  v["openTonight"] = w.types.map((t) => {
    const a = tonightBy.get(t.id);
    const open = a?.state === "open";
    return {
      name: t.name,
      flat: t.flat,
      count: tonight === undefined ? iso("…") : a?.left !== undefined ? iso(String(a.left)) : open ? fsi(tr("open")) : iso("0"),
      fg: open ? "var(--fg)" : "var(--fg-subtle)",
      opacity: open || tonight === undefined ? "1" : ".55",
    };
  });

  // ── results: only the types that sleep the party count
  const fits = w.types.filter((t) => t.sleeps >= guests);
  const openFits = problem !== null ? [] : fits.filter((t) => leftOf(byType.get(t.id)) > 0);
  const quotes = new Map<string, QuoteReply | undefined>();
  if (view === "results" && answer !== undefined) for (const t of openFits) quotes.set(t.id, app.quote(t.id, sr.arrive, sr.depart, guests).value);
  let lo: number | null = null;
  let hi: number | null = null;
  // The band spans only the kinds that sleep the party and are open on every night.
  for (const t of openFits) for (const night of quotes.get(t.id)?.nights ?? []) {
    lo = lo === null ? night.rate : Math.min(lo, night.rate);
    hi = hi === null ? night.rate : Math.max(hi, night.rate);
  }
  const tagged = [...new Set(openFits.flatMap((t) => (quotes.get(t.id)?.nights ?? []).flatMap((x) => x.tags)))];
  const fitWord = fits.length === kinds ? "all" : "party";
  const answered = answer !== undefined;
  v["rangeSum"] = {
    on: problem === null && n >= 1 && fits.length > 0 && answered,
    nights: nights(n),
    bandOn: openFits.length > 0 && lo !== null,
    band: lo === null ? iso("—") : iso(`${strip(money0(lo))} – ${strip(money0(hi))}`),
    kinds:
      openFits.length === 0
        ? tr("nothing that sleeps {n} is open across every night", { n: guests })
        : fits.length === 1
          ? tr("the one kind that sleeps {n} is open across every night", { n: guests })
          : openFits.length === fits.length
            ? fitWord === "all"
              ? tr("all {kinds} kinds are open across every night", { kinds: fits.length })
              : tr("all {kinds} kinds that sleep {n} are open across every night", { kinds: fits.length, n: guests })
            : fitWord === "all"
              ? tr("{open} of the {kinds} kinds are open across every night", { open: openFits.length, kinds: fits.length })
              : tr("{open} of the {kinds} kinds that sleep {n} are open across every night", { open: openFits.length, kinds: fits.length, n: guests }),
    weekendNote: tagged.length === 0 ? tr("No nights with a higher rate, so the rates are the quiet ones.") : tr("{rules} nights cost more — the nightly rates show which is which.", { rules: tagged.join(", ") }),
  };
  const early = answer?.earliest ?? null;
  v["noneFits"] = {
    on: problem === null && n >= 1 && answered && openFits.length === 0,
    title: tr("Nothing open for {guests} on these dates", { guests: strip(guestsW(guests)) }),
    hasEarliest: early !== null,
    noEarliest: early === null,
    nights: nights(n),
    earliest: early === null ? "" : iso(`${strip(fDW(early))} → ${strip(fDW(plus(early, n)))}`),
    goEarliest: () => {
      if (early === null) return;
      app.setState({ search: { ...sr, arrive: early, depart: plus(early, n) } });
      app.go("results", { searched: true });
    },
  };
  // Two rooms for a party no one room sleeps, when two are open across every night.
  if ((v["noneFits"] as V)["on"] && guests >= 2) {
    const all = app.avail(sr.arrive, sr.depart, 1).value;
    const open = w.types.map((t) => ({ t, a: all?.types.find((x) => x.pool === t.id) })).filter((x) => x.a !== undefined && leftOf(x.a) > 0);
    const fitsWith = (x: (typeof open)[number]) => open.some((y) => (y.t.id !== x.t.id || leftOf(x.a) >= 2) && x.t.sleeps + y.t.sleeps >= guests);
    const usable = open.filter(fitsWith);
    if (usable.length > 0) {
      const t1 = usable[0]!;
      const t2 = usable.find((y) => (y.t.id !== t1.t.id || leftOf(t1.a) >= 2) && t1.t.sleeps + y.t.sleeps >= guests)!;
      let g1 = Math.min(t1.t.sleeps, guests - 1);
      if (guests - g1 > t2.t.sleeps) g1 = guests - t2.t.sleeps;
      const list = new Intl.ListFormat(locale(), { type: "conjunction" }).format(
        usable.map((x) => (x.a!.left !== undefined ? `${x.t.name} ×${String(x.a!.left)}` : x.t.name)),
      );
      Object.assign(v["noneFits"] as V, {
        twoOn: true,
        twoLine: tr("Two rooms would sleep {n} — {rooms} are open. Reserve one, then the other (each has its own reference), or ring us.", { n: guests, rooms: list }),
        reserveTwo: () =>
          app.go("reserve", { pair: { types: [t1.t.id, t2.t.id], guests: [g1, guests - g1], step: 0, refs: [] }, pickedType: t1.t.id, rvShown: null, rvAnswer: null, rvBusy: false }),
      });
    }
  }
  v["houseDownOn"] = view === "results" && availAsk.error !== undefined;
  v["retryHouse"] = () => app.forget("avail:");
  if (v["houseDownOn"]) {
    (v["rangeSum"] as V)["on"] = false;
    (v["noneFits"] as V)["on"] = false;
  }
  v["offers"] =
    problem !== null || (v["noneFits"] as V)["on"] || v["houseDownOn"] || !answered
      ? []
      : w.types.map((t) => offer(app, t, byType.get(t.id), quotes.get(t.id), n, guests, narrow));

  // ── one room type
  const pt = s.pickedType === null ? null : w.typeById[s.pickedType] ?? null;
  if (pt !== null) {
    const small = guests > pt.sleeps;
    const a = byType.get(pt.id);
    const left = small || problem !== null ? 0 : leftOf(a);
    const priced = s.searched;
    const q = priced && left > 0 ? app.quote(pt.id, sr.arrive, sr.depart, guests).value : undefined;
    const earliest = !small && left === 0 ? a?.earliest ?? null : null;
    const mine = rooms.filter((r) => r.type === pt.id);
    v["rt"] = {
      priced,
      askDates: !priced,
      backLabel: priced ? tr("Back to the results") : tr("Back to the rooms"),
      back: () => (priced ? app.go("results", { searched: true }) : app.go("rooms")),
      seePrice: () => {
        if (nightsOf(app.state.search.arrive, app.state.search.depart) >= 1) app.setState({ searched: true });
      },
      cols: narrow ? "1fr" : "1fr 336px",
      sticky: narrow ? "static" : "sticky",
      tint: pt.tint,
      icon: pt.icon,
      chip: `${pt.code} · ${tr("sleeps {n}", { n: pt.sleeps })}`,
      hasLeft: left > 0 && left <= 4,
      leftText: tr("{n} left|{n} left", { n: left }),
      leftBg: left <= 2 ? "var(--warn)" : "rgba(10,10,15,.42)",
      leftFg: left <= 2 ? "var(--warn-fg)" : "rgba(255,255,255,.94)",
      name: pt.name,
      sleeps: sleepsLine(pt.sleeps),
      from: money0(pt.base),
      long: pt.long,
      has: pt.has.map((h) => ({ label: h, icon: hasIcon(h) })),
      nights: nightList(q),
      nightsLabel: nights(n),
      numbers: iso(mine.map((r) => r.n).join("   ")),
      floors: floorSpread(mine.map((r) => r.floor)),
      howMany: tr("{n} of them in the house", { n: mine.length }),
      subtotal: q === undefined ? iso("…") : money(q.data["subtotal"]),
      tax: q === undefined ? iso("…") : money(q.data["tax"]),
      total: q === undefined ? iso("…") : money(q.data["total"]),
      open: priced && answered && left > 0,
      soldOut: priced && answered && !small && left === 0 && problem === null,
      small: priced && small,
      problem: priced && problem !== null,
      smallNote: tr("{sleeps} — too small for {n}.", { sleeps: sleepsLine(pt.sleeps), n: guests }),
      hasEarliest: earliest !== null,
      earliest: earliest === null ? "" : iso(`${strip(fDW(earliest))} → ${strip(fDW(plus(earliest, Math.max(1, n))))}`),
      goEarliest: () => {
        if (earliest !== null) app.setState({ search: { ...sr, arrive: earliest, depart: plus(earliest, Math.max(1, n)) } });
      },
      moveDates: () => {
        if (earliest !== null) app.setState({ search: { ...sr, arrive: earliest, depart: plus(earliest, Math.max(1, n)) } });
        else app.go("home");
      },
      reserve: () => app.go("reserve", { rvShown: q === undefined ? null : Number(q.data["total"]).toFixed(2), rvAnswer: null, rvBusy: false }),
    };
  } else v["rt"] = { cols: "1fr", has: [], nights: [], priced: false, askDates: false };

  // ── reserve
  if (pt !== null) v["rv"] = reserveVals(app, w, pt, n, s.pair === null ? guests : s.pair.guests[s.pair.step], narrow);
  else v["rv"] = { cols: "1fr", extras: [], lines: [], times: [], alts: [], priceRows: [] };

  // ── confirmation
  const b = s.booking;
  const bs = b === null ? null : app.stay(b.id);
  if (b !== null && bs !== null) {
    const bt = w.typeById[bs.type]!;
    const stage = cancelStage(app, bs.arrive, bs.cancelBy);
    v["cf"] = {
      first: b.first,
      email: b.email,
      ref: b.refs.length > 1 ? b.refs.join(" · ") : bs.ref,
      twoCols: narrow ? "1fr" : "1fr 1fr",
      arrive: fDW(bs.arrive),
      depart: fDW(bs.depart),
      arrivalSaid: bs.arrivalTime === "22:30" ? tr("you said after 22:00") : tr("you said about {time}", { time: strip(fT(bs.arrivalTime)) }),
      saidOn: bs.arrivalTime !== H.arriveFrom,
      nightsLabel: nights(nightsOf(bs.arrive, bs.depart)),
      typeName: bt.name,
      tint: bt.tint,
      icon: bt.icon,
      guestsLabel: guestsW(bs.guests),
      leaveBy: fT(bs.lines.some((l) => l.on && l.per === "stay") ? H.lateUntil : H.leaveBy),
      outside: stage === "outside",
      inside: stage === "inside",
      deskOnly: stage === "desk",
      cancelNote: cancelNote(app, bs.arrive, true, bs.cancelBy),
      nights: nightList({ nights: b.nights } as QuoteReply),
      lines: lineRows(bs, H.lateUntil),
      tax: money(bs.m.tax),
      total: money(bs.m.total),
      emailLine: H.emailsOn
        ? tr("We are sending the details to {email}; this page's link opens your reservation any time.", { email: b.email })
        : tr("Keep this page's link — it opens your reservation any time."),
      moment: momentWords(app, bs.arrive, bs.cancelBy),
      payNote: tr("Nothing is taken online. You settle at the desk."),
      goOne: () => app.openOne(bs.id),
    };
  } else {
    // Until the stay is read back, the heading already greets the guest by the name they gave.
    v["cf"] = { first: b?.first ?? "", nights: [], lines: [] };
  }

  // ── sign in by email
  const a = s.auth;
  const wait = Math.max(0, Math.ceil(60 - (Date.now() - a.sentAt) / 1000));
  v["au"] = {
    endedOn: a.ended !== "",
    ended: a.ended,
    formOn: a.stage === "form",
    sentOn: a.stage === "sent",
    linkOn: a.stage === "link",
    expiredOn: a.stage === "expired",
    email: a.email,
    onEmail: (e: { target: { value: string } }) => app.setAuth({ email: e.target.value }),
    onEmailKey: (e: { key: string }) => {
      if (e.key === "Enter") void app.sendLink(false);
    },
    emailErrOn: a.emailErr !== "",
    emailErr: a.emailErr,
    emailInv: a.emailErr ? "true" : "false",
    emailBorder: a.emailErr ? "var(--danger)" : "var(--border-strong)",
    busy: a.busy,
    sendLabel: a.busy ? tr("Sending…") : tr("Send me a link"),
    send: () => {
      if (!app.state.auth.busy) void app.sendLink(false);
    },
    sentLine: tr("If {email} has a reservation with us, a link is on its way.", { email: a.email.trim() }),
    boxes: a.code.map((c, i) => ({
      id: `c${String(i)}`,
      v: c,
      dc: String(i),
      label: tr("Digit {i} of 6", { i: i + 1 }),
      locked: a.tries <= 0,
      onChange: (e: { target: { value: string } }) => app.codeInput(i, e.target.value),
      onKey: (e: { key: string }) => app.codeKey(i, e),
    })),
    codeErrOn: a.err !== "",
    codeErr: a.err,
    codeInv: a.err ? "true" : "false",
    locked: a.tries <= 0,
    canResend: wait === 0,
    cantResend: wait > 0 && a.tries > 0,
    resendLabel: wait === 0 ? tr("Send it again") : tr("Send it again in {wait}", { wait: strip(iso(`${String(Math.floor(wait / 60))}:${String(wait % 60).padStart(2, "0")}`)) }),
    resendFg: wait === 0 ? "var(--accent)" : "var(--fg-subtle)",
    resend: () => {
      if (Math.ceil(60 - (Date.now() - app.state.auth.sentAt) / 1000) <= 0 || app.state.auth.tries <= 0) void app.sendLink(true);
    },
    newLink: () => void app.sendLink(true),
    different: () => {
      app.setAuth({ stage: "form", code: ["", "", "", "", "", ""], err: "", tries: 5 });
      app.focusSoon("#au-email");
    },
    cont: () => {
      if (!app.state.auth.busy) void app.continueLink();
    },
    again: () => {
      if (okEmail(app.state.auth.email)) void app.sendLink(true);
      else app.setAuth({ stage: "form" });
    },
  };

  // ── your reservations
  const gp = (x: StV): [string, string] => {
    if (x.state === "cancelled") return [tr("Cancelled"), "danger"];
    if (x.state === "noshow") return [tr("No-show"), "danger"];
    if (x.state === "out") return [tr("Checked out"), "mute"];
    if (x.state === "in") return x.depart === today ? [tr("Leaving today"), "warn"] : [tr("You are with us"), "pos"];
    if (x.arrive < today) return [tr("Due {day}", { day: strip(fD(x.arrive)) }), "warn"];
    if (x.arrive === today) return [tr("Arriving today"), "info"];
    return [tr("Booked"), "plain"];
  };
  // Adminium answers only the signed-in guest's own stays; a stay opened by a forwarded link is not listed.
  const mine = w.stays.filter((x) => s.signedIn !== null && x.email.toLowerCase() === s.signedIn).sort((p, q) => p.arrive.localeCompare(q.arrive));
  const rowOf = (x: StV) => {
    const p = gp(x);
    const c = pillOf(p[1]);
    const t = w.typeById[x.type]!;
    return {
      id: x.ref,
      ref: x.ref,
      pill: p[0],
      pillBg: c[0],
      pillFg: c[1],
      typeName: t.name,
      flat: t.flat,
      range: iso(`${strip(fDW(x.arrive))} → ${strip(fDW(x.depart))}`),
      nights: nights(nightsOf(x.arrive, x.depart)),
      guests: guestsW(x.guests),
      go: () => app.openOne(x.id),
    };
  };
  const groups = [
    { id: "g1", title: tr("Coming up"), rows: mine.filter((x) => x.state === "booked").map(rowOf) },
    { id: "g2", title: tr("With us now"), rows: mine.filter((x) => x.state === "in").map(rowOf) },
    { id: "g3", title: tr("Before"), rows: mine.filter((x) => !(x.state === "in" || x.state === "booked")).map(rowOf) },
  ].filter((g) => g.rows.length);
  const offers = app.ports.guest?.offers ?? { newLink: true, signOutEverywhere: true, forget: true };
  v["ls"] = {
    email: s.signedIn ?? "",
    groups,
    empty: groups.length === 0,
    menuOpen: s.listMenu,
    menuExpanded: s.listMenu ? "true" : "false",
    toggleMenu: () => app.setState({ listMenu: !app.state.listMenu }),
    signOut: () => void app.signOut(false),
    // An action this Adminium does not serve is left out, not offered and refused.
    allOn: offers.signOutEverywhere,
    deleteOn: offers.forget,
    moreOn: offers.signOutEverywhere || offers.forget,
    signOutAll: () => void app.signOut(true),
    askDelete: () => app.setState({ listMenu: false, ddOpen: true }),
  };

  // ── one reservation
  const st = v["showOne"] ? app.stay(s.oneId) : null;
  v["on"] = { found: false, extras: [], rows: [], times: [] };
  if (st !== null) v["on"] = oneVals(app, w, st, gp);
  return v;
}

function canSee(app: HouseApp, id: number | null): boolean {
  if (id === null) return false;
  const st = app.stay(id);
  if (st === null) return false;
  return app.state.linkStay === id || (app.state.signedIn !== null && st.email.toLowerCase() === app.state.signedIn);
}

function offer(app: HouseApp, t: TypeV, a: TypeAvailability | undefined, q: QuoteReply | undefined, n: number, guests: number, narrow: boolean) {
  const s = app.state;
  const sr = s.search;
  const small = guests > t.sleeps;
  const left = small ? 0 : leftOf(a);
  const open = !small && left > 0;
  const soldOut = !small && left === 0;
  const earliest = soldOut ? a?.earliest ?? null : null;
  const rates = (q?.nights ?? []).map((x) => x.rate);
  return {
    border: open ? "var(--border)" : "var(--border-strong)",
    cols: narrow ? "1fr" : "216px 1fr",
    tileH: narrow ? "150px" : "100%",
    tint: t.tint,
    tileOpacity: open ? "1" : ".45",
    icon: t.icon,
    chip: `${t.code} · ${tr("sleeps {n}", { n: t.sleeps })}`,
    hasLeft: open && left <= 4,
    leftText: tr("{n} left|{n} left", { n: left }),
    leftBg: left <= 2 ? "var(--warn)" : "rgba(10,10,15,.42)",
    leftFg: left <= 2 ? "var(--warn-fg)" : "rgba(255,255,255,.94)",
    name: t.name,
    sleeps: small ? tr("{sleeps} — too small for {n}", { sleeps: sleepsLine(t.sleeps), n: guests }) : sleepsLine(t.sleeps),
    line: t.line,
    open,
    soldOut,
    small,
    rateFrom: rates.length ? money0(Math.min(...rates)) : money0(t.base),
    total: q === undefined ? iso("…") : money(q.data["total"]),
    nightsLabel: nights(n),
    subtotal: q === undefined ? iso("…") : money(q.data["subtotal"]),
    tax: q === undefined ? iso("…") : money(q.data["tax"]),
    ratesOpen: !!s.openRates[t.id],
    ratesIcon: s.openRates[t.id] ? "chevron-up" : "chevron-down",
    ratesLabel: s.openRates[t.id] ? tr("Hide the nightly rates") : tr("See the nightly rates"),
    ratesExpanded: s.openRates[t.id] ? "true" : "false",
    toggleRates: () => app.setState({ openRates: { ...app.state.openRates, [t.id]: !app.state.openRates[t.id] } }),
    nights: nightList(q),
    goType: () => app.go("type", { pickedType: t.id }),
    hasEarliest: earliest !== null,
    noEarliest: earliest === null,
    earliest: earliest === null ? "" : fDW(earliest),
    goEarliest: () => {
      if (earliest === null) return;
      app.setState({ search: { ...sr, arrive: earliest, depart: plus(earliest, n) } });
      app.go("results", { searched: true });
      app.toast(tr("Moved to {day} — same length of stay.", { day: strip(fDW(earliest)) }), "info");
    },
  };
}

/** A stay's extras as money lines: "Breakfast in the dining room · 2 people × 3 nights". */
export function lineRows(st: StV, lateUntil: string) {
  return st.lines.filter((l) => l.on).map((l) => ({ label: `${l.label} · ${extraDetail(l.per, l.guests, l.nights, lateUntil)}`, amount: money(l.amount) }));
}

function reserveVals(app: HouseApp, w: WorldV, pt: TypeV, n: number, guests: number, narrow: boolean): V {
  const s = app.state;
  const sr = s.search;
  const f = s.form;
  const picked = app.pickedExtras(f);
  const q = app.quote(pt.id, sr.arrive, sr.depart, guests, picked).value;
  const setF = (k: keyof typeof f) => (e: { target: { value: string } }) => app.setState({ form: { ...app.state.form, [k]: e.target.value } });
  const firstErr = s.formErr && !f.first.trim() ? tr("Your first name") : "";
  const lastErr = s.formErr && !f.last.trim() ? tr("Your surname") : "";
  const emailErr = s.formErr && !okEmail(f.email) ? tr("An email we can write to") : "";
  const A = s.rvAnswer;
  const answer = A?.kind === "gone" ? app.avail(sr.arrive, sr.depart, guests).value : undefined;
  const alts =
    A?.kind === "gone"
      ? w.types
          .filter((t) => t.id !== pt.id && t.sleeps >= guests && leftOf(answer?.types.find((x) => x.pool === t.id)) > 0)
          .map((t) => {
            const tq = app.quote(t.id, sr.arrive, sr.depart, guests, picked).value;
            return {
              label: tq === undefined ? t.name : tr("{type} — {total}", { type: t.name, total: strip(money(tq.data["total"])) }),
              pick: () => app.setState({ pickedType: t.id, rvShown: tq === undefined ? null : Number(tq.data["total"]).toFixed(2), rvAnswer: null }),
            };
          })
      : [];
  const lines = (q?.children?.stay_extras ?? []).map((c) => {
    const d = c.data as Record<string, unknown>;
    return { label: `${String(d["label"])} · ${extraDetail(String(d["per"]), Number(d["guests"]), Number(d["nights"]), w.H.lateUntil)}`, amount: money(d["amount"]) };
  });
  const total = q === undefined ? null : Number(q.data["total"]).toFixed(2);
  // What the guest saw is what the save expects: the price shown when they pressed Reserve.
  if (total !== null && s.rvShown !== total && !s.rvBusy && s.rvAnswer === null) queueMicrotask(() => app.setState({ rvShown: total }));
  return {
    cols: narrow ? "1fr" : "1fr 336px",
    twoCols: narrow ? "1fr" : "1fr 1fr",
    sticky: narrow ? "static" : "sticky",
    typeName: pt.name,
    tint: pt.tint,
    icon: pt.icon,
    sleeps: sleepsLine(pt.sleeps),
    first: f.first,
    last: f.last,
    email: f.email,
    mobile: f.mobile,
    note: f.note,
    onFirst: setF("first"),
    onLast: setF("last"),
    onEmail: setF("email"),
    onMobile: setF("mobile"),
    onNote: setF("note"),
    onTime: setF("arrivalTime"),
    firstErrOn: !!firstErr,
    firstErr,
    firstInv: firstErr ? "true" : "false",
    firstBorder: firstErr ? "var(--danger)" : "var(--border-strong)",
    lastErrOn: !!lastErr,
    lastErr,
    lastInv: lastErr ? "true" : "false",
    lastBorder: lastErr ? "var(--danger)" : "var(--border-strong)",
    emailErrOn: !!emailErr,
    emailErr,
    emailInv: emailErr ? "true" : "false",
    emailBorder: emailErr ? "var(--danger)" : "var(--border-strong)",
    arrivalTime: f.arrivalTime,
    times: timeOptions(f.arrivalTime, w.H.lateArrival),
    extras: w.extras.map((e: ExtraV) => {
      const on = !!f.extras[e.id];
      const amount = e.per === "person_night" ? e.amount * guests * Math.max(0, n) : e.per === "night" ? e.amount * Math.max(0, n) : e.amount;
      return {
        label: e.label,
        how: e.how,
        icon: e.icon,
        amount: money(amount),
        pressed: on ? "true" : "false",
        amtFg: on ? "var(--fg)" : "var(--fg-subtle)",
        border: on ? "var(--accent)" : "var(--border-strong)",
        bg: on ? "var(--accent-soft)" : "var(--surface-2)",
        trackBg: on ? "var(--accent)" : "var(--border-strong)",
        knobStart: on ? "20px" : "3px",
        toggle: () => app.setState({ form: { ...app.state.form, extras: { ...app.state.form.extras, [e.id]: !on } } }),
      };
    }),
    nightsLabel: nights(n),
    roomTotal: q === undefined ? iso("…") : money(q.data["room_total"]),
    lines,
    tax: q === undefined ? iso("…") : money(q.data["tax"]),
    total: q === undefined ? iso("…") : money(q.data["total"]),
    busy: s.rvBusy,
    idle: !s.rvBusy,
    btnLabel: s.rvBusy ? tr("Reserving…") : tr("Reserve the room"),
    btnBusy: s.rvBusy ? "true" : "false",
    btnBg: s.rvBusy ? "var(--surface-3)" : "var(--accent)",
    btnFg: s.rvBusy ? "var(--fg-muted)" : "var(--accent-fg)",
    confirm: () => {
      if (!app.state.rvBusy) app.tryReserve();
    },
    goneOn: A?.kind === "gone",
    alts,
    hasAlts: alts.length > 0,
    priceOn: A?.kind === "price",
    priceMsg: A?.kind === "price" ? tr("The price for these dates is now {total} — it was {was} when you looked.", { total: strip(money(A.total)), was: strip(money(A.was)) }) : "",
    priceRows: A?.kind === "price" ? nightList(app.quote(pt.id, sr.arrive, sr.depart, guests, picked).value) : [],
    acceptLabel: A?.kind === "price" ? tr("Reserve at {total}", { total: strip(money(A.total)) }) : "",
    accept: () => void app.reserve(true),
    ruleOn: A?.kind === "rule",
    ruleMsg: A?.msg ?? "",
    downOn: A?.kind === "down",
    changeDates: () => app.go("home", { rvAnswer: null }),
    payNote: tr("Nothing is taken online. You settle at the desk."),
  };
}

function oneVals(app: HouseApp, w: WorldV, st: StV, gp: (x: StV) => [string, string]): V {
  const s = app.state;
  const H = w.H;
  const today = app.day;
  const t = w.typeById[st.type]!;
  const p = gp(st);
  const c = pillOf(p[1]);
  const booked = st.state === "booked";
  const stage = cancelStage(app, st.arrive, st.cancelBy);
  const cut = stage === "desk";
  const inside = stage === "inside";
  const live = booked && !cut;
  const n = nightsOf(st.arrive, st.depart);
  const paid = st.m.paid;
  // A note with {phone} is drawn with the house's number as a link (`trx` in the view): its English is the key.
  let deadNote = "";
  if (booked && st.arrive < today) deadNote = key("We expected you on {day} — ring us on {phone} so we keep your room.");
  else if (booked && cut) deadNote = key("It is your arrival day. Anything to change, ring us on {phone}.");
  else if (st.state === "in") deadNote = tr("You are with us — anything you need, ask at the desk.");
  else if (st.state === "out") deadNote = tr("This stay has finished.");
  else if (st.state === "cancelled") deadNote = st.cancelCode === "house" ? tr("We had to cancel this stay on {day}. Ring us on {phone} and we will help you find another room.", { day: strip(fDW(st.cancelled?.date ?? today)), phone: H.phone }) : tr("Cancelled on {day}.", { day: strip(fDW(st.cancelled?.date ?? today)) });
  else if (st.state === "noshow") deadNote = tr("Marked as a no-show on {day} — ring us on {phone} if that is wrong.", { day: strip(fDW(st.noShow?.date ?? today)), phone: H.phone });
  const credits = st.credits.filter((x) => !x.voided);
  const rows = [{ id: "r0", label: tr("{nights} of room", { nights: strip(nights(n)) }), amount: money(st.m.room) }]
    .concat(lineRows(st, H.lateUntil).map((x, i) => ({ id: `x${String(i)}`, ...x })))
    .concat(st.charges.filter((x) => !x.voided).map((x, i) => ({ id: `c${String(i)}`, label: x.label + (x.note ? ` — ${x.note}` : ""), amount: money(x.amount) })))
    .concat(credits.map((x, i) => ({ id: `k${String(i)}`, label: creditLabel(x), amount: iso(`− ${strip(money(x.amount))}`) })))
    .concat([
      { id: "tx", label: taxWords(st.m.taxLabel || H.taxLabel, st.m.taxRate || H.taxRate), amount: money(st.m.tax) },
      { id: "tt", label: tr("Total"), amount: money(st.m.total) },
    ]);
  if (paid > 0) rows.push({ id: "pd", label: tr("Paid so far"), amount: iso(`− ${strip(money(paid))}`) });
  const gone = st.state === "cancelled" || st.state === "noshow";
  const signed = s.signedIn !== null && st.email.toLowerCase() === s.signedIn;
  return {
    found: true,
    ref: st.ref,
    name: st.name,
    typeName: t.name,
    tint: t.tint,
    icon: t.icon,
    range: iso(`${strip(fDW(st.arrive))} → ${strip(fDW(st.depart))}`),
    nightsLabel: nights(n),
    guestsLabel: guestsW(st.guests),
    state: p[0],
    stateBg: c[0],
    stateFg: c[1],
    live,
    dead: !live,
    deadNote,
    deadDay: strip(fDW(st.arrive)),
    deadPhone: booked && cut,
    phone: H.phone,
    outside: live && !inside,
    inside: live && inside,
    lineMoment: momentWords(app, st.arrive, st.cancelBy),
    cutMoment: fsi(tr("{time} on {day}", { time: strip(fT(H.arriveFrom)), day: strip(fDW(st.arrive)) })),
    outsideMsg: tr("Cancel at no charge until {moment}.", { moment: strip(momentWords(app, st.arrive, st.cancelBy)) }),
    insideMsg: tr("You are inside the notice we ask for. You can still cancel until {time} on {day}; it will be marked as a late cancellation. Nothing is charged.", { time: strip(fT(H.arriveFrom)), day: strip(fDW(st.arrive)) }),
    daysAhead: st.state !== "booked" ? "" : st.arrive > today ? tr("{days} from today", { days: strip(days(nightsOf(today, st.arrive))) }) : st.arrive === today ? tr("Today") : "",
    arrivalTime: st.arrivalTime,
    times: timeOptions(st.arrivalTime, H.lateArrival),
    onTime: (e: { target: { value: string } }) => void app.changeTime(st, e.target.value),
    extras: w.extras.map((e) => {
      const on = st.extras.includes(e.id);
      const busy = s.extraBusy === e.id;
      const amount = e.per === "person_night" ? e.amount * st.guests * n : e.per === "night" ? e.amount * n : e.amount;
      return {
        id: e.id,
        label: e.label,
        how: e.how,
        icon: busy ? "loader-circle" : e.icon,
        amount: money(amount),
        busy,
        idle: !busy,
        busyLabel: on ? tr("Taking it off…") : tr("Adding…"),
        pressed: on ? "true" : "false",
        ariaBusy: busy ? "true" : "false",
        amtFg: on ? "var(--fg)" : "var(--fg-subtle)",
        border: on ? "var(--accent)" : "var(--border-strong)",
        bg: on ? "var(--accent-soft)" : "var(--surface-2)",
        trackBg: on ? "var(--accent)" : "var(--border-strong)",
        knobStart: on ? "20px" : "3px",
        opacity: s.extraBusy && !busy ? ".6" : "1",
        toggle: () => void app.toggleExtra(st, e.id, on),
      };
    }),
    refusedOn: s.extraRefused !== "",
    refused: s.extraRefused,
    rows,
    dueLabel: gone ? (paid > 0 ? tr("To be given back") : tr("Nothing owing")) : tr("Due when you leave"),
    due: money(gone ? paid : Math.max(0, st.m.balance)),
    givenBackOn: gone && paid > 0,
    givenBackLine: tr("You paid {amount}. The desk gives it back — ring us on {phone} if you have not had it.", { amount: strip(money(paid)), phone: H.phone }),
    askCancel: () => app.askCancel(st.id, "guest"),
    // A date change needs a signed-in guest: a forwarded link cannot move a stay.
    canChange: live && !inside && signed,
    ringChange: live && inside,
    signToChange: live && !inside && !signed,
    signToChangeLine: tr("Sign in to change your dates, or ring us on {phone}.", { phone: H.phone }),
    goSignIn: () => app.go("signin"),
    openChg: () => app.openChg(st),
    leave: () => (s.signedIn !== null ? app.go("list") : app.go("home")),
    leaveLabel: s.signedIn !== null ? tr("Back to your reservations") : tr("Back to the front page"),
    canRelink: signed && st.email !== "" && (app.ports.guest?.offers?.newLink ?? true),
    relink: () => void app.relink(st),
  };
}

export function creditLabel(c: { from: string; to: string; reason: string }): string {
  const list: string[] = [];
  for (let d = c.from; d < c.to; d = plus(d, 1)) list.push(strip(fDW(d)));
  return c.reason === "missed" ? tr("Night not stayed — {days}", { days: list.join(", ") }) : tr("Nights not stayed — {days}", { days: list.join(", ") });
}

/** The change-the-dates sheet (a signed-in guest). */
export function chgVals(app: HouseApp, w: WorldV): V {
  const s = app.state;
  const c = s.chg;
  if (c === null) return { cd: { open: false, rows: [], lines: [] } };
  const st = app.stay(c.id);
  if (st === null) return { cd: { open: false, rows: [], lines: [] } };
  const t = w.typeById[st.type]!;
  const n = nightsOf(c.arrive, c.depart);
  const problem = app.problemOf(c.arrive, c.depart);
  const same = c.arrive === st.arrive && c.depart === st.depart;
  const answer = problem === null && !same ? app.avail(c.arrive, c.depart, st.guests, st.id).value : undefined;
  const a = answer?.types.find((x) => x.pool === st.type);
  const free = leftOf(a) > 0;
  const q = problem === null && !same && free ? app.ask(`quote-dates:${String(st.id)}:${c.arrive}:${c.depart}`, () => app.ports.guest!.quoteDates(st.id, c.arrive, c.depart)) : undefined;
  const roomRefused = q?.error !== undefined;
  const quote = q?.value;
  const ok = problem === null && free && !same && quote !== undefined && !roomRefused;
  const stage = cancelStage(app, c.arrive);
  const earliest = problem === null && answer !== undefined && !free ? a?.earliest ?? null : null;
  const total = quote === undefined ? "" : Number(quote.data["total"]).toFixed(2);
  return {
    cd: {
      open: true,
      tint: t.tint,
      icon: t.icon,
      title: tr("Change the dates"),
      sub: iso(`${st.ref} · ${t.name}`),
      close: () => app.setState({ chg: null }),
      arrive: c.arrive,
      depart: c.depart,
      minDate: app.day,
      minDepart: plus(c.arrive, 1),
      onArrive: (e: { target: { value: string } }) => {
        const na = e.target.value || c.arrive;
        app.setState({ chg: { ...c, arrive: na, depart: nightsOf(na, c.depart) < 1 ? plus(na, 1) : c.depart, moved: false, err: "" } });
      },
      onDepart: (e: { target: { value: string } }) => app.setState({ chg: { ...c, depart: e.target.value || c.depart, moved: false, err: "" } }),
      nightsLabel: n >= 1 ? nights(n) : iso("—"),
      guestsLabel: guestsW(st.guests),
      problemOn: problem !== null,
      problem: problem?.msg ?? "",
      openOn: ok,
      noneOn: problem === null && answer !== undefined && !free && !same,
      sameOn: same,
      hasEarliest: earliest !== null,
      earliest: earliest === null ? "" : fDW(earliest),
      moveLabel: earliest === null ? "" : tr("Move to {day}", { day: strip(fDW(earliest)) }),
      goEarliest: () => {
        if (earliest !== null) app.setState({ chg: { ...c, arrive: earliest, depart: plus(earliest, Math.max(1, n)) } });
      },
      rows: ok ? nightList(quote) : [],
      lines: ok
        ? (quote.children?.stay_extras ?? [])
            .filter((x) => (x.data as Record<string, unknown>)["state"] !== "off")
            .map((x, i) => {
              const d = x.data as Record<string, unknown>;
              return { id: `l${String(i)}`, label: `${String(d["label"])} · ${extraDetail(String(d["per"]), Number(d["guests"]), Number(d["nights"]), w.H.lateUntil)}`, amount: money(d["amount"]) };
            })
        : [],
      tax: quote === undefined ? "" : money(quote.data["tax"]),
      total: quote === undefined ? "" : money(quote.data["total"]),
      was: tr("was {total}", { total: strip(money(st.m.total)) }),
      lineNew: ok ? cancelNote(app, c.arrive, false) : "",
      lineBg: stage === "outside" ? "var(--pos-soft)" : "var(--warn-soft)",
      lineFg: stage === "outside" ? "var(--pos)" : "var(--warn)",
      lineIcon: stage === "outside" ? "shield-check" : "triangle-alert",
      roomKeptOn: roomRefused,
      movedOn: c.moved,
      movedMsg: tr("The price is now {total} — change at this price?", { total: strip(money(total)) }),
      busy: c.busy,
      cantGo: !ok || c.busy,
      btnLabel: c.busy ? tr("Changing…") : c.moved ? tr("Change at {total}", { total: strip(money(total)) }) : tr("Change to these dates"),
      btnBg: ok && !c.busy ? "var(--accent)" : "var(--surface-3)",
      btnFg: ok && !c.busy ? "var(--accent-fg)" : "var(--fg-subtle)",
      btnCursor: ok && !c.busy ? "pointer" : "not-allowed",
      confirm: () => {
        if (ok) void app.confirmChg(total);
      },
      foot: tr("Your extras follow the new dates."),
    },
  };
}

export { fD };
