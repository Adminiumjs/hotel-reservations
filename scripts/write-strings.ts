/**
 * The screens' sentences, collected: every English sentence the house's
 * screens translate — `tr("…")`, `trx("…")` and `key("…")` in `src/app`,
 * `src/view` and the demo's scenes — written to `src/i18n/strings/house/keys.json`,
 * and each language's file checked against it (what is owed, what is left over).
 *
 *   npm run strings            write keys.json and report
 *   npm run strings -- --check report only; exit 1 if keys.json is stale
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const DIRS = ["src/app", "src/view", "src/demo/scenes.ts"];
const OUT = join(ROOT, "src/i18n/strings/house");
const LOCALES = ["de-DE", "fr-FR", "cs-CZ", "da-DK", "zh-CN", "zh-TW", "ar-EG"];

function files(path: string): string[] {
  const abs = join(ROOT, path);
  if (statSync(abs).isFile()) return [abs];
  return readdirSync(abs).flatMap((name) => files(join(path, name)));
}

export function collect(): string[] {
  const keys = new Set<string>();
  for (const file of DIRS.flatMap(files).filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))) {
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(/\b(?:tr|trx|key)\(\s*"((?:[^"\\]|\\.)*)"/g)) keys.add(JSON.parse(`"${m[1]!}"`) as string);
  }
  return [...keys].sort((a, b) => a.localeCompare(b, "en"));
}

const check = process.argv.includes("--check");
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
if (check && stale) process.exit(1);
