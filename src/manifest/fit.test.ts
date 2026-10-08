/**
 * The stay, its extras, its codes and its payments are the parts Offers &
 * gift cards defines, spelled out on this app's own tables under its own
 * column names. The add-on is only suggested, so nothing is built ON its
 * shapes; this check holds the two together instead: Offers' own fit check
 * (`src/testing/shapes/fit.ts`, a copy) over the four shape files it ships.
 */
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { shapeFit, type Pairing, type Shape } from "../testing/shapes/fit.ts";
import { buildManifest } from "./build.ts";

const shape = (name: string): Shape => JSON.parse(readFileSync(new URL(`../testing/shapes/${name}.json`, import.meta.url), "utf8")) as Shape;
const SHAPES = ["discountable", "card-payment", "card-sale", "voucher-sale"].map(shape);

const PAIRINGS: Pairing[] = [
  {
    table: "stays",
    shape: "discountable@1",
    part: "order",
    tables: { lines: "stay_extras", codes: "stay_codes" },
    // No reduction is given by hand here, so none of the four staff columns; the reduction comes off in `subtotal`, which is the stay's own.
    columns: { discount_kind: null, discount_value: null, discount_reason: null, discount_by: null, paid_at: null, cancelled_at: null, net: null, subtotal: null },
  },
  { table: "stay_extras", shape: "discountable@1", part: "lines", tables: { order: "stays" }, columns: { order_id: "stay_id", item: null } },
  { table: "stay_codes", shape: "discountable@1", part: "codes", tables: { order: "stays" }, columns: { order_id: "stay_id" } },
  { table: "payments", shape: "card-payment@1", part: "payments", tables: { order: "stays" }, columns: { order_id: "stay_id" } },
];

describe("the stay, its extras, its codes and its payments fit Offers' parts", () => {
  const said = (manifest: Record<string, unknown>) => shapeFit(manifest as never, PAIRINGS, SHAPES).map((issue) => `${issue.table} as ${issue.shape}/${issue.part}: ${issue.message}`);

  it("as the manifest is written", () => {
    expect(said(buildManifest())).toEqual([]);
  });

  it("and would not with what a card holds after paying in the front desk's hands", () => {
    const manifest = JSON.parse(JSON.stringify(buildManifest())) as { roles: { key: string; limits: Record<string, { creatable?: string[] }> }[] };
    manifest.roles.find((role) => role.key === "front-desk")!.limits["payments"]!.creatable!.push("card_balance_after");
    expect(said(manifest).join("\n")).toContain("card_balance_after");
  });
});
