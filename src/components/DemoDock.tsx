/**
 * The demo dock.
 *
 * The persona segment, the clock, the theme toggle, the locale picker and a
 * reset. Deliberately labelled "Demo controls" so nobody mistakes it for a
 * feature of the hotel's software.
 *
 * The "Advance to check-out time" chip is the only thing in the app that moves
 * time. One tap takes the clock past 11:00: departures become due and the Today
 * board re-sorts around them. It latches — there is no way back except Reset,
 * because a hotel morning does not run twice.
 *
 * House layout rule 1 is enforced here: the check-in sheet and the settle
 * popover both put their confirm button low on the screen, so whenever either
 * is open the dock moves to the opposite inline corner. `--shifted` swaps
 * `inset-inline-end` for `inset-inline-start`, which mirrors correctly in RTL
 * without a second rule.
 */

import { ChevronDown, Clock3, Moon, RotateCcw, Settings2, Sun } from "lucide-react";

import type { Persona } from "../data/types.ts";
import { LOCALES, LOCALE_TAGS, useI18n, type LocaleTag } from "../i18n/index.tsx";
import { clockNow, overlayOpen, useStore } from "../state/store.ts";
import { Segmented } from "./Primitives.tsx";

export default function DemoDock() {
  const { t, locale, setLocale } = useI18n();
  const persona = useStore((s) => s.persona);
  const setPersona = useStore((s) => s.setPersona);
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const open = useStore((s) => s.dockOpen);
  const setOpen = useStore((s) => s.setDockOpen);
  const reset = useStore((s) => s.reset);
  const shifted = useStore(overlayOpen);
  const now = useStore((s) => s.now);
  const phase = useStore((s) => s.phase);
  const advanceClock = useStore((s) => s.advanceClock);

  if (!open) {
    return (
      <button
        type="button"
        className={`wh-dock__mini wh-btn${shifted ? " wh-dock--shifted" : ""}`}
        onClick={() => setOpen(true)}
        aria-label={t("chrome.dock.expand")}
      >
        <Settings2 size={15} aria-hidden="true" />
        {t("chrome.dock.title")}
      </button>
    );
  }

  const themeLabel = t(
    theme === "dark" ? "chrome.dock.theme.light" : "chrome.dock.theme.dark",
  );

  return (
    <aside className={`wh-dock${shifted ? " wh-dock--shifted" : ""}`} aria-label={t("chrome.dock.title")}>
      <div className="wh-dock__head">
        <Settings2 size={13} aria-hidden="true" />
        {t("chrome.dock.title")}
        <button
          type="button"
          className="wh-dock__collapse"
          onClick={() => setOpen(false)}
          aria-label={t("chrome.dock.collapse")}
        >
          <ChevronDown size={15} aria-hidden="true" />
        </button>
      </div>

      <Segmented<Persona>
        full
        ariaLabel={t("chrome.dock.persona")}
        value={persona}
        onChange={setPersona}
        options={[
          { value: "guest", label: t("chrome.dock.guest") },
          { value: "desk", label: t("chrome.dock.desk") },
        ]}
      />

      <div className="wh-dock__row">
        <span className="wh-dock__label">{t("chrome.dock.clock")}</span>
        <span className="wh-chip wh-mono">
          <Clock3 size={13} aria-hidden="true" />
          {clockNow(now, phase)}
        </span>
      </div>

      <button
        type="button"
        className="wh-button wh-button--soft wh-button--block wh-btn"
        onClick={advanceClock}
        disabled={phase === "after"}
        style={{ fontSize: 12.5, padding: "9px 11px" }}
      >
        {t("chrome.dock.advance")}
      </button>

      <div className="wh-dock__row">
        <span className="wh-dock__label">{t("chrome.dock.language")}</span>
        <select
          className="wh-select"
          value={locale}
          onChange={(e) => setLocale(e.target.value as LocaleTag)}
          aria-label={t("chrome.dock.language")}
        >
          {LOCALE_TAGS.map((tag) => (
            <option key={tag} value={tag}>
              {LOCALES[tag].native}
            </option>
          ))}
        </select>
      </div>

      <div className="wh-dock__row">
        <span className="wh-dock__label">{t("chrome.dock.theme")}</span>
        <button
          type="button"
          className="wh-iconbtn wh-btn wh-iconbtn--sm"
          onClick={toggleTheme}
          aria-label={themeLabel}
          title={themeLabel}
        >
          {theme === "dark" ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
        </button>
        <button
          type="button"
          className="wh-iconbtn wh-btn wh-iconbtn--sm"
          onClick={reset}
          aria-label={t("chrome.dock.reset")}
          title={t("chrome.dock.reset")}
          style={{ marginInlineStart: "auto" }}
        >
          <RotateCcw size={15} aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
