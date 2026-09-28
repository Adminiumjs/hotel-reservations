/**
 * Every screen the demo card offers, on both sides — the guest site and the
 * front desk — in light, dark, Arabic and on a phone, each shot and swept by
 * axe. The card's own `go` puts each screen up with what it needs to show (a
 * reservation for the confirmation, a signed-in guest for their list).
 */
import { expect, test } from "@playwright/test";

import { DEMO_SCREENS } from "../src/demo-card.ts";
import { check, demoUrl, goTo, newContext, ready, VARIANTS } from "./browser.ts";

for (const variant of VARIANTS) {
  test(`every screen, ${variant}`, async ({ browser }) => {
    const context = await newContext(browser, variant);
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(demoUrl("guest", variant));
    await ready(page);
    for (const screen of DEMO_SCREENS) {
      await goTo(page, screen.persona, screen.view);
      await expect.poll(() => page.evaluate(() => (window as unknown as { __house: { app: { state: { view: string } } } }).__house.app.state.view)).toBe(screen.view);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      await check(page, screen.persona, screen.id, variant);
    }
    expect(errors).toEqual([]);
    await context.close();
  });
}
