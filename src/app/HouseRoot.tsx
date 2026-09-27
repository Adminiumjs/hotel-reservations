/**
 * The house on screen: one controller, its values worked out on every change,
 * and the design's screens drawn from them — the guest site or the desk, the
 * sheets and dialogs over either, and the toasts.
 */
import { useEffect, useSyncExternalStore } from "react";

import { DeskView } from "../view/DeskView.tsx";
import { GuestView } from "../view/GuestView.tsx";
import { OverlaysView } from "../view/OverlaysView.tsx";
import { ToastsView } from "../view/ToastsView.tsx";
import type { HouseApp } from "./house.ts";
import { renderVals } from "./vals/base.ts";

import "./house.css";

export function HouseRoot({ app }: { app: HouseApp }) {
  useSyncExternalStore(app.subscribe, app.snapshot);
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
          <GuestView v={v} />
          <DeskView v={v} />
          <OverlaysView v={v} />
          <ToastsView v={v} />
        </div>
      </div>
    </div>
  );
}
