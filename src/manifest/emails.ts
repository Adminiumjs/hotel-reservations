/**
 * The house's emails, one template per outbox kind, in the languages the app
 * ships.
 *
 * Each email's words are a small record of sentences (`Words`), and the layout
 * that holds them is written once below, so a translation is only the words —
 * nobody re-builds a block list per language, and no language can lose a block
 * the others have.
 *
 * `{{…}}` are the outbox's variables, filled by Adminium when it sends:
 * `stay.*` and `room_type.*` through the message's link; `practice.*` the
 * house's settings row; `recipient.first_name` the guest; `appName` the
 * house's name; `manage_url` the guest site's reservation page. A time reads in
 * the guest's language and on the house's clock; money in the connection's
 * currency.
 *
 * Money paid online (`email-pay-words.ts`) is said only beside the value it
 * reads: a block tied to it (`showWhen`) is left out when the value is empty,
 * and a sentence with `otherwise` says today's words instead. So with payments
 * off — or nothing paid online — every email reads exactly as it did. The
 * folio so far carries a button to pay it online only while Adminium fills
 * `{{pay_url}}`, the stay's own live pay link.
 *
 * The message before the arrival says when the room is ready and until when
 * it is theirs, how to find the house (its own words, when it has them) and
 * who to tell when plans change.
 *
 * Only the online confirmation and a new link the signed-in guest asked for
 * carry the reservation's own link: a code is sent only to the person it
 * opens the stay for. A change of dates says the dates before (`was.*`, kept
 * on the message) and now.
 */
import { PAY_WORDS, type PayWords } from "./email-pay-words.ts";
import { EMAIL_AR, EMAIL_CS, EMAIL_DA, EMAIL_DE, EMAIL_FR, EMAIL_ZH_CN, EMAIL_ZH_TW } from "./email-words.ts";
import type { Tag } from "./labels.ts";
import type { Kind, PAY_KINDS } from "./outbox.ts";

/** The kinds sent only while the house takes payments online: their words are their twins', with their own name and preheader. */
type PayKind = (typeof PAY_KINDS)[number];

/** One email's sentences. */
export interface Words {
  name: string;
  subject: string;
  preheader: string;
  heading?: string;
  paras: string[];
  button?: string;
}

export type EmailWords = Record<Exclude<Kind, PayKind>, Words> & {
  reference: string;
  theRoom: string;
  total: string;
  /** "Nothing is taken online. You settle at the desk." */
  settle: string;
  cancelBy: string;
  lateOrEarly: string;
  /** "Total, was $791.34": a changed stay's total beside the one before. */
  totalWas: string;
  /** "Taxes and city levy (9%)": the stay's own tax name and rate. */
  taxLine: string;
  /** The folio's lines: what was paid, what is still to settle, and the sentence sent only with the document. */
  paid: string;
  balanceLine: string;
  attached: string;
  foot: string;
};

const NOTHING_CHARGED = "Nothing is charged.";
const STILL_OPEN = "If you did not mean to cancel, write to {{practice.email}} or ring us on {{practice.phone}} and we will see what is still open.";

export const EMAIL_EN: EmailWords = {
  reference: "Your reference",
  theRoom: "{{room_type.name}}, {{stay.arrive.day_month}} to {{stay.depart.day_month}}",
  total: "Total",
  settle: "Nothing is taken online. You settle at the desk.",
  cancelBy: "Cancelling costs nothing. After {{stay.cancel_by.time}} on {{stay.cancel_by.date}}, a cancellation is marked as late.",
  lateOrEarly: "Late or early? Write to {{practice.email}} or ring us on {{practice.phone}}.",
  totalWas: "Total, was {{was.total.money}}",
  taxLine: "{{stay.tax_label}} ({{stay.tax_rate.percent}})",
  paid: "Paid",
  balanceLine: "Still to settle",
  attached: "Your folio for the {{room_type.name}}, {{stay.arrive.day_month}} to {{stay.depart.day_month}}, is attached.",
  foot: "{{appName}} · {{practice.address}} · {{practice.phone}} · {{practice.email}}. You are getting this because you reserved a room with us.",
  "stay-made": {
    name: "Reservation made",
    subject: "Your room at {{appName}}, {{stay.ref}}",
    preheader: "{{stay.arrive.day_month}} to {{stay.depart.day_month}} · {{stay.total.money}} · nothing is taken online",
    heading: "You have a room, {{recipient.first_name}}.",
    paras: ["Arriving {{stay.arrive.day_month}}, from {{practice.arrive_from.time}}. Leaving {{stay.depart.day_month}}, by {{practice.leave_by.time}}."],
    button: "See your reservation",
  },
  "stay-made-desk": {
    name: "Reservation made at the desk",
    subject: "Your room at {{appName}}, {{stay.ref}}",
    preheader: "{{stay.arrive.day_month}} to {{stay.depart.day_month}} · {{stay.total.money}}",
    heading: "You have a room, {{recipient.first_name}}.",
    paras: ["Arriving {{stay.arrive.day_month}}, from {{practice.arrive_from.time}}. Leaving {{stay.depart.day_month}}, by {{practice.leave_by.time}}."],
  },
  "stay-cancelled-self": {
    name: "Cancelled by the guest",
    subject: "Your reservation {{stay.ref}} is cancelled",
    preheader: "Nothing is charged",
    heading: "Your reservation is cancelled.",
    paras: [NOTHING_CHARGED, STILL_OPEN],
  },
  "stay-cancelled-self-late": {
    name: "Cancelled by the guest, late",
    subject: "Your reservation {{stay.ref}} is cancelled",
    preheader: "Nothing is charged",
    heading: "Your reservation is cancelled.",
    paras: [
      "You cancelled after {{stay.cancel_by.time}} on {{stay.cancel_by.date}}, so it is marked as a late cancellation. Nothing is charged.",
      STILL_OPEN,
    ],
  },
  "stay-cancelled-desk": {
    name: "Cancelled at the guest's request",
    subject: "Your reservation {{stay.ref}} is cancelled",
    preheader: "Nothing is charged",
    heading: "Your reservation is cancelled.",
    paras: ["As you asked, we have cancelled it. Nothing is charged.", STILL_OPEN],
  },
  "stay-cancelled-desk-late": {
    name: "Cancelled at the guest's request, late",
    subject: "Your reservation {{stay.ref}} is cancelled",
    preheader: "Nothing is charged",
    heading: "Your reservation is cancelled.",
    paras: [
      "As you asked, we have cancelled it. It was after {{stay.cancel_by.time}} on {{stay.cancel_by.date}}, so it is marked as a late cancellation. Nothing is charged.",
      STILL_OPEN,
    ],
  },
  "stay-cancelled-house": {
    name: "Cancelled by the house",
    subject: "We have had to cancel {{stay.ref}}",
    preheader: "We are very sorry · nothing is charged",
    heading: "We are very sorry, {{recipient.first_name}}.",
    paras: [
      "We have had to cancel your reservation {{stay.ref}} ({{room_type.name}}, {{stay.arrive.day_month}} to {{stay.depart.day_month}}). We are very sorry. Nothing is charged.",
      "Ring us on {{practice.phone}} and we will help you find another room.",
    ],
  },
  "stay-no-show": {
    name: "We missed you",
    subject: "We missed you — {{stay.ref}}",
    preheader: "Nothing is charged",
    heading: "We missed you, {{recipient.first_name}}.",
    paras: [
      "We kept your room for {{stay.arrive.day_month}}, but you did not arrive, so reservation {{stay.ref}} is marked as a no-show. Nothing is charged.",
      "If you are still on your way, ring us on {{practice.phone}}.",
    ],
  },
  "stay-dates-changed": {
    name: "Dates changed",
    subject: "Your dates have changed — {{stay.ref}}",
    preheader: "{{stay.arrive.day_month}} to {{stay.depart.day_month}} · {{stay.total.money}}",
    heading: "Your dates have changed, {{recipient.first_name}}.",
    paras: [
      "Before: {{was.arrive.day_month}} to {{was.depart.day_month}}.",
      "Now: {{stay.arrive.day_month}} to {{stay.depart.day_month}}. Your extras follow the new dates.",
    ],
  },
  "stay-new-link": {
    name: "A new link",
    subject: "A new link to your reservation {{stay.ref}}",
    preheader: "The old link no longer opens it",
    heading: "Here is your new link, {{recipient.first_name}}.",
    paras: [
      "You asked for a new link to your reservation. The link we sent before no longer opens it.",
      "If you did not ask for it, ring us on {{practice.phone}}.",
    ],
    button: "See your reservation",
  },
  "stay-folio": {
    name: "The folio",
    subject: "Your folio from {{appName}} — {{stay.ref}}",
    preheader: "{{stay.arrive.day_month}} to {{stay.depart.day_month}} · {{stay.total.money}}",
    heading: "Thank you for staying with us, {{recipient.first_name}}.",
    paras: ["We hope to see you again."],
  },
  "stay-arriving": {
    name: "Before the arrival",
    subject: "See you on {{stay.arrive.day_month}} — {{stay.ref}}",
    preheader: "Your room is ready from {{practice.arrive_from.time}}",
    heading: "We look forward to seeing you, {{recipient.first_name}}.",
    paras: ["Your room is ready from {{practice.arrive_from.time}} on {{stay.arrive.day_month}}, and yours until {{practice.leave_by.time}} on {{stay.depart.day_month}}."],
  },
  "stay-folio-owing": {
    name: "The folio so far",
    subject: "Your folio so far — {{stay.ref}}",
    preheader: "{{stay.balance.money}} still to settle",
    heading: "Your folio so far, {{recipient.first_name}}.",
    paras: ["There is {{stay.balance.money}} still to settle at the desk."],
  },
};

/** A block of an email; `showWhen` sends it only while that value is there, and `otherwise` says other words in its place. */
type Block = { block: string; id: string; data: Record<string, unknown>; showWhen?: { var: string }; otherwise?: string };
const para = (id: string, ...paras: string[]): Block => ({ block: "email.text", id, data: { paras } });
/** A sentence sent only while the stay's value is there. */
const when = (id: string, value: string, text: string): Block => ({ ...para(id, text), showWhen: { var: `stay.${value}` } });

/**
 * The cancellations and the no-show: the sentence that ends "Nothing is
 * charged." says, while the stay still holds money paid online, what becomes
 * of it instead — the hotel gives it back (in time), or keeps it (late, or a
 * no-show) unless it gives it back. Money already on its way back is said
 * first, on the kinds that give it back by themselves.
 */
const KEPT: Partial<Record<Kind, { say: (p: PayWords) => string; back: boolean }>> = {
  "stay-cancelled-self": { say: (p) => p.willRefund, back: true },
  "stay-cancelled-desk": { say: (p) => p.willRefund, back: true },
  "stay-cancelled-house": { say: (p) => p.houseWillRefund, back: true },
  "stay-cancelled-self-late": { say: (p) => p.keeps, back: false },
  "stay-cancelled-desk-late": { say: (p) => p.keeps, back: false },
  "stay-no-show": { say: (p) => p.keeps, back: false },
};

/** What the reservation says it costs the guest now: paid online (part or all), being paid, or settled at the desk as ever. */
function settleBlocks(all: EmailWords, pay: PayWords): Block[] {
  return [
    when("paid-part", "online_part", pay.paidPart),
    when("paid-full", "online_full", pay.paidFull),
    when("paying", "pay_pending", pay.payPending),
    when("settle", "settle_desk", all.settle),
  ];
}
/** The folio's documents: an email that carries one, if Invoices & Receipts draws it. */
const FOLIO: ReadonlySet<Kind> = new Set(["stay-folio", "stay-folio-owing", "stay-folio-owing-pay"]);

/** A stay's extras, each its own line with what it costs. */
const EXTRAS: Block = {
  block: "email.rows",
  id: "extras",
  data: {
    from: { link: "stay", table: "stay_extras", via: "stay_id", orderBy: "id", where: { column: "state", in: ["on"] }, limit: 20 },
    row: { title: "{{row.label}}", amount: "{{row.amount.money}}" },
  },
};

/**
 * What codes and vouchers took off, one line each, as Offers & gift cards
 * recorded them for this stay. With the add-on away, or nothing taken off,
 * the list is empty and the block is left out.
 */
const REDUCTIONS: Block = {
  block: "email.rows",
  id: "reductions",
  data: {
    from: { link: "stay", addOn: "offers", table: "applied", match: { table: "source_table", row: "source_row" }, orderBy: "id", limit: 20 },
    row: { title: "{{row.name}}", amount: "−{{row.amount}}" },
  },
};

/** The emails that set out the stay and what it costs. */
const WITH_STAY: ReadonlySet<Kind> = new Set(["stay-made", "stay-made-desk", "stay-made-pay"]);

function layout(kind: Kind, all: AllWords, pay: PayWords) {
  const w = all[kind];
  const blocks: Block[] = [];
  if (w.heading !== undefined) blocks.push({ block: "email.heading", id: "heading", data: { text: w.heading } });
  blocks.push({ block: "email.stats", id: "reference", data: { items: [{ label: all.reference, value: "{{stay.ref}}" }] } });
  // Sent only with the document: an email that went without it says nothing of it.
  if (FOLIO.has(kind)) blocks.push({ block: "email.text", id: "attached", data: { paras: [all.attached], withAttachment: true } });
  const kept = KEPT[kind];
  if (kept !== undefined) {
    const [first, ...rest] = w.paras;
    if (first === undefined || !first.includes(pay.nothing)) throw new Error(`${kind}: its first sentence does not end "${pay.nothing}"`);
    if (kept.back) blocks.push(when("back", "online_back", pay.back));
    blocks.push({ ...para("body", first.replace(pay.nothing, kept.say(pay))), showWhen: { var: "stay.online_kept" }, otherwise: first });
    if (rest.length > 0) blocks.push(para("more", ...rest));
  } else if (kind === "stay-folio-owing-pay") {
    // While the stay can be paid online: what they owe, a button to pay it, and that the desk still takes it.
    blocks.push({ ...para("body", pay.owe), showWhen: { var: "pay_url" }, otherwise: w.paras.join(" ") });
    blocks.push({ block: "email.button", id: "pay", data: { label: pay.payButton, url: "{{pay_url}}" }, showWhen: { var: "pay_url" } });
    blocks.push({ ...para("pay-note", pay.payNote), showWhen: { var: "pay_url" } });
  } else blocks.push(para("body", ...w.paras));
  if (FOLIO.has(kind)) {
    blocks.push(REDUCTIONS);
    blocks.push({
      block: "email.tax-breakdown",
      id: "folio",
      data: {
        lines: [
          { label: all.total, amount: "{{stay.total.money}}" },
          { label: all.paid, amount: "{{stay.paid.money}}" },
          { label: all.balanceLine, amount: "{{stay.balance.money}}" },
        ],
      },
    });
  }
  if (WITH_STAY.has(kind)) {
    blocks.push({
      block: "email.tax-breakdown",
      id: "room",
      data: { lines: [{ label: all.theRoom, amount: "{{stay.room_total.money}}" }] },
    });
    blocks.push(EXTRAS);
    blocks.push(REDUCTIONS);
    blocks.push({
      block: "email.tax-breakdown",
      id: "totals",
      data: {
        lines: [
          { label: all.taxLine, amount: "{{stay.tax.money}}" },
          { label: all.total, amount: "{{stay.total.money}}" },
        ],
      },
    });
    blocks.push(...settleBlocks(all, pay));
    blocks.push(para("cancel", all.cancelBy, all.lateOrEarly));
  }
  if (kind === "stay-arriving") {
    // How to find the house, in its own words, when it has written them; then who to tell when plans change.
    blocks.push({ ...para("finding", "{{practice.finding}}"), showWhen: { var: "practice.finding" } });
    blocks.push(para("late", all.lateOrEarly));
  }
  if (kind === "stay-dates-changed") {
    blocks.push({ block: "email.tax-breakdown", id: "totals", data: { lines: [{ label: all.totalWas, amount: "{{stay.total.money}}" }] } });
    blocks.push(...settleBlocks(all, pay));
    blocks.push(para("cancel", all.cancelBy, all.lateOrEarly));
  }
  // The reservation's own link goes only to the person it was made for, and
  // only in the confirmation and a new link they asked for.
  if ((kind === "stay-made" || kind === "stay-made-pay" || kind === "stay-new-link") && w.button !== undefined) {
    blocks.push({ block: "email.button", id: "see", data: { label: w.button, url: "{{manage_url}}#{{stay.link_token}}" } });
  }
  return { subject: w.subject, preheader: w.preheader, blocks, footer: all.foot };
}

/** Every language's words: English here, the other seven (drafts until reviewed) in `email-words.ts`. */
export function emailWords(): Record<Tag, EmailWords> {
  return {
    "en-US": EMAIL_EN,
    "de-DE": EMAIL_DE,
    "fr-FR": EMAIL_FR,
    "da-DK": EMAIL_DA,
    "cs-CZ": EMAIL_CS,
    "ar-EG": EMAIL_AR,
    "zh-CN": EMAIL_ZH_CN,
    "zh-TW": EMAIL_ZH_TW,
  };
}

/** Every kind's words in one language: its own, and the payments-on twins made from them. */
type AllWords = EmailWords & Record<PayKind, Words>;
function withPayKinds(w: EmailWords, pay: PayWords): AllWords {
  return {
    ...w,
    // What it costs, never that nothing is taken online: the desk's confirmation already says it so.
    "stay-made-pay": { ...w["stay-made"], name: pay.madeName, preheader: w["stay-made-desk"].preheader },
    "stay-folio-owing-pay": { ...w["stay-folio-owing"], name: pay.owingName, preheader: pay.owe.replace(/[.。]$/, "") },
  };
}

/** The variables each template reads, for the template editor's list. */
function varsOf(kind: Kind): string[] {
  const text = JSON.stringify(layout(kind, withPayKinds(EMAIL_EN, PAY_WORDS["en-US"]), PAY_WORDS["en-US"]));
  const found = new Set<string>();
  for (const [, name] of text.matchAll(/\{\{([A-Za-z_.]+)\}\}/g)) found.add(name!);
  return [...found].filter((name) => /^[a-z_]+(\.[a-z_]+)*$/.test(name) && !name.startsWith("row.")).sort();
}

/** The manifest's `emailTemplates`: one per kind, in every language the words are in. */
export function emailTemplates(kinds: readonly Kind[]): unknown[] {
  const words = Object.fromEntries(Object.entries(emailWords()).map(([tag, w]) => [tag, withPayKinds(w, PAY_WORDS[tag as Tag])])) as Record<Tag, AllWords>;
  return kinds.map((kind) => ({
    key: `hotel-${kind}`,
    ...(FOLIO.has(kind) ? { attach: { kind: "invoice", link: "stay", optional: true } } : {}),
    name: Object.fromEntries(Object.entries(words).map(([tag, w]) => [tag, w[kind].name])),
    vars: varsOf(kind),
    locales: Object.fromEntries(Object.entries(words).map(([tag, w]) => [tag, layout(kind, w, PAY_WORDS[tag as Tag])])),
  }));
}
