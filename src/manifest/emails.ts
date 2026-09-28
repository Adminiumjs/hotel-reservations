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
 * Only the online confirmation and a new link the signed-in guest asked for
 * carry the reservation's own link: a code is sent only to the person it
 * opens the stay for. A change of dates says the dates before (`was.*`, kept
 * on the message) and now.
 */
import { EMAIL_AR, EMAIL_CS, EMAIL_DA, EMAIL_DE, EMAIL_FR, EMAIL_ZH_CN, EMAIL_ZH_TW } from "./email-words.ts";
import type { Tag } from "./labels.ts";
import type { Kind } from "./outbox.ts";

/** One email's sentences. */
export interface Words {
  name: string;
  subject: string;
  preheader: string;
  heading?: string;
  paras: string[];
  button?: string;
}

export type EmailWords = Record<Kind, Words> & {
  reference: string;
  theRoom: string;
  total: string;
  /** "Nothing is taken online. You settle at the desk." */
  settle: string;
  cancelBy: string;
  lateOrEarly: string;
  /** "Total, was $791.34": a changed stay's total beside the one before. */
  totalWas: string;
  foot: string;
};

const NOTHING_CHARGED = "Nothing is charged.";
const STILL_OPEN = "If you did not mean to cancel, write to {{practice.email}} or ring us on {{practice.phone}} and we will see what is still open.";

export const EMAIL_EN: EmailWords = {
  reference: "Your reference",
  theRoom: "{{room_type.name}}, {{stay.arrive.day_month}} to {{stay.depart.day_month}}",
  total: "Total",
  settle: "Nothing is taken online. You settle at the desk.",
  cancelBy: "Cancel at no charge until {{stay.cancel_by.time}} on {{stay.cancel_by.date}}.",
  lateOrEarly: "Late or early? Write to {{practice.email}} or ring us on {{practice.phone}}.",
  totalWas: "Total, was {{was.total}}",
  foot: "{{appName}} · {{practice.address}} · {{practice.phone}} · {{practice.email}}. You are getting this because you reserved a room with us.",
  "stay-made": {
    name: "Reservation made",
    subject: "Your room at {{appName}}, {{stay.ref}}",
    preheader: "{{stay.arrive.day_month}} to {{stay.depart.day_month}} · {{stay.total}} · nothing is taken online",
    heading: "You have a room, {{recipient.first_name}}.",
    paras: ["Arriving {{stay.arrive.day_month}}, from {{practice.arrive_from}}. Leaving {{stay.depart.day_month}}, by {{practice.leave_by}}."],
    button: "See your reservation",
  },
  "stay-made-desk": {
    name: "Reservation made at the desk",
    subject: "Your room at {{appName}}, {{stay.ref}}",
    preheader: "{{stay.arrive.day_month}} to {{stay.depart.day_month}} · {{stay.total}}",
    heading: "You have a room, {{recipient.first_name}}.",
    paras: ["Arriving {{stay.arrive.day_month}}, from {{practice.arrive_from}}. Leaving {{stay.depart.day_month}}, by {{practice.leave_by}}."],
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
    preheader: "{{stay.arrive.day_month}} to {{stay.depart.day_month}} · {{stay.total}}",
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
};

type Block = { block: string; id: string; data: Record<string, unknown> };
const para = (id: string, ...paras: string[]): Block => ({ block: "email.text", id, data: { paras } });

/** A stay's extras, each its own line with what it costs. */
const EXTRAS: Block = {
  block: "email.rows",
  id: "extras",
  data: {
    from: { link: "stay", table: "stay_extras", via: "stay_id", orderBy: "id", where: { column: "state", in: ["on"] }, limit: 20 },
    row: { title: "{{row.label}}", amount: "{{row.amount}}" },
  },
};

/** The emails that set out the stay and what it costs. */
const WITH_STAY: ReadonlySet<Kind> = new Set(["stay-made", "stay-made-desk"]);

function layout(kind: Kind, all: EmailWords) {
  const w = all[kind];
  const blocks: Block[] = [];
  if (w.heading !== undefined) blocks.push({ block: "email.heading", id: "heading", data: { text: w.heading } });
  blocks.push({ block: "email.stats", id: "reference", data: { items: [{ label: all.reference, value: "{{stay.ref}}" }] } });
  blocks.push(para("body", ...w.paras));
  if (WITH_STAY.has(kind)) {
    blocks.push({
      block: "email.tax-breakdown",
      id: "room",
      data: { lines: [{ label: all.theRoom, amount: "{{stay.room_total}}" }] },
    });
    blocks.push(EXTRAS);
    blocks.push({
      block: "email.tax-breakdown",
      id: "totals",
      data: {
        lines: [
          { label: "{{stay.tax_label}}", amount: "{{stay.tax}}" },
          { label: all.total, amount: "{{stay.total}}" },
        ],
      },
    });
    blocks.push({ block: "email.box", id: "settle", data: { label: all.settle } });
    blocks.push(para("cancel", all.cancelBy, all.lateOrEarly));
  }
  if (kind === "stay-dates-changed") {
    blocks.push({ block: "email.tax-breakdown", id: "totals", data: { lines: [{ label: all.totalWas, amount: "{{stay.total}}" }] } });
    blocks.push({ block: "email.box", id: "settle", data: { label: all.settle } });
    blocks.push(para("cancel", all.cancelBy, all.lateOrEarly));
  }
  // The reservation's own link goes only to the person it was made for, and
  // only in the confirmation and a new link they asked for.
  if ((kind === "stay-made" || kind === "stay-new-link") && w.button !== undefined) {
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

/** The variables each template reads, for the template editor's list. */
function varsOf(kind: Kind): string[] {
  const text = JSON.stringify(layout(kind, EMAIL_EN));
  const found = new Set<string>();
  for (const [, name] of text.matchAll(/\{\{([A-Za-z_.]+)\}\}/g)) found.add(name!);
  return [...found].filter((name) => /^[a-z_]+(\.[a-z_]+)*$/.test(name) && !name.startsWith("row.")).sort();
}

/** The manifest's `emailTemplates`: one per kind, in every language the words are in. */
export function emailTemplates(kinds: readonly Kind[]): unknown[] {
  const words = emailWords();
  return kinds.map((kind) => ({
    key: `hotel-${kind}`,
    name: Object.fromEntries(Object.entries(words).map(([tag, w]) => [tag, w[kind].name])),
    vars: varsOf(kind),
    locales: Object.fromEntries(Object.entries(words).map(([tag, w]) => [tag, layout(kind, w)])),
  }));
}
