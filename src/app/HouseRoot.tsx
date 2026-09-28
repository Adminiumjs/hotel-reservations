/**
 * The house on screen: one controller, its values worked out on every change,
 * and the design's screens drawn from them — the guest site or the desk, the
 * sheets and dialogs over either, and the toasts.
 */
import { Component, useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";

import { DeskView } from "../view/DeskView.tsx";
import { GuestView } from "../view/GuestView.tsx";
import { OverlaysView } from "../view/OverlaysView.tsx";
import { ToastsView } from "../view/ToastsView.tsx";
import { tr } from "../i18n/tr.ts";
import type { HouseApp } from "./house.ts";
import { DESK, GUEST } from "./sides.ts";
import { renderVals } from "./vals/base.ts";

import "./house.css";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** The sheet or dialog on top, if one is open. */
function topLayer(): HTMLElement | null {
  const all = [...document.querySelectorAll<HTMLElement>('[role="dialog"],[role="alertdialog"],aside[data-sheet],aside[data-nav-sheet]')];
  return all[all.length - 1] ?? null;
}

/**
 * A sheet or dialog keeps the keyboard inside it: the safe choice is focused
 * as it opens (the element marked `data-autofocus`, else the first control),
 * Tab goes round its own controls, and closing it gives focus back to what
 * opened it.
 */
function useLayerFocus(): void {
  const layer = useRef<{ el: HTMLElement; opener: Element | null } | null>(null);
  useEffect(() => {
    const top = topLayer();
    const now = layer.current;
    if (top !== null && top !== now?.el) {
      layer.current = { el: top, opener: now?.opener ?? document.activeElement };
      const first = top.querySelector<HTMLElement>("[data-autofocus]") ?? top.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus();
    } else if (top === null && now !== null) {
      layer.current = null;
      if (now.opener instanceof HTMLElement && now.opener.isConnected) now.opener.focus();
    }
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const top = topLayer();
      if (top === null) return;
      const items = [...top.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const at = document.activeElement;
      if (!top.contains(at)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && at === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && at === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

/** One bad row must never blank the whole site: the screens that failed say so, and a reload tries again. */
class Safe extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  override componentDidCatch(error: unknown): void {
    console.error(error);
  }
  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <main style={{ maxInlineSize: "34rem", margin: "12vh auto", padding: "0 20px", fontFamily: "system-ui, sans-serif", lineHeight: 1.55 }}>
        <h1 style={{ fontSize: "22px", margin: "0 0 10px" }}>{tr("This page could not be drawn.")}</h1>
        <p style={{ margin: "0 0 16px" }}>{tr("Something in it did not add up. Reloading usually puts it right.")}</p>
        <button onClick={() => window.location.reload()} style={{ padding: "10px 16px", borderRadius: "10px", border: "1px solid currentColor", background: "transparent", color: "inherit", font: "inherit", fontWeight: 700, cursor: "pointer" }}>
          {tr("Reload")}
        </button>
      </main>
    );
  }
}

export function HouseRoot({ app }: { app: HouseApp }) {
  return (
    <Safe>
      <House app={app} />
    </Safe>
  );
}

function House({ app }: { app: HouseApp }) {
  useSyncExternalStore(app.subscribe, app.snapshot);
  useLayerFocus();
  useEffect(() => {
    const onResize = () => {
      const narrow = window.innerWidth < 900;
      if (narrow !== app.state.isNarrow) app.setState({ isNarrow: narrow });
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") app.closeTop();
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
    };
  }, [app]);
  const v = renderVals(app);
  useEffect(() => {
    document.documentElement.lang = String(v["langCode"]);
    document.documentElement.dir = String(v["dir"]);
    document.documentElement.dataset["theme"] = String(v["themeAttr"]);
  });
  return (
    <div data-wh-root="" data-theme={String(v["themeAttr"])} dir={String(v["dir"])} lang={String(v["langCode"])} style={{ minBlockSize: "100vh", background: "var(--surface-3)", color: "var(--fg)" }}>
      <div data-wh-frame="">
        <div style={{ minBlockSize: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
          {GUEST ? <GuestView v={v} /> : null}
          {DESK ? <DeskView v={v} /> : null}
          <OverlaysView v={v} />
          <ToastsView v={v} />
          <div id="wh-said" className="wh-sr" role="status" aria-live="polite" />
        </div>
      </div>
    </div>
  );
}
