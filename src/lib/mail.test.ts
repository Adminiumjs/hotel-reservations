import { describe, expect, it } from "vitest";

import { yes } from "../data/wire.ts";
import { mailable } from "./mail.ts";

describe("an address Adminium would mail", () => {
  it("is not a reserved one: a sample guest's gets no email", () => {
    expect(mailable("teodor.blank@example.com")).toBe(false);
    expect(mailable("a@desk.test")).toBe(false);
    expect(mailable("a@host.invalid")).toBe(false);
    expect(mailable("no-at-sign")).toBe(false);
    expect(mailable(null)).toBe(false);
  });
  it("is any other", () => {
    expect(mailable("guest@wrenhouse.co")).toBe(true);
    expect(mailable(" guest@myexample.com ")).toBe(true);
  });
});

describe("a yes/no column", () => {
  it("is a yes as `true`, and as the 1 an older Adminium answered", () => {
    expect([true, 1].map(yes)).toEqual([true, true]);
    expect([false, 0, null, undefined, "1", "true"].map(yes)).toEqual([false, false, false, false, false, false]);
  });
});
