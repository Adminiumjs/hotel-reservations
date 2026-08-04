/**
 * The overlays: the check-in sheet, the cancel confirm, the calendar's
 * night drill-in, and the toast layer.
 *
 * All four are mounted once by `<App>` around the view switch, so a view change
 * never remounts them and a toast survives the navigation that raised it.
 * Escape closes them outermost-first through the store, and the dock steps
 * aside while any of them is open.
 *
 * The add-a-charge and settle popovers are NOT here — they belong to the folio
 * and open inline beside the ledger they act on, which is where somebody
 * standing at the desk expects to find them.
 */

import type { ReactNode } from "react";
import { BedDouble, CircleAlert, X } from "lucide-react";

import { useI18n } from "../i18n/index.tsx";
import {
  dateShort,
  dateWeekday,
  label,
  money,
  nightsLabel,
  typeName,
} from "../lib/format.ts";
import {
  assignableRooms,
  cancellationIsFree,
  cleaningCount,
  folioFor,
  movementsOn,
  nightRows,
  nights,
} from "../lib/stay.ts";
import {
  EXTRAS,
  TAX,
  fullName,
  typeById,
  useStore,
} from "../state/store.ts";
import { Button, Chip, Empty, Tile } from "./Primitives.tsx";

/* ------------------------------------------------------------------ shell */

function Sheet({
  onClose,
  label: ariaLabel,
  head,
  children,
}: {
  onClose: () => void;
  label: string;
  head: ReactNode;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <>
      <button type="button" className="wh-drawer__scrim" aria-label={t("chrome.close")} onClick={onClose} />
      <aside className="wh-drawer wh-scroll" role="dialog" aria-modal="true" aria-label={ariaLabel}>
        <div className="wh-drawer__head">
          {head}
          <button
            type="button"
            className="wh-iconbtn wh-btn wh-iconbtn--sm"
            onClick={onClose}
            aria-label={t("chrome.close")}
            style={{ marginInlineStart: "auto" }}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="wh-drawer__body">{children}</div>
      </aside>
    </>
  );
}

/* ------------------------------------------------------------ check-in */

export function CheckinSheet() {
  const { t } = useI18n();
  const ref = useStore((s) => s.checkinRef);
  const stays = useStore((s) => s.stays);
  const rooms = useStore((s) => s.rooms);
  const picked = useStore((s) => s.pickedRoom);
  const pickRoom = useStore((s) => s.pickRoom);
  const openCheckin = useStore((s) => s.openCheckin);
  const confirmCheckin = useStore((s) => s.confirmCheckin);
  const go = useStore((s) => s.go);

  if (ref === null) return null;
  const stay = stays.find((s) => s.ref === ref);
  if (stay === undefined) return null;
  const type = typeById(stay.type);

  /* Only Ready rooms of the booked type — never "any free room". */
  const options = assignableRooms(rooms, stay.type);
  const cleaning = cleaningCount(rooms, stay.type);

  return (
    <Sheet
      onClose={() => openCheckin(null)}
      label={t("checkin.title")}
      head={
        <>
          <Tile type={type} size={46} />
          <div style={{ minInlineSize: 0 }}>
            <h2 className="wh-drawer__title">{t("checkin.title")}</h2>
            <div style={{ fontSize: 13.5, fontWeight: 600, marginBlockStart: 3 }}>
              {fullName(stay)}
            </div>
            <div className="wh-drawer__meta">
              {t("checkin.sub", {
                name: stay.ref,
                type: typeName(type),
                nights: nightsLabel(nights(stay.arrive, stay.depart)),
              })}
            </div>
          </div>
        </>
      }
    >
      {stay.noteKey !== null && (
        <div className="wh-notice wh-notice--warn">
          <CircleAlert size={14} aria-hidden="true" />
          <span>{label(stay.noteKey, stay.note)}</span>
        </div>
      )}

      <section className="wh-panel">
        <header className="wh-panel__head">
          <h2 className="wh-panel__title">{t("checkin.pick")}</h2>
        </header>

        {options.length === 0 ? (
          <div className="wh-panel__body">
            {/* An honest state: say so, name how many are being cleaned, and
             * offer the rack rather than leaving the desk stuck. */}
            <div className="wh-notice wh-notice--warn">
              <CircleAlert size={14} aria-hidden="true" />
              <span>{t("checkin.noneReady", { count: String(cleaning) })}</span>
            </div>
            <div style={{ marginBlockStart: 12 }}>
              <Button
                tone="ghost"
                block
                onClick={() => {
                  openCheckin(null);
                  go("rack");
                }}
              >
                {t("checkin.seeRack")}
              </Button>
            </div>
          </div>
        ) : (
          options.map((room) => (
            <button
              key={room.number}
              type="button"
              className="wh-grid wh-grid--row"
              style={{ "--cols": "70px 1fr auto" } as React.CSSProperties}
              aria-pressed={picked === room.number}
              onClick={() => pickRoom(room.number)}
            >
              <span className="wh-mono" style={{ fontSize: 16, fontWeight: 700 }}>
                {room.number}
              </span>
              <span style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>
                {t("checkin.floor", { floor: String(room.floor) })}
                {room.noteKey !== null && ` · ${label(room.noteKey, "")}`}
              </span>
              {picked === room.number && <Chip tone="accent">✓</Chip>}
            </button>
          ))
        )}
      </section>

      {options.length > 0 && (
        <Button block disabled={picked === null} onClick={confirmCheckin}>
          <BedDouble size={15} aria-hidden="true" />
          {picked === null
            ? t("checkin.pickFirst")
            : t("checkin.confirm", { room: String(picked) })}
        </Button>
      )}
    </Sheet>
  );
}

/* -------------------------------------------------------- cancel confirm */

export function CancelDialog() {
  const { t } = useI18n();
  const ref = useStore((s) => s.cancelRef);
  const stays = useStore((s) => s.stays);
  const now = useStore((s) => s.now);
  const openCancel = useStore((s) => s.openCancel);
  const confirmCancel = useStore((s) => s.confirmCancel);

  if (ref === null) return null;
  const stay = stays.find((s) => s.ref === ref);
  if (stay === undefined) return null;
  const type = typeById(stay.type);
  if (type === null) return null;

  const clean = cancellationIsFree(now.date, stay.arrive);
  const deposit = nightRows(type, stay.arrive, stay.depart)[0]?.rate ?? 0;

  return (
    <Sheet
      onClose={() => openCancel(null)}
      label={t("myres.cancelBtn")}
      head={
        <div style={{ minInlineSize: 0 }}>
          <h2 className="wh-drawer__title">{t("myres.cancelBtn")}</h2>
          <div className="wh-drawer__meta">
            {stay.ref} · {dateShort(stay.arrive)} → {dateShort(stay.depart)}
          </div>
        </div>
      }
    >
      {/*
       * The 48-hour rule, said BEFORE the button rather than after it. A guest
       * who finds out afterwards that the deposit was kept is a guest who
       * telephones, and rightly.
       */}
      <div className={`wh-notice wh-notice--${clean ? "info" : "warn"}`}>
        <CircleAlert size={14} aria-hidden="true" />
        <span>
          {clean
            ? t("myres.cancelClean")
            : t("myres.cancelInside", { amount: money(deposit) })}
        </span>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <Button block onClick={confirmCancel}>
          {t("myres.cancelConfirm")}
        </Button>
        <Button tone="ghost" onClick={() => openCancel(null)}>
          {t("chrome.cancel")}
        </Button>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------- a night's moves */

export function NightDialog() {
  const { t } = useI18n();
  const day = useStore((s) => s.calDay);
  const stays = useStore((s) => s.stays);
  const setCalDay = useStore((s) => s.setCalDay);

  if (day === null) return null;
  const moves = movementsOn(stays, day);

  const list = (title: string, rows: typeof moves.arriving) => (
    <section className="wh-panel">
      <header className="wh-panel__head">
        <h2 className="wh-panel__title">{title}</h2>
        <span className="wh-panel__sub">{rows.length}</span>
      </header>
      {rows.length === 0 ? (
        <Empty title={t("calendar.nobody")} />
      ) : (
        rows.map((s) => (
          <div
            key={s.ref}
            className="wh-grid"
            style={{ "--cols": "1fr auto" } as React.CSSProperties}
          >
            <div>
              <div className="wh-folio__label">{fullName(s)}</div>
              <div className="wh-folio__meta">
                {typeName(typeById(s.type))} · {s.ref}
              </div>
            </div>
            <span className="wh-mono wh-folio__meta">
              {dateShort(s.arrive)} → {dateShort(s.depart)}
            </span>
          </div>
        ))
      )}
    </section>
  );

  return (
    <Sheet
      onClose={() => setCalDay(null)}
      label={dateWeekday(day)}
      head={
        <div>
          <h2 className="wh-drawer__title">{dateWeekday(day)}</h2>
          <div className="wh-drawer__meta">{t("calendar.night", { date: day })}</div>
        </div>
      }
    >
      {list(t("calendar.arrivingOn"), moves.arriving)}
      {list(t("calendar.leavingOn"), moves.leaving)}
    </Sheet>
  );
}

/* ---------------------------------------------------------------- toasts */

export function ToastLayer() {
  const toasts = useStore((s) => s.toasts);
  if (toasts.length === 0) return null;
  return (
    <div className="wh-toasts" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className="wh-toast">
          {toast.text}
        </div>
      ))}
    </div>
  );
}

/** Re-exported so the folio can share one balance helper with the overlays. */
export function balanceOf(ref: string, stays: ReturnType<typeof useStore.getState>["stays"]) {
  const stay = stays.find((s) => s.ref === ref);
  if (stay === undefined) return 0;
  const type = typeById(stay.type);
  if (type === null) return 0;
  return folioFor(stay, type, EXTRAS, TAX).balance;
}
