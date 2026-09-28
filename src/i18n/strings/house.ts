/**
 * The screens' words beside English, keyed by the English sentence (see
 * `../tr.ts`). Translators write one file per language in `./house/`, checked
 * against `./house/keys.json` (`npm run strings`) and held by
 * `house-strings.test.ts`; `npm run strings` also sorts every sentence into the
 * side that draws it (`./house/sides/`). A build takes the words of the sides it
 * draws — a guest's page carries none of the desk's — each flag a literal once
 * Vite has replaced it. A sentence with no entry shows in English.
 */
import { DESK, GUEST } from "../../app/sides.ts";
import { DEMO } from "../../surface.ts";
import type { LocaleTag } from "../locales.ts";
import demo from "./house/sides/demo.json" with { type: "json" };
import desk from "./house/sides/desk.json" with { type: "json" };
import guest from "./house/sides/guest.json" with { type: "json" };
import shared from "./house/sides/shared.json" with { type: "json" };

type Words = Partial<Record<LocaleTag, Record<string, string>>>;
const PARTS: Words[] = [shared, GUEST ? guest : {}, DESK ? desk : {}, DEMO ? demo : {}];
const TAGS: LocaleTag[] = ["de-DE", "fr-FR", "cs-CZ", "da-DK", "zh-CN", "zh-TW", "ar-EG"];

export const HOUSE: Partial<Record<LocaleTag, Record<string, string>>> = Object.fromEntries(TAGS.map((tag) => [tag, Object.assign({}, ...PARTS.map((part) => part[tag] ?? {}))]));
