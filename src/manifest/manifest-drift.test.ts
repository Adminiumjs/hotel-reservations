/**
 * `manifest.json` is written from `src/manifest/` (`npm run manifest`), and
 * this is what keeps the two from drifting: an edit to a module that was not
 * written out, or a hand edit to the file, fails here with the fix named.
 *
 * It also holds the manifest's own promises that the product's validator
 * cannot see: a guest reads nothing of anyone else's and nothing the desk
 * keeps to itself; the desk writes only what running the day needs and never
 * voids; housekeeping reads no guest; and the rules a stay depends on are on
 * the tables they guard.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildManifest, manifestText } from "./build.ts";
import { emailWords } from "./emails.ts";
import { LOCALES, untranslated } from "./labels.ts";
import { ARRIVAL_TIMES, DESK_CANCEL_CODES } from "./tables.ts";

const FILE = join(__dirname, "..", "..", "manifest.json");

type Json = Record<string, unknown>;
type Entry = Json & { table: string; methods: string[]; key?: string; select?: string[]; kind?: string };
const manifest = buildManifest() as Json & {
  requiredSchema: { tables: (Json & { ref: string; columns: (Json & { ref: string })[] })[] };
  publicAccess: Entry[];
  roles: (Json & { key: string; permissions: string[]; limits?: Record<string, Json> })[];
  outbox: Json & { producers: Json[] };
};
const table = (ref: string) => manifest.requiredSchema.tables.find((t) => t.ref === ref)!;
const column = (t: string, c: string) => table(t).columns.find((col) => col.ref === c)!;
const rules = (t: string, c: string) => (column(t, c)["rules"] ?? {}) as Json;
const role = (key: string) => manifest.roles.find((r) => r.key === key)!;
const states = (t = "stays") => table(t)["states"] as Json & { moves: Record<string, (string | Json)[]> };
const entries = (t: string) => manifest.publicAccess.filter((e) => e.table === t);

describe("manifest.json is what src/manifest/ writes", () => {
  it("is byte for byte the modules' output — run `npm run manifest` after changing them", () => {
    expect(readFileSync(FILE, "utf8") === manifestText()).toBe(true);
  });
});

describe("the manifest speaks all eight languages", () => {
  it("has every label in every language (drafts until the native review)", () => {
    buildManifest();
    expect(untranslated()).toEqual([]);
  });

  it("has every email in every language, with the same variables as the English", () => {
    const words = emailWords();
    const vars = (value: unknown) => [...JSON.stringify(value).matchAll(/\{\{([a-z_.]+)\}\}/g)].map((m) => m[1]).sort();
    for (const tag of LOCALES) {
      for (const kind of Object.keys(words["en-US"]) as (keyof typeof words["en-US"])[]) {
        expect(vars(words[tag][kind]), `${tag} ${String(kind)}`).toEqual(vars(words["en-US"][kind]));
      }
    }
  });
});

describe("a guest reads nothing of anyone else's, and nothing the desk keeps", () => {
  const NEVER = [
    "late_cancel",
    "cancel_code",
    "cancelled_by",
    "channel",
    "customer_id",
    "client_key",
    "link_token",
    "ref_seq",
    "checked_in_by",
    "checked_out_by",
    "recorded_by",
    "voided_by",
    "void_reason",
    "set_by",
    "ref_start",
    "ref_prefix",
  ];

  const selects = (e: Entry): string[] => [
    ...(e.select ?? []),
    ...Object.values((e["children"] ?? {}) as Record<string, Json>).flatMap((child) => (child["select"] as string[] | undefined) ?? []),
  ];

  it("never selects who at the desk did what, the late flag, who cancelled, a link code or a retry key", () => {
    for (const entry of manifest.publicAccess) {
      for (const name of NEVER) expect(selects(entry), `${entry.table} ${entry.methods.join(",")}`).not.toContain(name);
    }
  });

  it("shows the rooms by number and floor, never their status; and never the rate rules", () => {
    expect(entries("rooms").flatMap((e) => e.select ?? [])).not.toContain("status");
    expect(entries("rate_rules")).toEqual([]);
    expect(entries("room_closures")).toEqual([]);
  });

  it("reads stays only through a signed-in guest, or one stay by its own link", () => {
    for (const entry of entries("stays").filter((e) => e.methods.includes("GET") && e.kind !== "availability")) {
      const claimed = entry["claimedBy"] !== undefined && entry["level"] === "verified";
      const own = entry.key === "link" && (entry["claim"] as Json | undefined)?.["own"] === true;
      expect(claimed || own).toBe(true);
    }
  });

  it("emails a stay's own link only to the stay's own address, and stops it when the link is stopped", () => {
    const link = entries("stays").find((e) => e.key === "link")!;
    expect(link["claim"]).toEqual({ by: "token", column: "link_token", stopped: "link_stopped", own: true, address: "email" });
  });

  it("reads a stay's extras, charges, credits and payments only where the stay is", () => {
    for (const t of ["stay_extras", "charges", "stay_credits", "payments"]) {
      for (const entry of entries(t).filter((e) => e.kind !== "availability")) {
        expect(entry["visibleWith"], `${t} ${entry.key ?? "customer"}`).toEqual({ table: "stays", via: "stay_id" });
      }
    }
  });

  it("answers what is left each night as a count only when few are, never a row", () => {
    for (const t of ["stays", "stay_extras"]) {
      const found = entries(t).filter((e) => e.kind === "availability");
      expect(found.length, t).toBe(1);
      expect(found[0]!.methods).toEqual(["GET"]);
      expect(found[0]!.key).toBeUndefined();
      expect(found[0]!.select).toBeUndefined();
    }
  });

  it("stops a guest's reservation links when they delete their details, and makes a new one when they ask", () => {
    const identity = entries("customers").find((e) => e["claim"] !== undefined)!;
    expect((identity["forget"] as Json)["links"]).toBe(true);
    const own = entries("stays").filter((e) => e["newLink"] !== undefined);
    expect(own.length).toBe(1);
    expect(own[0]!["newLink"]).toEqual({ column: "link_token", kind: "stay-new-link" });
    expect(own[0]!["claimedBy"]).toBeDefined();
  });

  it("shows the house's own phone, address and email on its site: a business's, not a person's", () => {
    for (const c of ["phone", "address", "town", "email"]) expect(rules("settings", c)["personal"], c).toBe(false);
  });
});

describe("the guest's writes are the few the site needs", () => {
  const post = () => entries("stays").find((e) => e.methods.includes("POST"))!;
  const patches = () => entries("stays").filter((e) => e.methods.includes("PATCH"));

  it("reserves a room with its extras in one write, priced by Adminium, checked against the price the guest saw", () => {
    expect(post()["dryRun"]).toBe(true);
    expect(post()["expect"]).toBe("total");
    expect(post()["clientKey"]).toBe("client_key");
    expect(post()["writable"]).not.toEqual(expect.arrayContaining(["room_id"]));
    for (const decided of ["ref", "status", "total", "room_total", "tax", "paid", "balance", "channel", "cancel_by", "room_id"]) {
      expect(post()["writable"], decided).not.toContain(decided);
    }
    expect((post()["children"] as Json)["stay_extras"]).toMatchObject({ via: "stay_id", writable: ["extra_id"] });
  });

  it("holds the party to what the room type sleeps", () => {
    expect(post()["agrees"]).toContainEqual({ column: "guests", lte: { via: "room_type_id", column: "sleeps" } });
  });

  it("caps what nobody signed in for may send, and keeps what a stranger types plain text", () => {
    expect(post()["anonymous"]).toEqual({
      perValue: { columns: ["email"], n: 10 },
      perKeyHour: 300,
      perIpHour: 10,
      plainText: ["first_name", "last_name", "note", "mobile"],
    });
  });

  it("lets a guest cancel only to cancelled, only while booked and before the arrival afternoon, the reason theirs", () => {
    const cancelling = patches().filter((e) => (e["writable"] as string[]).includes("status"));
    expect(cancelling.length).toBe(2);
    for (const entry of cancelling) {
      expect(entry["writableValues"]).toEqual({ status: ["cancelled"], arrival_time: ARRIVAL_TIMES });
      expect(entry["writableWhen"]).toEqual({ status: ["booked"], arrive: { before: { time: { table: "settings", column: "arrive_from" } } } });
      expect(entry["defaults"]).toEqual({ cancel_code: "self" });
    }
  });

  it("moves the dates only for a signed-in guest, while they may still cancel at no charge, priced again by Adminium", () => {
    const moving = patches().filter((e) => (e["writable"] as string[]).includes("arrive"));
    expect(moving.length).toBe(1);
    expect(moving[0]!.key).toBeUndefined();
    expect(moving[0]!["claimedBy"]).toBeDefined();
    expect(moving[0]!["writable"]).toEqual(["arrive", "depart"]);
    expect(moving[0]!["writableWhen"]).toEqual({ status: ["booked"], cancel_by: { before: {} } });
    expect(moving[0]!["expect"]).toBe("total");
  });

  it("adds, drops or puts back an extra only until the arrival afternoon", () => {
    const window = { stay_id: { before: { column: "arrive", time: { table: "settings", column: "arrive_from" } } } };
    const patching = entries("stay_extras").filter((e) => e.methods.includes("PATCH"));
    const adding = entries("stay_extras").filter((e) => e.methods.includes("POST"));
    expect(patching.length).toBe(2);
    expect(adding.length).toBe(2);
    for (const entry of patching) {
      expect(entry["writable"]).toEqual(["state"]);
      expect(entry["writableWhen"]).toEqual(window);
    }
    for (const entry of adding) {
      expect(entry["writable"]).toEqual(["stay_id", "extra_id"]);
      expect(entry["writableWhen"]).toEqual(window);
    }
  });

  it("reads the extras on offer on both keys, so an extra added through a reservation's own link is known", () => {
    expect(entries("extras").map((e) => e.key ?? "customer").sort()).toEqual(["customer", "link"]);
  });
});

describe("the stay's life is Adminium's", () => {
  it("judges a guest in the house from tonight on: nights slept are never judged again", () => {
    for (const rule of table("stays")["capacity"] as Json[]) expect(rule["arrived"]).toEqual({ states: ["in_house"] });
    expect((table("stay_extras")["capacity"] as Json)["arrived"]).toEqual({ states: ["in_house"], via: "stay_id" });
  });

  it("adds a stay's rows only while it is live, and lets a manager void one after", () => {
    const children = states()["children"] as Record<string, Json>;
    expect(children["stay_extras"]).toEqual({ via: "stay_id", parentIn: ["booked", "in_house"] });
    const any = ["booked", "in_house", "departed", "cancelled", "no_show"];
    expect(children["charges"]).toEqual({ via: "stay_id", createIn: ["booked", "in_house"], changeIn: any });
    expect(children["stay_credits"]).toEqual({ via: "stay_id", createIn: ["in_house", "no_show"], changeIn: any });
    // Money in and money given back: on a stay in any state.
    expect(children["payments"]).toBeUndefined();
  });

  it("moves one step at a time and refuses a second desk's repeat", () => {
    expect(states()["strict"]).toBe(true);
    expect(Object.keys(states().moves).sort()).toEqual(["booked", "in_house", "no_show"]);
  });

  it("checks in only to a ready room, from the arrival day; checks out only with nothing owing", () => {
    const checkIn = states().moves["booked"]!.find((m) => typeof m === "object" && m["to"] === "in_house") as Json;
    expect(checkIn["requires"]).toMatchObject({
      where: [{ column: "room_id", isNull: false }],
      linked: [{ via: "room_id", where: [{ column: "status", eq: "ready" }] }],
      time: { after: { column: "arrive", time: "00:00" } },
    });
    expect(states().moves["in_house"]).toContainEqual({ to: "departed", requires: { where: [{ column: "balance", lte: 0 }] } });
  });

  it("cancels only with a reason, flags it late from the stored cancel-by moment, and never charges", () => {
    const cancel = states().moves["booked"]!.find((m) => typeof m === "object" && m["to"] === "cancelled") as Json;
    expect(cancel["requires"]).toEqual({ where: [{ column: "cancel_code", isNull: false }] });
    expect(states()["late"]).toEqual([
      { to: "cancelled", from: ["booked"], moment: { column: "cancel_by" }, within: { minutes: 0 }, mode: "flag", flag: "late_cancel" },
    ]);
  });

  it("marks a no-show on the morning after the day the guest was expected, and brings one back only while a night is left", () => {
    expect(states()["timed"]).toEqual([
      {
        from: "booked",
        to: "no_show",
        at: {
          column: "expect_by",
          time: { table: "settings", column: "no_show_at" },
          plus: { days: 1 },
          or: [{ column: "arrive", time: { table: "settings", column: "no_show_at" }, plus: { days: 1 } }],
        },
      },
    ]);
    for (const move of states().moves["no_show"]!) {
      expect((move as Json)["requires"]).toMatchObject({ time: { before: { column: "depart", time: { table: "settings", column: "leave_by" } } } });
    }
    // Brought back to booked: a taking back, so the no-show mark is emptied.
    expect(states().moves["no_show"]).toContainEqual(expect.objectContaining({ to: "booked", undo: true }));
    expect(rules("stays", "no_show_marked_at")["stamp"]).toMatchObject({ clearOnBack: true });
  });

  it("lets the desk mark a no-show from the time the guest said they would come, or the arrival afternoon", () => {
    const noShow = states().moves["booked"]!.find((m) => typeof m === "object" && m["to"] === "no_show") as Json;
    expect(noShow["requires"]).toEqual({
      time: { after: { column: "arrive", time: { column: "arrival_time" }, or: [{ column: "arrive", time: { table: "settings", column: "arrive_from" } }] } },
    });
  });

  it("makes the room occupied at check-in and sends it to be cleaned at check-out, in the same write", () => {
    expect(states()["effects"]).toEqual([
      { on: { to: "in_house" }, via: "room_id", set: { status: "occupied" } },
      { on: { to: "departed" }, via: "room_id", set: { status: "cleaning" } },
      // A guest in the house moved: the room left is cleaned, the ready room given is theirs.
      { on: { change: "room_id", in: ["in_house"] }, old: { set: { status: "cleaning" } }, new: { set: { status: "occupied" } } },
    ]);
    // By hand, only a manager puts right a room a mistaken check-in left occupied.
    expect(states("rooms").moves["ready"]).toContainEqual({ to: "occupied", roles: ["manager"] });
    expect(states("rooms").moves["occupied"]).toContainEqual({ to: "cleaning", roles: ["manager"] });
    expect((role("front-desk").limits!["rooms"]!["writableValues"] as Json)["status"]).toEqual(["ready", "cleaning"]);
  });

  it("works out every price, reference and total on the server", () => {
    expect(rules("stays", "ref_seq")["sequence"]).toEqual({ gapless: true, startSetting: { table: "settings", column: "ref_start" } });
    expect(rules("stays", "room_total")["perNight"]).toMatchObject({ from: "arrive", to: "depart", rate: { via: "room_type_id", column: "base_rate" } });
    expect(rules("stay_credits", "room_amount")["perNight"]).toMatchObject({ from: "from_date", to: "to_date", rate: { via: "room_type_id", column: "base_rate" } });
    expect(rules("stay_extras", "each")["copy"]).toEqual({ via: "extra_id", from: "amount", mode: "always" });
    expect(rules("charges", "amount")["copy"]).toEqual({ via: "charge_item_id", from: "amount", mode: "always" });
    for (const c of ["nights", "guests"]) expect(rules("stay_extras", c)["copy"], c).toEqual({ via: "stay_id", from: c, mode: "always", follow: true });
    expect(rules("stays", "tax_rate")["default"]).toEqual({ from: { table: "settings", column: "tax_rate" } });
    expect(rules("stays", "paid")["rollup"]).toMatchObject({ from: "payments", sum: "signed", balance: { column: "balance", of: "total" }, cap: true });
    expect(rules("stays", "cancel_by")["stamp"]).toEqual({
      set: {
        moment: {
          column: "arrive",
          time: { table: "settings", column: "arrive_from" },
          minus: { days: { table: "settings", column: "cancel_days" } },
        },
      },
      on: { columns: ["arrive"] },
    });
  });

  it("keeps a name joined from the guest's own names as personal as they are (the install drops the join otherwise)", () => {
    expect(rules("stays", "guest_name")).toMatchObject({ personal: true, formula: { join: ["first_name", " ", "last_name"] } });
  });

  it("never lets a charge take money off: the nights not stayed are Adminium's own row", () => {
    expect(rules("charges", "amount")["validation"]).toEqual({ min: 0 });
    expect(rules("stays", "credits_total")["rollup"]).toMatchObject({ from: "stay_credits", sum: "amount" });
  });
});

describe("the desk writes only what running the day needs", () => {
  it("reads the guest's name, email and mobile, to find and ring them", () => {
    expect(role("front-desk").permissions).toEqual(expect.arrayContaining(["table:@stays:read_pii", "table:@customers:read_pii"]));
    expect(role("front-desk")["screensOnly"]).toBe(true);
  });

  it("records charges, payments and credits but never changes one: voids are a manager's", () => {
    for (const t of ["charges", "payments", "stay_credits"]) {
      expect(role("front-desk").permissions, t).toContain(`table:@${t}:create`);
      expect(role("front-desk").permissions, t).not.toContain(`table:@${t}:update`);
      expect(role("manager").permissions, t).toContain(`table:@${t}:update`);
    }
  });

  it("cancels saying whether the guest asked or the house is cancelling — never as the guest online", () => {
    expect((role("front-desk").limits!["stays"]!["writableValues"] as Json)["cancel_code"]).toEqual(DESK_CANCEL_CODES);
    expect(DESK_CANCEL_CODES).not.toContain("self");
    for (const decided of ["ref", "total", "paid", "balance", "late_cancel", "cancel_by", "channel", "room_total"]) {
      expect(role("front-desk").limits!["stays"]!["writable"], decided).not.toContain(decided);
    }
  });

  it("gives housekeeping the rooms, and of a reservation only its room, dates and status — nothing of a guest", () => {
    const hk = role("housekeeping");
    expect(hk.permissions.filter((p) => p.includes(":read"))).toEqual([
      "table:@rooms:read",
      "table:@room_types:read",
      "table:@room_closures:read",
      "table:@extras:read",
      "table:@stays:read",
      "table:@stay_extras:read",
    ]);
    expect(hk.permissions.some((p) => p.endsWith(":read_pii"))).toBe(false);
    expect(hk.limits).toEqual({
      rooms: { writable: ["status"], writableValues: { status: ["ready", "cleaning"] } },
      stays: { readable: ["room_id", "arrive", "depart", "status"] },
      stay_extras: { readable: ["stay_id", "extra_id", "state"] },
    });
  });
});

describe("the emails wait for the house's switch and name who cancelled", () => {
  it("sends nothing while Email guests is off", () => {
    for (const producer of manifest.outbox.producers) {
      expect(producer["gate"], String(producer["kind"])).toEqual({ setting: { table: "settings", column: "guest_emails_on" } });
    }
  });

  it("writes to a guest in the language their reservation is kept in, and takes replies at the house's address", () => {
    const outbox = manifest.outbox as unknown as { recipient: Json; settings: Json };
    expect(outbox.recipient["language"]).toEqual({ column: "language" });
    expect(outbox.settings["replyTo"]).toBe("email");
  });

  it("tells a guest each change of their dates, with the dates and total before it", () => {
    const dates = manifest.outbox.producers.find((p) => p["kind"] === "stay-dates-changed")!;
    expect(dates["onChange"]).toEqual({ table: "stays", columns: ["arrive", "depart"], changed: true, where: { column: "status", eq: "booked" } });
    expect(dates["repeat"]).toBe(true);
    expect(dates["was"]).toEqual(["arrive", "depart", "total"]);
  });

  it("never tells a guest the house's own cancellation was their late one", () => {
    const house = manifest.outbox.producers.find((p) => p["kind"] === "stay-cancelled-house")!;
    expect(house["onChange"]).toEqual({ table: "stays", column: "cancel_code", to: "house" });
  });
});
