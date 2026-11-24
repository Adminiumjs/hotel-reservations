/**
 * The house's texts: one template per text kind of the outbox, in the eight
 * languages the app ships (`textTemplates`).
 *
 * A text shows on a locked phone and a number gets passed on, so each says
 * only what a guest needs on the day and nothing that opens anything: the
 * house's name first (Taiwan asks for it there, and it tells everyone who is
 * writing), the date, when the room is ready, the reference. No link, no
 * code, and no phone number either: where the opt-out goes through the house
 * (the UAE), a text carries no number at all. Adminium adds the opt-out line
 * itself, in the template's language, after the placeholders are filled, so
 * no template writes one; and none asks for a reply.
 *
 * EVERY LANGUAGE BESIDE ENGLISH IS AN UNREVIEWED DRAFT until a native speaker
 * has read it (the release waits for that review), as the emails are.
 * `texts.test.ts` counts each one's segments, filled and with its longest
 * opt-out line.
 */
import { l, type Tag } from "./labels.ts";
import { EMAIL_KINDS } from "./tables.ts";
import type { TextKind } from "./outbox.ts";

export const TEXT_BODIES: Record<TextKind, Record<Tag, string>> = {
  "stay-arriving-text": {
    "en-US": "{{appName}}: see you on {{stay.arrive.day_month}}. Your room is ready from {{practice.arrive_from.time}}. Reference {{stay.ref}}.",
    "de-DE": "{{appName}}: Bis bald am {{stay.arrive.day_month}}. Ihr Zimmer ist ab {{practice.arrive_from.time}} bereit. Referenz {{stay.ref}}.",
    "fr-FR": "{{appName}} : à bientôt, le {{stay.arrive.day_month}}. Votre chambre vous attend dès {{practice.arrive_from.time}}. Référence {{stay.ref}}.",
    "da-DK": "{{appName}}: Vi ses den {{stay.arrive.day_month}}. Dit værelse er klar fra {{practice.arrive_from.time}}. Reference {{stay.ref}}.",
    "cs-CZ": "{{appName}}: Těšíme se na vás {{stay.arrive.day_month}}. Pokoj je připraven od {{practice.arrive_from.time}}. Číslo rezervace {{stay.ref}}.",
    "ar-EG": "{{appName}}: نراك يوم {{stay.arrive.day_month}}. غرفتك جاهزة من {{practice.arrive_from.time}}. رقم الحجز {{stay.ref}}.",
    "zh-CN": "{{appName}}：期待{{stay.arrive.day_month}}与您相见。房间{{practice.arrive_from.time}}起可入住。预订号{{stay.ref}}。",
    "zh-TW": "{{appName}}：期待{{stay.arrive.day_month}}與您相見。房間{{practice.arrive_from.time}}起可入住。訂房編號{{stay.ref}}。",
  },
  "stay-dates-changed-text": {
    "en-US": "{{appName}}: your dates have changed. Now {{stay.arrive.day_month}} to {{stay.depart.day_month}}. Reference {{stay.ref}}.",
    "de-DE": "{{appName}}: Ihre Daten haben sich geändert. Jetzt {{stay.arrive.day_month}} bis {{stay.depart.day_month}}. Referenz {{stay.ref}}.",
    "fr-FR": "{{appName}} : vos dates ont changé. Désormais du {{stay.arrive.day_month}} au {{stay.depart.day_month}}. Référence {{stay.ref}}.",
    "da-DK": "{{appName}}: Dine datoer er ændret. Nu {{stay.arrive.day_month}} til {{stay.depart.day_month}}. Reference {{stay.ref}}.",
    "cs-CZ": "{{appName}}: Termín vašeho pobytu se změnil. Nově {{stay.arrive.day_month}} až {{stay.depart.day_month}}. Číslo rezervace {{stay.ref}}.",
    "ar-EG": "{{appName}}: تغيّرت مواعيد إقامتك. الآن من {{stay.arrive.day_month}} إلى {{stay.depart.day_month}}. رقم الحجز {{stay.ref}}.",
    "zh-CN": "{{appName}}：您的住宿日期已更改，现为{{stay.arrive.day_month}}至{{stay.depart.day_month}}。预订号{{stay.ref}}。",
    "zh-TW": "{{appName}}：您的住宿日期已變更，現為{{stay.arrive.day_month}}至{{stay.depart.day_month}}。訂房編號{{stay.ref}}。",
  },
};

/** The manifest's `textTemplates`: one per text kind, named as the Messages page names its kind. */
export function textTemplates(kinds: readonly TextKind[]): unknown[] {
  return kinds.map((kind) => ({
    key: `hotel-${kind}`,
    name: l(EMAIL_KINDS[kind]!),
    locales: Object.fromEntries(Object.entries(TEXT_BODIES[kind]).map(([tag, body]) => [tag, { body }])),
  }));
}
