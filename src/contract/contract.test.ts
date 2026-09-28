/**
 * THE HOTEL'S CONTRACT WITH ADMINIUM, ON EVERY ENGINE.
 *
 * This repo's own `manifest.json` and sample, installed on a BUILT Adminium
 * (with Invoices & Receipts when an add-ons checkout is beside it), on SQLite,
 * Postgres and MySQL:
 *
 *   1. install — every rule kept, both browser keys made, the outbox on;
 *   2. the sample added at 09:05 on Tuesday 28 July 2026 in Bellhaven: every
 *      stay's money as the rows work it out, the same as the demo's loader;
 *   3. the desk's counts: the fourteen nights of the calendar;
 *   4. a guest reserves the demo's first stay through the public API: priced
 *      by the dry run, written once with its extras, its reference WH-1001,
 *      a retry replayed without the link;
 *   5. the desk checks a guest in to a ready room (the room made occupied)
 *      and cannot check out a guest who still owes money;
 *   6. the desk's day through the app's OWN doors (`AdminiumDesk`,
 *      `AdminiumGuest`): a booking priced and saved once, an edit with its
 *      extras, a room move, leaving early, cancelling late, a no-show taken
 *      back, money given back, a void, a closure; the front desk's and
 *      housekeeping's limits; and at once, from two desks or two guests: the
 *      last room, one room given twice, one check-in twice;
 *   7. the sample removed.
 *
 * It runs when asked (`ADMINIUM_CONTRACT=1`) where an Adminium checkout with
 * its built server and dashboard is (`ADMINIUM_REPO`), and says why it
 * skipped when it is not;
 * `ADMINIUM_REQUIRE_CONTRACT=1` makes that a failure (the contract workflow
 * sets it). Postgres and MySQL run with `TEST_POSTGRES_URL` / `TEST_MYSQL_URL`.
 *
 * An Adminium that does not build some of the rules the stays need yet answers
 * their writes `RULE_NOT_BUILT`; then everything after the install is skipped,
 * saying so — and with `ADMINIUM_REQUIRE_CONTRACT=1` it fails instead.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AdminiumDesk } from "../data/adminiumDesk.ts";
import { AdminiumGuest } from "../data/adminiumGuest.ts";
import { COLUMNS, resolveSample } from "../data/sampleRows.ts";
import { createSessionTransport } from "../data/sessionSource.ts";
import { loadStaffConfig } from "../staffConnection.ts";
import { DEMO_BUNDLE, DEMO_CURRENCY, DEMO_START, DEMO_ZONE } from "../demo/world.ts";
import { addOnBundle, appBundle, boot, Caller, ENGINES, missing, ok, PORTS_PER_ENGINE, solve, until, withInvoices, type Engine, type Server } from "./harness.ts";

type Row = Record<string, unknown> & { id: number };

const why = missing();
const REQUIRED = process.env["ADMINIUM_REQUIRE_CONTRACT"] === "1";
if (why !== null && REQUIRED) throw new Error(`the contract must run here, and cannot: ${why}`);
const PORT_BASE = Number(process.env["CONTRACT_PORT_BASE"] ?? 8470);
const ADMIN = { email: process.env["E2E_ADMIN_EMAIL"] ?? "e2e@adminium.local", password: process.env["E2E_ADMIN_PASSWORD"] ?? "adminium-e2e-password" };

/** The sample as the demo's loader resolves it: what every engine must hold. */
const SAMPLE = resolveSample(DEMO_BUNDLE, { now: DEMO_START, zone: DEMO_ZONE, locale: "en-US", currency: DEMO_CURRENCY });

describe.skipIf(why !== null)(`the contract with a built Adminium${why === null ? "" : ` — skipped: ${why}`}`, () => {
  ENGINES.forEach(([engine, available], index) => {
    describe.skipIf(!available)(`on ${engine}`, () => {
      let server: Server;
      let staff: Caller;
      let connectionId = "";
      let real: Record<string, string> = {};
      let tableIds: Record<string, string> = {};
      /** Why the writes after the install cannot run on this Adminium, or null. */
      let notBuilt: string | null = null;
      let skipped: unknown[] = [];
      /** Surnames for the guests racing for the last room (a guest's name holds letters only). */
      const SURNAMES = ["Alder", "Birch", "Cedar", "Damson", "Elder", "Fennel", "Gorse", "Hazel"];

      beforeAll(async () => {
        server = await boot(engine as Engine, PORT_BASE + index * PORTS_PER_ENGINE, DEMO_START);
        staff = new Caller(server.base, { origin: server.base });
        await staff.signIn(ADMIN.email, ADMIN.password);
        const connections = ok(await staff.get<{ connections: { id: string; name: string }[] }>("/api/v1/connections"));
        connectionId = connections.connections.find((c) => c.name === "northwind")!.id;
      }, 240_000);

      afterAll(async () => {
        await server?.stop();
      });

      const data = (ref: string) => `/api/v1/data/${connectionId}/${encodeURIComponent(tableIds[ref]!)}`;
      const rows = async (ref: string): Promise<Row[]> => {
        const out: Row[] = [];
        for (let offset = 0; ; offset += 200) {
          const page = ok(await staff.get<{ data: Row[] }>(`${data(ref)}?limit=200&offset=${String(offset)}`)).data;
          out.push(...page);
          if (page.length < 200) return out;
        }
      };
      const byRef = (list: Row[], ref: string) => list.find((r) => r["ref"] === ref)!;
      const money = (value: unknown) => Number(value).toFixed(2);
      /** Skip, saying why, when this Adminium does not build the stays' rules yet (a failure when the contract is required). */
      const needsWrites = (skip: () => void) => {
        if (notBuilt === null) return;
        if (REQUIRED) throw new Error(notBuilt);
        skip();
      };

      it("installs the app, keeping every rule, both browser keys and the outbox", async () => {
        const invoices = withInvoices();
        if (invoices) {
          const addOn = addOnBundle();
          ok(await staff.post(`/api/v1/add-ons/upload?expectedSha512=${encodeURIComponent(addOn.integrity)}`, addOn.buffer));
        }
        const app = appBundle();
        const staged = await staff.post(`/api/v1/apps/upload?expectedSha512=${encodeURIComponent(app.integrity)}`, app.buffer);
        expect([200, 201], JSON.stringify(staged.body).slice(0, 800)).toContain(staged.status);
        const body = { key: app.key, version: app.version, connectionId };
        const plan = ok(await staff.post<{ plan: { installable: boolean; checksum: string; addOns: { key: string; need: string; checked: boolean }[] } }>("/api/v1/apps/plan", body)).plan;
        expect(plan.installable).toBe(true);
        // Invoices & Receipts is offered, ticked, for the folio; nothing waits on it.
        expect(plan.addOns.map((a) => [a.key, a.checked])).toEqual([["invoices", true]]);
        const installed = ok(
          await staff.post<{ rules: { skipped: unknown[] }; schema: { created: string[] }; publicAccess: { keys: Record<string, string> }; outbox: { defined: boolean } }>(
            "/api/v1/apps/install",
            { ...body, planChecksum: plan.checksum, ...(invoices ? {} : { addOns: { invoices: false } }) },
          ),
        );
        const created = installed.schema.created;
        const prefix = created.find((name) => name.endsWith("stay_extras"))!.slice(0, -"stay_extras".length);
        real = Object.fromEntries(created.map((name) => [name.slice(prefix.length), name]));
        expect(Object.keys(real).sort()).toEqual([...Object.keys(COLUMNS), "messages"].filter((v, i, all) => all.indexOf(v) === i).sort());
        const schema = ok(await staff.get<{ model: { tables: { id: string; name: string }[] } }>(`/api/v1/connections/${connectionId}/schema`));
        tableIds = Object.fromEntries(Object.entries(real).map(([ref, name]) => [ref, schema.model.tables.find((t) => t.name === name)!.id]));
        ok(await staff.patch(`/api/v1/connections/${connectionId}`, { timezone: DEMO_ZONE, currency: DEMO_CURRENCY }));
        // Where the links in its emails point: an install says it once.
        ok(await staff.put("/api/v1/settings/email", { publicOrigin: server.base }));
        skipped = installed.rules.skipped;
        expect(Object.keys(installed.publicAccess.keys).sort()).toEqual(["customer", "link"]);
        expect(installed.outbox.defined).toBe(true);
      }, 180_000);

      it("keeps every rule of the manifest (none skipped at install)", () => {
        expect(JSON.stringify(skipped)).toBe("[]");
      });

      it("adds the sample at 09:05 on 28 July: every stay's money as the rows work it out", async (ctx) => {
        const added = await staff.post("/api/v1/apps/hotel/sample-data");
        if (added.status === 501 && added.code === "RULE_NOT_BUILT") notBuilt = `this Adminium does not build ${JSON.stringify(added.details)} yet`;
        needsWrites(() => ctx.skip());
        ok(added, added.status === 202 ? 202 : 200);
        await until(async () => (ok(await staff.get<{ loaded: boolean }>("/api/v1/apps/hotel/sample-data")).loaded ? true : undefined), "the sample to be added");
        const held = await rows("stays");
        for (const expected of SAMPLE["stays"]!) {
          const stay = byRef(held, String(expected["ref"]));
          expect(stay["status"], String(expected["ref"])).toBe(expected["status"]);
          for (const column of ["nights", "room_total", "extras_total", "charges_total", "subtotal", "tax", "total", "paid", "balance"]) {
            expect(money(stay[column]), `${String(expected["ref"])} ${column}`).toBe(money(expected[column]));
          }
        }
      }, 240_000);

      it("counts the calendar's fourteen nights for the desk", async (ctx) => {
        needsWrites(() => ctx.skip());
        const answer = ok(await staff.get<{ data: { kind: string; rows: { pool: string; date: string; size: number; taken: number }[] } }>(`${data("stays")}/capacity-counts?rule=0&from=2026-07-28&days=14`)).data.rows;
        const types = await rows("room_types");
        const garden = String(types.find((t) => t["name"] === "Garden double")!.id);
        const g = answer.filter((c) => c.pool === garden).map((c) => `${String(c.taken)}/${String(c.size)}`);
        expect(g).toEqual(["9/13", "8/13", "6/13", "4/13", "2/13", "1/13", "2/13", "2/13", "1/14", "0/14", "1/14", "1/14", "0/14", "0/14"]);
      }, 60_000);

      it("lets a guest reserve the demo's first stay, priced by the dry run, written once", async (ctx) => {
        needsWrites(() => ctx.skip());
        ok(await staff.put("/api/v1/public-api", { enabled: true }));
        const config = ok(await new Caller(server.base).get<{ publishableKey: string }>("/apps/hotel/customer/surface-config.json"));
        const guest = new Caller(server.base, { authorization: `Bearer ${config.publishableKey}`, origin: server.base });
        const refs = ok(await guest.get<{ data: { refs: Record<string, { actions: string[]; writable: string[] }> } }>("/api/v1/public/config")).data.refs;
        const door = Object.entries(refs).find(([ref, r]) => ref.startsWith(real["stays"]!) && r.actions.includes("create"))![0];
        const types = await rows("room_types");
        const extras = await rows("extras");
        const body = {
          values: {
            room_type_id: types.find((t) => t["name"] === "Garden double")!.id,
            arrive: "2026-08-03",
            depart: "2026-08-05",
            guests: 2,
            first_name: "Elin",
            last_name: "Marsh",
            email: "elin.marsh@wrenhouse.test",
            arrival_time: "16:00",
            client_key: "c".repeat(43),
          },
          children: { stay_extras: [{ values: { extra_id: extras.find((e) => e["code"] === "BRK")!.id } }] },
        };
        const quote = ok(await guest.post<{ data: Record<string, unknown> }>(`/api/v1/public/records/${door}/dry-run`, body)).data;
        expect(money(quote["total"])).toBe("440.36");
        const proof = async () => {
          const challenge = ok(await guest.get<{ data: { id: string; salt: string; difficulty: number } }>("/api/v1/public/challenge?purpose=write")).data;
          return { "x-adminium-proof": `${challenge.id}.${solve(challenge.salt, challenge.difficulty)}` };
        };
        const made = ok(await guest.post<{ data: Row; link?: { token: string } }>(`/api/v1/public/records/${door}`, { ...body, expect: { total: "440.36" } }, await proof()), 201);
        expect(made.data["ref"]).toBe("WH-1001");
        expect(made.link?.token).toBeDefined();
        const again = ok(await guest.post<{ data: Row; replayed?: boolean; link?: unknown }>(`/api/v1/public/records/${door}`, { ...body, expect: { total: "440.36" } }, await proof()));
        expect([again.data.id, again.replayed, again.link]).toEqual([made.data.id, true, undefined]);
      }, 120_000);

      it("checks a guest in to a ready room, making it occupied, and will not check out a guest who owes money", async (ctx) => {
        needsWrites(() => ctx.skip());
        const stays = await rows("stays");
        const rooms = await rows("rooms");
        const room304 = rooms.find((r) => r["number"] === "304")!;
        ok(await staff.patch(`${data("stays")}/${String(byRef(stays, "WH-S3304").id)}`, { values: { room_id: room304.id, status: "in_house" } }));
        expect((await rows("rooms")).find((r) => r.id === room304.id)!["status"]).toBe("occupied");
        const refused = await staff.patch(`${data("stays")}/${String(byRef(stays, "WH-S3283").id)}`, { values: { status: "departed" } });
        expect([refused.status, refused.code, refused.details["requires"]]).toEqual([409, "STATE_MOVE_REFUSED", "balance"]);
      }, 60_000);

      /** A desk on its own session: the app's door, through the staff config the server hands its screens. */
      const deskOf = async (caller: Caller) => {
        const fetchAs = caller.fetchAs();
        const cfg = (await loadStaffConfig({ hostedStaff: true, base: `${server.base}/apps/hotel/staff/`, fetchImpl: fetchAs }))!;
        const t = createSessionTransport({
          tableOfRef: cfg.tables,
          connectionId: cfg.connectionId ?? undefined,
          staff: { csrfToken: cfg.csrfToken, timezone: cfg.timezone, timezoneSource: cfg.timezoneSource, serverTimezone: cfg.serverTimezone, currency: cfg.currency },
          fetchImpl: fetchAs,
        });
        // The screens read before they write: that read takes the session's write token.
        await t.port.config();
        return { desk: new AdminiumDesk(t, cfg), t, cfg };
      };
      /** A guest's page: its own tab, the house's keys. */
      const guestOf = async () => {
        const c = ok(await new Caller(server.base).get<{ publishableKey: string; publicKeys?: Record<string, string>; tables: Record<string, string> }>("/apps/hotel/customer/surface-config.json"));
        const fetchIn: typeof fetch = (input, init) => {
          const headers = new Headers(init?.headers);
          headers.set("origin", server.base);
          return fetch(new URL(String(input), server.base), { ...init, headers });
        };
        return new AdminiumGuest({ baseUrl: server.base, publishableKey: c.publishableKey, publicKeys: c.publicKeys ?? {}, tables: c.tables }, { fetch: fetchIn, storage: null });
      };
      /** A person with one of the app's roles, invited and signed in. */
      const person = async (slug: string, email: string, name: string) => {
        const roles = ok(await staff.get<{ roles?: { id: string; slug: string }[] }>("/api/v1/roles")).roles ?? [];
        const role = roles.find((r) => r.slug === slug)!;
        const password = `contract-${slug}-password`;
        const invited = ok(await staff.post<{ invite: { token: string } }>("/api/v1/users", { email, name, roleIds: [role.id] }), 201);
        ok(await new Caller(server.base, { origin: server.base }).post("/api/v1/auth/password/reset", { token: invited.invite.token, newPassword: password }));
        const caller = new Caller(server.base, { origin: server.base });
        // A screens-only person opens the app's screens, not the dashboard: the sign-in alone, the token from the staff config.
        ok(await caller.post("/api/v1/auth/login", { email, password }));
        return deskOf(caller);
      };
      const refusalOf = async (run: () => Promise<unknown>): Promise<string> => {
        try {
          await run();
          return "WROTE";
        } catch (error) {
          return String((error as { code?: string }).code ?? error);
        }
      };
      const paramsOf = async (run: () => Promise<unknown>): Promise<Record<string, unknown>> => {
        try {
          await run();
          return {};
        } catch (error) {
          return { code: (error as { code?: string }).code, ...((error as { params?: Record<string, unknown> }).params ?? {}) };
        }
      };

      it("takes a booking at the desk: priced by its quote, saved once, a retry replayed, three in a double refused", async (ctx) => {
        needsWrites(() => ctx.skip());
        const { desk } = await deskOf(staff);
        const h = await desk.house();
        const garden = h.types.find((x) => x["name"] === "Garden double")!;
        const breakfast = h.extras.find((x) => x["code"] === "BRK")!;
        const body = {
          values: { room_type_id: garden.id, arrive: "2026-08-10", depart: "2026-08-12", guests: 2, first_name: "Orin", last_name: "Hale", email: "orin.hale@wrenhouse.test", language: "en-US" },
          children: { stay_extras: [{ values: { extra_id: breakfast.id } }] },
        };
        const quote = await desk.quote(body);
        expect(quote.nights.map((n) => n.date)).toEqual(["2026-08-10", "2026-08-11"]);
        expect(await refusalOf(() => desk.book({ ...body, expect: { total: "1.00" } }))).toBe("PRICE_CHANGED");
        const key = "b".repeat(43);
        const made = await desk.book({ ...body, expect: { total: money(quote.data["total"]) }, clientKey: key });
        const again = await desk.book({ ...body, expect: { total: money(quote.data["total"]) }, clientKey: key });
        expect([again.data.id, again.replayed]).toEqual([made.data.id, true]);
        expect(await paramsOf(() => desk.quote({ ...body, values: { ...body.values, guests: 3 } }))).toMatchObject({ code: "VALIDATION_FAILED", column: "guests", reason: "too-many" });
        // An edit and its extras in one write, at the price its quote showed; four guests refused.
        const parking = h.extras.find((x) => x["code"] === "PRK")!;
        const q = await desk.quoteEdit(made.data.id, { depart: "2026-08-13" }, [{ extraId: parking.id, on: true }]);
        expect(q.nights.length).toBe(3);
        expect(q.children?.stay_extras?.map((c) => Number(c.data["nights"]))).toEqual([3, 3]);
        const edited = await desk.edit(made.data.id, { depart: "2026-08-13" }, money(q.data["total"]), [{ extraId: parking.id, on: true }]);
        expect(money(edited["total"])).toBe(money(q.data["total"]));
        expect(await paramsOf(() => desk.edit(made.data.id, { guests: 4 }))).toMatchObject({ code: "VALIDATION_FAILED", column: "guests" });
      }, 120_000);

      it("moves a guest in the house to a ready room in one write, and leaves the rooms as they should be", async (ctx) => {
        needsWrites(() => ctx.skip());
        const { desk } = await deskOf(staff);
        const stays = await rows("stays");
        const noor = byRef(stays, "WH-S3284");
        const h = await desk.house();
        const closed = new Set((await rows("room_closures")).filter((c) => c["active"] !== false && c["active"] !== 0).map((c) => c["room_id"]));
        const ready = h.rooms.find((r) => r["room_type_id"] === noor["room_type_id"] && r["status"] === "ready" && !closed.has(r.id))!;
        expect(await refusalOf(() => desk.moveRoom(noor.id, h.rooms.find((r) => r["number"] === "103")!.id))).toBe("STATE_MOVE_REFUSED");
        await desk.moveRoom(noor.id, ready.id);
        const after = await rows("rooms");
        expect([after.find((r) => r.id === noor["room_id"])!["status"], after.find((r) => r.id === ready.id)!["status"]]).toEqual(["cleaning", "occupied"]);
      }, 60_000);

      it("lets a guest leave early at Adminium's price, and checks them out once settled", async (ctx) => {
        needsWrites(() => ctx.skip());
        const { desk } = await deskOf(staff);
        const ros = byRef(await rows("stays"), "WH-S3292");
        const quote = await desk.quoteTakeOff(ros.id, "2026-07-28");
        expect([quote.refused, money(quote.credit)]).toEqual([false, "360.00"]);
        await desk.takeOffNights(ros.id, "2026-07-28");
        const owing = byRef(await rows("stays"), "WH-S3292");
        expect(money(owing["total"])).toBe(money(quote.total));
        expect(await refusalOf(() => desk.checkOut(ros.id))).toBe("STATE_MOVE_REFUSED");
        await desk.recordPayment(ros.id, { kind: "taken", amount: money(owing["balance"]), method: "card" });
        await desk.checkOut(ros.id);
        expect((await rows("rooms")).find((r) => r.id === ros["room_id"])!["status"]).toBe("cleaning");
      }, 60_000);

      it("cancels late, marks a no-show only from the guest's own time, and takes one back", async (ctx) => {
        needsWrites(() => ctx.skip());
        const { desk } = await deskOf(staff);
        const stays = await rows("stays");
        await desk.cancel(byRef(stays, "WH-S3322").id, "guest_asked");
        const saoirse = byRef(await rows("stays"), "WH-S3322");
        expect([saoirse["status"], Number(saoirse["late_cancel"]) === 1 || saoirse["late_cancel"] === true]).toEqual(["cancelled", true]);
        expect(await paramsOf(() => desk.noShow(byRef(stays, "WH-S3303").id))).toMatchObject({ code: "STATE_MOVE_REFUSED", requires: "time" });
        const rafe = byRef(stays, "WH-S3279");
        await desk.noShow(rafe.id);
        await desk.cameAfterAll(rafe.id, null);
        const back = byRef(await rows("stays"), "WH-S3279");
        expect([back["status"], back["no_show_marked_at"]]).toEqual(["booked", null]);
      }, 60_000);

      it("gives money back only with a note, and voids a charge at the price its quote said", async (ctx) => {
        needsWrites(() => ctx.skip());
        const { desk } = await deskOf(staff);
        const teo = byRef(await rows("stays"), "WH-S3283");
        expect(await refusalOf(() => desk.recordPayment(teo.id, { kind: "given_back", amount: "5.00", method: "cash" }))).toBe("VALIDATION_FAILED");
        const wine = (await rows("charges")).find((c) => c["stay_id"] === teo.id)!;
        const quote = await desk.quoteVoid("charges", wine.id);
        expect(quote.refused).toBe(false);
        await desk.voidRow("charges", wine.id, "Not theirs");
        expect(money(byRef(await rows("stays"), "WH-S3283")["total"])).toBe(money(quote.total));
      }, 60_000);

      it("holds the front desk and housekeeping to their roles", async (ctx) => {
        needsWrites(() => ctx.skip());
        const fd = await person("hotel-front-desk", `maeve.${engine}@wrenhouse.test`, "Maeve R.");
        expect(await fd.desk.me()).toEqual({ name: "Maeve R.", roles: ["front-desk"] });
        const charge = (await rows("charges"))[0]!;
        expect(await refusalOf(() => fd.desk.voidRow("charges", charge.id, "no"))).toBe("TABLE_FORBIDDEN");
        const teo = byRef(await rows("stays"), "WH-S3283");
        expect(await refusalOf(() => fd.t.mutate(`/api/v1/data/${fd.cfg.connectionId!}/${fd.cfg.tables["stays"]!}/${String(teo.id)}`, "PATCH", { values: { total: "1.00" } }))).toBe("COLUMN_FORBIDDEN");
        const hk = await person("hotel-housekeeping", `jory.${engine}@wrenhouse.test`, "Jory");
        const seen = await hk.desk.stays();
        expect(seen.length).toBeGreaterThan(40);
        for (const s of seen) for (const c of ["first_name", "last_name", "email", "mobile", "total"]) expect(s.stay[c], c).toBeUndefined();
        expect(seen.every((s) => s.charges.length === 0 && s.payments.length === 0)).toBe(true);
        expect(await refusalOf(() => hk.t.get(`/api/v1/data/${hk.cfg.connectionId!}/${hk.cfg.tables["stays"]!}?limit=3&select=first_name`))).toBe("COLUMN_FORBIDDEN");
      }, 120_000);

      it("gives one room to one of two desks asking at once, checks one guest in once, and sells the last room once", async (ctx) => {
        needsWrites(() => ctx.skip());
        const a = (await deskOf(staff)).desk;
        const b = (await deskOf(staff)).desk;
        const stays = await rows("stays");
        const rooms = await rows("rooms");
        // Hugo (Sat–Mon) and Beatrix (Sun–Thu) share Sunday night: room 301 to both at once, one of them.
        const room301 = rooms.find((r) => r["number"] === "301")!;
        const given = await Promise.allSettled([a.giveRoom(byRef(stays, "WH-S3306").id, room301.id), b.giveRoom(byRef(stays, "WH-S3307").id, room301.id)]);
        expect(given.map((g) => g.status).sort()).toEqual(["fulfilled", "rejected"]);
        // Priya checked in by two desks at once: once, and her room occupied once.
        const closed = new Set((await rows("room_closures")).filter((c) => c["active"] !== false && c["active"] !== 0).map((c) => c["room_id"]));
        const priya = byRef(stays, "WH-S3303");
        const ready = (await rows("rooms")).find((r) => r["room_type_id"] === priya["room_type_id"] && r["status"] === "ready" && !closed.has(r.id))!;
        const checked = await Promise.allSettled([a.checkIn(priya.id, ready.id), b.checkIn(priya.id, ready.id)]);
        expect(checked.map((c) => c.status).sort()).toEqual(["fulfilled", "rejected"]);
        expect([byRef(await rows("stays"), "WH-S3303")["status"], (await rows("rooms")).find((r) => r.id === ready.id)!["status"]]).toEqual(["in_house", "occupied"]);
        // Two guests, the Harbour doubles left for Mon 3 → Wed 5 August and one more each: never more than there are.
        const guests = await Promise.all([guestOf(), guestOf()]);
        const harbour = (await rows("room_types")).find((t) => t["name"] === "Harbour double")!;
        const left = (await guests[0]!.availability({ from: "2026-08-03", to: "2026-08-05", guests: 2 })).types.find((x) => x.pool === String(harbour.id))!.left ?? 0;
        const reserve = (g: AdminiumGuest, i: number) =>
          g.reserve({ values: { room_type_id: harbour.id, arrive: "2026-08-03", depart: "2026-08-05", guests: 2, first_name: "Last", last_name: SURNAMES[i]!, email: `last.room${String(i)}.${engine}@wrenhouse.test` }, children: { stay_extras: [] } }, `${String(i)}`.repeat(43));
        const asked = Array.from({ length: left + 1 }, (_, i) => i);
        const made = await Promise.allSettled(asked.map((i) => reserve(guests[i % 2]!, i)));
        expect(made.filter((m) => m.status === "fulfilled").length).toBe(left);
        expect(made.filter((m) => m.status === "rejected").map((m) => (m as PromiseRejectedResult).reason.code)).toEqual(["PUBLIC_NO_ROOM"]);
      }, 180_000);

      /** The next email to an address the server's mail sink holds, after the `after`-th it held. */
      const sinkCount = async () => ((await (await fetch(`${server.sink}/messages`)).json()) as unknown[]).length;
      const mailTo = async (to: string, after: number) =>
        until(async () => {
          const all = (await (await fetch(`${server.sink}/messages`)).json()) as { to: string[]; subject: string; text: string }[];
          return all.slice(after).find((m) => m.to.includes(to));
        }, `an email to ${to}`, 150_000);
      const codeIn = (text: string) => /\b(\d{6})\b/.exec(text)?.[1] ?? "";
      /** Two guests with a stay each, made online, and their own links. */
      const pair = { a: { email: `ines.${engine}@wrenhouse.dev`, id: 0, token: "" }, b: { email: `piet.${engine}@wrenhouse.dev`, id: 0, token: "" } };

      it("keeps each guest to their own stays, whether signed in or by a stay's own link", async (ctx) => {
        needsWrites(() => ctx.skip());
        const types = await rows("room_types");
        const garden = types.find((t) => t["name"] === "Garden double")!;
        const breakfast = (await rows("extras")).find((e) => e["code"] === "BRK")!;
        for (const [who, first, last] of [["a", "Ines", "Ortega"], ["b", "Piet", "Vos"]] as const) {
          const r = await (await guestOf()).reserve(
            { values: { room_type_id: garden.id, arrive: "2026-08-17", depart: "2026-08-20", guests: 2, first_name: first, last_name: last, email: pair[who].email, arrival_time: "17:00", language: who === "a" ? "fr-FR" : "en-US" }, children: { stay_extras: [{ values: { extra_id: breakfast.id } }] } },
            who.repeat(43),
          );
          pair[who].id = r.data.id;
          pair[who].token = r.link!.token;
        }
        // A signs in with the code her email carries.
        const a = await guestOf();
        const before = await sinkCount();
        await a.requestSignIn(pair.a.email, "fr-FR");
        const signIn = await mailTo(pair.a.email, before);
        expect(signIn.subject).toContain("Wren House");
        // Until the core reads a person their own details, the door says so after the session is made (checked below).
        await a.verifyCode(pair.a.email, codeIn(signIn.text)).catch((error: { code?: string }) => expect(["PUBLIC_UPSTREAM_UNAVAILABLE", "PUBLIC_QUERY_REFUSED"]).toContain(error.code));
        expect((await a.myStays()).map((s) => s.stay.id)).toEqual([pair.a.id]);
        // B's stay, as A, by every door: as if it were not there.
        expect(await refusalOf(() => a.changeStay(pair.b.id, { arrival_time: "18:00" }))).toBe("PUBLIC_REF_NOT_FOUND");
        expect(await refusalOf(() => a.changeStay(pair.b.id, { status: "cancelled", cancel_code: "self" }))).toBe("PUBLIC_REF_NOT_FOUND");
        expect(await refusalOf(() => a.quoteDates(pair.b.id, "2026-08-18", "2026-08-21"))).toBe("PUBLIC_REF_NOT_FOUND");
        expect(await refusalOf(() => a.newLink(pair.b.id))).toBe("PUBLIC_REF_NOT_FOUND");
        expect(await refusalOf(() => a.addExtra(pair.b.id, breakfast.id))).not.toBe("WROTE");
        // A's own dates, priced again with the extras following them; her arrival time, which cancels nothing.
        const quote = await a.quoteDates(pair.a.id, "2026-08-18", "2026-08-21");
        expect(quote.children?.stay_extras?.map((l) => Number(l.data["nights"]))).toEqual([3]);
        expect(String((await a.moveDates(pair.a.id, "2026-08-18", "2026-08-21", money(quote.data["total"])))["arrive"])).toBe("2026-08-18");
        await a.changeStay(pair.a.id, { arrival_time: "19:00" });
        expect((await rows("stays")).find((s) => s.id === pair.a.id)!["cancel_code"]).toBeNull();
        // Her stay's own link opens it; a new link stops the old one, and the tab it had opened.
        const byLink = await guestOf();
        await byLink.openLink(pair.a.token);
        await a.newLink(pair.a.id);
        expect(await refusalOf(() => byLink.linkedStay())).toBe("PUBLIC_REF_NOT_FOUND");
        expect(await refusalOf(async () => (await guestOf()).openLink(pair.a.token))).toBe("LINK_EXPIRED");
        // B's link opens B, and never A.
        const b = await guestOf();
        await b.openLink(pair.b.token);
        expect(await refusalOf(() => b.changeStay(pair.a.id, { arrival_time: "20:00" }))).toBe("PUBLIC_REF_NOT_FOUND");
        // Signed out everywhere: nothing of A's opens with that session.
        await a.signOutEverywhere();
        expect(await refusalOf(() => a.myStays())).toBe("PUBLIC_REF_NOT_FOUND");
      }, 420_000);

      /** B, signed in once for both of the next two (a sign-in is asked for only so often). */
      let signedB: AdminiumGuest | null = null;
      const bSignedIn = async () => {
        if (signedB !== null) return signedB;
        const b = await guestOf();
        const before = await sinkCount();
        await b.requestSignIn(pair.b.email);
        await b.verifyCode(pair.b.email, codeIn((await mailTo(pair.b.email, before)).text)).catch(() => undefined);
        signedB = b;
        return b;
      };

      it("reads a signed-in guest their own details", async (ctx) => {
        needsWrites(() => ctx.skip());
        expect(await (await bSignedIn()).signedIn()).toMatchObject({ email: pair.b.email, name: "Piet Vos" });
      }, 240_000);

      it("deletes a guest's details at his asking: the account emptied, his stays keep theirs, their links stop", async (ctx) => {
        needsWrites(() => ctx.skip());
        const b = await bSignedIn();
        await b.forget();
        expect((await rows("customers")).filter((c) => c["last_name"] === "Vos")).toEqual([]);
        const stay = (await rows("stays")).find((s) => s.id === pair.b.id)!;
        expect([stay["first_name"], stay["email"]]).toEqual(["Piet", pair.b.email]);
        expect(await refusalOf(async () => (await guestOf()).openLink(pair.b.token))).toBe("LINK_EXPIRED");
      }, 240_000);

      it("prints a folio through Invoices & Receipts, and emails one with the document in the guest's language", async (ctx) => {
        needsWrites(() => ctx.skip());
        if (!withInvoices()) ctx.skip();
        const { desk } = await deskOf(staff);
        const teo = byRef(await rows("stays"), "WH-S3283");
        const printed = await desk.printFolio(teo.id);
        const page = String((await staff.get(printed.url!)).body);
        const figure = (value: unknown) => Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        for (const words of ["WH-S3283", "301", figure(teo["total"]), figure(teo["balance"])]) expect(page, words).toContain(words);
        // Ines's stay (made online, in French), its folio so far.
        const before = await sinkCount();
        await desk.emailFolio(pair.a.id, true);
        const mail = await mailTo(pair.a.email, before);
        expect(mail.subject).toContain("note du séjour");
        expect((mail as unknown as { attachments: { contentType: string }[] }).attachments.length).toBeGreaterThan(0);
      }, 240_000);

      it("removes the sample", async (ctx) => {
        needsWrites(() => ctx.skip());
        const plan = ok(await staff.post<{ total: number }>("/api/v1/apps/hotel/sample-data/remove-plan"));
        expect(plan.total).toBeGreaterThan(0);
        // A sample row the desk has changed is the house's now, and stays (a cancelled or checked-out stay is locked anyway).
        ok(await staff.post("/api/v1/apps/hotel/sample-data/remove", { keepChanged: true }));
        expect(ok(await staff.get<{ loaded: boolean }>("/api/v1/apps/hotel/sample-data")).loaded).toBe(false);
        const touched = new Set(["WH-S3279", "WH-S3283", "WH-S3284", "WH-S3292", "WH-S3303", "WH-S3304", "WH-S3306", "WH-S3307", "WH-S3322"]);
        const left = (await rows("stays")).filter((s) => String(s["ref"]).startsWith("WH-S")).map((s) => String(s["ref"]));
        expect(left.filter((ref) => !touched.has(ref))).toEqual([]);
        expect(left.length).toBeGreaterThan(0);
      }, 120_000);
    });
  });
});
