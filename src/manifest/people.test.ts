/**
 * The house's guests, as the manifest tells Adminium of them: who a guest is
 * and where they are copied, which emails the do-not-email list may stop
 * (none), which tables the law keeps, and the reservation's tick — declared
 * with the very sentences the guest site shows, and the only way the
 * newsletter is said yes to from the guest's side.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import ar from "../i18n/strings/house/ar-EG.json" with { type: "json" };
import cs from "../i18n/strings/house/cs-CZ.json" with { type: "json" };
import da from "../i18n/strings/house/da-DK.json" with { type: "json" };
import de from "../i18n/strings/house/de-DE.json" with { type: "json" };
import fr from "../i18n/strings/house/fr-FR.json" with { type: "json" };
import zhCN from "../i18n/strings/house/zh-CN.json" with { type: "json" };
import zhTW from "../i18n/strings/house/zh-TW.json" with { type: "json" };
import { mailClassOf } from "../testing/manifest/mail-class.ts";
import { buildManifest } from "./build.ts";
import { LOCALES } from "./labels.ts";
import { KINDS, TEXT_KINDS } from "./outbox.ts";
import { TEXT_SENTENCES, TICK_SENTENCES } from "./people.ts";

type Json = Record<string, unknown>;
type Entry = Json & { table: string; key?: string; methods: string[]; writable?: string[]; consent?: Json; identity?: Json; claim?: Json; claimedBy?: Json };
type Limits = Record<string, { writable?: string[]; creatable?: string[] }>;

const manifest = buildManifest() as Json & {
  people: Json[];
  publicAccess: Entry[];
  outbox: Json & { recipient: Json; classes: Record<string, string> };
  requiredSchema: { tables: (Json & { ref: string; keep?: Json; columns: (Json & { ref: string; rules?: Json })[] })[] };
  roles: (Json & { key: string; permissions: string[]; limits?: Limits })[];
  compatibility: Json;
};
const table = (ref: string) => manifest.requiredSchema.tables.find((t) => t.ref === ref)!;
const column = (t: string, ref: string) => table(t).columns.find((c) => c.ref === ref);
const SCREENS: Record<string, Record<string, string>> = { "de-DE": de, "fr-FR": fr, "da-DK": da, "cs-CZ": cs, "ar-EG": ar, "zh-CN": zhCN, "zh-TW": zhTW };
const booking = () => manifest.publicAccess.find((e) => e.table === "stays" && e.methods.includes("POST"))!;

describe("the house's guests", () => {
  it("are the guest accounts: their address, whole name, first name, language and the newsletter's consent, and every copy of them", () => {
    expect(manifest.people).toEqual([
      {
        table: "customers",
        kind: "people",
        email: "email",
        name: "full_name",
        firstName: { column: "first_name" },
        language: "language",
        phone: "mobile",
        consent: { column: "opt_in", purpose: "newsletter" },
        copies: [
          { table: "stays", column: "first_name", holds: "name", via: "customer_id" },
          { table: "stays", column: "last_name", holds: "name", via: "customer_id" },
          { table: "stays", column: "guest_name", holds: "name", via: "customer_id" },
          { table: "stays", column: "email", holds: "email", via: "customer_id" },
          { table: "stays", column: "mobile", holds: "phone", via: "customer_id" },
        ],
      },
    ]);
    // 0.3.38 first read the house's guests; the floor has since moved on (0.3.76, texts and a guest's mobile).
    expect(manifest.compatibility["minAdminiumVersion"]).toBe("0.3.76");
  });

  it("have one address: the outbox's and the one they sign in with", () => {
    const person = manifest.people[0]!;
    expect(manifest.outbox.recipient["table"]).toBe(person["table"]);
    expect(manifest.outbox.recipient["email"]).toBe(person["email"]);
    const signIn = manifest.publicAccess.filter((e) => e.table === "customers" && e.claim !== undefined);
    expect(signIn.map((e) => e.claim!["email"])).toEqual([person["email"]]);
  });

  it("are named by their two names joined, as a stay's guest is, and that name is personal", () => {
    expect(column("customers", "full_name")).toEqual({ ...column("stays", "guest_name"), ref: "full_name", label: column("customers", "full_name")!["label"] });
    expect(column("customers", "full_name")!.rules).toEqual({ personal: true, formula: { join: ["first_name", " ", "last_name"] } });
  });

  it("keep a language with the same eight choices as a stay's, filled by the reservation that makes them", () => {
    expect(column("customers", "language")).toEqual(column("stays", "language"));
    expect(booking().identity!["fill"]).toEqual({ first_name: "first_name", last_name: "last_name", language: "language" });
  });

  it("are copied onto columns that hold what the copy says, and what a guest writes about themselves is personal", () => {
    for (const copy of manifest.people[0]!["copies"] as { table: string; column: string }[]) {
      expect([copy.table, copy.column, column(copy.table, copy.column)?.["type"]]).toEqual([copy.table, copy.column, "text"]);
    }
    expect(column("stays", "note")!.rules).toEqual({ personal: true });
  });
});

describe("the tables the law keeps", () => {
  it("are the guest register and its money — reservations, charges, nights not stayed and payments — kept for tax, and no other", () => {
    const kept = manifest.requiredSchema.tables.filter((t) => t.keep !== undefined).map((t) => [t.ref, t.keep]);
    expect(kept).toEqual([
      ["stays", { law: "tax" }],
      ["charges", { law: "tax" }],
      ["stay_credits", { law: "tax" }],
      ["payments", { law: "tax" }],
    ]);
  });
});

describe("the house's emails", () => {
  it("are every one service mail: the do-not-email list stops none", () => {
    expect(Object.keys(manifest.outbox.classes).sort()).toEqual([...KINDS, ...TEXT_KINDS].sort());
    for (const kind of KINDS) expect([kind, mailClassOf(manifest as never, { outboxKind: kind })]).toEqual([kind, "service"]);
  });

  it("and every text is a service text, sent as a text and nothing else", () => {
    const box = manifest.outbox as unknown as { channels: Record<string, string>; classes: Record<string, string> };
    expect(box.channels).toEqual(Object.fromEntries(TEXT_KINDS.map((kind) => [kind, "sms"])));
    for (const kind of TEXT_KINDS) expect([kind, box.classes[kind]]).toEqual([kind, "service"]);
    // One kind, one channel: no email kind is also a text.
    for (const kind of KINDS) expect(box.channels[kind]).toBeUndefined();
  });
});

describe("the reservation's tick", () => {
  const wording = (booking().consent as { wording: { version: number; text: Record<string, string> } }).wording;

  it("is declared with the sentences the reservation shows, in every language, as version 1", () => {
    expect(wording.version).toBe(1);
    expect(Object.keys(wording.text).sort()).toEqual([...LOCALES].sort());
    for (const tag of LOCALES) {
      const shown = TICK_SENTENCES.map((sentence) => (tag === "en-US" ? sentence : SCREENS[tag]![sentence]));
      expect(shown.every((s) => typeof s === "string" && s !== "" && !s.includes("\n"))).toBe(true);
      expect([tag, wording.text[tag]]).toEqual([tag, shown.join("\n")]);
      // The house's name stands in each language where the box shows it.
      expect([tag, wording.text[tag]!.includes("{hotel}")]).toEqual([tag, true]);
    }
    // And the guest site says exactly these, by these English keys.
    const screen = readFileSync(join(__dirname, "..", "app", "vals", "guest.ts"), "utf8");
    for (const sentence of TICK_SENTENCES) expect(screen).toContain(`tr(${JSON.stringify(sentence)}`);
  });

  it("is carried by the reservation alone, kept for the guest the address finds or the guest signed in", () => {
    const ticks = manifest.publicAccess.filter((e) => (e.writable ?? []).includes("opt_in"));
    // The reservation, and the same reservation paid as it is made (by the guest's choice, or first): each its own door.
    expect(ticks.map((e) => [e.table, e.key ?? "customer", e.methods.join()])).toEqual([
      ["stays", "customer", "POST"],
      ["stays", "customer", "POST"],
      ["stays", "customer", "POST"],
      ["stays", "customer", "POST"],
    ]);
    for (const e of ticks) {
      expect(e.consent).toEqual({ column: "opt_in", purpose: "newsletter", wording });
      expect([e.identity!["table"], e.identity!["link"], e.claimedBy!["table"], e.claimedBy!["column"]]).toEqual(["customers", "customer_id", "customers", "customer_id"]);
    }
    expect(ticks.map((e) => e["pay"] ?? false)).toEqual([false, true, true, false]);
    // No other door of the site takes a tick.
    expect(manifest.publicAccess.filter((x) => x.consent !== undefined)).toEqual(ticks);
  });

  it("is the only yes the guest's side can give: their own account cannot set the newsletter by hand", () => {
    const account = manifest.publicAccess.find((e) => e.table === "customers" && e.claim !== undefined)!;
    expect(account.writable).toEqual(["first_name", "last_name"]);
    expect(manifest.publicAccess.filter((e) => e.table === "customers" && (e.writable ?? []).includes("opt_in"))).toEqual([]);
    // Deleting their details still empties it: Adminium records the withdrawal first.
    expect((account["forget"] as { columns: string[] }).columns).toContain("opt_in");
  });

  it("is the guest's own: no role writes it on a reservation, at the desk or as the manager", () => {
    for (const r of manifest.roles) {
      const stays = r.limits?.["stays"];
      if (stays === undefined) continue;
      expect([r.key, (stays.writable ?? []).includes("opt_in"), (stays.creatable ?? []).includes("opt_in")]).toEqual([r.key, false, false]);
    }
    // Every role that may change a reservation has a column limit on it, so the line above holds for each.
    for (const r of manifest.roles.filter((x) => x.permissions.some((p) => p === "table:@stays:create" || p === "table:@stays:update"))) {
      expect([r.key, r.limits?.["stays"] !== undefined]).toEqual([r.key, true]);
    }
  });
});

describe("the reservation's box for texts", () => {
  const box = () => booking()["textConsent"] as { column: string; phone: string; class: string; wording: { version: number; text: Record<string, string> } };

  it("is declared with the sentences both forms show, in every language, as version 1", () => {
    const { wording } = box();
    expect(wording.version).toBe(1);
    expect(Object.keys(wording.text).sort()).toEqual([...LOCALES].sort());
    for (const tag of LOCALES) {
      const shown = TEXT_SENTENCES.map((sentence) => (tag === "en-US" ? sentence : SCREENS[tag]![sentence]));
      expect(shown.every((s) => typeof s === "string" && s !== "" && !s.includes("\n"))).toBe(true);
      expect([tag, wording.text[tag]]).toEqual([tag, shown.join("\n")]);
    }
    // The box the screens draw says exactly these, by these English keys.
    const screen = readFileSync(join(__dirname, "..", "app", "textBox.ts"), "utf8");
    for (const sentence of TEXT_SENTENCES) expect(screen).toContain(`tr(${JSON.stringify(sentence)}`);
  });

  it("is its own box: the stay's texts_ok for the stay's mobile, a yes to service texts, never the email tick", () => {
    expect(box()).toMatchObject({ column: "texts_ok", phone: "mobile", class: "service" });
    expect(box().column).not.toBe((booking().consent as Json)["column"]);
    // Every reservation door carries it, and no other door of the site.
    const doors = manifest.publicAccess.filter((e) => (e.writable ?? []).includes("texts_ok"));
    expect(doors.length).toBe(4);
    for (const e of doors) expect(e["textConsent"]).toEqual(box());
    expect(manifest.publicAccess.filter((e) => e["textConsent"] !== undefined)).toEqual(doors);
  });

  it("starts unticked and is never needed to book", () => {
    expect(column("stays", "texts_ok")).toMatchObject({ type: "bool", default: false });
    for (const e of manifest.publicAccess.filter((x) => x["textConsent"] !== undefined)) {
      expect((e["requires"] as string[] | undefined) ?? []).not.toContain("texts_ok");
      expect((e["defaults"] as Json | undefined)?.["texts_ok"]).toBeUndefined();
    }
    // No rule sets it: no default from elsewhere, no formula, no stamp, no copy.
    expect(column("stays", "texts_ok")!.rules).toBeUndefined();
  });

  it("is ticked at the desk only by someone who may take a booking, and never by housekeeping", () => {
    const writes = (key: string) => manifest.roles.find((r) => r.key === key)!.limits?.["stays"];
    expect(writes("front-desk")!.writable).toContain("texts_ok");
    expect(writes("front-desk")!.creatable).toContain("texts_ok");
    expect(writes("housekeeping")?.writable ?? []).not.toContain("texts_ok");
  });

  it("names the number a text goes to: the mobile the guest last ticked it for", () => {
    expect(column("customers", "mobile")).toMatchObject({
      type: "text",
      nullable: true,
      rules: { personal: true, rollup: { from: "stays", via: "customer_id", latest: { of: "mobile", by: "created_at" }, where: { column: "texts_ok", eq: true } } },
    });
    expect(manifest.outbox.recipient["phone"]).toBe("mobile");
    expect((manifest.outbox.recipient["fallback"] as Json)["phone"]).toBe("mobile");
    expect(manifest.people[0]!["phone"]).toBe("mobile");
  });
});
