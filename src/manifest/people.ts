/**
 * The house's guests, as Adminium is told of them (`people`), and the tick a
 * guest gives on their reservation ("Email me news and offers").
 *
 * A guest account (`customers`) is a person: made by the reservation from the
 * address the guest types, and signed in to by a link emailed to it. Their
 * address is the one the outbox writes to and the one they sign in with;
 * their name is their first name and surname joined (`full_name`); their
 * language is the one their first reservation was made in. `opt_in` ("News
 * from us") is the newsletter's consent, kept in step with Adminium's consent
 * log: the tick on a reservation writes a row in the log and sets it, an
 * unsubscribe clears it, and "Delete my details" records the withdrawal
 * before it empties it.
 *
 * A guest is also copied onto every reservation of theirs: its first name,
 * surname, the two joined, the address and the mobile. Each copy is declared,
 * so that finding, exporting and erasing a person reaches it; a reservation
 * and its money are the house's register and its bills, which the law keeps
 * (`keep` on their tables), so an erasure leaves those as they are.
 */
import ar from "../i18n/strings/house/ar-EG.json" with { type: "json" };
import cs from "../i18n/strings/house/cs-CZ.json" with { type: "json" };
import da from "../i18n/strings/house/da-DK.json" with { type: "json" };
import de from "../i18n/strings/house/de-DE.json" with { type: "json" };
import fr from "../i18n/strings/house/fr-FR.json" with { type: "json" };
import zhCN from "../i18n/strings/house/zh-CN.json" with { type: "json" };
import zhTW from "../i18n/strings/house/zh-TW.json" with { type: "json" };
import { LOCALES, type Tag } from "./labels.ts";

/** The tick, and the line under it: what a guest is shown on the reservation, as the screens say it. */
export const TICK_SENTENCES = ["Email me news and offers from {hotel}", "Every email has a link to stop them."] as const;

const SCREENS: Record<Exclude<Tag, "en-US">, Record<string, string>> = {
  "de-DE": de,
  "fr-FR": fr,
  "da-DK": da,
  "cs-CZ": cs,
  "ar-EG": ar,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
};

/** The two sentences in one language, one a line, from the screens' own words. */
function shown(tag: Tag): string {
  return TICK_SENTENCES.map((sentence) => {
    if (tag === "en-US") return sentence;
    const said = SCREENS[tag][sentence];
    if (said === undefined) throw new Error(`the reservation's tick has no ${tag} words for "${sentence}"`);
    return said;
  }).join("\n");
}

/**
 * The reservation's tick, as the consent log keeps it: the stay's `opt_in`,
 * for the newsletter, with the sentences shown beside the box. `{hotel}`
 * stands for the house's name, which the box shows in its place. A new
 * wording is a new version.
 */
export const NEWS_TICK = {
  column: "opt_in",
  purpose: "newsletter",
  wording: { version: 1, text: Object.fromEntries(LOCALES.map((tag) => [tag, shown(tag)])) },
};

export const PEOPLE = [
  {
    table: "customers",
    kind: "people",
    email: "email",
    name: "full_name",
    firstName: { column: "first_name" },
    language: "language",
    consent: { column: "opt_in", purpose: "newsletter" },
    // Every reservation keeps its guest's own details: the account's, or the ones typed at the desk for a guest with none.
    copies: [
      { table: "stays", column: "first_name", holds: "name", via: "customer_id" },
      { table: "stays", column: "last_name", holds: "name", via: "customer_id" },
      { table: "stays", column: "guest_name", holds: "name", via: "customer_id" },
      { table: "stays", column: "email", holds: "email", via: "customer_id" },
      { table: "stays", column: "mobile", holds: "phone", via: "customer_id" },
    ],
  },
];
