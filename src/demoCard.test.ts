/**
 * The demo card's declaration, whole: the `demo.json` it builds is one the
 * website accepts, in all eight languages; every screen is a screen the house
 * has; every shortcut and clock step has a scene that plays it.
 */
import { describe, expect, it } from "vitest";

import { buildDemoJson } from "../demo-emit.ts";
import { HouseApp } from "./app/house.ts";
import { DEMO_APP_KEY, DEMO_CLOCK, DEMO_DIR, DEMO_FRAMES, DEMO_PERSONAS, DEMO_SCREENS } from "./demo-card.ts";
import { demoJsonIssues } from "./demo-types.ts";
import { DemoAdminium } from "./demo/adminium.ts";
import { Scenes } from "./demo/scenes.ts";
import { DEMO_CARD_MESSAGES } from "./i18n/strings/demo-card.ts";
import { offences } from "./testing/lexicon.ts";

const VIEWS = ["home", "rooms", "find", "results", "type", "reserve", "conf", "signin", "list", "one", "404", "today", "newbooking", "rack", "calendar", "reservations", "folio"];

describe("the demo card", () => {
  const doc = buildDemoJson({
    appKey: DEMO_APP_KEY,
    dir: DEMO_DIR,
    frames: DEMO_FRAMES,
    screens: DEMO_SCREENS,
    personas: DEMO_PERSONAS,
    clock: DEMO_CLOCK,
    messages: DEMO_CARD_MESSAGES,
  });

  it("says nothing the release sweep refuses, in any of its eight languages (the card may say it is a demo)", () => {
    const hits = Object.entries(DEMO_CARD_MESSAGES).flatMap(([tag, words]) =>
      Object.values(words as Record<string, string>).flatMap((text) => offences(text, tag).filter((w) => !/demo|démo|演示|示範|تجريبي|ukázk|vorführ|demonstration/i.test(w)).map((w) => `${tag}: ${w} in ${JSON.stringify(text)}`)),
    );
    expect(hits).toEqual([]);
  });

  it("builds a demo.json the website accepts", () => {
    expect(demoJsonIssues(doc, { appKey: "hotel", dir: "hotel-reservations" })).toEqual([]);
  });

  it("offers the house's eighteen screens, each one the house has", () => {
    expect(doc.screens).toHaveLength(18);
    for (const screen of DEMO_SCREENS) expect(VIEWS).toContain(screen.view);
  });

  it("has a scene for every shortcut", () => {
    const demo = new DemoAdminium();
    const app = new HouseApp({ guest: demo.guest, desk: demo.desk }, "guest");
    const scenes = new Scenes(app, demo);
    const ids = DEMO_SCREENS.flatMap((s) => (s.shortcuts ?? []).map((c) => c.id));
    expect(ids.filter((id) => typeof scenes.shortcuts[id] !== "function")).toEqual([]);
    expect(Object.keys(scenes.shortcuts).sort()).toEqual([...ids].sort());
  });
});
