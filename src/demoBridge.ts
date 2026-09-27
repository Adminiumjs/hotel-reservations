/**
 * The demo's side of the website card's protocol (`demo-types.ts`): the card
 * picks a side and a screen, plays a screen's shortcuts, sets the language and
 * the theme, moves the clock; this answers with the house's state after every
 * change — which screen, which side, the clock as the card should print it, and
 * whether a sheet or dialog covers the page (the card hides then).
 *
 * Only the demo build contains this file (`DEMO` folds it away), and only a
 * page framed by the website's own origin speaks it.
 */
import { fDW, fT, strip } from "./app/fmt.ts";
import type { HouseApp, View } from "./app/house.ts";
import { DEMO_APP_KEY, DEMO_SCREENS } from "./demo-card.ts";
import { DEMO_PROTOCOL_VERSION, isDemoMessage, type DemoMessage } from "./demo-types.ts";
import type { Scenes } from "./demo/scenes.ts";
import { isLocaleTag } from "./i18n/locales.ts";

/** The card's screen for what is showing. */
export function currentScreen(app: HouseApp): string {
  const view = app.state.view;
  if (view === "404") return app.persona === "guest" ? "guest-404" : "desk-404";
  return DEMO_SCREENS.find((s) => s.view === view)?.id ?? String(view);
}

/** Whether a sheet, dialog or the narrow menu covers the page. */
export function overlayOpen(app: HouseApp): boolean {
  const s = app.state;
  return (
    s.navOpen ||
    s.checkinId !== null ||
    s.checkoutId !== null ||
    s.roomN !== null ||
    s.chargeOpen ||
    s.settleOpen ||
    s.cancelId !== null ||
    s.voidT !== null ||
    s.moveId !== null ||
    s.expectId !== null ||
    s.ddOpen ||
    s.chg !== null
  );
}

async function goToScreen(app: HouseApp, scenes: Scenes, id: string): Promise<void> {
  const screen = DEMO_SCREENS.find((s) => s.id === id);
  if (screen === undefined) return;
  if (app.persona !== screen.persona) app.setPersona(screen.persona);
  await scenes.go(screen.view as View);
}

function stateMessage(app: HouseApp): DemoMessage {
  return {
    type: "adminium:demo:state",
    dv: DEMO_PROTOCOL_VERSION,
    screen: currentScreen(app),
    persona: app.persona,
    mode: null,
    online: true,
    toggles: {},
    locale: app.state.lang,
    theme: app.state.theme,
    clockLabel: `${strip(fDW(app.day))} · ${strip(fT(app.time))}`,
    overlay: overlayOpen(app),
  };
}

export async function applyDemoMessage(message: DemoMessage, app: HouseApp, scenes: Scenes): Promise<void> {
  switch (message.type) {
    case "adminium:demo:init":
      if (isLocaleTag(message.locale)) app.setLang(message.locale);
      app.setState({ theme: message.theme });
      if (message.persona === "guest" || message.persona === "desk") app.setPersona(message.persona);
      if (message.screen !== undefined) await goToScreen(app, scenes, message.screen);
      return;
    case "adminium:demo:go":
      await goToScreen(app, scenes, message.screen);
      return;
    case "adminium:demo:do":
      await scenes.shortcuts[message.shortcut]?.();
      return;
    case "adminium:demo:set":
      if (message.theme !== undefined) app.setState({ theme: message.theme });
      if (message.locale !== undefined && isLocaleTag(message.locale)) app.setLang(message.locale);
      if (message.persona === "guest" || message.persona === "desk") app.setPersona(message.persona);
      return;
    case "adminium:demo:clock":
      await scenes.advance(message.advance);
      return;
    case "adminium:demo:reset":
      // Everything back as it was: the sample house, Tuesday morning.
      window.location.reload();
      return;
    default:
      return;
  }
}

export function startDemoBridge(app: HouseApp, scenes: Scenes): () => void {
  if (typeof window === "undefined" || window.parent === window) return () => {};
  const origin = window.location.origin;
  const parent = window.parent;
  const post = (message: DemoMessage) => parent.postMessage(message, origin);
  let last = "";
  const report = () => {
    const message = stateMessage(app);
    const text = JSON.stringify(message);
    if (text === last) return;
    last = text;
    post(message);
  };
  const onMessage = (event: MessageEvent) => {
    if (event.origin !== origin || event.source !== parent || !isDemoMessage(event.data)) return;
    void applyDemoMessage(event.data, app, scenes).finally(report);
  };
  window.addEventListener("message", onMessage);
  const off = app.subscribe(report);
  post({ type: "adminium:demo:hello", dv: DEMO_PROTOCOL_VERSION, appKey: DEMO_APP_KEY });
  return () => {
    window.removeEventListener("message", onMessage);
    off();
  };
}
