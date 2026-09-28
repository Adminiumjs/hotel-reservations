/**
 * The message registry: the keyed words the build hands Adminium
 * (`surface.json`'s sidebar labels). The screens' sentences are the house
 * catalog (`../strings/house.ts`, English as the key); this registry keeps only
 * what is looked up by a key.
 */
import type { Translated } from "../untranslated.ts";
import { LOCALE_TAGS, type LocaleTag } from "../locales.ts";
import { nav } from "../strings/nav.ts";

/**
 * Parity guard. `en-US` defines the keys; the other seven must each carry a
 * string for every one of them. A translation module that is missing an English
 * key is a COMPILE error here rather than a silent per-key fallback to English
 * at runtime — which is the failure mode this whole layer exists to prevent.
 */
type Area<EN extends Record<string, string>> = { "en-US": EN } & Record<
  Exclude<LocaleTag, "en-US">,
  Translated<EN>
>;

const AREAS: [Area<(typeof nav)["en-US"]>] = [nav];

export const MESSAGES = Object.fromEntries(
  LOCALE_TAGS.map((t) => [t, Object.assign({}, ...AREAS.map((a) => a[t] ?? {}))]),
) as Record<LocaleTag, Record<string, string>>;

/** Keys are typed off English — the source of truth — so a typo is a compile error. */
export type MessageKey = keyof (typeof nav)["en-US"];
