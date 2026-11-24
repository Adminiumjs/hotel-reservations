/**
 * The box "Text me about my stay", done by hand in the four looks (light,
 * dark, Arabic, a phone): on the guest's reservation, beside the email tick
 * and never the same box; a +86 number; a number that cannot be read; a
 * reservation made with the box left empty; and the desk's phone booking,
 * with its "ask the guest first". Each state is shot and swept.
 */
import { expect, test, type Page } from "@playwright/test";

import { check, demoUrl, goTo, newContext, play, ready, settle, VARIANTS, type HouseHandles } from "./browser.ts";

const state = (page: Page, key: string) => page.evaluate((k) => (window as unknown as { __house: HouseHandles & { app: { state: Record<string, unknown> } } }).__house.app.state[k], key);

for (const variant of VARIANTS) {
  test(`the guest's box for texts (${variant})`, async ({ browser }) => {
    const context = await newContext(browser, variant);
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(demoUrl("guest", variant));
    await ready(page);
    await goTo(page, "guest", "reserve");
    await play(page, "fill-guest");
    await settle(page);
    const box = page.locator("#rv-texts");
    const news = page.locator("#rv-opt-in");
    // W01: empty, under the mobile; the mobile's hint as it always was; the box says it is optional.
    await expect(box).not.toBeChecked();
    await expect(box).toBeEnabled();
    await expect(box).toHaveAttribute("aria-describedby", "rv-texts-hint");
    await expect(page.locator("#rv-texts-hint")).toHaveAttribute("aria-live", "polite");
    if (variant !== "arabic") {
      await expect(page.locator("#rv-mobile-hint")).toHaveText("Only so the desk can ring you on the day.");
      await expect(page.locator("#rv-texts-hint")).toContainText("Optional. You can stop at any time; each text tells you how.");
    }
    await check(page, "texts", "w01-box-empty", variant);
    // W03: ticking the email box never ticks the texts', and the other way round.
    await news.check();
    await expect(box).not.toBeChecked();
    await news.uncheck();
    // W02: ticked, the mobile's hint says the desk may text them too.
    await box.check();
    await expect(box).toBeChecked();
    await expect(news).not.toBeChecked();
    if (variant !== "arabic") await expect(page.locator("#rv-mobile-hint")).toHaveText("So the desk can ring you on the day, and text you about your stay.");
    await check(page, "texts", "w02-box-ticked", variant);
    // W13: the second box, for offers: its own, unticked, never ticked by the first.
    const offers = page.locator("#rv-offers");
    await expect(offers).not.toBeChecked();
    if (variant !== "arabic") await expect(page.getByText("Text me offers from Wren House")).toBeVisible();
    await offers.check();
    await expect(box).toBeChecked();
    await check(page, "texts", "w13-offers-ticked", variant);
    await offers.uncheck();
    // W04: a +86 number turns the box off and says why; the number stays for a call.
    await page.locator("#rv-mobile").fill("+86 138 0013 8000");
    await expect(box).toBeDisabled();
    await expect(box).not.toBeChecked();
    // No offers to mainland China: the box is not there at all.
    await expect(page.locator("#rv-offers")).toHaveCount(0);
    if (variant !== "arabic") await expect(page.locator("#rv-texts-hint")).toHaveText("We can't send texts to numbers in mainland China. Everything else works as usual.");
    await check(page, "texts", "w04-china", variant);
    // Hong Kong and Taiwan are not mainland China.
    await page.locator("#rv-mobile").fill("+886 912 345 678");
    await expect(box).toBeEnabled();
    await expect(box).toBeChecked();
    // Taiwan takes texts about a stay, but no offers: that box is not offered, and nothing says why.
    await expect(page.locator("#rv-offers")).toHaveCount(0);
    await page.locator("#rv-mobile").fill("+852 6123 4567");
    await expect(page.locator("#rv-offers")).toHaveCount(1);
    // W05: ticked, with a number that cannot be read: said beside the field.
    await page.locator("#rv-mobile").fill("555-CALL");
    await expect(page.locator("#rv-mobile-check")).toBeVisible();
    await expect(page.locator("#rv-mobile")).toHaveAttribute("aria-describedby", "rv-mobile-hint rv-mobile-check");
    await check(page, "texts", "w05-unreadable", variant);
    // Left empty, the reservation goes as it always did: no error, no nudge, no second question.
    await box.uncheck();
    await page.locator("#rv-mobile").fill("(207) 555-0150");
    await settle(page);
    await page.evaluate(() => (window as unknown as { __house: { app: { tryReserve(): void } } }).__house.app.tryReserve());
    await expect.poll(() => state(page, "view")).toBe("conf");
    expect((await state(page, "form")) as { textsOk: boolean }).toMatchObject({ textsOk: false });
    expect(errors).toEqual([]);
    await context.close();
  });

  test(`the desk's box for a phone booking (${variant})`, async ({ browser }) => {
    const context = await newContext(browser, variant);
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(demoUrl("desk", variant));
    await ready(page);
    await goTo(page, "desk", "newbooking");
    await settle(page);
    const box = page.locator("#nb-texts");
    // W06: the same box, unticked, with the desk's own line.
    await expect(box).not.toBeChecked();
    if (variant !== "arabic") await expect(page.locator("#nb-texts-hint")).toContainText("Ask the guest first. Tick only if they said yes.");
    await page.locator("#nb-mobile").fill("(207) 555-0199");
    await box.check();
    await expect(box).toBeChecked();
    await check(page, "texts", "w06-desk-box", variant);
    await page.locator("#nb-mobile").fill("+86 138 0013 8000");
    await expect(box).toBeDisabled();
    await check(page, "texts", "w06-desk-china", variant);
    expect(errors).toEqual([]);
    await context.close();
  });
}
