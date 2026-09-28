/**
 * The screens' sentences, collected: every English sentence the house's
 * screens translate — `tr("…")`, `trx("…")` and `key("…")` in `src/app`,
 * `src/view` and the demo's scenes — written to `src/i18n/strings/house/keys.json`,
 * and each language's file checked against it (what is owed, what is left over).
 *
 * Each sentence also goes to the side that draws it — `sides/shared.json`,
 * `guest.json`, `desk.json`, `demo.json`, every language in each — so a guest's
 * build carries the guest's words and not the desk's (`../src/i18n/strings/house.ts`).
 * A sentence belongs to the side of the files that say it: the desk's modules
 * (`SURFACE_STAFF_ONLY`), the guest's own, the demo's scenes; any other file is
 * drawn by both.
 *
 *   npm run strings            write keys.json and the sides, and report
 *   npm run strings -- --check report only; exit 1 if either is stale
 */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { SURFACE_STAFF_ONLY } from "../src/surface-nav.ts";

const ROOT = resolve(import.meta.dirname, "..");
const DIRS = ["src/app", "src/view", "src/demo/scenes.ts"];
const OUT = join(ROOT, "src/i18n/strings/house");
const LOCALES = ["de-DE", "fr-FR", "cs-CZ", "da-DK", "zh-CN", "zh-TW", "ar-EG"];

function files(path: string): string[] {
  const abs = join(ROOT, path);
  if (statSync(abs).isFile()) return [abs];
  return readdirSync(abs).flatMap((name) => files(join(path, name)));
}

/** Every sentence, with the files that say it (repo-relative). */
export function collectWhere(): Map<string, Set<string>> {
  const where = new Map<string, Set<string>>();
  for (const file of DIRS.flatMap(files).filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))) {
    const text = readFileSync(file, "utf8");
    const rel = relative(ROOT, file);
    for (const m of text.matchAll(/\b(?:tr|trx|key)\(\s*"((?:[^"\\]|\\.)*)"/g)) {
      const key = JSON.parse(`"${m[1]!}"`) as string;
      where.set(key, (where.get(key) ?? new Set()).add(rel));
    }
  }
  return where;
}

export function collect(): string[] {
  return [...collectWhere().keys()].sort((a, b) => a.localeCompare(b, "en"));
}

const GUEST_ONLY = ["src/app/vals/guest.ts", "src/view/GuestView.tsx"];
const DEMO_ONLY = ["src/demo/scenes.ts"];
export type Side = "shared" | "guest" | "desk" | "demo";

/** The side a sentence is drawn by, from the files that say it. */
export function sideOf(files: Set<string>): Side {
  const all = [...files];
  const of = (list: readonly string[]) => all.every((f) => list.includes(f));
  if (of(DEMO_ONLY)) return "demo";
  const noDemo = all.filter((f) => !DEMO_ONLY.includes(f));
  if (noDemo.every((f) => (SURFACE_STAFF_ONLY as readonly string[]).includes(f))) return "desk";
  if (noDemo.every((f) => GUEST_ONLY.includes(f))) return "guest";
  return "shared";
}

const check = process.argv.includes("--check");
const where = collectWhere();
const keys = collect();
const path = join(OUT, "keys.json");
const was = (() => {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as string[];
  } catch {
    return [];
  }
})();
const stale = JSON.stringify(was) !== JSON.stringify(keys);
if (!check) writeFileSync(path, `${JSON.stringify(keys, null, 2)}\n`);
console.log(`${String(keys.length)} sentences${stale ? (check ? " — keys.json is stale" : " — keys.json written") : ""}`);
for (const tag of LOCALES) {
  let words: Record<string, string> = {};
  try {
    words = JSON.parse(readFileSync(join(OUT, `${tag}.json`), "utf8")) as Record<string, string>;
  } catch {
    // Not started.
  }
  const owed = keys.filter((k) => !(k in words));
  const extra = Object.keys(words).filter((k) => !keys.includes(k));
  console.log(`${tag}: ${String(owed.length)} owed, ${String(extra.length)} left over`);
}
// Each side's words, every language in each: what a build of that side carries.
const sides: Record<Side, Record<string, Record<string, string>>> = { shared: {}, guest: {}, desk: {}, demo: {} };
for (const tag of LOCALES) {
  let words: Record<string, string> = {};
  try {
    words = JSON.parse(readFileSync(join(OUT, `${tag}.json`), "utf8")) as Record<string, string>;
  } catch {
    // Not started.
  }
  for (const side of Object.keys(sides) as Side[]) sides[side][tag] = {};
  for (const key of keys) if (key in words) sides[sideOf(where.get(key)!)][tag]![key] = words[key]!;
}
let sidesStale = false;
mkdirSync(join(OUT, "sides"), { recursive: true });
for (const side of Object.keys(sides) as Side[]) {
  const path = join(OUT, "sides", `${side}.json`);
  const text = `${JSON.stringify(sides[side], null, 1)}\n`;
  let was = "";
  try {
    was = readFileSync(path, "utf8");
  } catch {
    // Not written yet.
  }
  if (was !== text) {
    sidesStale = true;
    if (!check) writeFileSync(path, text);
  }
}
console.log(`sides: ${(Object.keys(sides) as Side[]).map((side) => `${side} ${String(Object.keys(sides[side]["de-DE"] ?? {}).length)}`).join(", ")}${sidesStale ? (check ? " — stale" : " — written") : ""}`);
if (check && (stale || sidesStale)) process.exit(1);
