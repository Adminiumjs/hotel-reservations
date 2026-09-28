/*
 * Entry point.
 *
 * Every build draws the house's screens (`app/HouseRoot.tsx`, with their own
 * stylesheet). The demo build draws them on the demo's own Adminium, in this
 * browser; every other build on a real one (`app/bootAdminium.tsx`): the desk
 * served by Adminium to the person signed in to it, or the guest site through
 * the house's browser keys.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { DEMO } from "./surface.ts";

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root — check index.html");

/** This app, as the failure screen says it: the kind of app, never a sample house's name. */
const BRAND = "The hotel";

/**
 * The headline for a startup failure, chosen by CAUSE.
 *
 * One sentence used to cover every cause: "<Brand> is not connected". It was
 * wrong for most of them and actively misleading for two — an app that reached
 * Adminium, authenticated, and refused only because two databases are serving
 * is not "not connected", and an operator who reads that goes looking for a
 * broken connection instead of the choice the app is actually waiting on.
 *
 * The DETAIL under it already says precisely what happened; this only has to
 * name the KIND of problem without contradicting it.
 */
function titleFor(code: string | null): string {
  switch (code) {
    case "AMBIGUOUS_CONNECTION":
      return `${BRAND} does not know which database to read`;
    case "CONNECTION_PAUSED":
      return `The hotel's database is paused`;
    case "NO_CONNECTION":
      return `${BRAND} is not connected`;
    case "NO_BACKEND":
      return `${BRAND} has no backend configured`;
    default:
      // Reached the server and could not finish: a refused scope, a schema that
      // does not match, an expired session. "Not connected" would be a guess.
      return `${BRAND} could not load its data`;
  }
}

/**
 * The smallest honest "this is not configured" surface.
 *
 * Deliberately plain DOM and inline styles: it has to work when the data layer,
 * and possibly the locale bundle, did not. Anything richer would be one more
 * thing that can fail while reporting a failure.
 */
function showStartupFailure(mount: HTMLElement, detail: string, code: string | null): void {
  const title = titleFor(code);
  console.error(`[adminium] ${title}: ${detail}`);
  mount.innerHTML = "";
  const box = document.createElement("div");
  box.setAttribute("role", "alert");
  box.style.cssText =
    "max-width:34rem;margin:12vh auto;padding:1.5rem;font:400 15px/1.6 system-ui,sans-serif;" +
    "border:1px solid #d4d4d8;border-radius:12px;color:#18181b;background:#fff";
  const h = document.createElement("h1");
  h.textContent = title;
  h.style.cssText = "margin:0 0 .5rem;font-size:1.05rem;font-weight:600";
  const p = document.createElement("p");
  p.textContent = detail;
  // `pre-wrap`: the detail is a LIST — one problem per line, and a blank line
  // before any hint. Collapsed to a single run of prose (the CSS default) the
  // nine missing tables and the sentence that explains them read as one
  // sentence, which is how "resume it in Connections" ends up glued to a
  // column name.
  p.style.cssText = "margin:0;color:#52525b;white-space:pre-wrap";
  box.append(h, p);
  mount.append(box);
}

/**
 * The demo build: the house's screens on the demo's own Adminium, in this
 * browser. `?side=desk` opens the desk (the demo card switches sides).
 */
async function bootDemo(mount: HTMLElement): Promise<void> {
  const [{ DemoAdminium }, { HouseApp }, { HouseRoot }, { Scenes }, { startDemoBridge }] = await Promise.all([
    import("./demo/adminium.ts"),
    import("./app/house.ts"),
    import("./app/HouseRoot.tsx"),
    import("./demo/scenes.ts"),
    import("./demoBridge.ts"),
  ]);
  const demo = new DemoAdminium();
  const params = new URLSearchParams(window.location.search);
  const side = params.get("side") === "desk" ? "desk" : "guest";
  const dark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  const app = new HouseApp({ guest: demo.guest, desk: demo.desk }, side, { lang: params.get("lang") ?? "en-US", theme: params.get("theme") === "dark" || (params.get("theme") === null && dark) ? "dark" : "light" });
  app.demo = { onClock: (fn) => demo.onClock(fn) };
  const scenes = new Scenes(app, demo);
  (window as unknown as { __house?: unknown }).__house = { app, demo, scenes };
  await app.start();
  startDemoBridge(app, scenes);
  createRoot(mount).render(
    <StrictMode>
      <HouseRoot app={app} />
    </StrictMode>,
  );
}

async function boot(): Promise<void> {
  if (DEMO) {
    await bootDemo(container as HTMLElement);
    return;
  }
  /*
   * A NON-DEMO BUILD NEVER RENDERS DEMO DATA. The desk (hosted staff) reads
   * through the signed-in person's session; the guest site (hosted customer, or
   * a standalone build) through the house's browser keys. With no Adminium to
   * reach, the build says so and stops — it never falls back to the demo's rows.
   */
  const { bootAdminium } = await import("./app/bootAdminium.tsx");
  await bootAdminium(container as HTMLElement, (detail, code) => showStartupFailure(container as HTMLElement, detail, code));
}

void boot();
