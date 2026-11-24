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

/** What the reservation writes: the guest's tick, only for a number a text can go to. */
export function textsOkFor(ticked: boolean, mobile: string): boolean {
  const state = numberState(mobile);
  return ticked && state !== "china" && state !== "empty";
}

/** The box's words and state, for one form; each side adds its own line (the guest's hint, the desk's "ask first"). */
export function textBoxVals(ticked: boolean, mobile: string, toggle: () => void) {
  const state = numberState(mobile);
  const china = state === "china";
  const on = ticked && !china;
  return {
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
