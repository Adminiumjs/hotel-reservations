/**
 * The real desk door over a stand-in session transport: which route each call
 * reads and writes, with what, and how a refusal reaches the screens.
 */
import { describe, expect, it } from "vitest";

import { AdminiumDesk, type EventSourceLike } from "./adminiumDesk.ts";
import { SessionPortError, type SessionTransport } from "./sessionSource.ts";
import type { StaffConfig, TableAction } from "../staffConnection.ts";
import type { LiveFrame } from "./wire.ts";

interface Sent {
  method: string;
  path: string;
  body?: unknown;
}

const D = "/api/v1/data/c1";

/** A transport answering from `routes` (method + path without its query → reply), recording every call. */
function transport(routes: Record<string, (sent: Sent) => unknown>) {
  const sent: Sent[] = [];
  const answer = (s: Sent) => {
    sent.push(s);
    const route = routes[`${s.method} ${s.path.split("?")[0]}`];
    if (route === undefined) throw new SessionPortError("Not found.", 404, "NOT_FOUND", { pk: null });
    return route(s);
  };
  const t: SessionTransport = {
    port: {} as SessionTransport["port"],
    get: async <T,>(path: string) => answer({ method: "GET", path }) as T,
    mutate: async <T,>(path: string, method: "POST" | "PUT" | "PATCH" | "DELETE", body?: unknown) => answer({ method, path, body }) as T,
    connection: async () => "c1",
    tableId: async (name: string) => `public.${name}`,
    relation: async (child: string, column: string) => `rel:${child}.${column}`,
    refresh: async () => undefined,
  };
  return { t, sent };
}

const config = (over: Partial<StaffConfig> = {}): StaffConfig => ({
  connectionId: "c1",
  appName: "Wren House",
  tables: {},
  settings: {},
  timezone: "America/New_York",
  timezoneSource: "operator",
  serverTimezone: "UTC",
  currency: "USD",
  user: { id: "u1", name: "Maeve R.", email: "maeve@wren.test" },
  csrfToken: "csrf",
  publicKeys: {},
  access: { tables: {}, roles: [{ slug: "hotel-front-desk", name: "Front desk" }] },
  addOns: {},
  ...over,
});
const readsAll = { tables: Object.fromEntries(["settings", "room_types", "room_type_features", "rooms", "extras", "house_notes", "room_closures", "rate_rules", "charge_items", "customers", "stays", "stay_extras", "charges", "stay_credits", "payments"].map((t): [string, TableAction[]] => [t, ["read", "create", "update"]])) };

describe("the real desk door", () => {
  it("says who is signed in and the app's roles by their own names", async () => {
    const desk = new AdminiumDesk(transport({}).t, config({ access: { tables: {}, roles: [{ slug: "hotel-manager", name: "Manager" }] } }));
    expect(await desk.me()).toEqual({ name: "Maeve R.", roles: ["manager"] });
    expect(await desk.config()).toEqual({ timezone: "America/New_York", currency: "USD", folio: false });
  });

  it("prints the folio through Invoices & Receipts, and emails it by stamping when it was asked for", async () => {
    const { t, sent } = transport({
      [`POST /api/v1/apps/hotel/documents/render`]: () => ({ printUrl: "/api/v1/documents/doc_1/print" }),
      [`PATCH ${D}/hotel_stays/41`]: (s) => ({ data: { id: 41, ...(s.body as { values: object }).values } }),
    });
    const desk = new AdminiumDesk(t, config({ now: "2026-07-28T13:05:00.000Z", addOns: { invoices: { version: "1.0.6", settings: {} } } }), { clock: () => Date.parse("2026-07-28T13:05:00.000Z") });
    expect((await desk.config()).folio).toBe(true);
    expect(await desk.printFolio(41)).toEqual({ url: "/api/v1/documents/doc_1/print" });
    await desk.emailFolio(41, true);
    expect(sent.map((s) => s.body)).toEqual([{ ref: "stays", kind: "invoice", pk: { id: 41 } }, { values: { folio_so_far_at: "2026-07-28T13:05:00.000Z" } }]);
  });

  it("takes the house's clock from Adminium's config, not the browser's", async () => {
    const desk = new AdminiumDesk(transport({}).t, config({ now: "2026-07-28T13:05:00.000Z" }));
    expect(await desk.config()).toEqual({ timezone: "America/New_York", currency: "USD", now: "2026-07-28T13:05:00.000Z", folio: false });
  });

  it("reads only the tables the person may read", async () => {
    const { t, sent } = transport({
      [`GET ${D}/hotel_rooms`]: () => ({ data: [{ id: 2, number: "301" }, { id: 1, number: "104" }] }),
      [`GET ${D}/hotel_room_types`]: () => ({ data: [{ id: 1, base_rate: "170.00" }] }),
      [`GET ${D}/hotel_room_closures`]: () => ({ data: [] }),
    });
    const housekeeping = config({ access: { tables: { rooms: ["read", "update"], room_types: ["read"], room_closures: ["read"] }, roles: [{ slug: "hotel-housekeeping", name: "Housekeeping" }] } });
    const house = await new AdminiumDesk(t, housekeeping).house();
    expect(house.rooms.map((r) => r["number"])).toEqual(["104", "301"]);
    expect(house.rates).toEqual([]);
    expect(new Set(sent.map((s) => s.path.split("?")[0]))).toEqual(new Set([`${D}/hotel_rooms`, `${D}/hotel_room_types`, `${D}/hotel_room_closures`]));
  });

  it("pages through a long list", async () => {
    const rows = Array.from({ length: 230 }, (_, i) => ({ id: i + 1, stay_id: 1 }));
    const { t, sent } = transport({
      [`GET ${D}/hotel_stays`]: () => ({ data: [{ id: 1 }] }),
      [`GET ${D}/hotel_stay_extras`]: (s) => {
        const offset = Number(new URLSearchParams(s.path.split("?")[1]).get("offset"));
        return { data: rows.slice(offset, offset + 200) };
      },
      [`GET ${D}/hotel_charges`]: () => ({ data: [] }),
      [`GET ${D}/hotel_stay_credits`]: () => ({ data: [] }),
      [`GET ${D}/hotel_payments`]: () => ({ data: [] }),
    });
    const stays = await new AdminiumDesk(t, config({ access: { ...readsAll, roles: [] } })).stays();
    expect(stays[0]!.extras).toHaveLength(230);
    expect(sent.filter((s) => s.path.startsWith(`${D}/hotel_stay_extras`))).toHaveLength(2);
  });

  it("reads the nights' counts of the room types and the parking", async () => {
    const { t, sent } = transport({
      [`GET ${D}/hotel_stays/capacity-counts`]: () => ({ data: { kind: "night", rows: [{ pool: "1", date: "2026-07-28", size: 12, outOfService: 1, taken: 9, held: 0, left: 3 }] } }),
      [`GET ${D}/hotel_stay_extras/capacity-counts`]: () => ({ data: { kind: "night", rows: [{ pool: "3", date: "2026-07-28", size: 6, taken: 4, held: 0, left: 2 }] } }),
    });
    const counts = await new AdminiumDesk(t, config({ access: { ...readsAll, roles: [] } })).counts("2026-07-27", 16);
    expect(counts).toEqual([
      { table: "stays", pool: 1, date: "2026-07-28", size: 12, outOfService: 1, taken: 9, left: 3 },
      { table: "stay_extras", pool: 3, date: "2026-07-28", size: 6, outOfService: 0, taken: 4, left: 2 },
    ]);
    expect(sent[0]!.path).toBe(`${D}/hotel_stays/capacity-counts?rule=0&from=2026-07-27&days=16`);
  });

  it("prices a booking by Adminium's dry run, its extras under their link, and books it", async () => {
    const { t, sent } = transport({
      ...Object.fromEntries(["settings", "room_type_features", "rooms", "extras", "house_notes", "room_closures", "rate_rules", "charge_items"].map((t) => [`GET ${D}/hotel_${t}`, () => ({ data: [] })])),
      [`GET ${D}/hotel_room_types`]: () => ({ data: [{ id: 1, base_rate: "170.00" }] }),
      [`POST ${D}/hotel_stays/dry-run`]: () => ({ data: { total: "370.60" }, children: { "rel:hotel_stay_extras.stay_id": [{ data: { extra_id: 1, amount: "32.00" } }] }, nights: [{ date: "2026-08-03", rate: "185.00", tags: ["Weekend"] }] }),
      [`POST ${D}/hotel_stays`]: () => ({ data: { id: 44, ref: "WH-1002" }, undoToken: "u" }),
      [`GET ${D}/hotel_stay_extras`]: () => ({ data: [{ id: 9, stay_id: 44, extra_id: 1 }] }),
    });
    const desk = new AdminiumDesk(t, config({ access: { ...readsAll, roles: [] } }));
    await desk.house();
    const body = { values: { room_type_id: 1, arrive: "2026-08-03", depart: "2026-08-05", guests: 2 }, children: { stay_extras: [{ values: { extra_id: 1 } }] } };
    const quote = await desk.quote(body);
    expect(sent.find((s) => s.path === `${D}/hotel_stays/dry-run`)!.body).toEqual({
      values: { room_type_id: 1, arrive: "2026-08-03", depart: "2026-08-05", guests: 2, channel: "desk", first_name: "—" },
      children: { "rel:hotel_stay_extras.stay_id": [{ values: { extra_id: 1 } }] },
    });
    expect(quote.data["total"]).toBe("370.60");
    expect(quote.nights).toEqual([{ date: "2026-08-03", rate: 185, base: 170, tags: ["Weekend"] }]);
    expect(quote.children?.stay_extras?.[0]?.data["amount"]).toBe("32.00");
    const made = await desk.book({ ...body, values: { ...body.values, first_name: "Ines" } });
    expect(made.data["ref"]).toBe("WH-1002");
    expect(made.children?.stay_extras?.map((c) => c.data["id"])).toEqual([9]);
  });

  it("moves a stay by its status, saying the status the desk saw", async () => {
    const { t, sent } = transport({ [`PATCH ${D}/hotel_stays/41`]: (s) => ({ data: { id: 41, ...(s.body as { values: object }).values } }) });
    const desk = new AdminiumDesk(t, config());
    await desk.checkIn(41, 7);
    await desk.checkOut(41);
    await desk.cancel(41, "house");
    await desk.noShow(41);
    expect(sent.map((s) => s.body)).toEqual([
      { values: { room_id: 7, status: "in_house" }, from: "booked" },
      { values: { status: "departed" }, from: "in_house" },
      { values: { status: "cancelled", cancel_code: "house" }, from: "booked" },
      { values: { status: "no_show" }, from: "booked" },
    ]);
  });

  it("moves a guest in the house to another room in one write: Adminium moves both rooms with it", async () => {
    const { t, sent } = transport({
      [`PATCH ${D}/hotel_stays/41`]: () => ({ data: { id: 41, room_id: 8 } }),
    });
    await new AdminiumDesk(t, config()).moveRoom(41, 8);
    expect(sent.filter((s) => s.method === "PATCH").map((s) => [s.path, s.body])).toEqual([[`${D}/hotel_stays/41`, { values: { room_id: 8 } }]]);
  });

  it("puts an extra on by its own row: a new line, or the old one back on", async () => {
    const lines: Record<string, unknown>[] = [];
    const { t, sent } = transport({
      [`GET ${D}/hotel_stay_extras`]: () => ({ data: lines }),
      [`POST ${D}/hotel_stay_extras`]: (s) => ({ data: { id: 9, ...(s.body as { values: object }).values } }),
      [`PATCH ${D}/hotel_stay_extras/9`]: (s) => ({ data: { id: 9, ...(s.body as { values: object }).values } }),
    });
    const desk = new AdminiumDesk(t, config());
    await desk.setExtra(41, 1, true);
    lines.push({ id: 9, stay_id: 41, extra_id: 1, state: "on" });
    await desk.setExtra(41, 1, false);
    lines[0]!["state"] = "off";
    await desk.setExtra(41, 1, true);
    // Off twice: the second finds it off already, and nothing is written.
    await expect(desk.setExtra(41, 1, false)).rejects.toMatchObject({ code: "STATE_UNCHANGED" });
    expect(sent.filter((s) => s.method !== "GET").map((s) => [s.method, s.body])).toEqual([
      ["POST", { values: { stay_id: 41, extra_id: 1 } }],
      ["PATCH", { values: { state: "off" } }],
      ["PATCH", { values: { state: "on" } }],
    ]);
  });

  it("takes the nights not stayed off as a credit row, which Adminium prices — once, however often it is sent", async () => {
    const made: Record<string, unknown>[] = [];
    const { t, sent } = transport({
      [`GET ${D}/hotel_stays/41`]: () => ({ data: { id: 41, arrive: "2026-07-27", depart: "2026-07-31" } }),
      [`GET ${D}/hotel_stay_credits`]: () => ({ data: made }),
      [`POST ${D}/hotel_stay_credits`]: (s) => {
        const row = { id: 3, ...(s.body as { values: object }).values, voided: false, amount: "340.00" };
        made.push(row);
        return { data: row };
      },
    });
    const desk = new AdminiumDesk(t, config());
    await desk.takeOffNights(41, "2026-07-29");
    expect(sent.filter((s) => s.method === "POST").map((s) => s.body)).toEqual([{ values: { stay_id: 41, reason: "left_early", from_date: "2026-07-29", to_date: "2026-07-31" } }]);
    // Sent again after a reply that never came: the credit is found, and nothing more is written.
    expect((await desk.takeOffNights(41, "2026-07-29")).id).toBe(3);
    expect(sent.filter((s) => s.method === "POST")).toHaveLength(1);
    await expect(desk.takeOffNights(41, "2026-07-31")).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("asks Adminium's change quote for an edit, sending every extra line with the ones ticked on or off", async () => {
    const { t, sent } = transport({
      [`GET ${D}/hotel_stay_extras`]: () => ({ data: [{ id: 9, stay_id: 41, extra_id: 1, state: "on" }, { id: 10, stay_id: 41, extra_id: 2, state: "off" }] }),
      [`POST ${D}/hotel_stays/41/dry-run`]: () => ({
        data: { id: 41, room_type_id: 2, total: "612.40" },
        children: { "rel:hotel_stay_extras.stay_id": [{ data: { id: 9, state: "off" } }, { data: { id: 10, state: "on" } }, { data: { id: 11, extra_id: 3 } }] },
        nights: [{ date: "2026-07-30", rate: "205.00", base: "180.00", tags: ["Summer weeks"] }],
      }),
    });
    const quote = await new AdminiumDesk(t, config()).quoteEdit(41, { depart: "2026-08-01" }, [{ extraId: 1, on: false }, { extraId: 2, on: true }, { extraId: 3, on: true }]);
    expect(sent.at(-1)!.body).toEqual({
      values: { depart: "2026-08-01" },
      children: {
        "rel:hotel_stay_extras.stay_id": [
          { key: { id: 9 }, values: { state: "off" } },
          { key: { id: 10 }, values: { state: "on" } },
          { values: { extra_id: 3 } },
        ],
      },
    });
    expect([quote.data["total"], quote.nights, quote.children?.stay_extras?.length]).toEqual(["612.40", [{ date: "2026-07-30", rate: 205, base: 180, tags: ["Summer weeks"] }], 3]);
  });

  it("saves an edit and its extras in one write, with the price the desk showed", async () => {
    const { t, sent } = transport({
      [`GET ${D}/hotel_stay_extras`]: () => ({ data: [{ id: 9, stay_id: 41, extra_id: 1, state: "on" }] }),
      [`PATCH ${D}/hotel_stays/41`]: () => ({ data: { id: 41 } }),
    });
    await new AdminiumDesk(t, config()).edit(41, { guests: 3 }, "612.40", [{ extraId: 1, on: false }]);
    expect(sent.filter((s) => s.method === "PATCH").map((s) => s.body)).toEqual([
      { values: { guests: 3 }, children: { "rel:hotel_stay_extras.stay_id": [{ key: { id: 9 }, values: { state: "off" } }] }, expect: { total: "612.40" } },
    ]);
  });

  it("takes a booking with the price it showed and a retry key, and says a replay", async () => {
    const { t, sent } = transport({
      [`POST ${D}/hotel_stays`]: () => ({ data: { id: 50, ref: "WH-1001" }, replayed: true }),
      [`GET ${D}/hotel_stay_extras`]: () => ({ data: [] }),
    });
    const reply = await new AdminiumDesk(t, config()).book({ values: { first_name: "Elin" }, children: { stay_extras: [] }, expect: { total: "440.36" }, clientKey: "k".repeat(43) });
    expect(sent[0]!.body).toMatchObject({ expect: { total: "440.36" }, clientKey: "k".repeat(43) });
    expect(reply.replayed).toBe(true);
  });

  it("quotes the nights stayed and a void through the stay's change quote; a refusal of the balance is said, not thrown", async () => {
    const { t, sent } = transport({
      [`GET ${D}/hotel_stays/41`]: () => ({ data: { id: 41, depart: "2026-07-31", total: "900.00", paid: "500.00" } }),
      [`GET ${D}/hotel_stay_credits`]: () => ({ data: [] }),
      [`GET ${D}/hotel_charges/3`]: () => ({ data: { id: 3, stay_id: 41, voided: false } }),
      [`GET ${D}/hotel_charges`]: () => ({ data: [{ id: 3, stay_id: 41, voided: false }, { id: 4, stay_id: 41, voided: true }] }),
      [`POST ${D}/hotel_stays/41/dry-run`]: (s) => {
        const children = (s.body as { children: Record<string, unknown[]> }).children;
        if ("rel:hotel_charges.stay_id" in children) throw new SessionPortError("Refused.", 409, "BALANCE_EXCEEDED", {});
        return { data: { id: 41, total: "508.60" }, children: { "rel:hotel_stay_credits.stay_id": [{ data: { id: 7, amount: "392.40" } }] } };
      },
    });
    const desk = new AdminiumDesk(t, config());
    expect(await desk.quoteTakeOff(41, "2026-07-29")).toMatchObject({ total: 508.6, refused: false, credit: 392.4 });
    expect(await desk.quoteVoid("charges", 3)).toEqual({ refused: true, paid: 500, total: 900 });
    expect((sent.at(-1)!.body as { children: Record<string, unknown> }).children).toEqual({
      "rel:hotel_charges.stay_id": [{ key: { id: 3 }, values: { voided: true } }, { key: { id: 4 }, values: { voided: true } }],
    });
  });

  it("hands a refusal on with Adminium's code and what it said beside", async () => {
    const { t } = transport({
      [`PATCH ${D}/hotel_stays/41`]: () => {
        throw new SessionPortError("Refused.", 409, "STATE_MOVE_REFUSED", { column: "status", requires: "balance" });
      },
    });
    await expect(new AdminiumDesk(t, config()).checkOut(41)).rejects.toMatchObject({ name: "ApiError", status: 409, code: "STATE_MOVE_REFUSED", params: { requires: "balance" } });
  });

  it("reads a folio's nights from Adminium's nightly lines, and none where it keeps one line", async () => {
    let stale = false;
    const { t } = transport({
      [`GET ${D}/hotel_stays/41`]: () => ({ data: { id: 41 } }),
      [`GET ${D}/hotel_stays/41/nightly`]: () => ({ data: { column: "room_total", nights: [{ date: "2026-07-27", rate: "185.00", base: "170.00", tags: [], qty: 1, amount: "185.00" }], total: "185.00", stale } }),
      [`GET ${D}/hotel_stay_extras`]: () => ({ data: [] }),
      [`GET ${D}/hotel_charges`]: () => ({ data: [] }),
      [`GET ${D}/hotel_stay_credits`]: () => ({ data: [] }),
      [`GET ${D}/hotel_payments`]: () => ({ data: [] }),
    });
    const desk = new AdminiumDesk(t, config());
    expect((await desk.folio(41)).nights).toEqual([{ date: "2026-07-27", rate: 185, base: 170, tags: [] }]);
    stale = true;
    expect((await desk.folio(41)).nights).toEqual([]);
  });

  it("hears the tables this person may read on one stream, and says when it was away", async () => {
    let source: (EventSourceLike & { url: string; fire: (type: string, data: unknown) => void }) | null = null;
    const listeners = new Map<string, (e: { data: string }) => void>();
    const open = (url: string) => {
      source = {
        url,
        onopen: null,
        onerror: null,
        addEventListener: (type, fn) => listeners.set(type, fn),
        close: () => undefined,
        fire: (type, data) => listeners.get(type)?.({ data: JSON.stringify(data) }),
      };
      return source;
    };
    const access = { tables: { rooms: ["read" as const], room_closures: ["read" as const], room_types: ["read" as const] }, roles: [] };
    const desk = new AdminiumDesk(transport({}).t, config({ access }), { stream: open });
    const frames: LiveFrame[] = [];
    const states: string[] = [];
    desk.subscribe((f) => frames.push(f), (s) => states.push(s));
    await new Promise((r) => setTimeout(r, 0));
    expect(decodeURIComponent(source!.url)).toBe("/api/v1/events?channels=widget-data:c1:public.hotel_rooms,widget-data:c1:public.hotel_room_closures,widget-data:c1:public.hotel_room_types");
    source!.onopen?.({});
    source!.fire("record.update", { channel: "widget-data:c1:public.hotel_rooms", type: "record.update", data: { pk: { id: 7 } } });
    source!.onerror?.({});
    source!.onopen?.({});
    expect(frames).toEqual([{ table: "rooms", id: 7, op: "update" }, { table: "*", id: 0, op: "update" }]);
    expect(states).toEqual(["live", "reconnecting", "live"]);
  });
});
