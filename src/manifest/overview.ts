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

function card(i: string, widget: string, [x, y, w, h]: Place, en: string, config: Json): Json {
  const titles: Labels = l(en);
  return { i, widget, x, y, w, h, config: { title: titles["en-US"], titles, ...config } };
}

export const OVERVIEW_LAYOUT = {
  version: 1,
  items: [
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
    card("on-accounts", "kpi-stat-card", [9, 0, 3, 3], "On guests' accounts", {
      ...MONEY,
      iconName: "wallet",
      binding: metric(sum("balance", "owing"), { filters: [eq("status", "in_house")] }),
    }),
    card("recorded", "kpi-stat-card", [0, 3, 4, 3], "Money recorded this month", {
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
    card("late-cancellations", "kpi-stat-card", [4, 3, 4, 3], "Late cancellations this month", {
      ...COUNT,
      iconName: "calendar-x",
      binding: metric(count("stays"), {
        filters: [eq("late_cancel", true), oneOf("cancel_code", ["self", "guest_asked"])],
        window: month("cancelled_at"),
      }),
    }),
    card("no-shows", "kpi-stat-card", [8, 3, 4, 3], "No-shows this month", {
      ...COUNT,
      iconName: "user-x",
      binding: metric(count("stays"), { filters: [eq("status", "no_show")], window: month("arrive") }),
    }),
    card("made-by-week", "chart-bar", [0, 6, 12, 8], "Reservations made each week", {
      binding: query({
        shape: "timeseries",
        aggregations: [count("stays")],
        bucket: { column: "created_at", unit: "week" },
        window: weeks("created_at"),
      }),
    }),
  ],
};
