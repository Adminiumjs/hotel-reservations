/**
 * The box "Text me about my stay", as the guest's reservation and the desk's
 * booking both draw it.
 *
 * It is its own box: never the email tick, never ticked for anyone, never
 * needed to book. A guest's tick is kept in Adminium's text consent log for
 * the mobile typed beside it, with the words shown (`TEXT_BOX` in
 * `manifest/people.ts`, which reads the same sentences). Adminium decides
 * what a number is; the page only reads enough of it to say two things
 * before anything is sent:
 *
 *   - a number in mainland China (+86): no text can go there, so the box is
 *     off and one line says so; the number still lets the desk ring them,
 *     and the reservation goes as ever. Hong Kong (+852) and Taiwan (+886)
 *     are other numbers;
 *   - a number that cannot be read, with the box ticked: "Check this number
 *     so we can text you", beside the field. It stops nothing.
 *
 * The guest's form has a second box, "Text me offers from …", for offers by
 * text: its own column, its own words, recorded under offers. It is not shown
 * for a number in mainland China, the UAE, Egypt, Saudi Arabia or Taiwan,
 * where offers by text cannot go, and says nothing about why.
 *
 * Neither box is drawn while the house has no text service set up in
 * Adminium (`ready`): a box no text would ever follow is not asked.
 */
import { tr } from "../i18n/tr.ts";

/** What the page can tell of a typed number. */
export type NumberState = "empty" | "china" | "unreadable" | "readable";

/** The separators people type inside a number. */
const SEPARATORS = /[\s().\-/ ]/g;

export function numberState(typed: string): NumberState {
  const raw = typed.trim();
  if (raw === "") return "empty";
  const compact = raw.replace(SEPARATORS, "");
  const international = compact.startsWith("+") ? compact.slice(1) : compact.startsWith("00") ? compact.slice(2) : null;
  if (international !== null) {
    if (!/^\d{7,15}$/.test(international)) return "unreadable";
    return international.startsWith("86") ? "china" : "readable";
  }
  // A number without its country is read in the house's own country, by Adminium.
  return /^\d{6,15}$/.test(compact) ? "readable" : "unreadable";
}

/** What the reservation writes: the guest's tick, only for a number a text can go to, and only while texts are set up. */
export function textsOkFor(ticked: boolean, mobile: string, ready = true): boolean {
  const state = numberState(mobile);
  return ready && ticked && state !== "china" && state !== "empty";
}

/** The countries offers by text never go to (they take no reply, or no texts at all): their calling codes. */
const NO_OFFERS = ["86", "971", "20", "966", "886"];

/** Whether the box for offers is shown for this number: not for a number of a country offers cannot go to. */
export function offersOffered(typed: string): boolean {
  const compact = typed.trim().replace(SEPARATORS, "");
  const international = compact.startsWith("+") ? compact.slice(1) : compact.startsWith("00") ? compact.slice(2) : null;
  return international === null || !NO_OFFERS.some((code) => international.startsWith(code));
}

/** What the reservation writes for offers: the guest's tick, for a number offers can go to, while texts are set up. */
export function offersOkFor(ticked: boolean, mobile: string, ready = true): boolean {
  return ready && ticked && offersOffered(mobile) && numberState(mobile) !== "empty";
}

/** The second box, on the guest's form: shown or not, and its words. */
export function offersBoxVals(ticked: boolean, mobile: string, toggle: () => void, hotel: string, ready: boolean) {
  const shown = ready && offersOffered(mobile);
  return {
    offersShown: shown,
    offersOn: shown && ticked,
    onOffers: toggle,
    offersLabel: tr("Text me offers from {hotel}", { hotel }),
    offersOptional: tr("Optional. You can stop at any time; each text tells you how."),
  };
}

/** The box's words and state, for one form; each side adds its own line (the guest's hint, the desk's "ask first"). */
export function textBoxVals(ticked: boolean, mobile: string, toggle: () => void, ready = true) {
  const state = numberState(mobile);
  const china = state === "china";
  const on = ready && ticked && !china;
  return {
    // Drawn only while the house's texts are set up.
    textShown: ready,
    textOn: on,
    textDisabled: china,
    onText: () => {
      if (!china) toggle();
    },
    textLabel: tr("Text me about my stay"),
    textSub: tr("Your arrival details, and if your dates change."),
    textOptional: tr("Optional. You can stop at any time; each text tells you how."),
    // A +86 number: the box is off, and this line takes the place of its hint.
    textChinaOn: china,
    textChina: tr("We can't send texts to numbers in mainland China. Everything else works as usual."),
    textHintOn: !china,
    // Ticked, with a number a text cannot go to: said beside the field, and nothing is stopped.
    textCheckOn: on && (state === "unreadable" || state === "empty"),
    textCheck: tr("Check this number so we can text you"),
    textOpacity: china ? ".55" : "1",
    textCursor: china ? "not-allowed" : "pointer",
  };
}
