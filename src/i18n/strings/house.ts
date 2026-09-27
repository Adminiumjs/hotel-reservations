/**
 * The screens' words beside English, keyed by the English sentence (see
 * `../tr.ts`): one file per language in `./house/`, checked against
 * `./house/keys.json` (`npm run strings`) and held by `house-strings.test.ts`.
 * A sentence with no entry shows in English.
 */
import type { LocaleTag } from "../locales.ts";
import ar from "./house/ar-EG.json" with { type: "json" };
import cs from "./house/cs-CZ.json" with { type: "json" };
import da from "./house/da-DK.json" with { type: "json" };
import de from "./house/de-DE.json" with { type: "json" };
import fr from "./house/fr-FR.json" with { type: "json" };
import zhCN from "./house/zh-CN.json" with { type: "json" };
import zhTW from "./house/zh-TW.json" with { type: "json" };

export const HOUSE: Partial<Record<LocaleTag, Record<string, string>>> = {
  "de-DE": de,
  "fr-FR": fr,
  "cs-CZ": cs,
  "da-DK": da,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
  "ar-EG": ar,
};
