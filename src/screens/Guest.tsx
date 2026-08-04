/**
 * The guest's six views: the house, what is open, a room type, the reservation
 * form, the confirmation and the lookup.
 *
 * Two rules from the engine have to be VISIBLE here rather than merely obeyed.
 * The per-night breakdown on a results card must add up to the total beside it,
 * because rates differ by night and a flat rate times nights would be wrong.
 * And a search that breaks the length or Saturday rules gets a friendly inline
 * message naming the rule, not a disabled button with no explanation.
 */

import { useMemo } from "react";
import {
  BedDouble,
  CalendarCheck,
  CircleAlert,
  CircleCheck,
  Croissant,
  MapPin,
  Search,
} from "lucide-react";

import { useI18n } from "../i18n/index.tsx";
import {
  dateLong,
  dateShort,
  dateWeekday,
  guestsLabel,
  label as tLabel,
  leftLabel,
  money,
  money0,
  nightsLabel,
  tagLabel,
  typeName,
} from "../lib/format.ts";
import {
  cancellationIsFree,
  earliestFor,
  extraRows,
  folioFor,
  freeAcross,
  nightRows,
  nights,
  plusDays,
  roomTotal,
  round2,
  stayProblem,
} from "../lib/stay.ts";
import {
  ARRIVAL_TIMES,
  EXTRAS,
  LOOKUP_HINT,
  ROOM_TYPES,
  TAX,
  typeById,
  useStore,
} from "../state/store.ts";
import {
  Button,
  Chip,
  Empty,
  FEATURE_ICON,
  Field,
  Icon,
  Notice,
  Panel,
  Tile,
} from "../components/Primitives.tsx";

const TAX_PCT = `${Math.round(TAX * 100)}%`;

/* ------------------------------------------------------------ the search */

/** The stay search. Shared by the home hero and the results header. */
function StaySearch({ onGo }: { onGo: () => void }) {
  const { t } = useI18n();
  const search = useStore((s) => s.search);
  const setSearch = useStore((s) => s.setSearch);
  const now = useStore((s) => s.now);

  const n = nights(search.arrive, search.depart);
  const problem = stayProblem(search.arrive, search.depart);

  return (
    <div className="wh-search">
      <div className="wh-search__row">
        <Field label={t("home.arrive")}>
          <input
            className="wh-input wh-fld"
            type="date"
            value={search.arrive}
            min={now.date}
            onChange={(e) => setSearch({ arrive: e.target.value })}
          />
        </Field>
        <Field label={t("home.depart")}>
          <input
            className="wh-input wh-fld"
            type="date"
            value={search.depart}
            min={plusDays(search.arrive, 1)}
            onChange={(e) => setSearch({ depart: e.target.value })}
          />
        </Field>
        <Field label={t("home.guests")}>
          <select
            className="wh-select wh-fld"
            value={String(search.guests)}
            onChange={(e) => setSearch({ guests: Number(e.target.value) })}
          >
            {[1, 2, 3, 4].map((g) => (
              <option key={g} value={g}>
                {guestsLabel(g)}
              </option>
            ))}
          </select>
        </Field>
        <Button block disabled={n < 1} onClick={onGo}>
          <Search size={15} aria-hidden="true" />
          {t("home.go")}
        </Button>
      </div>

      <div className="wh-search__foot">
        <span className="wh-mono">{t("home.nights", { nights: nightsLabel(Math.max(0, n)) })}</span>
        <span>·</span>
        <span>{t("home.rule")}</span>
      </div>

      {problem !== null && (
        <div style={{ marginBlockStart: 12 }}>
          <Notice tone={problem === "saturday" ? "info" : "warn"} icon={<CircleAlert size={14} aria-hidden="true" />}>
            {problem === "saturday"
              ? t("results.satRule")
              : problem === "too-long"
                ? t("results.lenRule", { nights: nightsLabel(n) })
                : t("results.tooShort")}
          </Notice>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ home */

export function Home() {
  const { t } = useI18n();
  const go = useStore((s) => s.go);

  return (
    <section className="wh-guest wh-screen">
      <div className="wh-hero">
        <h1 className="wh-hero__name">{t("chrome.brand")}</h1>
        <p className="wh-hero__tag">{t("home.tagline")}</p>
      </div>

      <StaySearch onGo={() => go("results")} />

      <div className="wh-tri">
        <Panel title={t("home.house.title")}>
          <p className="wh-sub" style={{ margin: 0 }}>
            {t("home.house.body")}
          </p>
          <div style={{ marginBlockStart: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {ROOM_TYPES.map((type) => (
              <Tile key={type.id} type={type} size={44} />
            ))}
          </div>
        </Panel>
        <Panel title={t("home.breakfast.title")}>
          <p className="wh-sub" style={{ margin: 0 }}>
            {t("home.breakfast.body")}
          </p>
          <div style={{ marginBlockStart: 12 }}>
            <Chip tone="accent">
              <Croissant size={12} aria-hidden="true" />
              {tLabel("data.extra.breakfast", "Breakfast in the morning")}
            </Chip>
          </div>
        </Panel>
        <Panel title={t("home.find.title")}>
          <p className="wh-sub" style={{ margin: 0 }}>
            {t("home.find.body")}
          </p>
          <div style={{ marginBlockStart: 12 }}>
            <Button tone="ghost" size="sm" onClick={() => go("findus")}>
              <MapPin size={13} aria-hidden="true" />
              {t("chrome.nav.findus")}
            </Button>
          </div>
        </Panel>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- results */

export function Results() {
  const { t } = useI18n();
  const search = useStore((s) => s.search);
  const rooms = useStore((s) => s.rooms);
  const stays = useStore((s) => s.stays);
  const openRates = useStore((s) => s.openRates);
  const toggleRates = useStore((s) => s.toggleRates);
  const pickType = useStore((s) => s.pickType);
  const setSearch = useStore((s) => s.setSearch);
  const go = useStore((s) => s.go);

  const n = nights(search.arrive, search.depart);
  const problem = stayProblem(search.arrive, search.depart);

  const offers = useMemo(
    () =>
      ROOM_TYPES.map((type) => ({
        type,
        left: problem === null ? freeAcross(rooms, stays, type.id, search.arrive, search.depart) : 0,
        total: problem === null ? roomTotal(type, search.arrive, search.depart) : 0,
        rows: problem === null ? nightRows(type, search.arrive, search.depart) : [],
      })),
    [rooms, stays, search.arrive, search.depart, problem],
  );

  return (
    <section className="wh-guest wh-screen">
      <h1 className="wh-h1">{t("results.title")}</h1>
      <p className="wh-sub">
        {t("results.sub", {
          range: `${dateWeekday(search.arrive)} → ${dateWeekday(search.depart)}`,
          nights: nightsLabel(Math.max(0, n)),
          guests: guestsLabel(search.guests),
        })}
      </p>

      <StaySearch onGo={() => go("results")} />

      {problem === null && (
        <div className="wh-stack">
          {offers.map(({ type, left, total, rows }) => {
            const sellable = left > 0;
            const earliest = sellable
              ? null
              : earliestFor(rooms, stays, type.id, n, search.arrive);
            const showRates = openRates[type.id] === true;

            return (
              <div key={type.id} className="wh-panel wh-card">
                <div className="wh-offer">
                  <Tile type={type} size={92} icon={40} showCode />

                  <div className="wh-offer__body">
                    <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                      <h2 className="wh-panel__title" style={{ fontSize: 16 }}>
                        {typeName(type)}
                      </h2>
                      {sellable ? (
                        <Chip tone={left <= 2 ? "warn" : undefined}>{leftLabel(left)}</Chip>
                      ) : (
                        <Chip tone="danger">{t("results.soldOut")}</Chip>
                      )}
                    </div>
                    <p className="wh-sub" style={{ marginBlockStart: 4 }}>
                      {tLabel(type.blurbKey, type.blurb)}
                    </p>
                    <div className="wh-folio__meta" style={{ marginBlockStart: 6 }}>
                      {t("results.sleeps", { count: String(type.sleeps) })}
                    </div>

                    {!sellable && (
                      <div style={{ marginBlockStart: 12 }}>
                        {earliest === null ? (
                          <Notice tone="warn">{t("results.noEarliest")}</Notice>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <span className="wh-folio__meta">
                              {t("results.earliest", { date: dateWeekday(earliest) })}
                            </span>
                            <Button
                              tone="soft"
                              size="sm"
                              onClick={() =>
                                setSearch({
                                  arrive: earliest,
                                  depart: plusDays(earliest, Math.max(1, n)),
                                })
                              }
                            >
                              {t("results.earliestGo", { date: dateShort(earliest) })}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {sellable && (
                    <div className="wh-offer__price">
                      <div className="wh-offer__rate">{money0(rows[0]?.rate ?? type.base)}</div>
                      <div className="wh-folio__meta">{t("results.perNight")}</div>
                      <div className="wh-mono" style={{ marginBlockStart: 8, fontWeight: 700 }}>
                        {t("results.total", {
                          amount: money(total),
                          nights: nightsLabel(n),
                        })}
                      </div>
                      <div style={{ marginBlockStart: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <Button tone="ghost" size="sm" onClick={() => toggleRates(type.id)}>
                          {showRates ? t("results.hideRates") : t("results.seeRates")}
                        </Button>
                        <Button size="sm" onClick={() => pickType(type.id)}>
                          {t("results.reserve")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/*
                 * The per-night list. It VISIBLY SUMS to the total above it —
                 * rates differ by night, and a card whose breakdown does not
                 * add up is a card nobody trusts twice.
                 */}
                {sellable && showRates && (
                  <div className="wh-panel__body" style={{ paddingBlockStart: 0 }}>
                    <div className="wh-nightlist">
                      <div className="wh-folio__meta" style={{ marginBlockEnd: 6 }}>
                        {t("results.ratesNote")}
                      </div>
                      {rows.map((row) => (
                        <div key={row.night} className="wh-nightlist__row">
                          <span className="wh-mono">{dateWeekday(row.night)}</span>
                          {row.tags.map((tag) => (
                            <Chip key={tag} tone="info">
                              {tagLabel(tag)}
                            </Chip>
                          ))}
                          <span>{money(row.rate)}</span>
                        </div>
                      ))}
                      <div className="wh-nightlist__row wh-nightlist__sum">
                        <span>{nightsLabel(rows.length)}</span>
                        <span>{money(total)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* -------------------------------------------------------------- roomtype */

export function RoomTypePage() {
  const { t } = useI18n();
  const pickedType = useStore((s) => s.pickedType);
  const search = useStore((s) => s.search);
  const rooms = useStore((s) => s.rooms);
  const stays = useStore((s) => s.stays);
  const go = useStore((s) => s.go);

  const type = pickedType === null ? null : typeById(pickedType);
  if (type === null) return <Empty title={t("results.soldOut")} />;

  const n = nights(search.arrive, search.depart);
  const rows = nightRows(type, search.arrive, search.depart);
  const total = roomTotal(type, search.arrive, search.depart);
  const tax = round2(total * TAX);
  const left = freeAcross(rooms, stays, type.id, search.arrive, search.depart);

  return (
    <section className="wh-guest wh-screen">
      <Button tone="ghost" size="sm" onClick={() => go("results")}>
        {t("chrome.back")}
      </Button>

      <div style={{ marginBlockStart: 14, display: "flex", gap: 18, flexWrap: "wrap", alignItems: "flex-start" }}>
        <Tile type={type} size={160} icon={64} showCode />
        <div style={{ flex: 1, minInlineSize: 240 }}>
          <h1 className="wh-h1">{typeName(type)}</h1>
          <p className="wh-sub">{tLabel(type.longKey, type.long)}</p>
          <div style={{ display: "flex", gap: 8, marginBlockStart: 10, flexWrap: "wrap" }}>
            <Chip>{t("results.sleeps", { count: String(type.sleeps) })}</Chip>
            {left > 0 && <Chip tone={left <= 2 ? "warn" : "pos"}>{t("roomtype.left", { count: String(left) })}</Chip>}
          </div>
        </div>
      </div>

      <div style={{ marginBlockStart: 20 }}>
        <Panel title={t("roomtype.whatsIn")}>
          <div className="wh-features">
            {type.features.map((f) => (
              <span key={f} className="wh-feature">
                <Icon name={FEATURE_ICON[f] ?? "check"} size={14} />
                {tLabel(`data.feature.${f}`, f)}
              </span>
            ))}
          </div>
        </Panel>
      </div>

      <div style={{ marginBlockStart: 14 }}>
        <Panel title={t("roomtype.breakdown")} bodyless>
          <div className="wh-panel__body">
            {rows.map((row) => (
              <div key={row.night} className="wh-nightlist__row">
                <span className="wh-mono">{dateWeekday(row.night)}</span>
                {row.tags.map((tag) => (
                  <Chip key={tag} tone="info">
                    {tagLabel(tag)}
                  </Chip>
                ))}
                <span>{money(row.rate)}</span>
              </div>
            ))}
            {/* Taxes get their own line rather than being buried in the total. */}
            <div className="wh-nightlist__row" style={{ color: "var(--fg-muted)" }}>
              <span>{t("roomtype.taxes", { pct: TAX_PCT })}</span>
              <span>{money(tax)}</span>
            </div>
            <div className="wh-nightlist__row wh-nightlist__sum">
              <span>{t("roomtype.stayTotal", { nights: nightsLabel(n) })}</span>
              <span>{money(round2(total + tax))}</span>
            </div>
          </div>
        </Panel>
      </div>

      <div style={{ marginBlockStart: 16 }}>
        <Button block disabled={left <= 0} onClick={() => go("reserve")}>
          <CalendarCheck size={15} aria-hidden="true" />
          {t("roomtype.reserve")}
        </Button>
        {/* 21 D10a: never the obvious phrasing for a cancellation at no cost. */}
        <p className="wh-honest">{t("roomtype.cancelLine")}</p>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- reserve */

export function Reserve() {
  const { t } = useI18n();
  const pickedType = useStore((s) => s.pickedType);
  const search = useStore((s) => s.search);
  const form = useStore((s) => s.form);
  const setForm = useStore((s) => s.setForm);
  const reserve = useStore((s) => s.reserve);
  const now = useStore((s) => s.now);

  const type = pickedType === null ? null : typeById(pickedType);
  if (type === null) return <Empty title={t("results.soldOut")} />;

  const n = nights(search.arrive, search.depart);
  const rows = nightRows(type, search.arrive, search.depart);
  const room = roomTotal(type, search.arrive, search.depart);

  const chosen: string[] = [];
  if (form.breakfast) chosen.push("breakfast");
  if (form.parking) chosen.push("parking");
  if (form.late) chosen.push("late");
  const extras = extraRows(EXTRAS, chosen, search.guests, n);
  const extrasTotal = round2(extras.reduce((sum, e) => sum + e.amount, 0));

  const subtotal = round2(room + extrasTotal);
  const tax = round2(subtotal * TAX);
  const total = round2(subtotal + tax);
  const deposit = rows[0]?.rate ?? 0;

  const ready = form.first.trim() !== "" && form.last.trim() !== "";

  return (
    <section className="wh-guest wh-screen">
      <h1 className="wh-h1">{t("reserve.title")}</h1>
      <p className="wh-sub">
        {t("reserve.sub", {
          type: typeName(type),
          range: `${dateWeekday(search.arrive)} → ${dateWeekday(search.depart)}`,
          nights: nightsLabel(n),
        })}
      </p>

      <div style={{ marginBlockStart: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        <Panel title={t("reserve.title")}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Field label={t("reserve.first")}>
              <input
                className="wh-input wh-fld"
                value={form.first}
                onChange={(e) => setForm({ first: e.target.value })}
              />
            </Field>
            <Field label={t("reserve.last")}>
              <input
                className="wh-input wh-fld"
                value={form.last}
                onChange={(e) => setForm({ last: e.target.value })}
              />
            </Field>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBlockStart: 12 }}>
            <Field label={t("reserve.email")}>
              <input
                className="wh-input wh-fld"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ email: e.target.value })}
              />
            </Field>
            <Field label={t("reserve.mobile")}>
              <input
                className="wh-input wh-fld"
                value={form.mobile}
                onChange={(e) => setForm({ mobile: e.target.value })}
              />
            </Field>
          </div>

          <div style={{ marginBlockStart: 12 }}>
            <Field label={t("reserve.arrivalTime")}>
              <select
                className="wh-select wh-fld"
                value={form.arrivalTime}
                onChange={(e) => setForm({ arrivalTime: e.target.value })}
              >
                {ARRIVAL_TIMES.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </Field>
            <p className="wh-folio__meta" style={{ marginBlockStart: 6 }}>
              {t("reserve.arrivalHint", { from: now.arrivalsFrom })}
            </p>
          </div>

          <div style={{ marginBlockStart: 12 }}>
            <Field label={t("reserve.note")}>
              <textarea
                className="wh-textarea wh-fld"
                value={form.note}
                placeholder={t("reserve.notePlaceholder")}
                onChange={(e) => setForm({ note: e.target.value })}
              />
            </Field>
          </div>
        </Panel>

        {/* Extras as toggles, each saying HOW it is charged beside the amount. */}
        <Panel title={t("reserve.extras")}>
          {EXTRAS.map((extra) => {
            const on =
              extra.id === "breakfast"
                ? form.breakfast
                : extra.id === "parking"
                  ? form.parking
                  : form.late;
            const how =
              extra.per === "person-night"
                ? t("reserve.perPersonNight", { amount: money0(extra.amount) })
                : extra.per === "night"
                  ? t("reserve.perNight", { amount: money0(extra.amount) })
                  : t("reserve.perStay", { amount: money0(extra.amount) });
            return (
              <button
                key={extra.id}
                type="button"
                className="wh-grid wh-grid--row"
                style={{ "--cols": "28px 1fr auto" } as React.CSSProperties}
                aria-pressed={on}
                onClick={() =>
                  setForm(
                    extra.id === "breakfast"
                      ? { breakfast: !on }
                      : extra.id === "parking"
                        ? { parking: !on }
                        : { late: !on },
                  )
                }
              >
                <span className="wh-pick__tick" aria-hidden="true" style={{ inlineSize: 24, blockSize: 24 }}>
                  {on && <CircleCheck size={14} />}
                </span>
                <span>
                  <span className="wh-folio__label">{tLabel(extra.labelKey, extra.label)}</span>
                  <span className="wh-folio__meta" style={{ display: "block" }}>
                    {how}
                  </span>
                </span>
                <span className="wh-mono" style={{ fontWeight: 700 }}>
                  {on
                    ? money(extras.find((e) => e.id === extra.id)?.amount ?? 0)
                    : "—"}
                </span>
              </button>
            );
          })}
        </Panel>

        <Panel title={t("reserve.summary")}>
          <div className="wh-nightlist__row">
            <span>{t("reserve.room", { nights: nightsLabel(n), type: typeName(type) })}</span>
            <span>{money(room)}</span>
          </div>
          {extras.map((e) => (
            <div key={e.id} className="wh-nightlist__row">
              <span>{tLabel(e.labelKey, e.label)}</span>
              <span>{money(e.amount)}</span>
            </div>
          ))}
          <div className="wh-nightlist__row" style={{ color: "var(--fg-muted)" }}>
            <span>{t("roomtype.taxes", { pct: TAX_PCT })}</span>
            <span>{money(tax)}</span>
          </div>
          <div className="wh-nightlist__row wh-nightlist__sum">
            <span>{t("folio.total")}</span>
            <span>{money(total)}</span>
          </div>
          <div style={{ marginBlockStart: 12 }}>
            <Notice tone="info">{t("reserve.deposit")}</Notice>
          </div>
          <div className="wh-nightlist__row" style={{ marginBlockStart: 8 }}>
            <span>{t("reserve.takingNow")}</span>
            <span>{money(deposit)}</span>
          </div>
          <div className="wh-nightlist__row">
            <span>{t("reserve.onDeparture")}</span>
            <span>{money(round2(total - deposit))}</span>
          </div>
        </Panel>

        {/* The card sheet carries the storefront callout verbatim. */}
        <Panel title={t("reserve.card")}>
          <Notice tone="warn" icon={<CircleAlert size={14} aria-hidden="true" />}>
            {t("reserve.cardCallout")}
          </Notice>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBlockStart: 12 }}>
            <Field label={t("reserve.cardNumber")}>
              <input className="wh-input wh-input--num wh-fld" placeholder="4242 4242 4242 4242" readOnly />
            </Field>
            <Field label={t("reserve.cardExpiry")}>
              <input className="wh-input wh-input--num wh-fld" placeholder="04 / 29" readOnly />
            </Field>
            <Field label={t("reserve.cardCvc")}>
              <input className="wh-input wh-input--num wh-fld" placeholder="123" readOnly />
            </Field>
          </div>
        </Panel>

        {!ready && <Notice tone="warn">{t("reserve.missing")}</Notice>}

        <Button block disabled={!ready} onClick={reserve}>
          <BedDouble size={15} aria-hidden="true" />
          {t("reserve.confirm")}
        </Button>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- confirm */

export function Confirm() {
  const { t } = useI18n();
  const bookedRef = useStore((s) => s.bookedRef);
  const stays = useStore((s) => s.stays);
  const now = useStore((s) => s.now);
  const go = useStore((s) => s.go);

  const stay = stays.find((s) => s.ref === bookedRef);
  if (stay === undefined) return <Empty title={t("myres.notFound")} />;
  const type = typeById(stay.type);
  if (type === null) return null;

  const folio = folioFor(stay, type, EXTRAS, TAX);

  return (
    <section className="wh-guest wh-guest--narrow wh-screen" style={{ textAlign: "center" }}>
      <div style={{ color: "var(--pos)", display: "flex", justifyContent: "center" }}>
        <CircleCheck size={52} aria-hidden="true" />
      </div>
      <h1 className="wh-h1" style={{ marginBlockStart: 12 }}>
        {t("confirm.title")}
      </h1>
      <p className="wh-sub">{t("confirm.sub", { email: stay.email || "—" })}</p>

      <div style={{ marginBlockStart: 18, textAlign: "start" }}>
        <Panel>
          <div className="wh-kpi__label">{t("confirm.ref")}</div>
          <div className="wh-kpi__value" style={{ fontSize: 28 }}>
            {stay.ref}
          </div>

          <div className="wh-nightlist" style={{ marginBlockStart: 14 }}>
            <div className="wh-nightlist__row">
              <span>{t("confirm.arriving")}</span>
              <span>{dateLong(stay.arrive)}</span>
            </div>
            <div className="wh-nightlist__row">
              <span>{t("confirm.leaving")}</span>
              <span>{dateLong(stay.depart)}</span>
            </div>
            <div className="wh-nightlist__row">
              <span>{t("confirm.roomType")}</span>
              <span>{typeName(type)}</span>
            </div>
            <div className="wh-nightlist__row">
              <span>{nightsLabel(folio.nights.length)}</span>
              <span>{guestsLabel(stay.guests)}</span>
            </div>
          </div>

          <p className="wh-folio__meta" style={{ marginBlockStart: 10 }}>
            {t("confirm.window", { from: now.arrivalsFrom, time: stay.arrivalTime })}{" "}
            {t("confirm.leaveBy", { by: now.departBy })}
          </p>

          {/* A room type, never a room number — assignment happens at arrival. */}
          <div style={{ marginBlockStart: 12 }}>
            <Notice tone="info">{t("confirm.roomNote")}</Notice>
          </div>
        </Panel>

        <div style={{ marginBlockStart: 14 }}>
          <Panel title={t("confirm.breakdown")}>
            {folio.nights.map((row) => (
              <div key={row.night} className="wh-nightlist__row">
                <span className="wh-mono">{dateWeekday(row.night)}</span>
                <span>{money(row.rate)}</span>
              </div>
            ))}
            {folio.extras.map((e) => (
              <div key={e.id} className="wh-nightlist__row">
                <span>{tLabel(e.labelKey, e.label)}</span>
                <span>{money(e.amount)}</span>
              </div>
            ))}
            <div className="wh-nightlist__row" style={{ color: "var(--fg-muted)" }}>
              <span>{t("roomtype.taxes", { pct: TAX_PCT })}</span>
              <span>{money(folio.tax)}</span>
            </div>
            <div className="wh-nightlist__row wh-nightlist__sum">
              <span>{t("folio.total")}</span>
              <span>{money(folio.total)}</span>
            </div>
            <div className="wh-nightlist__row wh-nightlist__sum" style={{ color: "var(--accent)" }}>
              <span>{t("confirm.balance")}</span>
              <span>{money(folio.balance)}</span>
            </div>
          </Panel>
        </div>

        <p className="wh-honest">{t("confirm.lookupHint", { ref: stay.ref })}</p>

        <Button block tone="ghost" onClick={() => go("home")}>
          {t("confirm.done")}
        </Button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- my stay */

export function MyReservation() {
  const { t } = useI18n();
  const lookupRef = useStore((s) => s.lookupRef);
  const lookupSurname = useStore((s) => s.lookupSurname);
  const foundRef = useStore((s) => s.foundRef);
  const missed = useStore((s) => s.lookupMissed);
  const setLookupRef = useStore((s) => s.setLookupRef);
  const setLookupSurname = useStore((s) => s.setLookupSurname);
  const runLookup = useStore((s) => s.runLookup);
  const fillDemoLookup = useStore((s) => s.fillDemoLookup);
  const stays = useStore((s) => s.stays);
  const now = useStore((s) => s.now);
  const addExtraToStay = useStore((s) => s.addExtraToStay);
  const changeArrivalTime = useStore((s) => s.changeArrivalTime);
  const openCancel = useStore((s) => s.openCancel);

  const stay = stays.find((s) => s.ref === foundRef) ?? null;
  const type = stay === null ? null : typeById(stay.type);
  const folio = stay !== null && type !== null ? folioFor(stay, type, EXTRAS, TAX) : null;
  const clean = stay === null ? true : cancellationIsFree(now.date, stay.arrive);

  return (
    <section className="wh-guest wh-guest--narrow wh-screen">
      <h1 className="wh-h1">{t("myres.title")}</h1>
      <p className="wh-sub">{t("myres.sub")}</p>

      <div style={{ marginBlockStart: 18 }}>
        <Panel>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Field label={t("myres.ref")}>
              <input
                className="wh-input wh-fld wh-mono"
                value={lookupRef}
                onChange={(e) => setLookupRef(e.target.value)}
              />
            </Field>
            <Field label={t("myres.surname")}>
              <input
                className="wh-input wh-fld"
                value={lookupSurname}
                onChange={(e) => setLookupSurname(e.target.value)}
              />
            </Field>
          </div>
          <div style={{ display: "flex", gap: 10, marginBlockStart: 12, flexWrap: "wrap" }}>
            <Button onClick={runLookup}>
              <Search size={14} aria-hidden="true" />
              {t("myres.find")}
            </Button>
            {/* A tappable demo hint, so nobody has to invent a reference. */}
            <Button tone="ghost" size="sm" onClick={fillDemoLookup}>
              {t("myres.hint", { ref: LOOKUP_HINT.ref, surname: LOOKUP_HINT.surname })}
            </Button>
          </div>

          {missed && (
            <div style={{ marginBlockStart: 12 }}>
              <Notice tone="warn">{t("myres.notFound")}</Notice>
            </div>
          )}
        </Panel>
      </div>

      {stay !== null && type !== null && folio !== null && (
        <div style={{ marginBlockStart: 14, display: "flex", flexDirection: "column", gap: 14 }}>
          <Panel title={t("myres.yourStay")}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <Tile type={type} size={72} icon={32} />
              <div style={{ minInlineSize: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{typeName(type)}</div>
                <div className="wh-folio__meta">
                  {dateWeekday(stay.arrive)} → {dateWeekday(stay.depart)} ·{" "}
                  {nightsLabel(folio.nights.length)} · {guestsLabel(stay.guests)}
                </div>
                <div style={{ marginBlockStart: 8 }}>
                  <Chip tone={stay.status === "cancelled" ? "danger" : "accent"}>
                    {t(`chrome.stay.${stay.status}` as "chrome.stay.confirmed")}
                  </Chip>
                </div>
              </div>
              <div style={{ marginInlineStart: "auto", textAlign: "end" }}>
                <div className="wh-kpi__label">{t("confirm.balance")}</div>
                <div className="wh-mono" style={{ fontSize: 18, fontWeight: 700 }}>
                  {money(folio.balance)}
                </div>
              </div>
            </div>
          </Panel>

          {stay.status === "cancelled" ? (
            <Notice tone="danger">{t("myres.cancelled")}</Notice>
          ) : stay.status === "in_house" ? (
            <Notice tone="info">{t("myres.inHouse")}</Notice>
          ) : (
            <>
              <Panel title={t("myres.addExtra")}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {EXTRAS.filter((e) => !stay.extras.includes(e.id)).map((extra) => (
                    <Button
                      key={extra.id}
                      tone="ghost"
                      size="sm"
                      onClick={() => addExtraToStay(stay.ref, extra.id)}
                    >
                      <Icon name={extra.icon} size={13} />
                      {tLabel(extra.labelKey, extra.label)}
                    </Button>
                  ))}
                  {EXTRAS.every((e) => stay.extras.includes(e.id)) && (
                    <span className="wh-folio__meta">—</span>
                  )}
                </div>
              </Panel>

              <Panel title={t("myres.changeTime")}>
                <select
                  className="wh-select wh-fld"
                  value={stay.arrivalTime}
                  onChange={(e) => changeArrivalTime(stay.ref, e.target.value)}
                >
                  {ARRIVAL_TIMES.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </Panel>

              {/* The 48-hour consequence is stated before the button, never after. */}
              <Panel>
                <Notice tone={clean ? "info" : "warn"}>
                  {clean
                    ? t("roomtype.cancelLine")
                    : t("myres.cancelInside", { amount: money(folio.deposit) })}
                </Notice>
                <div style={{ marginBlockStart: 12 }}>
                  <Button tone="ghost" block onClick={() => openCancel(stay.ref)}>
                    {t("myres.cancelBtn")}
                  </Button>
                </div>
              </Panel>
            </>
          )}
        </div>
      )}
    </section>
  );
}

/* ----------------------------------------------------------------- rooms */

export function Rooms() {
  const { t } = useI18n();
  const rooms = useStore((s) => s.rooms);
  const pickType = useStore((s) => s.pickType);

  return (
    <section className="wh-guest wh-screen">
      <h1 className="wh-h1">{t("rooms.title")}</h1>
      <p className="wh-sub">{t("rooms.sub")}</p>

      <div className="wh-stack">
        {ROOM_TYPES.map((type) => {
          const count = rooms.filter((r) => r.type === type.id).length;
          return (
            <div key={type.id} className="wh-panel wh-card">
              <div className="wh-offer">
                <Tile type={type} size={92} icon={40} showCode />
                <div className="wh-offer__body">
                  <h2 className="wh-panel__title" style={{ fontSize: 16 }}>
                    {typeName(type)}
                  </h2>
                  <p className="wh-sub" style={{ marginBlockStart: 4 }}>
                    {tLabel(type.longKey, type.long)}
                  </p>
                  <div style={{ display: "flex", gap: 8, marginBlockStart: 10, flexWrap: "wrap" }}>
                    <Chip>{t("rooms.count", { count: String(count) })}</Chip>
                    <Chip>{t("results.sleeps", { count: String(type.sleeps) })}</Chip>
                  </div>
                </div>
                <div className="wh-offer__price">
                  <div className="wh-folio__meta">{t("rooms.from", { amount: money0(type.base) })}</div>
                  <div style={{ marginBlockStart: 10 }}>
                    <Button size="sm" onClick={() => pickType(type.id)}>
                      {t("rooms.see")}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- findus */

export function FindUs() {
  const { t } = useI18n();
  const go = useStore((s) => s.go);

  return (
    <section className="wh-guest wh-guest--narrow wh-screen">
      <h1 className="wh-h1">{t("findus.title")}</h1>
      <p className="wh-sub">{t("findus.sub")}</p>

      <div style={{ marginBlockStart: 18 }}>
        <div
          className="wh-hero"
          style={{ minBlockSize: 180, display: "grid", placeItems: "center", paddingBlock: 40 }}
        >
          <MapPin size={52} aria-hidden="true" />
        </div>
        <p className="wh-sub" style={{ marginBlockStart: 16 }}>
          {t("findus.body")}
        </p>
        <div style={{ marginBlockStart: 16 }}>
          <Button tone="ghost" onClick={() => go("home")}>
            {t("findus.back")}
          </Button>
        </div>
      </div>
    </section>
  );
}
