/**
 * Paying online, as the manifest declares it: what Adminium may take for a
 * stay and where it writes it, who may give it back, which guest doors take
 * a payment as they reserve, and what each email says only beside a value —
 * so that with payments off, nothing reads otherwise than it did.
 */
import { describe, expect, it } from "vitest";

import { buildManifest } from "./build.ts";
import { PAY_WORDS } from "./email-pay-words.ts";
import { LOCALES } from "./labels.ts";

type Json = Record<string, unknown>;
type Entry = Json & { table: string; methods: string[]; key?: string; select?: string[]; writable?: string[]; defaults?: Json; requirePayments?: string };
const manifest = buildManifest() as Json & {
  requiredSchema: { tables: (Json & { ref: string; columns: (Json & { ref: string; default?: unknown; enum?: string[]; unique?: boolean })[] })[] };
  publicAccess: Entry[];
  roles: (Json & { key: string; permissions: string[]; limits?: Record<string, Json> })[];
  outbox: Json & { producers: (Json & { kind: string })[] };
  payments: { payables: Json[] };
  emailTemplates: (Json & { key: string; locales: Record<string, { preheader: string; blocks: (Json & { id: string; showWhen?: { var: string }; otherwise?: string; data: Json })[] }> })[];
};
const table = (ref: string) => manifest.requiredSchema.tables.find((t) => t.ref === ref)!;
const column = (t: string, c: string) => table(t).columns.find((col) => col.ref === c)!;
const role = (key: string) => manifest.roles.find((r) => r.key === key)!;
const payable = manifest.payments.payables[0] as Json & { payments: Json; refunds: Json; refundOn: Json; status: Json };

describe("a stay is payable online", () => {
  it("is the house's one payable: its total, what is due online now, written into its own payments as online", () => {
    expect(manifest.payments.payables).toHaveLength(1);
    expect(payable).toMatchObject({ table: "stays", label: "ref", amount: { column: "total" }, currency: { connection: true }, due: { column: "pay_due" }, customerEmail: "email", receipt: "engine", returnTo: "/paid" });
    expect(payable.payments).toMatchObject({ kind: "table", table: "payments", link: "stay_id", amount: "amount", method: { column: "method", values: { "*": "online" } }, reference: "payment_ref", provider: "provider", last4: "payment_last4" });
    expect(column("payments", "method").enum).toContain("online");
  });

  it("keeps its own reference apart from the desk's and a gift card's: a new unique column, never `reference` or `card_last4`", () => {
    expect(column("payments", "payment_ref")).toMatchObject({ type: "text", unique: true, maxLength: 64 });
    expect(column("payments", "reference").unique).toBeUndefined();
    expect(payable.payments["reference"]).not.toBe("reference");
    expect(payable.payments["last4"]).not.toBe("card_last4");
  });

  it("is paid only while the stay waits for it, is booked or in the house; the payment books only a stay that waits", () => {
    expect(payable["payableWhen"]).toEqual([{ column: "status", in: ["pending_payment", "booked", "in_house"] }]);
    expect(payable.status).toEqual({ column: "status", paid: "booked", from: ["pending_payment"] });
    // A room held while its guest pays is paid only by a way that settles at once.
    expect(payable["instantOnly"]).toEqual({ where: [{ column: "status", eq: "pending_payment" }] });
  });

  it("gives money back as a given-back row naming the online payment — never `against_id`, which posts a gift card's refund", () => {
    expect(payable.refunds).toMatchObject({ model: "rows", table: "payments", payment: "refund_of", amount: "amount", providerRef: "refund_ref", state: "refund_state" });
    expect(payable.refunds["payment"]).not.toBe("against_id");
    expect(column("payments", "refund_of")).toMatchObject({ type: "fk", references: "payments" });
    // The row Adminium writes itself, after a cancellation in time, carries the note a given-back row must have.
    expect((payable.refunds["auto"] as { values: Json }).values).toMatchObject({ kind: "given_back", method: "online", automatic: true });
    expect(typeof (payable.refunds["auto"] as { values: Json }).values["note"]).toBe("string");
    // Its stay is the one of the payment it gives back.
    expect(column("payments", "stay_id")["rules"]).toEqual({ copy: { via: "refund_of", from: "stay_id", mode: "default" } });
  });

  it("refunds by itself only a cancellation before the free-cancellation time, by the guest or by someone who may refund, behind the house's switch", () => {
    expect(payable.refundOn).toEqual({
      moves: [{ from: ["booked"], to: "cancelled", by: ["customer", "refund-right"] }],
      switch: { table: "settings", column: "auto_refund" },
      before: { column: "cancel_by", hours: { table: "settings", column: "auto_refund_stop_hours" } },
    });
    expect(column("settings", "auto_refund").default).toBe(true);
    expect(column("settings", "auto_refund_stop_hours").default).toBe(0);
  });

  it("asks nothing of a guest unless the house says so: nothing online by default, one night when it does", () => {
    expect(column("settings", "pay_at_booking")).toMatchObject({ enum: ["none", "optional", "required"], default: "none" });
    expect(column("settings", "pay_how_much")).toMatchObject({ enum: ["one_night", "whole_stay"], default: "one_night" });
    expect(column("settings", "pay_hold_minutes").default).toBe(15);
  });
});

describe("who touches online money", () => {
  it("lets the manager give it back, and nobody type what only a payment fills", () => {
    expect(role("manager").permissions).toContain("payments:@:refund");
    expect(role("front-desk").permissions).not.toContain("payments:@:refund");
    const managerWrites = (role("manager").limits!["payments"]!["creatable"] as string[]) ?? [];
    for (const engineOnly of ["payment_ref", "provider", "payment_last4", "refunded_elsewhere", "refund_ref", "refund_state", "automatic"]) {
      expect(managerWrites).not.toContain(engineOnly);
    }
    // A manager names the payment money goes back to; the desk records only what it takes and gives by hand.
    expect(managerWrites).toContain("refund_of");
    expect(role("front-desk").limits!["payments"]!["creatableValues"]).toEqual({ method: ["card", "cash", "transfer", "gift_card"] });
    expect(role("front-desk").limits!["payments"]!["creatable"]).not.toContain("refund_of");
  });

  it("lets no guest door write a payment's columns, or what the stay owes online", () => {
    for (const entry of manifest.publicAccess) {
      for (const col of ["payment_ref", "provider", "payment_last4", "refund_ref", "refund_state", "pay_lapsed", "pay_due", "deposit"]) {
        expect(entry.writable ?? [], `${entry.table} ${entry.methods.join()}`).not.toContain(col);
        expect(Object.keys(entry.defaults ?? {}), `${entry.table} defaults`).not.toContain(col);
      }
    }
  });
});

describe("the guest site's reservation, paid as it is made", () => {
  const posts = manifest.publicAccess.filter((e) => e.table === "stays" && e.methods.includes("POST") && e.key === undefined);
  const setting = (...values: string[]) => [{ table: "settings", column: "pay_at_booking", in: values }];
  it("is four doors, each open only while the house's setting and its payments say so: no caller books unpaid while paying first is required and possible", () => {
    expect(posts).toHaveLength(4);
    const [plain, choice, first, firstOff] = posts as [Entry, Entry, Entry, Entry];
    const rest = (e: Entry) => {
      const { defaults: _d, pay: _p, requireSetting: _r, requirePayments: _q, ...kept } = e;
      return kept;
    };
    for (const e of [choice, first, firstOff]) expect(rest(e)).toEqual(rest(plain));
    // Unpaid, as ever, while the house asks nothing or leaves it to the guest; unpaid while paying first is required and impossible.
    expect([plain["requireSetting"], plain["requirePayments"], plain["pay"], plain["defaults"]]).toEqual([setting("none", "optional"), undefined, undefined, undefined]);
    expect([firstOff["requireSetting"], firstOff["requirePayments"], firstOff["pay"], firstOff["defaults"]]).toEqual([setting("required"), "off", undefined, undefined]);
    // Paid as it is made, only while the house takes payments online: by the guest's choice, or waiting for the payment.
    expect(choice).toMatchObject({ pay: true, defaults: { pay_now: true }, requireSetting: setting("optional"), requirePayments: "on" });
    expect(first).toMatchObject({ pay: true, defaults: { status: "pending_payment", pay_now: true }, requireSetting: setting("required"), requirePayments: "on" });
    // The state a booking starts in is the door's, never the caller's.
    for (const e of posts) expect(e.writable ?? []).not.toContain("status");
    // Every new door after every older entry, so each older one keeps its name.
    expect(manifest.publicAccess.slice(-3)).toEqual([choice, first, firstOff]);
  });
});

describe("the emails say online money only beside it", () => {
  const template = (kind: string, tag = "en-US") => manifest.emailTemplates.find((t) => t.key === `hotel-${kind}`)!.locales[tag]!;
  it("ends a cancellation 'Nothing is charged.' unless online money is still held, in every language", () => {
    for (const tag of LOCALES) {
      for (const kind of ["stay-cancelled-self", "stay-cancelled-self-late", "stay-cancelled-desk", "stay-cancelled-desk-late", "stay-cancelled-house", "stay-no-show"]) {
        const body = template(kind, tag).blocks.find((b) => b.id === "body")!;
        expect(body.showWhen, `${tag} ${kind}`).toEqual({ var: "stay.online_kept" });
        expect(body.otherwise, `${tag} ${kind}`).toContain(PAY_WORDS[tag].nothing);
        expect(JSON.stringify(body.data), `${tag} ${kind}`).not.toContain(PAY_WORDS[tag].nothing);
      }
    }
  });

  it("reads the same variables in every language", () => {
    const vars = (value: unknown) => [...JSON.stringify(value).matchAll(/\{\{([a-z_.]+)\}\}/g)].map((m) => m[1]).sort();
    for (const tag of LOCALES) {
      for (const key of Object.keys(PAY_WORDS["en-US"]) as (keyof (typeof PAY_WORDS)["en-US"])[]) expect(vars(PAY_WORDS[tag][key]), `${tag} ${key}`).toEqual(vars(PAY_WORDS["en-US"][key]));
    }
  });

  it("says what a reservation costs the guest now: paid online, being paid, or settled at the desk as ever", () => {
    const blocks = template("stay-made").blocks;
    expect(blocks.filter((b) => b.showWhen !== undefined).map((b) => [b.id, b.showWhen!.var])).toEqual([
      ["paid-part", "stay.online_part"],
      ["paid-full", "stay.online_full"],
      ["paying", "stay.pay_pending"],
      ["settle", "stay.settle_desk"],
    ]);
  });

  it("sends the folio so far as ever while the house takes no payments online, and its twin with a pay button while it does", () => {
    const off = template("stay-folio-owing");
    expect(off.blocks.find((b) => b.id === "pay")).toBeUndefined();
    expect(off.preheader).toBe("{{stay.balance.money}} still to settle");
    const on = template("stay-folio-owing-pay");
    expect(on.preheader).toBe("You owe {{stay.balance.money}}");
    expect(on.blocks.find((b) => b.id === "pay")).toMatchObject({ block: "email.button", data: { url: "{{pay_url}}" }, showWhen: { var: "pay_url" } });
    expect(on.blocks.find((b) => b.id === "body")!.otherwise).toBe("There is {{stay.balance.money}} still to settle at the desk.");
    const producers = manifest.outbox.producers.filter((p) => p.kind.startsWith("stay-folio-owing"));
    expect(producers.map((p) => [p.kind, p["payments"]])).toEqual([["stay-folio-owing", "off"], ["stay-folio-owing-pay", "on"]]);
  });

  it("says nothing is taken online in the reservation's preheader only while the house takes no payments online", () => {
    expect(template("stay-made").preheader).toContain("nothing is taken online");
    expect(template("stay-made-pay").preheader).not.toContain("nothing is taken online");
    for (const tag of LOCALES) expect(template("stay-made-pay", tag).preheader, tag).not.toBe(template("stay-made", tag).preheader);
  });

  it("confirms a stay made waiting for its payment when the payment books it, not when it is made — one twin or the other", () => {
    for (const [kind, payments] of [["stay-made", "off"], ["stay-made-pay", "on"]] as const) {
      const made = manifest.outbox.producers.filter((p) => p.kind === kind);
      expect(made).toHaveLength(2);
      for (const p of made) expect([p["dropWhen"], p["payments"]]).toEqual([[{ column: "status", in: ["pending_payment", "cancelled"], reason: "no-longer-needed" }], payments]);
      expect(made[1]!["onChange"]).toEqual({ table: "stays", column: "status", to: "booked", where: { column: "channel", eq: "online" } });
    }
  });
});
