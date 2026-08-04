/**
 * The small shared pieces: buttons, chips, panels, fields, tiles, KPI cards,
 * bars, grid rows and empty states.
 *
 * They are grouped in one module rather than one file each because none of them
 * is more than a handful of lines and they are always imported together.
 * Anything with real behaviour — the shell, the dock, the overlays — lives in
 * its own file.
 */

import type { CSSProperties, ReactNode } from "react";
import {
  BedDouble,
  BedSingle,
  Car,
  Check,
  Clock,
  Coffee,
  Croissant,
  LampDesk,
  Shirt,
  ShowerHead,
  Sofa,
  Sun,
  Trees,
  Waves,
  Wifi,
  Wine,
} from "lucide-react";

import type { RoomType } from "../data/types.ts";
import { typeTile } from "../lib/format.ts";

/* ------------------------------------------------------------------ icons */

/**
 * The seed stores a Lucide icon NAME, and this table turns it into a component.
 * Written out rather than imported dynamically so the bundle only carries the
 * icons this app actually draws — and so a typo in the seed is caught here
 * rather than rendering nothing at all.
 */
const ICONS = {
  "bed-double": BedDouble,
  "bed-single": BedSingle,
  car: Car,
  check: Check,
  clock: Clock,
  coffee: Coffee,
  croissant: Croissant,
  "lamp-desk": LampDesk,
  shirt: Shirt,
  "shower-head": ShowerHead,
  sofa: Sofa,
  sun: Sun,
  trees: Trees,
  waves: Waves,
  wifi: Wifi,
  wine: Wine,
} as const;

export function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const Cmp = ICONS[name as keyof typeof ICONS] ?? Check;
  return <Cmp size={size} aria-hidden="true" />;
}

/** Which glyph a "what's in the room" feature gets. */
export const FEATURE_ICON: Record<string, string> = {
  single: "bed-single",
  double: "bed-double",
  sofa: "sofa",
  sitting: "sofa",
  bath: "shower-head",
  shower: "shower-head",
  wifi: "wifi",
  tea: "coffee",
  desk: "lamp-desk",
  garden: "trees",
  water: "waves",
  robes: "shirt",
};

/* ------------------------------------------------------------------ tiles */

/**
 * A room type is its tint. There is no photography anywhere in this app: a
 * Harbour double is two gradient stops, an oversized icon and a small mono
 * code chip, and the same two stops follow it onto the results card, the
 * room-type page, the rack tile and the calendar row.
 */
export function Tile({
  type,
  size = 56,
  icon,
  badge,
  showCode,
}: {
  type: RoomType | null;
  size?: number;
  icon?: number;
  badge?: ReactNode;
  showCode?: boolean;
}) {
  if (type === null) {
    return <span className="wh-tile" style={{ width: size, height: size }} />;
  }
  return (
    <span
      className="wh-tile"
      style={{ width: size, height: size, background: typeTile(type.from, type.to) }}
      aria-hidden="true"
    >
      <Icon name={type.icon} size={icon ?? Math.round(size / 2)} />
      {showCode === true && size >= 46 && <span className="wh-tile__sku">{type.code}</span>}
      {/* House layout rule 2: a badge sits OPPOSITE the tile's own chip. */}
      {badge !== undefined && <span className="wh-tile__badge">{badge}</span>}
    </span>
  );
}


/* ----------------------------------------------------------------- button */

type Tone = "accent" | "ghost" | "soft" | "warn";

export function Button({
  children,
  onClick,
  tone = "accent",
  size,
  block,
  disabled,
  title,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: Tone;
  size?: "sm";
  block?: boolean;
  disabled?: boolean;
  title?: string;
  className?: string;
}) {
  const cls = [
    "wh-button",
    "wh-btn",
    tone === "accent" ? "" : `wh-button--${tone}`,
    size === "sm" ? "wh-button--sm" : "",
    block ? "wh-button--block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button type="button" className={cls} onClick={onClick} disabled={disabled} title={title}>
      {children}
    </button>
  );
}

export function IconButton({
  children,
  onClick,
  label,
  small,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  label: string;
  small?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`wh-iconbtn wh-btn${small ? " wh-iconbtn--sm" : ""} ${className}`.trim()}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------- chip */

export function Chip({
  children,
  tone,
  outline,
  style,
}: {
  children: ReactNode;
  tone?: "pos" | "warn" | "danger" | "info" | "accent";
  outline?: boolean;
  style?: CSSProperties;
}) {
  const cls = [
    "wh-chip",
    tone ? `wh-chip--${tone}` : "",
    outline ? "wh-chip--outline" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls} style={style}>
      {children}
    </span>
  );
}

/** A filter pill. `pressed` takes the accent, so a live filter is obvious. */
export function Filter({
  children,
  count,
  pressed,
  onClick,
}: {
  children: ReactNode;
  count?: ReactNode;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className="wh-filter wh-btn" aria-pressed={pressed} onClick={onClick}>
      {children}
      {count !== undefined && <span className="wh-filter__count">{count}</span>}
    </button>
  );
}

/** An amount, a date, a code — anything that must not be re-ordered by bidi. */
export function Mono({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span className={`wh-mono ${className}`.trim()} style={style}>
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ panel */

export function Panel({
  title,
  meta,
  actions,
  children,
  bodyless,
  className = "",
}: {
  title?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  /** Skip the padded body — for a panel whose content is its own grid. */
  bodyless?: boolean;
  className?: string;
}) {
  return (
    <section className={`wh-panel ${className}`.trim()}>
      {title !== undefined && (
        <header className="wh-panel__head">
          <h2 className="wh-panel__title">{title}</h2>
          {meta !== undefined && <span className="wh-panel__sub">{meta}</span>}
          {actions !== undefined && (
            <div style={{ marginInlineStart: "auto", display: "flex", gap: 8 }}>{actions}</div>
          )}
        </header>
      )}
      {bodyless ? children : <div className="wh-panel__body">{children}</div>}
    </section>
  );
}

/* --------------------------------------------------------------- KPI card */

export function Kpi({
  label,
  value,
  hint,
  tone,
  large,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "pos" | "warn" | "danger" | "muted";
  large?: boolean;
}) {
  return (
    <div className="wh-kpi">
      <div className="wh-kpi__label">{label}</div>
      <div
        className={`wh-kpi__value${large ? " wh-kpi__value--lg" : ""}`}
        style={tone ? { color: tone === "muted" ? "var(--fg-muted)" : `var(--${tone})` } : undefined}
      >
        {value}
      </div>
      {hint !== undefined && <div className="wh-kpi__hint">{hint}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------- bars */

export function Bar({
  pct,
  tone,
  thin,
  label,
}: {
  pct: number;
  tone?: "pos" | "warn" | "danger" | "muted";
  thin?: boolean;
  label?: { text: string; color: string };
}) {
  return (
    <div>
      <div className={`wh-bar${thin === true ? " wh-bar--thin" : ""}`}>
        <div
          className={`wh-bar__fill${tone ? ` wh-bar__fill--${tone}` : ""}`}
          style={{ inlineSize: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
      {label !== undefined && (
        <div className="wh-bar__label" style={{ color: label.color }}>
          {label.text}
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- fields */

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="wh-field">
      <span className="wh-label">{label}</span>
      {children}
    </label>
  );
}

/** A read-only twin of a field — a live yield, a computed margin. */
export function Readout({
  label,
  children,
  color,
}: {
  label: string;
  children: ReactNode;
  color?: string;
}) {
  return (
    <div className="wh-field">
      <span className="wh-label">{label}</span>
      <div className="wh-readout" style={color !== undefined ? { color } : undefined}>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ empty state */

export function Empty({ title, body }: { title: string; body?: string }) {
  return (
    <div className="wh-empty">
      <div className="wh-empty__title">{title}</div>
      {body !== undefined && <p className="wh-empty__body">{body}</p>}
    </div>
  );
}

/** The line that tells a reader what this workspace deliberately is not. */
export function Honest({ children }: { children: ReactNode }) {
  return <p className="wh-honest">{children}</p>;
}

/** An honest inline explanation — a refusal, a warning, a confirmation. */
export function Notice({
  tone,
  icon,
  children,
}: {
  tone: "danger" | "warn" | "info" | "pos";
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`wh-notice wh-notice--${tone}`}>
      {icon}
      <span>{children}</span>
    </div>
  );
}

/* -------------------------------------------------------------- segmented */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  full,
  ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  full?: boolean;
  ariaLabel?: string;
}) {
  return (
    <div className={`wh-seg${full === true ? " wh-seg--full" : ""}`} role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="wh-seg__btn"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
