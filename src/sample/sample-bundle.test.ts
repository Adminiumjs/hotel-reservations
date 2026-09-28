/**
 * THE SAMPLE FILE, ITS SOURCE, THE BROWSER'S LOADER AND THE MANIFEST AGREE.
 *
 * `seeds/hotel.sample.json` is what an operator adds from Adminium and what
 * the website's demo resolves in the browser. It is written from
 * `wren-house.ts` (`npm run sample`); this fails when the two drift, puts the
 * file through the checks Adminium runs when it is added (vendored with the
 * rest of the manifest checks), holds the loader's written part to
 * manifest.json, and then checks what a sample load cannot: every row is one
 * the product could have made.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { sampleText } from "../../scripts/write-sample.ts";
import { withWrittenPart, type ManifestForSample } from "../../scripts/write-sample-columns.ts";
import { sampleBundleIssues, sampleBundleSchema } from "../testing/manifest/sample.ts";
import type { Manifest } from "../testing/manifest/schema.ts";
import { resolveSample, type SampleBundleRows } from "../data/sampleRows.ts";
import { offences } from "../testing/lexicon.ts";
import { DEMO_ZONE } from "./wren-house.ts";

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
const manifest = JSON.parse(read("../../manifest.json")) as Manifest & ManifestForSample & { sampleData: { file: string } };
const text = read("../../seeds/hotel.sample.json");
const bundle = JSON.parse(text) as SampleBundleRows;
const rowsOf = (ref: string) => bundle.tables.find((t) => t.ref === ref)?.rows ?? [];

describe("the sample file is what its source writes", () => {
  it("is byte for byte `wren-house.ts`'s bundle — run `npm run sample` after changing it", () => {
    expect(text === sampleText()).toBe(true);
  });

  it("is the file the manifest names", () => {
    expect(manifest.sampleData.file).toBe("seeds/hotel.sample.json");
  });

  it("holds the loader's columns and rules to manifest.json — run `npm run sample` after changing the manifest", () => {
    const source = read("../data/sampleRows.ts");
    expect(withWrittenPart(source, manifest) === source).toBe(true);
  });
});

describe("Adminium would add it", () => {
  it("is a well-formed adminium.sample/1 bundle", () => {
    expect(sampleBundleSchema.safeParse(bundle).success).toBe(true);
  });

  it("passes the checks Adminium runs before it adds a bundle", () => {
    expect(sampleBundleIssues(bundle as never, manifest)).toEqual([]);
  });

  it("resolves at any moment, not only on a Tuesday at 09:05", () => {
    for (const iso of ["2026-07-28T13:05:00Z", "2026-07-28T15:20:00Z", "2026-07-30T03:10:00Z", "2026-12-24T20:00:00Z", "2027-03-14T07:00:00Z"]) {
      expect(() => resolveSample(bundle, { now: Date.parse(iso), zone: DEMO_ZONE, locale: "en-US", currency: "USD" })).not.toThrow();
    }
  });
});

describe("added on any day, it is the same house at another point of its week", () => {
  const at = (iso: string) => resolveSample(bundle, { now: Date.parse(iso), zone: DEMO_ZONE, locale: "en-US", currency: "USD" });
  const tuesday = at("2026-07-28T13:05:00Z");
  const byRef = (world: ReturnType<typeof at>) => new Map(world["stays"]!.map((s) => [String(s["ref"]), s]));
  const weekday = (date: unknown) => new Date(`${String(date)}T00:00:00Z`).getUTCDay();

  for (const iso of ["2026-07-31T18:00:00Z", "2026-08-01T14:00:00Z", "2026-10-12T20:00:00Z", "2027-03-18T13:00:00Z"]) {
    it(`keeps every weekday and every price, and puts each guest where the clock says (${iso})`, () => {
      const world = at(iso);
      const then = byRef(tuesday);
      for (const s of world["stays"]!) {
        const t = then.get(String(s["ref"]))!;
        expect(weekday(s["arrive"]), String(s["ref"])).toBe(weekday(t["arrive"]));
        // The nights and extras cost what they cost on the Tuesday; a charge comes only once its evening has.
        for (const c of ["room_total", "extras_total"]) expect(s[c], `${String(s["ref"])} ${c}`).toBe(t[c]);
        // Checked out means settled; in the house means in a room that is theirs.
        if (s["status"] === "departed") expect(Number(s["balance"]), String(s["ref"])).toBe(0);
        if (s["status"] === "in_house") {
          const room = world["rooms"]!.find((r) => r["id"] === s["room_id"])!;
          expect(room["status"], String(s["ref"])).toBe("occupied");
        }
      }
      const inHouseRooms = new Set(world["stays"]!.filter((s) => s["status"] === "in_house").map((s) => s["room_id"]));
      for (const room of world["rooms"]!.filter((r) => r["status"] === "occupied")) expect(inHouseRooms.has(room["id"]), String(room["number"])).toBe(true);
      // Nothing is paid or charged before its time.
      const now = Date.parse(iso);
      for (const p of world["payments"]!) expect(Date.parse(String(p["recorded_at"]))).toBeLessThanOrEqual(now + 30 * 60_000);
    });
  }
});

describe("every row is one the product could have made", () => {
  it("mails nobody real: every address is on a reserved example domain, which Adminium never mails", () => {
    const addresses = [...JSON.stringify(bundle).matchAll(/"(?:email|to_address)":\s*"([^"]+)"/g)].map((m) => m[1]!);
    expect(addresses.length).toBeGreaterThan(40);
    for (const address of addresses) expect(address, address).toMatch(/@example\.[a-z]+$|\.example$/);
  });

  it("spells its references with an S and off the running series, so a house's own WH-1001 is never one of them", () => {
    for (const row of rowsOf("stays")) {
      expect(row["ref"]).toMatch(/^WH-S\d{4}$/);
      expect(row["ref_seq"]).toBeNull();
    }
  });

  it("gives a cancellation its reason, and a guest in the house a room", () => {
    for (const row of rowsOf("stays")) {
      if (row["status"] === "cancelled") expect(row["cancel_code"], String(row["ref"])).toBe("self");
      if (row["status"] === "in_house" || row["status"] === "departed") expect(row["room_id"], String(row["ref"])).not.toBeNull();
    }
  });

  it("puts no more guests in a room than its type sleeps, and never one Saturday night alone", () => {
    const resolved = resolveSample(bundle, { now: Date.parse("2026-07-28T13:05:00Z"), zone: DEMO_ZONE, locale: "en-US", currency: "USD" });
    for (const s of resolved["stays"]!) {
      const type = resolved["room_types"]!.find((t) => t["id"] === s["room_type_id"])!;
      expect(Number(s["guests"]), String(s["ref"])).toBeLessThanOrEqual(Number(type["sleeps"]));
      const saturday = new Date(`${String(s["arrive"])}T00:00:00Z`).getUTCDay() === 6;
      if (saturday) expect(Number(s["nights"]), String(s["ref"])).toBeGreaterThanOrEqual(2);
      expect(Number(s["nights"])).toBeLessThanOrEqual(14);
    }
  });

  it("says nothing the product never says", () => {
    const strings = [...JSON.stringify(bundle).matchAll(/"([^"@]+)"/g)].map((m) => m[1]!);
    const hits = strings.flatMap((s) => offences(s, null).map((word) => `${word} in ${JSON.stringify(s)}`));
    expect(hits).toEqual([]);
    expect(JSON.stringify(bundle).toLowerCase()).not.toContain("lorem");
  });
});
