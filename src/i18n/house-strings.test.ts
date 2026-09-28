/**
 * The screens' words in all eight languages: every sentence the screens
 * translate has an entry in each language, with the same `{placeholders}` as
 * the English, a plural in the language's own number of forms, and none of the
 * words the release sweep refuses — in that language's spelling too.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { offences } from "../testing/lexicon.ts";
import { PLURAL_ORDER } from "./tr.ts";
import { HOUSE } from "./strings/house.ts";
import type { LocaleTag } from "./locales.ts";

const ROOT = resolve(import.meta.dirname, "../..");
const KEYS = JSON.parse(readFileSync(join(ROOT, "src/i18n/strings/house/keys.json"), "utf8")) as string[];
const OTHERS = Object.keys(HOUSE) as LocaleTag[];
const holes = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();

describe("the screens' words", () => {
  it("keys.json holds every sentence the screens translate, and each side's words are the languages' own", () => {
    execFileSync("npx", ["vite-node", "scripts/write-strings.ts", "--", "--check"], { cwd: ROOT, stdio: "pipe" });
  });

  it("gives a guest's build none of the desk's words", () => {
    const side = (name: string) => JSON.parse(readFileSync(join(ROOT, `src/i18n/strings/house/sides/${name}.json`), "utf8")) as Record<string, Record<string, string>>;
    const guestSees = new Set([...Object.keys(side("shared")["de-DE"]!), ...Object.keys(side("guest")["de-DE"]!)]);
    const deskOnly = Object.keys(side("desk")["de-DE"]!);
    expect(deskOnly.length).toBeGreaterThan(300);
    expect(deskOnly.filter((k) => guestSees.has(k))).toEqual([]);
    for (const k of ["Occupancy tonight", "Take a booking", "Record a payment"]) expect(guestSees.has(k), k).toBe(false);
  });

  it("reads enough sentences to mean something", () => {
    expect(KEYS.length).toBeGreaterThan(600);
    expect(OTHERS).toHaveLength(7);
  });

  it.each(OTHERS)("%s: every sentence, and nothing left over", (tag) => {
    const words = HOUSE[tag]!;
    expect(KEYS.filter((k) => !(k in words))).toEqual([]);
    expect(Object.keys(words).filter((k) => !KEYS.includes(k))).toEqual([]);
  });

  it.each(OTHERS)("%s: the same placeholders, and a plural in the language's own forms", (tag) => {
    const bad: string[] = [];
    for (const [en, text] of Object.entries(HOUSE[tag]!)) {
      if (text.trim() === "") bad.push(`empty: ${en}`);
      const plural = en.includes("|");
      const forms = plural ? text.split("|") : [text];
      if (plural && forms.length !== PLURAL_ORDER[tag].length) bad.push(`${String(forms.length)} forms, want ${String(PLURAL_ORDER[tag].length)}: ${en}`);
      if (!plural && text.includes("|")) bad.push(`a "|" in a sentence that is not a plural: ${en}`);
      const want = [...new Set(holes(en))].sort();
      for (const form of forms) {
        const got = [...new Set(holes(form))].sort();
        // A plural form may leave out {n} (Arabic "ليلة واحدة" says the one in words).
        const missing = want.filter((h) => !got.includes(h) && !(plural && h === "n"));
        const extra = got.filter((h) => !want.includes(h));
        if (missing.length > 0 || extra.length > 0) bad.push(`placeholders ${JSON.stringify(got)} for ${JSON.stringify(want)}: ${en} → ${form}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("says none of the banned words, in any language", () => {
    const hits = KEYS.flatMap((en) => offences(en, "en-US").map((w) => `en-US: ${w} in ${JSON.stringify(en)}`));
    for (const tag of OTHERS) for (const text of Object.values(HOUSE[tag]!)) hits.push(...offences(text, tag).map((w) => `${tag}: ${w} in ${JSON.stringify(text)}`));
    expect(hits).toEqual([]);
  });
});
