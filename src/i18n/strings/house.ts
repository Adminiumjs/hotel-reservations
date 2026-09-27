/**
 * The screens' words beside English, keyed by the English sentence (see
 * `../tr.ts`). Written by `npm run strings` from every `tr("…")` in the
 * screens; a sentence with no entry for a language shows in English and is
 * counted as owed.
 */
import type { LocaleTag } from "../locales.ts";

export const HOUSE: Partial<Record<LocaleTag, Record<string, string>>> = {};
