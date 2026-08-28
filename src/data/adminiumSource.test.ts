// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Connected mode (28-public-surface.md §5.2, 28-T28 wave 2).
 *
 * ── WHY THIS DRIVES A REAL CLIENT ──────────────────────────────────────────
 * `createPublicClient` takes an injectable `fetch`, so these run the SHIPPED
 * client against canned wire responses rather than a hand-written stub of it.
 * That puts `assertRefs`, the config fetch and the URL building under test too
 * — and those are where a connected app actually fails, not in the mapping.
 *
 * ── WHAT IS WORTH ASSERTING, AND WHY ───────────────────────────────────────
 * Three properties, each of which fails SILENTLY if it breaks:
 *
 *  1. Demo mode survives. Every marketplace demo is a static clone with no
 *     server; if an absent variable stopped meaning "demo", thirteen public
 *     demos would break at once and the build would still be green.
 *  2. The swap happens before the store reads. `state/store.ts` reads at module
 *     scope, so a late swap renders demo data against a real backend and looks
 *     completely fine. The seam's tripwire is the only thing that says so.
 *  3. Keys are derived from ids, not from operator text. This is the convention
 *     the other twelve repos copy, and the reason this app needed no schema
 *     change while clinic-desk carries three WS-I gap markers.
 */

import { describe, expect, it } from "vitest";

import { createPublicClient } from "@adminiumjs/public-client";

import { loadSnapshot, snapshotSource } from "./adminiumSource.ts";
import { demoSource, isConnected, setDataSource, source } from "./source.ts";

const REFS = [
  "roomTypes",
  "roomTypeFeatures",
  "rooms",
  "extras",
  "stays",
  "stayExtras",
  "charges",
  "payments",
];

const ROWS: Record<string, unknown[]> = {
  roomTypes: [
    {
      id: "garden",
      name: "Garden double",
      blurb: "Doors onto the walled garden.",
      description: "A double bed and a pair of doors.",
      sleeps: 2,
      tint_from: "#a", tint_to: "#b", icon: "bed-double", code: "GDN",
      base_rate: "150.00",
    },
  ],
  roomTypeFeatures: [
    { type_id: "garden", feature: "garden" },
    { type_id: "garden", feature: "bath" },
  ],
  rooms: [
    { number: 12, floor: 1, type_id: "garden", status: "ready", note: null },
    { number: 14, floor: 1, type_id: "garden", status: "oos", note: "shower" },
  ],
  extras: [{ id: "breakfast", label: "Breakfast", amount: "14.00", charged: "person-night", icon: "croissant" }],
  stays: [
    {
      ref: "WH-1042",
      first_name: "Ada", last_name: "Bell", email: "a@b.test", mobile: "07700",
      type_id: "garden", room_number: 12,
      arrive: "2026-07-28", depart: "2026-07-31",
      guests: 2, arrival_time: "16:00", note: "late train",
      status: "in_house", checked_in_at: "15:40", no_deposit: false,
    },
  ],
  stayExtras: [{ stay_ref: "WH-1042", extra_id: "breakfast" }],
  charges: [{ stay_ref: "WH-1042", charged_on: "2026-07-29", kind: "bar", label: "Bar", amount: "18.50" }],
  payments: [{ stay_ref: "WH-1042", paid_on: "2026-07-28", method: "card", label: "Deposit", amount: "150.00" }],
};

/** A server that answers exactly what the scope would. */
function fakeFetch(overrides: { rows?: Record<string, unknown[]>; expose?: (ref: string) => string[] } = {}) {
  const rows = overrides.rows ?? ROWS;
  return async (input: RequestInfo | URL): Promise<Response> => {
    const url = new URL(String(input));
    const json = (body: unknown) =>
      new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });

    if (url.pathname.endsWith("/public/config")) {
      const refs: Record<string, unknown> = {};
      for (const ref of REFS) {
        refs[ref] = {
          actions: ["list"],
          // Everything the source asks for, unless a case narrows it.
          expose: overrides.expose?.(ref) ?? Object.keys((rows[ref]?.[0] ?? {}) as object),
          filterable: [], searchable: [], orderable: [], writable: [], limit: 500,
        };
      }
      // `/public/config` is the one route the client unwraps: it reads
      // `body.data`, while `list` reads the body itself.
      return json({
        data: { version: 1, side: "customer", timezone: "Europe/London", currency: "GBP", claim: null, refs },
      });
    }

    const ref = url.pathname.split("/").pop() ?? "";
    return json({ data: rows[ref] ?? [] });
  };
}

const clientWith = (fetch: ReturnType<typeof fakeFetch>) =>
  createPublicClient({ baseUrl: "https://api.example.test", publishableKey: "adm_pub_test", fetch });

describe("demo mode is the structural default", () => {
  it("builds no client when either variable is absent", () => {
    // The marketplace demos are static clones with no server. This is the one
    // condition (§5.4) that keeps all thirteen of them working.
    expect(createPublicClient({ baseUrl: "https://x.test", publishableKey: "" })).toBeNull();
    expect(createPublicClient({ baseUrl: "", publishableKey: "adm_pub_x" })).toBeNull();
    expect(createPublicClient(undefined)).toBeNull();
  });

  it("falls back rather than throwing when the server is unreachable", async () => {
    const client = clientWith(async () => {
      throw new Error("ECONNREFUSED");
    });
    expect(await loadSnapshot(client!)).toBeNull();
  });

  it("falls back when the scope does not expose a column the app reads", async () => {
    // An operator can narrow a scope at any time. `assertRefs` turns that into
    // one legible boot failure instead of a 403 on whichever screen reads it.
    const client = clientWith(fakeFetch({ expose: (ref) => (ref === "stays" ? ["ref"] : ["id"]) }));
    expect(await loadSnapshot(client!)).toBeNull();
  });
});

describe("the snapshot maps the wire onto the app's shapes", () => {
  it("derives every i18n key from the row's own id", async () => {
    const snap = await loadSnapshot(clientWith(fakeFetch())!);
    expect(snap).not.toBeNull();

    const type = snap!.roomTypes[0]!;
    // Key from the TEXT primary key; text from the column. Both survive, which
    // is what lets a renamed room type and a translated one both render right.
    expect(type.nameKey).toBe("data.type.garden");
    expect(type.name).toBe("Garden double");
    expect(type.blurbKey).toBe("data.type.garden.blurb");
    expect(type.longKey).toBe("data.type.garden.long");
    // `numeric` arrives as a string and must not reach arithmetic as one.
    expect(type.base).toBe(150);
    // Bare slugs: `Guest.tsx` expands them as `data.feature.<f>` at render, so
    // expanding here too would produce `data.feature.data.feature.garden`.
    expect(type.features).toEqual(["garden", "bath"]);

    const extra = snap!.extras[0]!;
    expect(extra.labelKey).toBe("data.extra.breakfast");
    expect(extra.amount).toBe(14);
  });

  it("assembles each stay's folio from its three child tables", async () => {
    const snap = await loadSnapshot(clientWith(fakeFetch())!);
    const stay = snap!.stays[0]!;
    expect(stay.ref).toBe("WH-1042");
    expect(stay.extras).toEqual(["breakfast"]);
    expect(stay.charges).toEqual([
      { date: "2026-07-29", kind: "bar", labelKey: "data.charge.bar", label: "Bar", amount: 18.5 },
    ]);
    expect(stay.payments[0]).toMatchObject({ method: "card", amount: 150, labelKey: "data.pay.card" });
    // A guest's own words have no catalogue key; inventing one renders empty.
    expect(stay.noteKey).toBeNull();
    expect(stay.note).toBe("late train");
  });

  it("keeps a room's out-of-service reason keyed, and a ready room's null", async () => {
    const snap = await loadSnapshot(clientWith(fakeFetch())!);
    expect(snap!.rooms.map((r) => r.noteKey)).toEqual([null, "data.note.shower"]);
  });

  it("builds today from the tenant's zone, not the browser's", async () => {
    const snap = await loadSnapshot(clientWith(fakeFetch())!);
    // Shape, not value — the value is the real clock. `HH:MM`, and a real day.
    expect(snap!.now.morning).toMatch(/^\d{2}:\d{2}$/);
    expect(snap!.now.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // House policy has no home in the schema (WS-I G4) and stays constant.
    expect(snap!.now.departBy).toBe("11:00");
    expect(snap!.now.arrivalsFrom).toBe("15:00");
  });

  it("hands back the same shapes demoSource does", async () => {
    const snap = await loadSnapshot(clientWith(fakeFetch())!);
    const connected = snapshotSource(snap!);
    for (const key of ["now", "roomTypes", "rooms", "extras", "stays"] as const) {
      expect(typeof connected[key]).toBe("function");
    }
    // Copied on the way out, like the demo source — a caller that mutates what
    // it is given must not reach back into the snapshot.
    connected.roomTypes()[0]!.features.push("mutated");
    expect(connected.roomTypes()[0]!.features).toEqual(["garden", "bath"]);
  });
});

describe("the seam", () => {
  it("reports demo mode until a real source is installed", () => {
    expect(isConnected()).toBe(false);
  });

  it("refuses a swap that arrives after the store has read", () => {
    // THE SILENT FAILURE THIS PINS. `state/store.ts` reads at module scope, so
    // a static `import App` evaluates it during main.tsx's own imports — before
    // any fetch can resolve. The app then renders demo data against a
    // configured backend and looks entirely correct. Nothing else notices.
    source.roomTypes();
    expect(() => setDataSource(demoSource)).toThrow(/after the store already read/);
  });
});
