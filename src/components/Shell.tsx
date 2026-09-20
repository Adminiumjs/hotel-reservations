/**
 * TWO shells, switched by the demo dock's Guest | Front desk segment.
 *
 * The guest gets a warm public site: a wordmark, three links, a theme toggle
 * and a centred column that simply narrows. No sidebar, no search, no sight of
 * anybody else's reservation. The desk gets internal chrome — a sidebar, a
 * topbar with a search over guest names and references, and a staff chip — and
 * under 900px a hamburger plus a slide-in sheet.
 *
 * That difference is the product story, so it lives in the chrome rather than
 * being simulated inside each screen.
 */

import { isEmbedded } from "../embed.ts";
import { DEMO } from "../surface.ts";
import { useMemo, useState } from "react";
import {
  BedDouble,
  CalendarDays,
  ClipboardList,
  LayoutGrid,
  MapPin,
  Menu,
  Moon,
  Search,
  Sun,
  X,
} from "lucide-react";

import { ADDRESS } from "../data/demo.ts";
import type { View } from "../data/types.ts";
import { appName } from "../i18n/ambient.ts";
import { useI18n } from "../i18n/index.tsx";
import type { MessageKey } from "../i18n/messages/index.ts";
import { dateShort } from "../lib/format.ts";
import { DESK_STAFF, fullName, stayTypeName, useStore } from "../state/store.ts";

/* --------------------------------------------------------------- desk nav */

interface NavEntry {
  view: View;
  labelKey: MessageKey;
  icon: typeof CalendarDays;
}

const NAV: NavEntry[] = [
  { view: "today", labelKey: "chrome.nav.today", icon: CalendarDays },
  { view: "rack", labelKey: "chrome.nav.rack", icon: LayoutGrid },
  { view: "calendar", labelKey: "chrome.nav.calendar", icon: CalendarDays },
  { view: "reservations", labelKey: "chrome.nav.reservations", icon: ClipboardList },
];

/**
 * What this app is CALLED on screen.
 *
 * The operator's name from Adminium when they set one, else the name this
 * build ships with. One helper rather than a `??` at each render site: a
 * sidebar, a wordmark and a dialog label that disagree about the name of the
 * app is a worse bug than any of them being wrong alone.
 *
 * Not localized, deliberately — an operator types one business name and it is
 * not Adminium's to translate. `chrome.brand` still is, for the apps that keep
 * the shipped one.
 */
function useBrand(): string {
  const { t } = useI18n();
  return appName() ?? t("chrome.brand");
}

function NavList({ onPick }: { onPick?: () => void }) {
  const { t } = useI18n();
  const view = useStore((s) => s.view);
  const go = useStore((s) => s.go);

  return (
    <nav className="wh-sidebar__nav" aria-label={t("chrome.brand.desk")}>
      {NAV.map((entry) => {
        const Cmp = entry.icon;
        return (
          <button
            key={entry.view}
            type="button"
            className="wh-navitem"
            aria-current={view === entry.view ? "page" : undefined}
            onClick={() => {
              go(entry.view);
              onPick?.();
            }}
          >
            <Cmp size={16} aria-hidden="true" />
            {t(entry.labelKey)}
          </button>
        );
      })}
    </nav>
  );
}

function Brand({ sub }: { sub: MessageKey }) {
  const brand = useBrand();
  const { t } = useI18n();
  return (
    <div className="wh-sidebar__brand">
      <span className="wh-sidebar__mark" aria-hidden="true">
        <BedDouble size={17} />
      </span>
      <span>
        <span className="wh-sidebar__name">{brand}</span>
        <span className="wh-sidebar__sub">{t(sub)}</span>
      </span>
    </div>
  );
}

/**
 * The demo's own footer — and ONLY the demo's.
 *
 * It named the app a demo beside an `adminium.dev/demo/<key>` chip. True of the
 * marketplace demo; a falsehood on an operator's own deployment, where it told
 * their staff and their customers that the thing they were working in was a
 * sample. It shipped that way in all eight locales, in the hosted bundles both.
 *
 * `DEMO` folds to a literal at build time (`surface.ts`), so in every other
 * build this markup is eliminated rather than merely skipped — the same rule
 * D24 applied to the demo dock, which this footer was simply missed by.
 */
function Footer() {
  const { t } = useI18n();
  if (!DEMO) return null;
  return (
    <div className="wh-sidebar__foot">
      {t("chrome.footer.copy")}
      <span className="wh-sidebar__chip wh-mono">{t("chrome.footer.chip")}</span>
    </div>
  );
}

function ThemeButton() {
  const { t } = useI18n();
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const label = t(theme === "dark" ? "chrome.dock.theme.light" : "chrome.dock.theme.dark");
  return (
    <button type="button" className="wh-iconbtn wh-btn" onClick={toggleTheme} aria-label={label} title={label}>
      {theme === "dark" ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
    </button>
  );
}

/* ---------------------------------------------------------------- search */

/**
 * The desk's search over guest names and references. A filter over what is
 * already in memory rather than a query — there is no server in a demo — and
 * picking a hit opens that guest's folio rather than a list.
 */
function DeskSearch() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const query = useStore((s) => s.deskQuery);
  const setDeskQuery = useStore((s) => s.setDeskQuery);
  const stays = useStore((s) => s.stays);
  const openFolio = useStore((s) => s.openFolio);
  const go = useStore((s) => s.go);

  const q = query.trim().toLowerCase();
  const hits = useMemo(() => {
    if (q.length < 2) return null;
    return stays
      .filter(
        (s) =>
          fullName(s).toLowerCase().includes(q) || s.ref.toLowerCase().includes(q),
      )
      .slice(0, 7);
  }, [q, stays]);

  return (
    <div className="wh-topbar__search">
      <Search size={15} aria-hidden="true" />
      <input
        className="wh-topbar__input wh-fld"
        type="search"
        value={query}
        placeholder={t("chrome.search.placeholder")}
        aria-label={t("chrome.search.label")}
        onChange={(e) => {
          setDeskQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 140)}
      />

      {open && hits !== null && (
        <div className="wh-searchpop wh-scroll">
          {hits.length === 0 && (
            <p className="wh-searchpop__empty">{t("chrome.search.empty", { query })}</p>
          )}
          {hits.map((s) => (
            <button
              key={s.ref}
              type="button"
              className="wh-searchpop__row"
              onMouseDown={() => {
                openFolio(s.ref);
                go("folio");
                setDeskQuery("");
              }}
            >
              <span className="wh-mono" style={{ fontSize: 12, fontWeight: 600 }}>
                {s.ref}
              </span>
              <span className="wh-searchpop__meta">{fullName(s)}</span>
              <span className="wh-searchpop__meta wh-mono" style={{ marginInlineStart: "auto" }}>
                {dateShort(s.arrive)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/*
 * THE ZONE CHIP IS GONE, and the warning it carried now lives in Adminium.
 *
 * It rendered "Dates shown in UTC" — or a city nobody confirmed — permanently,
 * in the header of every screen, for everyone. But an unset timezone is the
 * OPERATOR's to fix, on the connection, in Adminium; staff and customers
 * reading this app can do nothing about it and were shown it on every page
 * anyway. Studio's Connections card now names the zone dates actually render
 * in whenever a connection has none, which is both where the fix is and the
 * only audience that can apply it.
 *
 * `timezoneNotice()` stays in `i18n/ambient.ts`: the claim is still worth
 * carrying and still logged at boot. Nothing renders it.
 */

/* ------------------------------------------------------------- desk shell */

function DeskShell({ children }: { children: React.ReactNode }) {
  const brand = useBrand();
  const { t } = useI18n();
  const navOpen = useStore((s) => s.navOpen);
  const setNavOpen = useStore((s) => s.setNavOpen);

  return (
    <div className="wh-app">
      <aside className="wh-sidebar">
        <Brand sub="chrome.brand.desk" />
        <NavList />
        <Footer />
      </aside>

      {navOpen && (
        <>
          <button
            type="button"
            className="wh-scrim"
            aria-label={t("chrome.menu.close")}
            onClick={() => setNavOpen(false)}
          />
          <div className="wh-sheet" role="dialog" aria-modal="true" aria-label={brand}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <Brand sub="chrome.brand.desk" />
              <button
                type="button"
                className="wh-iconbtn wh-btn wh-iconbtn--sm"
                style={{ marginInlineStart: "auto", marginInlineEnd: 8 }}
                onClick={() => setNavOpen(false)}
                aria-label={t("chrome.menu.close")}
              >
                <X size={15} aria-hidden="true" />
              </button>
            </div>
            <NavList onPick={() => setNavOpen(false)} />
            <Footer />
          </div>
        </>
      )}

      <div className="wh-main">
        <header className="wh-topbar">
          <button
            type="button"
            className="wh-iconbtn wh-btn wh-narrow-only"
            onClick={() => setNavOpen(true)}
            aria-label={t("chrome.menu.open")}
          >
            <Menu size={18} aria-hidden="true" />
          </button>

          <DeskSearch />
          <div className="wh-topbar__spacer" />


          <ThemeButton />
          <span className="wh-userchip">
            <span className="wh-avatar" aria-hidden="true">
              {DESK_STAFF.ini}
            </span>
            <span className="wh-wide-only">{DESK_STAFF.name}</span>
          </span>
        </header>

        <main className="wh-content wh-scroll" id="main">
          {children}
        </main>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ guest shell */

/**
 * The public side: a centred column, three links, and nothing that belongs to
 * the desk. It never shows another guest's name, a room number or an
 * occupancy figure, because a guest has no business seeing any of them.
 */
function GuestShell({ children }: { children: React.ReactNode }) {
  const brand = useBrand();
  const { t } = useI18n();
  const view = useStore((s) => s.view);
  const go = useStore((s) => s.go);

  const links: { view: View; key: MessageKey }[] = [
    { view: "rooms", key: "chrome.nav.rooms" },
    { view: "myreservation", key: "chrome.nav.myreservation" },
    { view: "findus", key: "chrome.nav.findus" },
  ];

  return (
    <div className="wh-site">
      <header className="wh-site__head">
        <button type="button" className="wh-site__brand" onClick={() => go("home")}>
          <span className="wh-site__mark" aria-hidden="true">
            <BedDouble size={17} />
          </span>
          <span>
            <span className="wh-site__wordmark">{brand}</span>
            <span className="wh-site__tag">{t("chrome.brand.site")}</span>
          </span>
        </button>

        <nav className="wh-site__nav" aria-label={t("chrome.brand.site")}>
          {links.map((l) => (
            <button
              key={l.key}
              type="button"
              className="wh-site__link"
              aria-current={view === l.view ? "page" : undefined}
              onClick={() => go(l.view)}
            >
              {t(l.key)}
            </button>
          ))}
        </nav>

        <div style={{ marginInlineStart: "auto" }}>
          <ThemeButton />
        </div>
      </header>

      <main className="wh-site__body" id="main">
        {children}
      </main>

      <footer className="wh-site__foot">
        <span className="wh-site__where">
          <MapPin size={13} aria-hidden="true" />
          {ADDRESS}
        </span>
        {/* Demo-only, like the sidebar's <Footer/>. The address above it is
            real content and stays in every build. */}
        {DEMO && (
          <>
            <span>{t("chrome.footer.copy")}</span>
            <span className="wh-sidebar__chip wh-mono">{t("chrome.footer.chip")}</span>
          </>
        )}
      </footer>
    </div>
  );
}

/**
 * NO CHROME AT ALL — the internal placement (29-app-surfaces.md D6).
 *
 * Blended into the Adminium dashboard, this app's screens render inside the
 * dashboard's own shell: Adminium's sidebar carries this app's sections and its
 * topbar carries the account menu, the theme control and the language control.
 * Rendering our own alongside would be two sidebars, two theme toggles and two
 * brands in one window.
 *
 * `#main` is kept, because the skip link targets it and a skip link pointing at
 * nothing is worse than no skip link.
 */
function EmbeddedShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="wh-embedded">
      <main className="wh-content wh-scroll" id="main">
        {children}
      </main>
    </div>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const persona = useStore((s) => s.persona);
  /*
   * A runtime check, not a build flag, and that is the point: ONE hosted-staff
   * bundle serves both placements. Opened directly at its own URL it renders
   * the full front-desk chrome; framed by the dashboard it renders none.
   * Switching placement is a setting in Studio, not a rebuild.
   */
  if (isEmbedded()) return <EmbeddedShell>{children}</EmbeddedShell>;
  return persona === "desk" ? (
    <DeskShell>{children}</DeskShell>
  ) : (
    <GuestShell>{children}</GuestShell>
  );
}

/** Re-exported so the folio header can name a stay's room type. */
export { stayTypeName };
