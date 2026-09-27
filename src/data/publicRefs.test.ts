/**
 * The guest site's ref names are the ones Adminium gives the manifest's
 * entries when it installs the app: worked out here from the manifest itself,
 * by the server's own naming, and compared with `PUBLIC_REFS`.
 */
import { describe, expect, it } from "vitest";

import { buildManifest } from "../manifest/build.ts";
import { PUBLIC_REFS, publicRefs } from "./publicRefs.ts";

type Entry = { table: string; key?: string; kind?: string; claim?: unknown; claimedBy?: unknown; visibleWith?: unknown; unlockBy?: unknown; level?: string; methods: string[]; writable?: string[] };

/** The server's naming of `publicAccess` entries (`planPublicEndpoints`), over the tables' real names. */
function serverRefs(entries: Entry[], real: (table: string) => string): string[] {
  const taken = new Set<string>();
  return entries.map((entry) => {
    const name = real(entry.table);
    const own = entry.claimedBy !== undefined || entry.visibleWith !== undefined;
    const base =
      entry.kind === "availability"
        ? `${name}_availability`
        : entry.unlockBy !== undefined
          ? `${name}_unlocked`
          : entry.claim !== undefined || (own && entry.level !== "verified")
            ? `${name}_claimed`
            : own
              ? `${name}_verified`
              : name;
    let ref = base;
    for (let n = 2; taken.has(ref); n += 1) ref = `${base}_${String(n)}`;
    taken.add(ref);
    return ref;
  });
}

const entries = (buildManifest() as { publicAccess: Entry[] }).publicAccess;
const refs = serverRefs(entries, (t) => `hotel_${t}`);
const refOf = (find: (e: Entry) => boolean) => {
  const at = entries.findIndex(find);
  return at < 0 ? undefined : refs[at];
};
const has = (e: Entry, m: string) => e.methods.includes(m);
const writes = (e: Entry, c: string) => (e.writable ?? []).includes(c);

describe("the guest site's refs", () => {
  const r = publicRefs();

  it("name the house's plain reads", () => {
    for (const name of ["settings", "types", "features", "rooms", "extras", "notes"] as const) {
      const table = PUBLIC_REFS[name][0];
      expect(r[name]).toBe(refOf((e) => e.table === table && e.key === undefined && e.claimedBy === undefined && e.visibleWith === undefined && e.kind === undefined));
    }
  });

  it("name the reserving entry, the account and the signed-in guest's own rows", () => {
    expect(r.reserve).toBe(refOf((e) => e.table === "stays" && has(e, "POST")));
    expect(r.account).toBe(refOf((e) => e.table === "customers" && e.claim !== undefined));
    expect(r.myStays).toBe(refOf((e) => e.table === "stays" && e.key === undefined && has(e, "GET") && e.claimedBy !== undefined));
    expect(r.myDates).toBe(refOf((e) => e.table === "stays" && e.key === undefined && writes(e, "arrive")));
    expect(r.myExtras).toBe(refOf((e) => e.table === "stay_extras" && e.key === undefined && has(e, "POST")));
    expect(r.myExtraState).toBe(refOf((e) => e.table === "stay_extras" && e.key === undefined && writes(e, "state")));
    for (const [name, table] of [["myCharges", "charges"], ["myCredits", "stay_credits"], ["myPayments", "payments"]] as const) {
      expect(r[name]).toBe(refOf((e) => e.table === table && e.key === undefined));
    }
  });

  it("name the one stay its own link opens, on the link key", () => {
    expect(r.linkStay).toBe(refOf((e) => e.table === "stays" && e.key === "link"));
    expect(r.linkExtras).toBe(refOf((e) => e.table === "stay_extras" && e.key === "link" && has(e, "POST")));
    expect(r.linkExtraState).toBe(refOf((e) => e.table === "stay_extras" && e.key === "link" && writes(e, "state")));
    for (const [name, table] of [["linkCharges", "charges"], ["linkCredits", "stay_credits"], ["linkPayments", "payments"]] as const) {
      expect(r[name]).toBe(refOf((e) => e.table === table && e.key === "link"));
    }
  });

  it("name what is open by the availability entries' own names, once they are declared", () => {
    expect(r.nights).toBe("hotel_stays_availability");
    expect(r.parking).toBe("hotel_stay_extras_availability");
    for (const [name, table] of [["nights", "stays"], ["parking", "stay_extras"]] as const) {
      const declared = refOf((e) => e.table === table && e.kind === "availability");
      if (declared !== undefined) expect(r[name]).toBe(declared);
    }
  });

  it("follow the server's table names", () => {
    const renamed = publicRefs({ stays: "wren_stays", customers: "wren_customers" });
    expect(renamed.linkStay).toBe("wren_stays_claimed");
    expect(renamed.reserve).toBe("wren_stays_verified_3");
    expect(renamed.account).toBe("wren_customers_claimed");
    expect(renamed.rooms).toBe("hotel_rooms");
  });

  it("leave no entry of the manifest unnamed", () => {
    const named = new Set(Object.values(r));
    const unused = refs.filter((ref) => !named.has(ref));
    expect(unused).toEqual([]);
  });
});
