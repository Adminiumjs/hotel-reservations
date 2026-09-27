/**
 * The small runtime the house's screens are drawn with.
 *
 * The screens keep the design's inline styles as written (`st("display:flex;…")`),
 * parsed once per distinct string into React's style object; a hover or a
 * pressed look (`fx(hover, active)`) becomes a generated class whose rules
 * win over the inline style; an icon is a Lucide SVG filling the span the
 * design sized for it.
 */
import type { CSSProperties } from "react";

import { ICONS } from "./icons.ts";

const styles = new Map<string, CSSProperties>();

/** `a:b;c:d` → a style object; custom properties kept, `-webkit-x` → `WebkitX`. */
export function st(css: string | null | undefined): CSSProperties {
  const text = css ?? "";
  const known = styles.get(text);
  if (known !== undefined) return known;
  const out: Record<string, string> = {};
  for (const decl of split(text)) {
    const at = decl.indexOf(":");
    if (at < 1) continue;
    const prop = decl.slice(0, at).trim();
    const value = decl.slice(at + 1).trim();
    if (value === "" || value === "undefined" || value === "null") continue;
    out[prop.startsWith("--") ? prop : camel(prop)] = value;
  }
  styles.set(text, out as CSSProperties);
  return out as CSSProperties;
}

/** Declarations split on `;` outside parentheses and quotes. */
function split(css: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  for (let i = 0; i < css.length; i += 1) {
    const c = css[i]!;
    if (quote !== null) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") quote = c;
    else if (c === "(") depth += 1;
    else if (c === ")") depth -= 1;
    else if (c === ";" && depth === 0) {
      out.push(css.slice(start, i));
      start = i + 1;
    }
  }
  out.push(css.slice(start));
  return out;
}

const camel = (prop: string) => prop.replace(/^-(webkit|moz|ms)-/, (_, v: string) => `${v[0]!.toUpperCase()}${v.slice(1)}-`).replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

const classes = new Map<string, string>();
let sheet: CSSStyleSheet | null = null;

/** A class carrying a hover and a pressed look; its rules beat the element's inline style. */
export function fx(hover: string | null, active: string | null): string {
  const key = `${hover ?? ""}|${active ?? ""}`;
  const known = classes.get(key);
  if (known !== undefined) return known;
  const name = `fx${String(classes.size + 1)}`;
  classes.set(key, name);
  if (typeof document !== "undefined") {
    if (sheet === null) {
      const el = document.createElement("style");
      el.id = "wh-fx";
      document.head.appendChild(el);
      sheet = el.sheet;
    }
    const important = (css: string) =>
      split(css)
        .filter((d) => d.includes(":"))
        .map((d) => `${d.trim()} !important`)
        .join(";");
    if (hover) sheet?.insertRule(`@media (hover:hover){.${name}:hover:not(:disabled){${important(hover)}}}`, sheet.cssRules.length);
    if (active) sheet?.insertRule(`.${name}:active:not(:disabled){${important(active)}}`, sheet.cssRules.length);
  }
  return name;
}

/** A Lucide icon filling its span; an unknown name draws a plain circle. */
export function Icon({ name }: { name: string | null | undefined }) {
  const Svg = ICONS[name ?? ""] ?? ICONS["circle"]!;
  return <Svg width="100%" height="100%" strokeWidth={2} aria-hidden="true" focusable="false" />;
}
