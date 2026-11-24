/**
 * The box "Text me about my stay": what the page tells of a typed number, and
 * what the reservation writes for the box.
 */
import { describe, expect, it } from "vitest";

import { numberState, offersBoxVals, offersOffered, offersOkFor, textBoxVals, textsOkFor } from "./textBox.ts";

describe("a typed number", () => {
  it("is read in the house's country when it carries none, and with its own when it does", () => {
    expect(["(207) 555-0123", "207 555 0123", "+44 20 7946 0958", "0044 20 7946 0958", "+1 (207) 555-0123"].map(numberState)).toEqual(["readable", "readable", "readable", "readable", "readable"]);
  });

  it("in mainland China (+86, or 0086) is one no text can go to; Hong Kong and Taiwan are not", () => {
    expect(["+86 138 0013 8000", "0086 13800138000", "+8613800138000"].map(numberState)).toEqual(["china", "china", "china"]);
    expect(["+852 6123 4567", "+886 912 345 678"].map(numberState)).toEqual(["readable", "readable"]);
  });

  it("cannot be read when it is letters, too short or too long", () => {
    expect(["call me", "12-34", "+1 2", "+123456789012345678", "555-CALL"].map(numberState)).toEqual(["unreadable", "unreadable", "unreadable", "unreadable", "unreadable"]);
    expect(["", "   "].map(numberState)).toEqual(["empty", "empty"]);
  });
});

describe("the box", () => {
  const toggle = () => undefined;

  it("starts unticked and says it is optional, with what the texts are about", () => {
    const v = textBoxVals(false, "", toggle);
    expect([v.textOn, v.textDisabled, v.textHintOn, v.textChinaOn, v.textCheckOn]).toEqual([false, false, true, false, false]);
    expect([v.textLabel, v.textSub, v.textOptional]).toEqual([
      "Text me about my stay",
      "Your arrival details, and if your dates change.",
      "Optional. You can stop at any time; each text tells you how.",
    ]);
  });

  it("is off for a +86 number, and one line says so in place of its hint", () => {
    const v = textBoxVals(true, "+86 138 0013 8000", toggle);
    expect([v.textOn, v.textDisabled, v.textHintOn, v.textChinaOn]).toEqual([false, true, false, true]);
    expect(v.textChina).toBe("We can't send texts to numbers in mainland China. Everything else works as usual.");
    let toggled = 0;
    textBoxVals(false, "+86 138 0013 8000", () => (toggled += 1)).onText();
    expect(toggled).toBe(0);
  });

  it("ticked, with a number that cannot be read, asks the guest to check it, and stops nothing", () => {
    expect(textBoxVals(true, "555-CALL", toggle)).toMatchObject({ textOn: true, textCheckOn: true, textCheck: "Check this number so we can text you" });
    expect(textBoxVals(false, "555-CALL", toggle).textCheckOn).toBe(false);
    expect(textBoxVals(true, "(207) 555-0123", toggle).textCheckOn).toBe(false);
  });
});

describe("what the reservation writes", () => {
  it("is the guest's tick, for a number a text can go to; never a yes the guest did not give", () => {
    expect(textsOkFor(true, "(207) 555-0123")).toBe(true);
    expect(textsOkFor(false, "(207) 555-0123")).toBe(false);
    expect(textsOkFor(true, "+86 138 0013 8000")).toBe(false);
    expect(textsOkFor(true, "")).toBe(false);
  });
});

describe("the box for offers", () => {
  it("is never shown for mainland China, the UAE, Egypt, Saudi Arabia or Taiwan; Hong Kong and the rest are offered", () => {
    expect(["+86 138 0013 8000", "+971 50 123 4567", "+20 10 1234 5678", "+966 50 123 4567", "+886 912 345 678", "00886 912 345 678"].map(offersOffered)).toEqual([false, false, false, false, false, false]);
    expect(["+852 6123 4567", "+44 20 7946 0958", "(207) 555-0123", ""].map(offersOffered)).toEqual([true, true, true, true]);
  });

  it("starts unticked, names the house, and writes a yes only for a number offers can go to", () => {
    const v = offersBoxVals(false, "(207) 555-0123", () => undefined, "Wren House", true);
    expect([v.offersShown, v.offersOn, v.offersLabel]).toEqual([true, false, "Text me offers from Wren House"]);
    expect(offersBoxVals(true, "+886 912 345 678", () => undefined, "Wren House", true)).toMatchObject({ offersShown: false, offersOn: false });
    expect([offersOkFor(true, "(207) 555-0123"), offersOkFor(true, "+971 50 123 4567"), offersOkFor(true, ""), offersOkFor(false, "(207) 555-0123")]).toEqual([true, false, false, false]);
  });
});

describe("with texts not set up in Adminium", () => {
  it("draws neither box, and writes no yes", () => {
    expect(textBoxVals(true, "(207) 555-0123", () => undefined, false)).toMatchObject({ textShown: false, textOn: false, textCheckOn: false });
    expect(offersBoxVals(true, "(207) 555-0123", () => undefined, "Wren House", false)).toMatchObject({ offersShown: false, offersOn: false });
    expect([textsOkFor(true, "(207) 555-0123", false), offersOkFor(true, "(207) 555-0123", false)]).toEqual([false, false]);
  });
});
