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
import { DESK_ONLY } from "./engine.ts";

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

describe("what the demo plays is in the manifest now, not a copy of its own", () => {
  it("answers the guest site's two availability questions, saying a number only when few are left", () => {
    const found = manifest.publicAccess.filter((e) => e.kind === "availability");
    expect(found.map((e) => e.table)).toEqual(["stays", "stay_extras"]);
    for (const e of found) expect((e["showLeft"] as Json)["below"]).toBeGreaterThan(0);
  });

  it("marks a no-show from the guest's own time, and the arrival afternoon when they gave none", () => {
    const noShow = (stays.states!.moves["booked"] as Json[]).find((m) => m["to"] === "no_show")!;
    expect(JSON.stringify(noShow)).toContain('{"column":"arrival_time"}');
    // Only the key left out after 22:00 waits for the morning: the desk's screen keeps that.
    expect(DESK_ONLY.lateArrival).toBe("22:30");
  });

  it("moves the rooms along when a guest in the house changes room", () => {
    expect(stays.states!.effects).toContainEqual({ on: { change: "room_id", in: ["in_house"] }, old: { set: { status: "cleaning" } }, new: { set: { status: "occupied" } } });
  });

  it("stops the links when a guest deletes their details, and makes a guest a new one", () => {
    const customers = manifest.publicAccess.find((e) => e.table === "customers")!;
    expect((customers["forget"] as Json)["links"]).toBe(true);
    expect(text).toContain('"newLink":{"column":"link_token","kind":"stay-new-link"}');
  });

  it("judges an added extra by the arrival afternoon", () => {
    const adds = manifest.publicAccess.filter((e) => e.table === "stay_extras" && e.methods.includes("POST"));
    for (const entry of adds) expect(entry["writableWhen"]).toBeDefined();
  });

  it("voids whatever state the stay is in, and adds rows only while it is live", () => {
    const children = (stays.states as Json)["children"] as Record<string, Json>;
    expect(children["charges"]!["changeIn"]).toContain("departed");
    expect(children["charges"]!["createIn"]).not.toContain("departed");
  });

  it("judges a stay in the house from tonight on", () => {
    for (const rule of stays["capacity"] as Json[]) expect(rule["arrived"]).toEqual({ states: ["in_house"] });
  });
});
