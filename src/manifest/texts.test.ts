/**
 * The house's texts, held to what a text may say and to what it costs.
 *
 * Each template is filled with long values (a long month, the house's name,
 * a reference) and given the longest opt-out line Adminium adds in its
 * language (the one that names the house's address, for a sender that cannot
 * take a reply), then counted the way Adminium's length counter counts it
 * (`apps/server/src/sms/send/length.ts`: GSM-7 160/153, else UCS-2 70/67,
 * an escaped GSM character taking two places). Adminium never sends a text
 * over six segments; the house's stay within three.
 */
import { describe, expect, it } from "vitest";

import { checkTextTemplate } from "../testing/manifest/text-messages.ts";
import { buildManifest } from "./build.ts";
import { LOCALES, type Tag } from "./labels.ts";
import { TEXT_KINDS } from "./outbox.ts";
import { TEXT_BODIES } from "./texts.ts";

const GSM_BASIC = new Set('@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà');
const GSM_ESCAPED = new Set("^{}\\[~]|€\f");

/** Segments, as Adminium estimates them for a destination with the standard table. */
function segments(body: string): { encoding: "gsm-7" | "ucs-2"; segments: number } {
  const chars = Array.from(body);
  const gsm = chars.every((c) => GSM_BASIC.has(c) || GSM_ESCAPED.has(c));
  const widths = gsm ? chars.map((c) => (GSM_ESCAPED.has(c) ? 2 : 1)) : chars.map((c) => c.length);
  const limit = gsm ? { alone: 160, split: 153 } : { alone: 70, split: 67 };
  const units = widths.reduce((a, b) => a + b, 0);
  if (units <= limit.alone) return { encoding: gsm ? "gsm-7" : "ucs-2", segments: units === 0 ? 0 : 1 };
  let count = 1;
  let room = limit.split;
  for (const w of widths) {
    if (w > room) {
      count += 1;
      room = limit.split;
    }
    room -= w;
  }
  return { encoding: gsm ? "gsm-7" : "ucs-2", segments: count };
}

/** The opt-out line Adminium adds for a sender that cannot take a reply: the longer of its two, in each language. */
const STOP_BY_CONTACT: Record<Tag, string> = {
  "en-US": "To stop these texts, contact {contact}.",
  "de-DE": "Keine SMS mehr? Wenden Sie sich an {contact}.",
  "fr-FR": "Pour ne plus recevoir de SMS, contactez {contact}.",
  "da-DK": "Stop sms'er ved at kontakte {contact}.",
  "cs-CZ": "Zrušení SMS: kontaktujte {contact}.",
  "ar-EG": "لإيقاف الرسائل تواصل مع {contact}.",
  "zh-CN": "退订请联系{contact}。",
  "zh-TW": "退訂請聯絡{contact}。",
};

/** Long values for every placeholder a template reads. */
function filled(body: string, tag: Tag): string {
  const day = (iso: string) => new Intl.DateTimeFormat(tag, { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(iso));
  const values: Record<string, string> = {
    appName: "Wren House",
    "stay.arrive.day_month": day("2026-09-30T12:00:00Z"),
    "stay.depart.day_month": day("2026-12-31T12:00:00Z"),
    "practice.arrive_from.time": new Intl.DateTimeFormat(tag, { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(new Date("2026-09-30T15:00:00Z")),
    "stay.ref": "WH-S13312",
  };
  return body.replace(/\{\{\s*([A-Za-z_.]+)\s*\}\}/g, (_, name: string) => {
    const value = values[name];
    if (value === undefined) throw new Error(`no sample value for {{${name}}}`);
    return value;
  });
}

const manifest = buildManifest() as { textTemplates: { key: string; name: Record<string, string>; locales: Record<string, { body: string }> }[]; outbox: { kinds: Record<string, string>; channels: Record<string, string> } };

describe("the house's texts", () => {
  it("are one template per text kind, each named, in every language", () => {
    expect(manifest.textTemplates.map((t) => t.key)).toEqual(TEXT_KINDS.map((kind) => `hotel-${kind}`));
    for (const kind of TEXT_KINDS) expect(manifest.outbox.kinds[kind]).toBe(`hotel-${kind}`);
    for (const t of manifest.textTemplates) {
      expect(Object.keys(t.locales).sort()).toEqual([...LOCALES].sort());
      expect(Object.keys(t.name).sort()).toEqual([...LOCALES].sort());
    }
  });

  it("say nothing a text may not: no link, no code, no 'reply YES', no phone number, no opt-out of their own", () => {
    for (const kind of TEXT_KINDS) {
      for (const tag of LOCALES) {
        const body = TEXT_BODIES[kind][tag];
        expect([kind, tag, checkTextTemplate(body)]).toEqual([kind, tag, { ok: true }]);
        // Where the opt-out goes through the house (the UAE), the body carries no number and no link at all.
        expect(body).not.toMatch(/https?:|www\.|url|link|token|phone|email/i);
        expect(body).not.toMatch(/STOP/);
        // The house's name opens every text (Taiwan asks for it): who is writing, on a locked phone.
        expect(body.startsWith("{{appName}}")).toBe(true);
      }
    }
  });

  it("stay within three segments in every language, filled and with Adminium's longest opt-out line", () => {
    const contact = "reservations@wrenhouse.example";
    for (const kind of TEXT_KINDS) {
      for (const tag of LOCALES) {
        const text = filled(TEXT_BODIES[kind][tag], tag);
        const stop = STOP_BY_CONTACT[tag].replace("{contact}", contact);
        const whole = tag.startsWith("zh") ? `${text}${stop}` : `${text} ${stop}`;
        const counted = segments(whole);
        expect([kind, tag, counted.segments <= 3], `${whole} (${counted.encoding}, ${String(counted.segments)})`).toEqual([kind, tag, true]);
      }
    }
  });

  it("go as English, German and Danish texts in the cheap alphabet when the values are", () => {
    for (const kind of TEXT_KINDS) {
      for (const tag of ["en-US", "de-DE", "da-DK"] as const) expect([kind, tag, segments(filled(TEXT_BODIES[kind][tag], tag)).encoding]).toEqual([kind, tag, "gsm-7"]);
    }
  });
});
