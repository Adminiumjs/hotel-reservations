/**
 * The values every screen shares — the frame, the theme and the language, the
 * clock, the house's name and telephone, the toasts — and the whole bag the
 * screens draw from: these, the guest's, the desk's and the sheets'.
 */
import { dirFor, isLocaleTag, LOCALE_TAGS, LOCALES } from "../../i18n/locales.ts";
import { tr } from "../../i18n/tr.ts";
import { fDW, fLong, fT, iso, strip, taxWords } from "../fmt.ts";
import type { HouseApp, View } from "../house.ts";
import { deskVals } from "./desk.ts";
import { guestVals } from "./guest.ts";
import { overlayVals } from "./overlays.ts";
import { DESK, GUEST } from "../sides.ts";

type V = Record<string, unknown>;

const CLOSED_SCREENS: V = {
  showHome: false, showRooms: false, showFind: false, showResults: false, showType: false, showReserve: false, showConf: false,
  showSignin: false, showList: false, showOne: false, show404: false, showLookup: false,
  showToday: false, showRack: false, showCal: false, showRes: false, showFolio: false, show404desk: false, showNew: false,
  roomsList: [], offers: [], openTonight: [], typeChips: [], deskNav: [], searchHits: [], kpis: [], columns: [], notes: [],
  rt: { has: [], nights: [] }, rv: { extras: [], lines: [], times: [], alts: [], priceRows: [] }, cf: { nights: [], lines: [] },
  au: { boxes: [] }, ls: { groups: [] }, on: { extras: [], rows: [], times: [] }, rangeSum: {}, noneFits: {},
  nb: { types: [], extras: [], times: [], nightRows: [], extraLines: [], languages: [] }, fo: { rows: [], chips: [], actions: [] },
  deskQuery: "", onDeskQuery: () => undefined, onDeskQueryKey: () => undefined,
  rackLegend: [], rackFloors: [], calDays: [], calRows: [], calTotals: [], resFilters: [], resRows: [], day: { arrivals: [], departures: [] }, tomorrow: {},
  ci: { open: false }, co: { open: false }, rm: { open: false }, ch: { open: false }, se: { open: false }, cx: { open: false },
  vd: { open: false }, mv: { open: false }, dd: { open: false }, cd: { open: false }, ex: { open: false },
};

export function renderVals(app: HouseApp): V {
  const s = app.state;
  const w = app.world();
  const narrow = app.narrow();
  const guest = app.persona === "guest";
  const theme = s.theme;
  const lang = isLocaleTag(s.lang) ? s.lang : "en-US";
  const H = w?.H;
  const base: V = {
    stop: (e: { stopPropagation: () => void }) => e.stopPropagation(),
    loading: w === null && !s.loadError,
    themeAttr: theme,
    loadError: s.loadError,
    retryLoad: () => {
      app.forget();
      void app.start();
    },
    isGuest: guest,
    isDesk: !guest,
    dir: dirFor(lang),
    langCode: lang,
    isNarrow: narrow,
    isWide: !narrow,
    showSidebar: !guest && !narrow,
    navOpen: s.navOpen,
    toasts: s.toasts.map((t) => ({
      id: t.id,
      msg: t.msg,
      icon: t.kind === "warn" ? "triangle-alert" : t.kind === "info" ? "info" : "check",
      bg: t.kind === "warn" ? "var(--warn)" : "var(--fg)",
      fg: t.kind === "warn" ? "var(--warn-fg)" : "var(--bg)",
    })),
    themeIcon: theme === "dark" ? "sun" : "moon",
    themeTitle: theme === "dark" ? tr("Switch to light") : tr("Switch to dark"),
    toggleTheme: () => app.setState({ theme: app.state.theme === "dark" ? "light" : "dark" }),
    guestPad: narrow ? "20px 16px 96px" : "30px 22px 110px",
    deskPad: narrow ? "18px 16px 96px" : "22px 20px 110px",
    goHome: () => app.go(guest ? "home" : "today"),
    go404: () => app.go("404"),
    openNav: () => app.setState({ navOpen: true }),
    closeNav: () => app.setState({ navOpen: false }),
    arriveFrom: H === undefined ? "" : fT(H.arriveFrom),
    leaveBy: H === undefined ? "" : fT(H.leaveBy),
    phone: H?.phone ?? "",
    telHref: H?.tel ?? "",
    address: H?.address ?? "",
    houseName: H?.name ?? "",
    footLine: H === undefined ? "" : `© ${app.day.slice(0, 4)} ${H.name} · ${H.address}`,
    taxLabel: H === undefined ? "" : taxWords(H.taxLabel, H.taxRate),
    clockShort: iso(`${strip(fDW(app.day))} · ${strip(fT(app.time))}`),
    clockLong: `${fLong(app.day)}, ${strip(fT(app.time))}`,
    // the guest footer's language switch.
    lang,
    languages: LOCALE_TAGS.map((tag) => ({ value: tag, label: LOCALES[tag].native })),
    onLang: (e: { target: { value: string } }) => app.setLang(e.target.value),
    langLabel: tr("Language"),
    guestNav: (
      [
        { id: "rooms", label: tr("Rooms"), on: ["rooms", "results", "type", "reserve"] },
        { id: "signin", label: tr("Your reservation"), on: ["signin", "list", "one"] },
        { id: "find", label: tr("Find us"), on: ["find"] },
      ] as { id: View; label: string; on: View[] }[]
    ).map((g) => {
      const on = s.view !== null && g.on.includes(s.view);
      return {
        id: g.id,
        label: g.label,
        current: on ? "page" : "false",
        go: () => (g.id === "signin" && app.state.signedIn !== null ? app.go("list") : app.go(g.id)),
        bg: on ? "var(--surface-3)" : "transparent",
        fg: on ? "var(--fg)" : "var(--fg-muted)",
        weight: on ? "700" : "600",
      };
    }),
    lk: { hints: [], extras: [], rows: [], times: [] },
  };
  if (w === null || s.view === null) return { ...base, ...CLOSED_SCREENS };
  Object.assign(base, CLOSED_SCREENS);
  // Each side's values only in the build that draws it: the other side's code is not in its bundle.
  if (guest) {
    if (GUEST) Object.assign(base, guestVals(app, w));
  } else if (DESK) Object.assign(base, deskVals(app, w));
  Object.assign(base, overlayVals(app, w));
  return base;
}
