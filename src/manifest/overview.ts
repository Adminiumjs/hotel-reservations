/**
 * The Overview page's layout: the house at a glance, drawn by Adminium's own
 * widgets from the app's tables. Nothing on it is typed in — every figure is
 * a stored row, counted or summed where Adminium runs the query, on the
 * house's clock.
 *
 * What the words mean, once:
 *   - "in house" is a stay checked in and not yet checked out;
 *   - "arriving today" is a stay whose first night is tonight, booked or
 *     already checked in; "leaving today" one whose last morning is today,
 *     still in the house or gone;
 *   - "on guests' accounts" is what the guests in the house have not paid yet,
 *     for their whole stays;
 *   - "money recorded" is every payment recorded this month, less what was
 *     given back — money in hand, not what the rooms earned;
 *   - a late cancellation is the guest's own, made after the cancel-by moment;
 *     a cancellation by the house is never one.
 *
 * A card's title is written in every language the app speaks; money is shown
 * in the connection's currency.
 */
import { l, type Labels } from "./labels.ts";

type Json = Record<string, unknown>;

const query = (rest: Json): Json => ({ kind: "table-query", source: { name: "stays", type: "table" }, ...rest });
const metric = (aggregation: Json, rest: Json): Json => query({ shape: "metric+delta", aggregations: [aggregation], ...rest });

const count = (alias: string): Json => ({ fn: "count", alias });
const sum = (column: string, alias: string): Json => ({ fn: "sum", column, alias });
const eq = (column: string, value: unknown): Json => ({ column, op: "eq", value });
const oneOf = (column: string, value: string[]): Json => ({ column, op: "in", value });

/** Today, on the house's calendar. */
const today = (column: string): Json => ({ column, last: 1, unit: "day", calendar: true });
/** This month, on the house's calendar. */
const month = (column: string): Json => ({ column, last: 1, unit: "month", calendar: true });
/** The eight weeks ending this one. */
const weeks = (column: string): Json => ({ column, last: 8, unit: "week", calendar: true });

const COUNT = { metricFormat: "plain", deltaMode: "none", showSparkline: false };
const MONEY = { metricFormat: "currency", deltaMode: "none", showSparkline: false };

type Place = [x: number, y: number, w: number, h: number];

/** A card's words beside its title, each in every language the app speaks. */
interface Words {
  subtitle?: string;
  caption?: string;
  empty?: string;
}

function card(i: string, widget: string, [x, y, w, h]: Place, en: string, config: Json, words: Words = {}): Json {
  const titles: Labels = l(en);
  const others = (text: string) => {
    const { "en-US": _en, ...rest } = l(text);
    return rest;
  };
  return {
    i,
    widget,
    x,
    y,
    w,
    h,
    config: {
      title: titles["en-US"],
      titles,
      ...(words.subtitle === undefined ? {} : { subtitle: words.subtitle, subtitles: others(words.subtitle) }),
      ...(words.caption === undefined ? {} : { metricLabel: words.caption, metricLabels: others(words.caption) }),
      ...(words.empty === undefined ? {} : { emptyState: { titleKey: words.empty, titles: others(words.empty) } }),
      ...config,
    },
  };
}

/** A night's figure over the room types' limit: tonight, against last night. */
const tonight = (metricName: "occupancy" | "earnings"): Json => ({
  kind: "capacity-counts",
  source: { name: "stays" },
  shape: "metric+delta",
  capacity: { metric: metricName },
});
const day = (column: string, op: string, when: string): Json => ({ column, op, day: when });
const list = (rest: Json): Json => ({ kind: "table-query", source: { name: "stays", type: "table" }, shape: "record-list", ...rest });
const ROOM_TYPE = "room_type:room_type_id.name";

export const OVERVIEW_LAYOUT = {
  version: 1,
  items: [
    // ── the day at a glance
    card("in-house", "kpi-stat-card", [0, 0, 3, 3], "In house now", {
      ...COUNT,
      iconName: "bed-double",
      binding: metric(count("stays"), { filters: [eq("status", "in_house")] }),
    }),
    card("arriving", "kpi-stat-card", [3, 0, 3, 3], "Arriving today", {
      ...COUNT,
      iconName: "log-in",
      binding: metric(count("stays"), { filters: [oneOf("status", ["booked", "in_house"])], window: today("arrive") }),
    }),
    card("leaving", "kpi-stat-card", [6, 0, 3, 3], "Leaving today", {
      ...COUNT,
      iconName: "log-out",
      binding: metric(count("stays"), { filters: [oneOf("status", ["in_house", "departed"])], window: today("depart") }),
    }),
    card(
      "on-accounts",
      "kpi-stat-card",
      [9, 0, 3, 3],
      "On guests' accounts",
      { ...MONEY, iconName: "wallet", binding: metric(sum("balance", "owing"), { filters: [eq("status", "in_house")] }) },
      { caption: "for their whole stays, not yet paid" },
    ),
    // How full the house is tonight and what its rooms earn tonight, from the night limit itself.
    card(
      "occupancy",
      "kpi-stat-card",
      [0, 3, 4, 3],
      "Occupancy tonight",
      { metricFormat: "percent", deltaMode: "none", showSparkline: false, iconName: "door-open", binding: tonight("occupancy") },
      { caption: "of the rooms we can sell", empty: "No rooms to sell tonight" },
    ),
    card(
      "room-income",
      "kpi-stat-card",
      [4, 3, 4, 3],
      "Room income tonight",
      { ...MONEY, iconName: "landmark", binding: tonight("earnings") },
      { caption: "the nightly rates of the rooms sold" },
    ),
    card("recorded", "kpi-stat-card", [8, 3, 4, 3], "Money recorded this month", {
      ...MONEY,
      iconName: "banknote",
      binding: {
        kind: "table-query",
        source: { name: "payments", type: "table" },
        shape: "metric+delta",
        aggregations: [sum("signed", "recorded")],
        filters: [eq("voided", false)],
        window: month("paid_on"),
      },
    }),
    // ── how reservations come in
    card("made-by-week", "chart-bar", [0, 6, 8, 8], "Reservations made each week", {
      binding: query({
        shape: "timeseries",
        aggregations: [count("stays")],
        bucket: { column: "created_at", unit: "week" },
        window: weeks("created_at"),
      }),
    }),
    card(
      "made-where",
      "chart-stacked-bar-100",
      [8, 6, 4, 8],
      "Made online or at the desk, last 30 days",
      {
        binding: query({
          shape: "categorical",
          groupBy: ["channel"],
          aggregations: [count("stays")],
          window: { column: "created_at", last: 30, unit: "day" },
        }),
      },
      { subtitle: "Reservations by where they were made", empty: "No reservations made in the last 30 days." },
    ),
    // ── today's people
    card(
      "leaving-owing",
      "mini-table",
      [0, 14, 6, 7],
      "Leaving today with money owing",
      {
        limit: 6,
        columns: [
          { name: "guest_name", label: "Guest" },
          { name: "balance", label: "Owing", logicalType: "decimal", semantic: "money" },
        ],
        secondary: ["ref", "room_type"],
        viewAllHref: "/p/hotel-reservations?f.status=eq:in_house&f.depart=gte:today&f.depart=lte:today&f.balance=gt:0",
        binding: list({
          select: ["id", "ref", "guest_name", "balance"],
          lookups: [ROOM_TYPE],
          filters: [eq("status", "in_house"), day("depart", "eq", "today"), { column: "balance", op: "gt", value: 0 }],
          orderBy: [{ column: "balance", dir: "desc" }],
          limit: 6,
        }),
      },
      { subtitle: "Leaving today · balance above zero", empty: "Nobody leaving with money owing." },
    ),
    card(
      "next-arrivals",
      "mini-table",
      [6, 14, 6, 7],
      "Next arrivals",
      {
        limit: 6,
        columns: [
          { name: "guest_name", label: "Guest" },
          { name: "arrive", label: "Arrives", logicalType: "date" },
          { name: "arrival_time", label: "About", format: "mono" },
        ],
        secondary: ["ref", "room_type"],
        viewAllHref: "/p/hotel-reservations?f.status=eq:booked&f.arrive=gte:today",
        binding: list({
          select: ["id", "ref", "guest_name", "arrive", "arrival_time"],
          lookups: [ROOM_TYPE],
          filters: [eq("status", "booked"), day("arrive", "gte", "today")],
          orderBy: [
            { column: "arrive", dir: "asc" },
            { column: "arrival_time", dir: "asc" },
          ],
          limit: 6,
        }),
      },
      { subtitle: "Booked, arriving from today", empty: "No arrivals ahead." },
    ),
    // ── the month, and the rooms
    card(
      "late-cancellations",
      "kpi-stat-card",
      [0, 21, 3, 3],
      "Late cancellations this month",
      {
        ...COUNT,
        iconName: "calendar-x",
        binding: metric(count("stays"), {
          filters: [eq("late_cancel", true), oneOf("cancel_code", ["self", "guest_asked"])],
          window: month("cancelled_at"),
        }),
      },
      { caption: "by guests" },
    ),
    card("no-shows", "kpi-stat-card", [3, 21, 3, 3], "No-shows this month", {
      ...COUNT,
      iconName: "user-x",
      binding: metric(count("stays"), { filters: [eq("status", "no_show")], window: month("arrive") }),
    }),
    card(
      "out-of-service",
      "mini-table",
      [6, 21, 6, 6],
      "Rooms out of service",
      {
        limit: 6,
        columns: [
          { name: "room", label: "Room", format: "mono" },
          { name: "to_date", label: "Last night out", logicalType: "date" },
        ],
        secondary: ["reason"],
        viewAllHref: "/p/hotel-out-of-service?f.active=eq:true",
        binding: {
          kind: "table-query",
          source: { name: "room_closures", type: "table" },
          shape: "record-list",
          select: ["id", "reason", "to_date"],
          lookups: ["room:room_id.number"],
          filters: [eq("active", true), { or: [day("to_date", "gte", "today"), { column: "to_date", op: "is_null" }] }],
          orderBy: [{ column: "from_date", dir: "desc" }],
          limit: 6,
        },
      },
      { subtitle: "Out today or later", empty: "No room is out of service." },
    ),
  ],
};
