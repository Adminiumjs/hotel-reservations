/**
 * Every shortcut the demo card plays — the guest who rings, the room that goes
 * while someone types, the other desk that records a payment first — each on
 * a fresh Tuesday morning, on its own screen, shot and swept by axe. Then the
 * clock row: check-out time, and a whole day on.
 */
import { expect, test } from "@playwright/test";

import { DEMO_SCREENS } from "../src/demo-card.ts";
import { check, demoUrl, goTo, newContext, play, ready, settle, type HouseHandles } from "./browser.ts";

const MOMENTS = DEMO_SCREENS.flatMap((screen) => (screen.shortcuts ?? []).map((cut) => ({ screen, cut })));

test("every shortcut on its screen", async ({ browser }) => {
  expect(MOMENTS.length).toBeGreaterThan(30);
  const context = await newContext(browser, "light");
  const errors: string[] = [];
  for (const { screen, cut } of MOMENTS) {
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(`${cut.id}: ${error.message}`));
    await page.goto(demoUrl(screen.persona, "light"));
    await ready(page);
    await goTo(page, screen.persona, screen.view);
    await play(page, cut.id);
    await settle(page);
    // A moment's own follow-up (a toast, a sheet) lands a beat later.
    await page.waitForTimeout(400);
    await check(page, "moments", `${screen.id}-${cut.id}`, "light");
    await page.close();
  }
  expect(errors).toEqual([]);
  await context.close();
});

test("the clock row moves the house on", async ({ browser }) => {
  const context = await newContext(browser, "light");
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(demoUrl("desk", "light"));
  await ready(page);
  await goTo(page, "desk", "today");
  const day = () => page.evaluate(() => (window as unknown as { __house: HouseHandles & { app: { day: string } } }).__house.app.day);
  expect(await day()).toBe("2026-07-28");
  await page.evaluate(() => (window as unknown as { __house: HouseHandles }).__house.scenes.advance("checkout"));
  await check(page, "moments", "clock-checkout", "light");
  await page.evaluate(() => (window as unknown as { __house: HouseHandles }).__house.scenes.advance("day"));
  await expect.poll(day).toBe("2026-07-29");
  await check(page, "moments", "clock-day", "light");
  expect(errors).toEqual([]);
  await context.close();
});
