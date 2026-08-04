/**
 * The front desk's five views: the day, the rack, the calendar, the book and a
 * folio.
 *
 * Three rules from the engine are load-bearing on these screens.
 *
 *   • The Today board is what is LEFT TO DO, not what was booked: somebody
 *     already checked in this morning belongs under In house.
 *   • The rack is the whole of housekeeping — a status and a "mark ready", never
 *     a work queue (21 D13).
 *   • Check-out is refused while a balance is outstanding, with the amount
 *     named. Not a silently disabled button: the guest is standing there.
 */

import {
  BedDouble,
  Banknote,
  CircleAlert,
  CircleCheck,
  LogIn,
  LogOut,
  Plus,
} from "lucide-react";

import type { RoomStatus } from "../data/types.ts";
import { useI18n } from "../i18n/index.tsx";
import {
  dateFull,
  dateShort,
  dateWeekday,
  dayNumber,
  guestsLabel,
  label as tLabel,
  methodLabel,
  money,
  money0,
  nightOfLabel,
  nightsLabel,
  pctWhole,
  phaseLabel,
  roomStatusLabel,
  signedMoney,
  stayStatusLabel,
  typeName,
  weekdayShort,
} from "../lib/format.ts";
import {
  calendarRow,
  checkPayment,
  checkoutBlock,
  dayBoard,
  folioFor,
  isLive,
  nightOfStay,
  nights,
  occupancyOn,
  plusDays,
  round2,
} from "../lib/stay.ts";
import {
  CHARGES,
  EXTRAS,
  ROOM_TYPES,
  TAX,
  clockNow,
  fullName,
  typeById,
  useStore,
} from "../state/store.ts";
import {
  Button,
  Chip,
  Empty,
  Field,
  Filter,
  Icon,
  Kpi,
  Mono,
  Notice,
  Panel,
  Tile,
} from "../components/Primitives.tsx";

const TAX_PCT = `${Math.round(TAX * 100)}%`;

/* ----------------------------------------------------------------- today */

export function Today() {
  const { t } = useI18n();
  const stays = useStore((s) => s.stays);
  const rooms = useStore((s) => s.rooms);
  const now = useStore((s) => s.now);
  const phase = useStore((s) => s.phase);
  const openCheckin = useStore((s) => s.openCheckin);
  const openFolio = useStore((s) => s.openFolio);
  const go = useStore((s) => s.go);

  const board = dayBoard(stays, now.date);
  const occ = occupancyOn(rooms, stays, ROOM_TYPES, now.date);

  const folioOf = (ref: string) => {
    const stay = stays.find((s) => s.ref === ref);
    const type = stay === undefined ? null : typeById(stay.type);
    return stay !== undefined && type !== null ? folioFor(stay, type, EXTRAS, TAX) : null;
  };

  const openTheFolio = (ref: string) => {
    openFolio(ref);
    go("folio");
  };

  return (
    <section className="wh-view wh-screen">
      <div className="wh-screen__head">
        <div>
          <h1 className="wh-h1">{t("today.title")}</h1>
          <p className="wh-sub">
            {t("today.sub", {
              date: dateFull(now.date),
              time: clockNow(now, phase),
              phase: phaseLabel(phase),
            })}
          </p>
        </div>
        <div className="wh-kpis">
          <Kpi label={t("today.kpi.occ")} value={pctWhole(occ.pct)} tone="pos" />
          <Kpi
            label={t("today.kpi.sold")}
            value={occ.sold}
            hint={t("today.soldOf", { count: String(occ.sellable) })}
          />
          <Kpi label={t("today.kpi.arrivals")} value={board.arriving.length} />
          <Kpi label={t("today.kpi.departures")} value={board.leaving.length} tone="warn" />
          <Kpi
            label={t("today.kpi.rate")}
            value={occ.averageRate === null ? "—" : money0(occ.averageRate)}
          />
        </div>
      </div>

      <div className="wh-board">
        {/* --- arriving --- */}
        <div className="wh-board__col">
          <div className="wh-board__head">
            <span>{t("today.arriving")}</span>
            <span className="wh-board__count">{board.arriving.length}</span>
          </div>
          {board.arriving.length === 0 && <Empty title={t("today.none")} />}
          {board.arriving.map((stay) => (
            <div key={stay.ref} className="wh-guestcard wh-card">
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <Tile type={typeById(stay.type)} size={38} icon={18} />
                <div style={{ minInlineSize: 0, flex: 1 }}>
                  <div className="wh-guestcard__name">{fullName(stay)}</div>
                  <div className="wh-guestcard__meta">
                    {typeName(typeById(stay.type))} ·{" "}
                    {nightsLabel(nights(stay.arrive, stay.depart))}
                  </div>
                  <Mono className="wh-guestcard__meta">
                    {stay.ref} · {t("today.expected", { time: stay.arrivalTime })}
                  </Mono>
                </div>
              </div>
              {stay.noteKey !== null && (
                <div style={{ marginBlockStart: 9 }}>
                  <Notice tone="warn" icon={<CircleAlert size={13} aria-hidden="true" />}>
                    {tLabel(stay.noteKey, stay.note)}
                  </Notice>
                </div>
              )}
              <div style={{ marginBlockStart: 10 }}>
                <Button block onClick={() => openCheckin(stay.ref)}>
                  <LogIn size={14} aria-hidden="true" />
                  {t("today.checkIn")}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* --- in house --- */}
        <div className="wh-board__col">
          <div className="wh-board__head">
            <span>{t("today.inhouse")}</span>
            <span className="wh-board__count">{board.inHouse.length}</span>
          </div>
          {board.inHouse.length === 0 && <Empty title={t("today.none")} />}
          {board.inHouse.map((stay) => {
            const folio = folioOf(stay.ref);
            const night = nightOfStay(stay, now.date);
            return (
              <button
                key={stay.ref}
                type="button"
                className="wh-guestcard wh-card"
                style={{ textAlign: "start", inlineSize: "100%" }}
                onClick={() => openTheFolio(stay.ref)}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <Tile type={typeById(stay.type)} size={38} icon={18} />
                  <div style={{ minInlineSize: 0, flex: 1 }}>
                    <div className="wh-guestcard__name">{fullName(stay)}</div>
                    <div className="wh-guestcard__meta">
                      {t("today.room", { room: String(stay.room ?? "—") })} ·{" "}
                      {nightOfLabel(night.current, night.total)}
                    </div>
                  </div>
                  <Mono style={{ fontWeight: 700 }}>
                    {folio === null ? "—" : money(folio.balance)}
                  </Mono>
                </div>
              </button>
            );
          })}
        </div>

        {/* --- leaving --- */}
        <div className="wh-board__col">
          <div className="wh-board__head">
            <span>{t("today.leaving")}</span>
            <span className="wh-board__count">{board.leaving.length}</span>
          </div>
          {board.leaving.length === 0 && <Empty title={t("today.none")} />}
          {board.leaving.map((stay) => {
            const folio = folioOf(stay.ref);
            const blocked = folio !== null && checkoutBlock(folio.balance).blocked;
            return (
              <div key={stay.ref} className="wh-guestcard wh-card">
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <Tile type={typeById(stay.type)} size={38} icon={18} />
                  <div style={{ minInlineSize: 0, flex: 1 }}>
                    <div className="wh-guestcard__name">{fullName(stay)}</div>
                    <div className="wh-guestcard__meta">
                      {t("today.room", { room: String(stay.room ?? "—") })} ·{" "}
                      {t("today.due", { by: now.departBy })}
                    </div>
                  </div>
                </div>
                <div style={{ marginBlockStart: 9 }}>
                  {blocked ? (
                    <Chip tone="danger">
                      {t("today.balance", { amount: money(folio.balance) })}
                    </Chip>
                  ) : (
                    <Chip tone="pos">{t("today.settled")}</Chip>
                  )}
                </div>
                <div style={{ marginBlockStart: 10 }}>
                  <Button
                    block
                    tone={blocked ? "warn" : "accent"}
                    onClick={() => openTheFolio(stay.ref)}
                  >
                    <LogOut size={14} aria-hidden="true" />
                    {t("today.checkOut")}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ rack */

const STATUS_ORDER: RoomStatus[] = ["ready", "occupied", "cleaning", "oos"];

export function Rack() {
  const { t } = useI18n();
  const rooms = useStore((s) => s.rooms);
  const markReady = useStore((s) => s.markReady);

  const floors = [...new Set(rooms.map((r) => r.floor))].sort((a, b) => a - b);
  const counts = STATUS_ORDER.map((status) => ({
    status,
    count: rooms.filter((r) => r.status === status).length,
  }));

  return (
    <section className="wh-view wh-screen">
      <h1 className="wh-h1">{t("rack.title")}</h1>
      <p className="wh-sub">{t("rack.sub")}</p>

      {/* The legend, with a live count per status. */}
      <div className="wh-filters" style={{ marginBlockStart: 14 }}>
        <span className="wh-kpi__label">{t("rack.legend")}</span>
        {counts.map(({ status, count }) => (
          <Chip
            key={status}
            tone={
              status === "ready"
                ? "pos"
                : status === "occupied"
                  ? "accent"
                  : status === "cleaning"
                    ? "warn"
                    : undefined
            }
          >
            {roomStatusLabel(status)} · {count}
          </Chip>
        ))}
      </div>

      {floors.map((floor) => (
        <div key={floor} className="wh-rack__floor">
          <div className="wh-kpi__label">{t("rack.floor", { floor: String(floor) })}</div>
          <div className="wh-rack__grid">
            {rooms
              .filter((r) => r.floor === floor)
              .map((room) => {
                const type = typeById(room.type);
                return (
                  <div key={room.number} className={`wh-roomtile wh-roomtile--${room.status}`}>
                    <span className="wh-roomtile__n">{room.number}</span>
                    <span
                      className="wh-roomtile__type"
                      style={{
                        background: type === null ? "var(--border)" : type.from,
                      }}
                      title={typeName(type)}
                    />
                    <span className="wh-roomtile__status">{roomStatusLabel(room.status)}</span>
                    {room.noteKey !== null && (
                      <span className="wh-roomtile__note">{tLabel(room.noteKey, "")}</span>
                    )}
                    {room.status === "cleaning" && (
                      <div style={{ marginBlockStart: 6 }}>
                        <Button size="sm" tone="ghost" onClick={() => markReady(room.number)}>
                          {t("rack.markReady")}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </section>
  );
}

/* -------------------------------------------------------------- calendar */

export function Calendar() {
  const { t } = useI18n();
  const rooms = useStore((s) => s.rooms);
  const stays = useStore((s) => s.stays);
  const now = useStore((s) => s.now);
  const setCalDay = useStore((s) => s.setCalDay);

  const days = 14;
  const nightsList = Array.from({ length: days }, (_, i) => plusDays(now.date, i));

  return (
    <section className="wh-view wh-screen">
      <h1 className="wh-h1">{t("calendar.title")}</h1>
      <p className="wh-sub">{t("calendar.sub")}</p>

      <div className="wh-panel wh-cal" style={{ marginBlockStart: 16, padding: 14 }}>
        <div className="wh-cal__grid">
          <div />
          {nightsList.map((night) => (
            <div key={night} className="wh-cal__head">
              <div>{weekdayShort(night)}</div>
              <div className="wh-mono">{dayNumber(night)}</div>
            </div>
          ))}

          {ROOM_TYPES.map((type) => {
            const row = calendarRow(rooms, stays, type.id, now.date, days);
            return (
              <div key={type.id} className="wh-cal__row">
                <div className="wh-cal__label">
                  <Tile type={type} size={24} icon={12} />
                  {typeName(type)}
                </div>
                {row.map((cell) => (
                  <button
                    key={cell.night}
                    type="button"
                    className={`wh-cal__cell wh-btn${cell.full ? " wh-cal__cell--full" : ""}`}
                    style={
                      cell.full
                        ? undefined
                        : {
                            /* Denser as it fills, so a busy week reads at a glance. */
                            background: `color-mix(in srgb, var(--accent) ${Math.round(cell.pct * 0.35)}%, var(--surface))`,
                          }
                    }
                    onClick={() => setCalDay(cell.night)}
                    title={t("calendar.soldOf", {
                      sold: String(cell.sold),
                      available: String(cell.available),
                    })}
                  >
                    {/* House layout rule 4 — the mark has its own gutter. */}
                    {cell.full && <span className="wh-cal__mark">{t("calendar.full")}</span>}
                    {cell.sold}/{cell.available}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- reservations */

const RES_COLS = "110px minmax(140px,1.4fr) minmax(120px,1fr) 150px 70px auto";

export function Reservations() {
  const { t } = useI18n();
  const stays = useStore((s) => s.stays);
  const now = useStore((s) => s.now);
  const filter = useStore((s) => s.resFilter);
  const setResFilter = useStore((s) => s.setResFilter);
  const openFolio = useStore((s) => s.openFolio);
  const go = useStore((s) => s.go);

  const rows = stays.filter((s) => {
    if (filter === "all") return true;
    if (filter === "arriving") return s.arrive === now.date && isLive(s) && s.status !== "in_house";
    if (filter === "inhouse") return s.status === "in_house";
    if (filter === "leaving") return s.depart === now.date && s.status === "in_house";
    return isLive(s) && s.arrive > now.date;
  });

  const filters: State["resFilter"][] = ["all", "arriving", "inhouse", "leaving", "upcoming"];

  return (
    <section className="wh-view wh-screen">
      <h1 className="wh-h1">{t("reservations.title")}</h1>
      <p className="wh-sub">{t("reservations.sub")}</p>

      <div className="wh-filters" style={{ marginBlock: "16px 12px" }}>
        {filters.map((f) => (
          <Filter key={f} pressed={filter === f} onClick={() => setResFilter(f)}>
            {t(`reservations.filter.${f}` as "reservations.filter.all")}
          </Filter>
        ))}
      </div>

      <div className="wh-panel" style={{ overflow: "hidden" }}>
        <div className="wh-grid wh-grid--head" style={{ "--cols": RES_COLS } as React.CSSProperties}>
          <div>{t("reservations.col.ref")}</div>
          <div>{t("reservations.col.guest")}</div>
          <div>{t("reservations.col.type")}</div>
          <div>{t("reservations.col.dates")}</div>
          <div style={{ textAlign: "end" }}>{t("reservations.col.nights")}</div>
          <div style={{ textAlign: "end" }}>{t("reservations.col.status")}</div>
        </div>

        {rows.length === 0 && <Empty title={t("reservations.none")} />}

        {rows.map((stay) => (
          <button
            key={stay.ref}
            type="button"
            className="wh-grid wh-grid--row wh-grid--collapse"
            style={{ "--cols": RES_COLS } as React.CSSProperties}
            aria-label={t("reservations.open")}
            onClick={() => {
              openFolio(stay.ref);
              go("folio");
            }}
          >
            <Mono style={{ fontWeight: 700, fontSize: 12.5 }}>{stay.ref}</Mono>
            <div className="wh-folio__label">{fullName(stay)}</div>
            <div className="wh-folio__meta">{typeName(typeById(stay.type))}</div>
            <Mono className="wh-folio__meta">
              {dateShort(stay.arrive)} → {dateShort(stay.depart)}
            </Mono>
            <div className="wh-num">{nights(stay.arrive, stay.depart)}</div>
            <div className="wh-span" style={{ textAlign: "end" }}>
              <Chip
                tone={
                  stay.status === "in_house"
                    ? "accent"
                    : stay.status === "cancelled"
                      ? "danger"
                      : stay.status === "departed"
                        ? "pos"
                        : "info"
                }
              >
                {stayStatusLabel(stay.status)}
              </Chip>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

/** Local alias so the filter list above stays readable. */
type State = { resFilter: "all" | "arriving" | "inhouse" | "leaving" | "upcoming" };

/* ----------------------------------------------------------------- folio */

export function Folio() {
  const { t } = useI18n();
  const ref = useStore((s) => s.folioRef);
  const stays = useStore((s) => s.stays);
  const chargeOpen = useStore((s) => s.chargeOpen);
  const chargeKind = useStore((s) => s.chargeKind);
  const chargeAmount = useStore((s) => s.chargeAmount);
  const settleOpen = useStore((s) => s.settleOpen);
  const settleAmount = useStore((s) => s.settleAmount);
  const settleMethod = useStore((s) => s.settleMethod);
  const setChargeOpen = useStore((s) => s.setChargeOpen);
  const setChargeKind = useStore((s) => s.setChargeKind);
  const setChargeAmount = useStore((s) => s.setChargeAmount);
  const addCharge = useStore((s) => s.addCharge);
  const setSettleOpen = useStore((s) => s.setSettleOpen);
  const setSettleAmount = useStore((s) => s.setSettleAmount);
  const setSettleMethod = useStore((s) => s.setSettleMethod);
  const settle = useStore((s) => s.settle);
  const checkOut = useStore((s) => s.checkOut);
  const go = useStore((s) => s.go);

  const stay = stays.find((s) => s.ref === ref) ?? null;
  if (stay === null) return <Empty title={t("reservations.none")} />;
  const type = typeById(stay.type);
  if (type === null) return null;

  const folio = folioFor(stay, type, EXTRAS, TAX);
  const block = checkoutBlock(folio.balance);
  const want = round2(Number.parseFloat(settleAmount || "0") || 0);
  const check = checkPayment(want, folio.balance);

  /* A running balance down the right, the way an account is read. */
  let running = 0;

  return (
    <section className="wh-view wh-screen" style={{ maxInlineSize: 900 }}>
      <Button tone="ghost" size="sm" onClick={() => go("today")}>
        {t("folio.back")}
      </Button>

      <div className="wh-screen__head" style={{ marginBlockStart: 14 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <Tile type={type} size={56} icon={26} />
          <div>
            <h1 className="wh-h1">{fullName(stay)}</h1>
            <Mono className="wh-sub">
              {t("folio.sub", { name: typeName(type), ref: stay.ref })}
            </Mono>
            <div style={{ marginBlockStart: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Chip tone={stay.status === "in_house" ? "accent" : "info"}>
                {stayStatusLabel(stay.status)}
              </Chip>
              {stay.room !== null && (
                <Chip>{t("today.room", { room: String(stay.room) })}</Chip>
              )}
              <Chip>{guestsLabel(stay.guests)}</Chip>
            </div>
          </div>
        </div>
        <div className="wh-kpis">
          <Kpi label={t("folio.total")} value={money(folio.total)} />
          <Kpi
            label={t("folio.balance")}
            value={money(folio.balance)}
            tone={block.blocked ? "warn" : "pos"}
          />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Panel title={t("folio.nightsHead")} bodyless>
          {folio.nights.map((row) => {
            running = round2(running + row.rate);
            return (
              <div key={row.night} className="wh-folio__row">
                <BedDouble size={15} aria-hidden="true" />
                <div>
                  <div className="wh-folio__label">
                    {t("folio.night", {
                      n: String(row.index),
                      date: dateWeekday(row.night),
                      type: typeName(type),
                    })}
                  </div>
                </div>
                <Mono className="wh-num">{money(row.rate)}</Mono>
                <Mono className="wh-num wh-num--muted wh-folio__balance">{money(running)}</Mono>
              </div>
            );
          })}

          {folio.extras.length > 0 && (
            <div className="wh-grid wh-grid--head" style={{ "--cols": "1fr" } as React.CSSProperties}>
              {t("folio.extrasHead")}
            </div>
          )}
          {folio.extras.map((e) => {
            running = round2(running + e.amount);
            return (
              <div key={e.id} className="wh-folio__row">
                <Icon name={e.icon} size={15} />
                <div>
                  <div className="wh-folio__label">{tLabel(e.labelKey, e.label)}</div>
                  <div className="wh-folio__meta">
                    {dateShort(stay.arrive)} → {dateShort(stay.depart)}
                  </div>
                </div>
                <Mono className="wh-num">{money(e.amount)}</Mono>
                <Mono className="wh-num wh-num--muted wh-folio__balance">{money(running)}</Mono>
              </div>
            );
          })}

          {folio.charges.length > 0 && (
            <div className="wh-grid wh-grid--head" style={{ "--cols": "1fr" } as React.CSSProperties}>
              {t("folio.chargesHead")}
            </div>
          )}
          {folio.charges.map((c, i) => {
            running = round2(running + c.amount);
            return (
              <div key={`${c.kind}-${i}`} className="wh-folio__row">
                <Plus size={15} aria-hidden="true" />
                <div>
                  <div className="wh-folio__label">{tLabel(c.labelKey, c.label)}</div>
                  <div className="wh-folio__meta">{dateShort(c.date)}</div>
                </div>
                <Mono className="wh-num">{money(c.amount)}</Mono>
                <Mono className="wh-num wh-num--muted wh-folio__balance">{money(running)}</Mono>
              </div>
            );
          })}

          <div className="wh-totals">
            <div className="wh-totals__row">
              <span>{t("folio.subtotal")}</span>
              <Mono>{money(folio.subtotal)}</Mono>
            </div>
            <div className="wh-totals__row">
              <span>{t("folio.tax", { pct: TAX_PCT })}</span>
              <Mono>{money(folio.tax)}</Mono>
            </div>
            <div className="wh-totals__row wh-totals__row--grand">
              <span>{t("folio.total")}</span>
              <Mono>{money(folio.total)}</Mono>
            </div>
          </div>
        </Panel>

        <Panel title={t("folio.paymentsHead")} bodyless>
          {folio.payments.map((p, i) => (
            <div key={`${p.date}-${i}`} className="wh-folio__row">
              <Banknote size={15} aria-hidden="true" style={{ color: "var(--pos)" }} />
              <div>
                <div className="wh-folio__label">{tLabel(p.labelKey, p.label)}</div>
                <div className="wh-folio__meta">
                  {dateShort(p.date)} · {methodLabel(p.method)}
                </div>
              </div>
              <Mono className="wh-num" style={{ color: "var(--pos)" }}>
                {signedMoney(-p.amount)}
              </Mono>
              <Mono className="wh-num wh-num--muted wh-folio__balance">
                {money(round2(folio.total - folio.payments.slice(0, i + 1).reduce((s, x) => s + x.amount, 0)))}
              </Mono>
            </div>
          ))}

          <div className="wh-panel__body">
            {folio.balance <= 0.005 ? (
              <Notice tone="pos" icon={<CircleCheck size={15} aria-hidden="true" />}>
                {t("folio.settledFull")}
              </Notice>
            ) : (
              <div className="wh-totals__row wh-totals__row--grand" style={{ borderBlockStart: 0 }}>
                <span>{t("folio.balance")}</span>
                <Mono>{money(folio.balance)}</Mono>
              </div>
            )}

            {/* --- add a charge --- */}
            {chargeOpen && (
              <div
                style={{
                  marginBlockStart: 12,
                  padding: 13,
                  border: "1px solid var(--border-strong)",
                  borderRadius: 11,
                  background: "var(--surface-2)",
                }}
              >
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Field label={t("folio.addPick")}>
                    <select
                      className="wh-select wh-fld"
                      value={chargeKind}
                      onChange={(e) => setChargeKind(e.target.value)}
                    >
                      {CHARGES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {tLabel(c.labelKey, c.label)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={t("folio.addAmount")}>
                    <input
                      className="wh-input wh-input--num wh-fld"
                      inputMode="decimal"
                      value={chargeAmount}
                      onChange={(e) => setChargeAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                    />
                  </Field>
                </div>
                <div style={{ display: "flex", gap: 9, marginBlockStart: 11 }}>
                  <Button block onClick={addCharge}>
                    {t("folio.addBtn")}
                  </Button>
                  <Button tone="ghost" onClick={() => setChargeOpen(false)}>
                    {t("chrome.cancel")}
                  </Button>
                </div>
              </div>
            )}

            {/* --- take a payment --- */}
            {settleOpen && (
              <div
                style={{
                  marginBlockStart: 12,
                  padding: 13,
                  border: "1px solid var(--border-strong)",
                  borderRadius: 11,
                  background: "var(--surface-2)",
                }}
              >
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Field label={t("folio.amount")}>
                    <input
                      className="wh-input wh-input--num wh-fld"
                      inputMode="decimal"
                      value={settleAmount}
                      onChange={(e) => setSettleAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                    />
                  </Field>
                  <Field label={t("folio.method")}>
                    <select
                      className="wh-select wh-fld"
                      value={settleMethod}
                      onChange={(e) =>
                        setSettleMethod(e.target.value as "card" | "cash" | "transfer")
                      }
                    >
                      <option value="card">{methodLabel("card")}</option>
                      <option value="cash">{methodLabel("cash")}</option>
                      <option value="transfer">{methodLabel("transfer")}</option>
                    </select>
                  </Field>
                </div>

                {/* Partials are welcome; overpayment names the excess. */}
                {check.over > 0 && (
                  <div style={{ marginBlockStart: 10 }}>
                    <Notice tone="danger">
                      {t("folio.over", {
                        over: money(check.over),
                        balance: money(folio.balance),
                      })}
                    </Notice>
                  </div>
                )}

                <div style={{ display: "flex", gap: 9, marginBlockStart: 11 }}>
                  <Button block disabled={!check.ok} onClick={settle}>
                    {t("folio.record")}
                  </Button>
                  <Button tone="ghost" onClick={() => setSettleOpen(false)}>
                    {t("chrome.cancel")}
                  </Button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginBlockStart: 14, flexWrap: "wrap" }}>
              <Button tone="ghost" onClick={() => setChargeOpen(true)}>
                <Plus size={14} aria-hidden="true" />
                {t("folio.addCharge")}
              </Button>
              {folio.balance > 0.005 && (
                <Button
                  tone="soft"
                  onClick={() => {
                    setSettleAmount(folio.balance.toFixed(2));
                    setSettleOpen(true);
                  }}
                >
                  <Banknote size={14} aria-hidden="true" />
                  {t("folio.settle")}
                </Button>
              )}
            </div>
          </div>
        </Panel>

        {/*
         * Check-out. Refused while a balance is outstanding, with the amount
         * named — the guest is standing at the desk and somebody has to be able
         * to say why, so the reason is written out beside the disabled button.
         */}
        {stay.status === "in_house" && (
          <div>
            {block.blocked && (
              <Notice tone="warn" icon={<CircleAlert size={14} aria-hidden="true" />}>
                {t("folio.blocked", { amount: money(block.outstanding) })}
              </Notice>
            )}
            <div style={{ marginBlockStart: 10 }}>
              <Button block disabled={block.blocked} onClick={() => checkOut(stay.ref)}>
                <LogOut size={15} aria-hidden="true" />
                {t("folio.checkOut")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
