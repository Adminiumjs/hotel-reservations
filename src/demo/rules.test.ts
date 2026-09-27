/**
 * THE DEMO PLAYS THE MANIFEST'S RULES, AND SAYS WHICH IT PLAYS AHEAD OF IT.
 *
 * `rules.ts` is the manifest's stamps, night pools, states, public entries,
 * roles and email producers, written out for the demo (`npm run
 * demo-rules`); it fails here the moment the manifest moves without it.
 *
 * `AHEAD` lists what the demo plays that the manifest does not declare yet —
 * each waits for the Adminium that reads it. The day one of them lands in the
 * manifest, its check below fails, and the demo stops carrying its own copy.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { demoRulesText } from "../../scripts/write-demo-rules.ts";
import { AHEAD } from "./engine.ts";

type Json = Record<string, unknown>;
const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
const manifest = JSON.parse(read("../../manifest.json")) as Json & {
  requiredSchema: { tables: (Json & { ref: string; states?: Json & { moves: Record<string, unknown[]>; effects?: Json[] } })[] };
  publicAccess: (Json & { table: string; kind?: string; methods: string[] })[];
  roles: (Json & { key: string; limits?: Record<string, Json> })[];
};
const stays = manifest.requiredSchema.tables.find((t) => t.ref === "stays")!;
const text = JSON.stringify(manifest);

describe("the demo's rules are the manifest's", () => {
  it("is what `npm run demo-rules` writes from manifest.json", () => {
    expect(read("./rules.ts") === demoRulesText(manifest)).toBe(true);
  });
});

describe("what the demo plays ahead of the manifest is not in it yet", () => {
  it("answers the guest site's two availability questions", () => {
    expect(manifest.publicAccess.filter((e) => e.kind === "availability")).toEqual([]);
    expect(AHEAD.availability).toEqual(["stays", "stay_extras"]);
  });

  it("marks a no-show from the guest's own time (the manifest opens it at the arrival afternoon for everyone)", () => {
    const noShow = (stays.states!.moves["booked"] as Json[]).find((m) => m["to"] === "no_show")!;
    expect(JSON.stringify(noShow)).not.toContain("arrival_time");
  });

  it("moves the rooms along when a guest in the house changes room", () => {
    for (const effect of stays.states!.effects ?? []) expect(Object.keys(effect["on"] as Json)).toEqual(["to"]);
  });

  it("stops the links when a guest deletes their details, and makes a guest a new one", () => {
    expect(text).not.toContain("new-link");
    const customers = manifest.publicAccess.find((e) => e.table === "customers")!;
    expect(JSON.stringify(customers["forget"])).not.toContain("link");
  });

  it("judges an added extra by the arrival afternoon", () => {
    const adds = manifest.publicAccess.filter((e) => e.table === "stay_extras" && e.methods.includes("POST"));
    for (const entry of adds) expect(entry["writableWhen"]).toBeUndefined();
  });

  it("voids on a finished stay (the manifest keeps charges to the states a stay is open in)", () => {
    const children = (stays.states as Json)["children"] as Record<string, Json>;
    expect(children["charges"]!["parentIn"]).not.toContain("departed");
  });

  it("holds the party to the room on the desk's changes, and judges a stay in the house from today", () => {
    expect(AHEAD.staffAgrees && AHEAD.inHouseFromToday && AHEAD.datesJudgedBefore && AHEAD.extrasAddWindow).toBe(true);
    expect(text).not.toContain("changeIn");
  });
});
