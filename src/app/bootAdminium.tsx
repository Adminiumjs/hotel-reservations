/**
 * The house on a real Adminium: the desk served by Adminium to the person
 * signed in to it, or the guest site through the house's browser keys — the
 * same screens the demo draws, through the real doors (`../data/adminium*.ts`).
 *
 * The staff build reads its whole start from the staff `surface-config.json`;
 * the guest site from the customer one, or from a standalone build's baked
 * address and key. Nothing here falls back to invented rows: a build with no
 * Adminium to reach says so and stops.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { resolveLocale } from "../i18n/locales.ts";
import { HOSTED, SURFACE_SIDE } from "../surface.ts";
import { HouseRoot } from "./HouseRoot.tsx";
import { HouseApp } from "./house.ts";

export type StartupFailure = (detail: string, code: string | null) => void;

/** Where a guest's page was opened: a sign-in link (`…/c#<code>`), a stay's own link (`…/r#<code>`), or neither. */
export function entryOf(pathname: string, hash: string): { place: "c" | "r" | null; token: string | null } {
  const last = pathname.replace(/\/+$/, "").split("/").pop() ?? "";
  const token = hash.replace(/^#/, "").split("&")[0] ?? "";
  const place = last === "c" || last === "r" ? last : null;
  return { place, token: place !== null && /^[A-Za-z0-9_-]{8,128}$/.test(token) ? token : null };
}

export async function bootAdminium(mount: HTMLElement, fail: StartupFailure): Promise<void> {
  const lang = resolveLocale(typeof navigator === "undefined" ? [] : navigator.languages);
  const theme = window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  let app: HouseApp;

  // Each side loads only its own door: the branch not taken folds away, and its imports with it.
  if (HOSTED && SURFACE_SIDE === "staff") {
    const [{ loadStaffConfig }, { createSessionTransport }, { AdminiumDesk }] = await Promise.all([import("../staffConnection.ts"), import("../data/sessionSource.ts"), import("../data/adminiumDesk.ts")]);
    const staff = await loadStaffConfig();
    if (staff === null) {
      fail("This Adminium did not answer the desk's configuration. It may be older than this app, or the app is not installed.", "NO_BACKEND");
      return;
    }
    if (staff.user === null || staff.csrfToken === null) {
      window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    const transport = createSessionTransport({
      tableOfRef: staff.tables,
      connectionId: staff.connectionId ?? undefined,
      staff: { csrfToken: staff.csrfToken, timezone: staff.timezone, timezoneSource: staff.timezoneSource, serverTimezone: staff.serverTimezone, currency: staff.currency },
      refreshToken: async () => (await loadStaffConfig())?.csrfToken ?? null,
    });
    app = new HouseApp({ desk: new AdminiumDesk(transport, staff) }, "desk", { lang, theme });
  } else {
    const [{ resolveSurfaceConfig }, { AdminiumGuest }] = await Promise.all([import("../publicConfig.ts"), import("../data/adminiumGuest.ts")]);
    const served = await resolveSurfaceConfig();
    if (served === null) {
      fail(
        "This build has no backend configured. A hosted guest site needs a key bound to it in Studio (or VITE_ADMINIUM_PUBLISHABLE_KEY baked at build time); a standalone build needs that and VITE_ADMINIUM_API_BASE_URL.",
        "NO_BACKEND",
      );
      return;
    }
    app = new HouseApp({ guest: new AdminiumGuest(served) }, "guest", { lang, theme });
  }

  await app.start();
  const entry = app.persona === "guest" ? entryOf(window.location.pathname, window.location.hash) : { place: null, token: null };
  // The link's code leaves the address bar at once: a reload must not spend it again.
  if (entry.place !== null) window.history.replaceState(window.history.state, "", window.location.pathname.replace(/\/(c|r)\/?$/, "/"));
  // The address bar's screen first, then where the guest's link or kept session takes them: the link wins.
  if (HOSTED) await attachToHost(app);
  if (app.persona === "guest") {
    await app.arrive(entry.place, entry.token);
    // "Your reservation" is the list for a guest already signed in.
    if (app.state.view === "signin" && app.state.signedIn !== null && entry.place === null) app.go("list");
  }

  createRoot(mount).render(
    <StrictMode>
      <HouseRoot app={app} />
    </StrictMode>,
  );
}

/**
 * Hosted inside Adminium: the address bar follows the screen, and the
 * dashboard's frame — its theme, its language, its sidebar — drives the app.
 */
async function attachToHost(app: HouseApp): Promise<void> {
  const [{ attachUrlSync }, { connectToHost }, { SURFACE_NAV, APP_KEY }] = await Promise.all([import("../urlSync.ts"), import("../embed.ts"), import("../surface-nav.ts")]);
  let bridge: { navigated: (path: string) => void } | null = null;
  const sync = attachUrlSync({
    nav: SURFACE_NAV,
    side: SURFACE_SIDE,
    go: (view) => app.go(view),
    current: () => app.state.view ?? "home",
    onPath: (path) => bridge?.navigated(path),
  });
  bridge = await connectToHost(APP_KEY, SURFACE_SIDE as "staff" | "customer", sync.path(), {
    onTheme: (theme) => app.setState({ theme }),
    onLocale: (tag) => app.setLang(resolveLocale([tag])),
    onPath: (path) => sync.applyPath(path),
  });
  let last = app.state.view;
  app.subscribe(() => {
    if (app.state.view === last) return;
    last = app.state.view;
    sync.reflect();
  });
}
