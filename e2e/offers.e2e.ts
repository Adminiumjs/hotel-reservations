/**
 * The three new moments, each done by hand on its own screen in the four
 * looks (light, dark, Arabic, a phone): a guest types a code and reserves;
 * the desk takes a gift card; housekeeping puts the linen back. Every figure
 * on the page is the demo house's own answer — the test reads them, never
 * works them out.
 */
import { expect, test, type Page } from "@playwright/test";

import { check, demoUrl, goTo, newContext, play, ready, settle, VARIANTS, type HouseHandles } from "./browser.ts";

const state = (page: Page, key: string) => page.evaluate((k) => (window as unknown as { __house: HouseHandles & { app: { state: Record<string, unknown> } } }).__house.app.state[k], key);

for (const variant of VARIANTS) {
  test(`a guest types a code and reserves (${variant})`, async ({ browser }) => {
    const context = await newContext(browser, variant);
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(demoUrl("guest", variant));
    await ready(page);
    await goTo(page, "guest", "reserve");
    await settle(page);
    // The link opens the field; a code the house does not know is said under it, and nothing changes.
    await page.locator("button[aria-controls='code-box']").click();
    await page.locator("#code-field").fill("summer25");
    await page.locator("#code-field").press("Enter");
    await expect(page.locator("#code-err")).toBeVisible();
    await check(page, "offers", "reserve-code-refused", variant);
    // The house's own code: one row, by name, taken off before the tax.
    await page.locator("#code-field").fill("midweek");
    await page.locator("#code-field").press("Enter");
    await expect(page.locator("[data-code-row]")).toHaveCount(1);
    await expect(page.locator("[data-code-row]")).toContainText("Midweek");
    await expect(page.locator("[data-code-row]")).toContainText("MIDWEEK");
    await check(page, "offers", "reserve-code-applied", variant);
    // Removed, and put back by the card's shortcut; then reserved at the price shown.
    await page.locator("[data-code-row] button").click();
    await expect(page.locator("[data-code-row]")).toHaveCount(0);
    await play(page, "code-midweek");
    await page.locator("#code-field").press("Enter");
    await expect(page.locator("[data-code-row]")).toHaveCount(1);
    await play(page, "fill-guest");
    await settle(page);
    await page.evaluate(() => (window as unknown as { __house: { app: { tryReserve(): void } } }).__house.app.tryReserve());
    await expect.poll(() => state(page, "view")).toBe("conf");
    await check(page, "offers", "conf-with-code", variant);
    await expect(page.locator("main")).toContainText("Midweek");
    expect(errors).toEqual([]);
    await context.close();
  });

  test(`the desk takes a gift card (${variant})`, async ({ browser }) => {
    const context = await newContext(browser, variant);
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(demoUrl("desk", variant));
    await ready(page);
    await goTo(page, "desk", "folio");
    await play(page, "pay-gift-card");
    await settle(page);
    await expect(page.locator("#se-card")).toHaveValue("GC-7K2M-W3HN-Q4XP");
    // No amount is typed for a gift card: the house says what it pays.
    await expect(page.locator("#se-amt")).toHaveCount(0);
    await page.locator("#se-card").press("Enter");
    await expect(page.locator("[role=dialog] [role=status]")).toContainText("150.00");
    await check(page, "offers", "gift-card-checked", variant);
    await page.locator("[role=dialog] button").last().click();
    await expect.poll(() => state(page, "settleOpen")).toBe(false);
    await settle(page);
    await expect(page.locator("main")).toContainText("Q4XP");
    await check(page, "offers", "folio-gift-card-paid", variant);
    // A card the house does not know: said under the field.
    await play(page, "record-balance");
    await page.evaluate(() => (window as unknown as { __house: { app: { setState(s: unknown): void } } }).__house.app.setState({ settleMethod: "gift_card", cardCode: "GC-0000-0000-0000" }));
    await page.locator("#se-card").press("Enter");
    await expect(page.locator("#se-card-err")).toBeVisible();
    await check(page, "offers", "gift-card-unknown", variant);
    expect(errors).toEqual([]);
    await context.close();
  });

  test(`housekeeping puts the linen back (${variant})`, async ({ browser }) => {
    const context = await newContext(browser, variant);
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(demoUrl("desk", variant));
    await ready(page);
    await goTo(page, "desk", "today");
    await settle(page);
    await expect(page.locator("[data-linen-strip]")).toContainText("236");
    await check(page, "offers", "today-linen", variant);
    await play(page, "housekeeping");
    await settle(page);
    await expect(page.locator("main [data-icon='washing-machine']")).toBeVisible();
    await play(page, "linen-back");
    await settle(page);
    await expect(page.locator("[data-linen-row]")).toHaveCount(3);
    await expect(page.locator("[data-linen-row] input").first()).toHaveValue("24");
    await check(page, "offers", "linen-sheet", variant);
    // Two more bath towels than the note said: allowed, and said.
    await page.locator("[data-linen-row] input").first().fill("26");
    await check(page, "offers", "linen-sheet-changed", variant);
    await page.locator("aside[data-sheet] button").last().click();
    await expect.poll(() => state(page, "linenOpen")).toBe(false);
    await settle(page);
    await check(page, "offers", "linen-back-done", variant);
    expect(errors).toEqual([]);
    await context.close();
  });
}
