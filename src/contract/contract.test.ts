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
import { publicRefs } from "../data/publicRefs.ts";
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
        // A suggested add-on is installed with the app only when the install lists it (the box the operator ticks).
        const listed: { key: string; version: string }[] = [];
        if (invoices) {
          const addOn = addOnBundle();
          ok(await staff.post(`/api/v1/add-ons/upload?expectedSha512=${encodeURIComponent(addOn.integrity)}`, addOn.buffer));
          listed.push({ key: addOn.key, version: addOn.version });
        }
        const app = appBundle();
        const staged = await staff.post(`/api/v1/apps/upload?expectedSha512=${encodeURIComponent(app.integrity)}`, app.buffer);
        expect([200, 201], JSON.stringify(staged.body).slice(0, 800)).toContain(staged.status);
        const body = { key: app.key, version: app.version, connectionId };
        const plan = ok(await staff.post<{ plan: { installable: boolean; checksum: string; addOns: { key: string; need: string; checked: boolean }[] } }>("/api/v1/apps/plan", body)).plan;
        expect(plan.installable).toBe(true);
        // Invoices & Receipts is offered, ticked, for the folio; nothing waits on it.
        // Inventory and Offers & gift cards are offered unticked: this contract installs neither, and the house runs as it always has.
        expect(plan.addOns.map((a) => [a.key, a.checked])).toEqual([["invoices", true], ["inventory", false], ["offers", false]]);
        const installed = ok(
          await staff.post<{ rules: { skipped: unknown[] }; schema: { created: string[] }; publicAccess: { keys: Record<string, string> }; outbox: { defined: boolean } }>(
            "/api/v1/apps/install",
            { ...body, planChecksum: plan.checksum, addOns: listed },
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
            // A mobile as guests type one, and a note with times and numbers in it: both must go through.
            mobile: "(207) 555-0150",
            note: "On the 18:40 ferry, so after 9pm. Room 12 again if it is free; 2 of us.",
            arrival_time: "16:00",
            client_key: "c".repeat(43),
          },
          children: { stay_extras: [{ values: { extra_id: extras.find((e) => e["code"] === "BRK")!.id } }] },
        };
        const quote = ok(await guest.post<{ data: Record<string, unknown> }>(`/api/v1/public/records/${door}/dry-run`, body)).data;
        expect(money(quote["total"])).toBe("440.36");
        // A mobile no phone could ring, a name with a digit in it, and one carrying a web address: refused, each naming its column.
        for (const [column, value] of [["mobile", "ring me at the desk"], ["last_name", "Marsh 3"], ["first_name", "Elin wrenhouse.com"]] as const) {
          const refused = await guest.post<{ error: { code: string; params?: { column?: string } } }>(`/api/v1/public/records/${door}/dry-run`, { ...body, values: { ...body.values, [column]: value } });
          expect([refused.status, refused.body.error?.code, refused.body.error?.params?.column], `${column}: ${JSON.stringify(refused.body).slice(0, 300)}`).toEqual([400, "PUBLIC_WRITE_REFUSED", column]);
        }
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
          installId: cfg.installId,
          staff: { csrfToken: cfg.csrfToken, timezone: cfg.timezone, timezoneSource: cfg.timezoneSource, serverTimezone: cfg.serverTimezone, currency: cfg.currency },
          fetchImpl: fetchAs,
        });
        // The screens read before they write: that read takes the session's write token.
        await t.port.config();
        return { desk: new AdminiumDesk(t, cfg), t, cfg };
      };
      const customerConfig = async () => ok(await new Caller(server.base).get<{ publishableKey: string; publicKeys?: Record<string, string>; tables: Record<string, string> }>("/apps/hotel/customer/surface-config.json"));
      /** A guest's page: its own tab, the house's keys. `sent` hears each session the page sends, by the key it goes with. */
      const guestOf = async (sent?: Map<string, string>) => {
        const c = await customerConfig();
        const fetchIn: typeof fetch = (input, init) => {
          const headers = new Headers(init?.headers);
          headers.set("origin", server.base);
          const session = headers.get("x-adminium-public-session");
          if (sent !== undefined && session !== null) sent.set(headers.get("authorization") ?? "", session);
          return fetch(new URL(String(input), server.base), { ...init, headers });
        };
        return new AdminiumGuest({ baseUrl: server.base, publishableKey: c.publishableKey, publicKeys: c.publicKeys ?? {}, tables: c.tables }, { fetch: fetchIn, storage: null });
      };
      /**
       * The public doors as a page writing its own requests would use them — a key, a session, a ref — so a
       * check reaches the door it names, whatever the app's own routing would have chosen.
       */
      const rawDoor = async () => {
        const c = await customerConfig();
        const refs = publicRefs(c.tables);
        const call = async (key: string, session: string | undefined, path: string, init: { method?: string; body?: unknown } = {}) => {
          const res = await fetch(new URL(path, server.base), {
            method: init.method ?? "GET",
            headers: { authorization: `Bearer ${key}`, origin: server.base, "content-type": "application/json", ...(session === undefined ? {} : { "x-adminium-public-session": session }) },
            ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
          });
          return { status: res.status, body: (await res.json().catch(() => ({}))) as { data?: Row[] | Row; error?: { code?: string } } };
        };
        return { keys: { customer: c.publishableKey, link: c.publicKeys?.["link"] ?? "" }, refs, call };
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
        // Sent again (a reply that never came): the credit already made is found, and no second one is.
        await desk.takeOffNights(ros.id, "2026-07-28");
        expect((await rows("stay_credits")).filter((c) => c["stay_id"] === ros.id).length).toBe(1);
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

      it("gives money back online only as a given-back row naming the payment: its stay is the payment's, and one not taken online is not sent", async (ctx) => {
        needsWrites(() => ctx.skip());
        const { desk } = await deskOf(staff);
        const teo = byRef(await rows("stays"), "WH-S3283");
        const card = (await rows("payments")).find((p) => p["stay_id"] === teo.id && p["method"] === "card" && p["kind"] === "taken")!;
        const paidBefore = money(teo["paid"]);
        // The row Adminium writes itself after a cancellation in time names only the payment: the stay is copied from it.
        const made = ok(await staff.post<{ data: Row }>(data("payments"), { values: { kind: "given_back", method: "online", refund_of: card.id, amount: "5.00", note: "A night's breakfast" } }), 201).data;
        expect([made["stay_id"], made["refund_of"]]).toEqual([teo.id, card.id]);
        // A payment taken at the desk cannot be given back online: Adminium says the refund was not sent, and it counts nothing.
        const stamped = await until(async () => {
          const found = (await rows("payments")).find((p) => p.id === made.id)!;
          return found["refund_state"] === null || found["refund_state"] === undefined ? undefined : found;
        }, "the refund row stamped", 120_000);
        expect([stamped["refund_state"], money(stamped["signed"])]).toEqual(["not-sent", "0.00"]);
        expect(money(byRef(await rows("stays"), "WH-S3283")["paid"])).toBe(paidBefore);
        // Nobody types what only a payment fills, and the desk records nothing as online.
        const forged = await staff.post<{ error?: { code?: string } }>(data("payments"), { values: { stay_id: teo.id, kind: "taken", method: "card", amount: "1.00", payment_ref: "pi_forged" } });
        expect(forged.status).toBeGreaterThanOrEqual(400);
        expect(desk).toBeDefined();
      }, 180_000);

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
        // The guest's tick for the house's news is theirs alone: the desk records none, on a booking it takes or one it changes.
        expect(await refusalOf(() => fd.t.mutate(`/api/v1/data/${fd.cfg.connectionId!}/${fd.cfg.tables["stays"]!}/${String(teo.id)}`, "PATCH", { values: { opt_in: true } }))).toBe("COLUMN_FORBIDDEN");
        const fdHouse = await fd.desk.house();
        const deskBody = {
          values: { room_type_id: fdHouse.types.find((x) => x["name"] === "Garden double")!.id, arrive: "2026-08-24", depart: "2026-08-26", guests: 2, first_name: "Wren", last_name: "Tally", email: `wren.${engine}@wrenhouse.test`, language: "en-US" },
          children: { stay_extras: [] },
        };
        expect(await refusalOf(() => fd.desk.book({ ...deskBody, values: { ...deskBody.values, opt_in: true } }))).toBe("COLUMN_FORBIDDEN");
        expect((await rows("stays")).some((st) => st["email"] === `wren.${engine}@wrenhouse.test`)).toBe(false);
        // Nor does the manager, who may change everything else a person types on a reservation.
        const mgr = await person("hotel-manager", `osk.${engine}@wrenhouse.test`, "Osk");
        expect(await refusalOf(() => mgr.t.mutate(`/api/v1/data/${mgr.cfg.connectionId!}/${mgr.cfg.tables["stays"]!}/${String(teo.id)}`, "PATCH", { values: { opt_in: true } }))).toBe("COLUMN_FORBIDDEN");
        // A stay that already has a credit (none of its nights, so its money stands): the front desk still gets Adminium's quote
        // for leaving early — its credits go back as they are — and may change none of them.
        const staying = (await rows("stays")).find((st) => st["status"] === "in_house" && String(st["depart"]) > "2026-07-30")!;
        const { t, cfg } = await deskOf(staff);
        const missed = (await t.mutate<{ data: Row }>(`/api/v1/data/${cfg.connectionId!}/${cfg.tables["stay_credits"]!}`, "POST", { values: { stay_id: staying.id, reason: "missed", from_date: "2026-07-28", to_date: "2026-07-28" } })).data;
        expect(await refusalOf(() => fd.desk.quoteTakeOff(staying.id, "2026-07-28"))).toBe("WROTE");
        expect(await refusalOf(() => fd.t.mutate(`/api/v1/data/${fd.cfg.connectionId!}/${fd.cfg.tables["stay_credits"]!}/${String(missed.id)}`, "PATCH", { values: { voided: true } }))).toBe("COLUMN_FORBIDDEN");
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
      /** The first email to `to` since `after` whose subject matches: a mail queued by an earlier step may land late. */
      const mailTo = async (to: string, after: number, subject: RegExp) =>
        until(async () => {
          const all = (await (await fetch(`${server.sink}/messages`)).json()) as { to: string[]; subject: string; text: string }[];
          return all.slice(after).find((m) => m.to.includes(to) && subject.test(m.subject));
        }, `an email to ${to} (${subject.source})`, 150_000);
      const SIGN_IN = /sign-in link|lien de connexion/;
      const codeIn = (text: string) => /\b(\d{6})\b/.exec(text)?.[1] ?? "";
      /** Two guests with a stay each, made online, and their own links. */
      const pair = { a: { email: `ines.${engine}@wrenhouse.dev`, id: 0, token: "" }, b: { email: `piet.${engine}@wrenhouse.dev`, id: 0, token: "" } };

      it("keeps each guest to their own stays, whether signed in or by a stay's own link", async (ctx) => {
        needsWrites(() => ctx.skip());
        const types = await rows("room_types");
        const garden = types.find((t) => t["name"] === "Garden double")!;
        const extras = await rows("extras");
        const breakfast = extras.find((e) => e["code"] === "BRK")!;
        const parking = extras.find((e) => e["code"] === "PRK")!;
        const door = await rawDoor();
        const linesOf = async (stayId: unknown) => (await rows("stay_extras")).filter((l) => l["stay_id"] === stayId);
        for (const [who, first, last] of [["a", "Ines", "Ortega"], ["b", "Piet", "Vos"]] as const) {
          const r = await (await guestOf()).reserve(
            { values: { room_type_id: garden.id, arrive: "2026-08-17", depart: "2026-08-20", guests: 2, first_name: first, last_name: last, email: pair[who].email, arrival_time: "17:00", language: who === "a" ? "fr-FR" : "en-US" }, children: { stay_extras: [{ values: { extra_id: breakfast.id } }] } },
            who.repeat(43),
          );
          pair[who].id = r.data.id;
          pair[who].token = r.link!.token;
        }
        // A signs in with the code her email carries.
        const aSent = new Map<string, string>();
        const a = await guestOf(aSent);
        const before = await sinkCount();
        await a.requestSignIn(pair.a.email, "fr-FR");
        const signIn = await mailTo(pair.a.email, before, SIGN_IN);
        expect(signIn.subject).toContain("Wren House");
        await a.verifyCode(pair.a.email, codeIn(signIn.text));
        expect((await a.myStays()).map((s) => s.stay.id)).toEqual([pair.a.id]);
        // B's stay, as A, by every door: as if it were not there.
        expect(await refusalOf(() => a.changeStay(pair.b.id, { arrival_time: "18:00" }))).toBe("PUBLIC_REF_NOT_FOUND");
        expect(await refusalOf(() => a.changeStay(pair.b.id, { status: "cancelled", cancel_code: "self" }))).toBe("PUBLIC_REF_NOT_FOUND");
        expect(await refusalOf(() => a.quoteDates(pair.b.id, "2026-08-18", "2026-08-21"))).toBe("PUBLIC_REF_NOT_FOUND");
        expect(await refusalOf(() => a.newLink(pair.b.id))).toBe("PUBLIC_REF_NOT_FOUND");
        // An extra B does not have (so no rule of B's own could be what refuses it), and B's own line.
        expect(await refusalOf(() => a.addExtra(pair.b.id, parking.id))).not.toBe("WROTE");
        const bLine = (await linesOf(pair.b.id)).find((l) => l["extra_id"] === breakfast.id)!;
        expect(await refusalOf(() => a.setExtra(bLine.id, "off", pair.b.id))).not.toBe("WROTE");
        expect((await linesOf(pair.b.id)).map((l) => [l["extra_id"], l["state"]])).toEqual([[breakfast.id, "on"]]);
        // What A's session reads, row by row, through every door of hers: nothing of another stay's.
        const aSession = aSent.get(`Bearer ${door.keys.customer}`)!;
        expect(aSession).toBeTruthy();
        const others = new Set((await rows("stays")).filter((st) => st.id !== pair.a.id).map((st) => st.id));
        expect(others.size).toBeGreaterThan(10);
        for (const ref of [door.refs.myStays, door.refs.myExtras, door.refs.myCharges, door.refs.myCredits, door.refs.myPayments]) {
          const got = await door.call(door.keys.customer, aSession, `/api/v1/public/records/${ref}?limit=200`);
          expect(got.status, ref).toBe(200);
          const read = (got.body.data ?? []) as Row[];
          expect(read.filter((row) => others.has((ref === door.refs.myStays ? row.id : row["stay_id"]) as Row["id"])), ref).toEqual([]);
        }
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
        // B's link opens B, and never A: A's stay asked for, changed and added to through the link door itself.
        const bSent = new Map<string, string>();
        const b = await guestOf(bSent);
        await b.openLink(pair.b.token);
        const bLink = bSent.get(`Bearer ${door.keys.link}`)!;
        expect(bLink).toBeTruthy();
        expect((await door.call(door.keys.link, bLink, `/api/v1/public/records/${door.refs.linkStay}/${String(pair.a.id)}`)).status).toBe(404);
        expect((await door.call(door.keys.link, bLink, `/api/v1/public/records/${door.refs.linkStay}/${String(pair.a.id)}`, { method: "PATCH", body: { values: { arrival_time: "20:00" } } })).status).toBe(404);
        expect((await door.call(door.keys.link, bLink, `/api/v1/public/records/${door.refs.linkExtras}`, { method: "POST", body: { values: { stay_id: pair.a.id, extra_id: parking.id } } })).status).toBeGreaterThanOrEqual(400);
        expect((await rows("stays")).find((st) => st.id === pair.a.id)!["arrival_time"]).toBe("19:00");
        expect((await linesOf(pair.a.id)).some((l) => l["extra_id"] === parking.id)).toBe(false);
        // Signed out everywhere: the session A held, sent again as it was, opens nothing.
        await a.signOutEverywhere();
        expect(await refusalOf(() => a.myStays())).toBe("PUBLIC_REF_NOT_FOUND");
        const replayed = await door.call(door.keys.customer, aSession, `/api/v1/public/records/${door.refs.myStays}`);
        expect(replayed.status).not.toBe(200);
        expect((replayed.body.data ?? []) as Row[]).toEqual([]);
      }, 420_000);

      /** B, signed in once for the next few (a sign-in is asked for only so often); the session his page sends, by key. */
      let signedB: AdminiumGuest | null = null;
      const bSessions = new Map<string, string>();
      const bSignedIn = async () => {
        if (signedB !== null) return signedB;
        const b = await guestOf(bSessions);
        const before = await sinkCount();
        await b.requestSignIn(pair.b.email);
        await b.verifyCode(pair.b.email, codeIn((await mailTo(pair.b.email, before, SIGN_IN)).text));
        signedB = b;
        return b;
      };

      it("reads a signed-in guest their own details", async (ctx) => {
        needsWrites(() => ctx.skip());
        expect(await (await bSignedIn()).signedIn()).toMatchObject({ email: pair.b.email, name: "Piet Vos" });
      }, 240_000);

      // ── the newsletter's tick, kept in Adminium's consent log ──

      type Panel = { declared: boolean; purposes: { purpose: string; state: string }[]; history: { state: string; source: string; detail: string | null; wordingVersion: string | null }[] };
      /** How a guest stands in the consent log, as the record page's panel reads it. */
      const panelOf = async (customerId: unknown) =>
        ok(await staff.post<{ data: Panel }>("/api/v1/consent/panel", { connectionId, table: tableIds["customers"]!, recordId: String(customerId) })).data;
      const said = (panel: Panel) => panel.history.map((e) => [e.state, e.source, e.detail, e.wordingVersion]);
      const newsOf = (panel: Panel) => panel.purposes.find((p) => p.purpose === "newsletter")!.state;
      const ticked = (value: unknown) => value === true || value === 1 || value === "1";
      /** A reservation as the guest site makes it, through the app's own door: the tick given or not. */
      const reserveAs = async (email: string, first: string, last: string, language: string, tick: boolean, arrive: string, g?: AdminiumGuest) => {
        const garden = (await rows("room_types")).find((t) => t["name"] === "Garden double")!;
        const depart = new Date(Date.parse(`${arrive}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
        const made = await (g ?? (await guestOf())).reserve(
          { values: { room_type_id: garden.id, arrive, depart, guests: 1, first_name: first, last_name: last, email, language, opt_in: tick }, children: { stay_extras: [] } },
          `${email}-${arrive}`.replace(/[^A-Za-z0-9]/g, "").padEnd(43, "k").slice(0, 64),
        );
        const stay = (await rows("stays")).find((st) => st.id === made.data.id)!;
        return { stay, customer: (await rows("customers")).find((c) => c.id === stay["customer_id"])! };
      };

      it("keeps a stranger's tick in the consent log, for the guest the address makes, in the reservation's language", async (ctx) => {
        needsWrites(() => ctx.skip());
        const email = `noor.${engine}@wrenhouse.dev`;
        const made = await reserveAs(email, "Noor", "Haddad", "fr-FR", true, "2026-09-01");
        // A guest met for the first time: named, in the reservation's language, with the newsletter's yes.
        expect([ticked(made.stay["opt_in"]), made.customer["email"], made.customer["full_name"], made.customer["language"], ticked(made.customer["opt_in"])]).toEqual([true, email, "Noor Haddad", "fr-FR", true]);
        // One row in the log: from the form, the wording shown and its language — kept for the guest, never the reservation.
        const panel = await panelOf(made.customer.id);
        expect([panel.declared, newsOf(panel), said(panel)]).toEqual([true, "yes", [["yes", "form", "hotel:stays", "v1 fr-FR"]]]);
      }, 240_000);

      it("writes nothing for a box left unticked, and still sends the confirmation to a guest on the do-not-email list: it is service mail", async (ctx) => {
        needsWrites(() => ctx.skip());
        const email = `omar.${engine}@wrenhouse.dev`;
        ok(await staff.post("/api/v1/consent/stop-list", { addresses: [email] }));
        const before = await sinkCount();
        const made = await reserveAs(email, "Omar", "Saleh", "en-US", false, "2026-09-01");
        expect([ticked(made.stay["opt_in"]), made.customer["full_name"], made.customer["language"], ticked(made.customer["opt_in"]), said(await panelOf(made.customer.id))]).toEqual([false, "Omar Saleh", "en-US", false, []]);
        expect((await mailTo(email, before, new RegExp(String(made.stay["ref"])))).to).toContain(email);
      }, 240_000);

      it("never lets a guest's own account set the newsletter by hand; a signed-in guest's tick is his, and a later box left unticked takes nothing back", async (ctx) => {
        needsWrites(() => ctx.skip());
        const b = await bSignedIn();
        const door = await rawDoor();
        const session = bSessions.get(`Bearer ${door.keys.customer}`)!;
        expect(session).toBeTruthy();
        const piet = (await rows("customers")).find((c) => c["email"] === pair.b.email)!;
        expect([ticked(piet["opt_in"]), piet["full_name"], piet["language"]]).toEqual([false, "Piet Vos", "en-US"]);
        // His own account, by its own door: his names are his to change, the newsletter is not.
        const byHand = await door.call(door.keys.customer, session, `/api/v1/public/records/${door.refs.account}/${String(piet.id)}`, { method: "PATCH", body: { values: { opt_in: true } } });
        expect(byHand.status).toBeGreaterThanOrEqual(400);
        expect([ticked((await rows("customers")).find((c) => c.id === piet.id)!["opt_in"]), said(await panelOf(piet.id))]).toEqual([false, []]);
        // Signed in, he reserves again and ticks: kept for him, whatever address he types, in his account's language.
        const ticked1 = await reserveAs(`someone.else.${engine}@wrenhouse.dev`, "Piet", "Vos", "de-DE", true, "2026-09-15", b);
        expect([ticked1.stay["customer_id"], ticked(ticked1.stay["opt_in"])]).toEqual([piet.id, true]);
        const yes = [["yes", "form", "hotel:stays", "v1 en-US"]];
        expect([ticked((await rows("customers")).find((c) => c.id === piet.id)!["opt_in"]), said(await panelOf(piet.id))]).toEqual([true, yes]);
        // And once more, the box left empty: nothing written, the yes he gave kept.
        const plain = await reserveAs(pair.b.email, "Piet", "Vos", "en-US", false, "2026-09-22", b);
        expect([plain.stay["customer_id"], ticked(plain.stay["opt_in"])]).toEqual([piet.id, false]);
        expect([ticked((await rows("customers")).find((c) => c.id === piet.id)!["opt_in"]), said(await panelOf(piet.id))]).toEqual([true, yes]);
      }, 240_000);

      it("deletes a guest's details at his asking: the account emptied, his stays keep theirs, their links stop", async (ctx) => {
        needsWrites(() => ctx.skip());
        const b = await bSignedIn();
        const piet = (await rows("customers")).find((c) => c["email"] === pair.b.email)!;
        await b.forget();
        expect((await rows("customers")).filter((c) => c["last_name"] === "Vos")).toEqual([]);
        // The newsletter taken back with the rest, and the log says so before the yes he gave.
        const panel = await panelOf(piet.id);
        expect([ticked((await rows("customers")).find((c) => c.id === piet.id)!["opt_in"]), newsOf(panel), said(panel)]).toEqual([
          false,
          "no",
          [
            ["no", "person", "forget", null],
            ["yes", "form", "hotel:stays", "v1 en-US"],
          ],
        ]);
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
        const mail = await mailTo(pair.a.email, before, /note du séjour/);
        expect(mail.subject).toContain("note du séjour");
        expect((mail as unknown as { attachments: { contentType: string }[] }).attachments.length).toBeGreaterThan(0);
      }, 240_000);

      it("holds a room while a guest asked to pay first pays, unseen by the desk, and lets it go at the end of the hold with nothing taken", async (ctx) => {
        needsWrites(() => ctx.skip());
        const settings = (await rows("settings"))[0]!;
        ok(await staff.patch(`${data("settings")}/${String(settings.id)}`, { values: { pay_at_booking: "required", pay_how_much: "whole_stay", pay_hold_minutes: 5 } }));
        const config = ok(await new Caller(server.base).get<{ publishableKey: string }>("/apps/hotel/customer/surface-config.json"));
        const guest = new Caller(server.base, { authorization: `Bearer ${config.publishableKey}`, origin: server.base });
        // Nobody switched the app on in Adminium's Payments: the guest site is told so, and reads as ever.
        expect(ok(await guest.get<{ data: { online: boolean } }>("/api/v1/public/payments/available")).data.online).toBe(false);
        const refs = ok(await guest.get<{ data: { refs: Record<string, { actions: string[] }> } }>("/api/v1/public/config")).data.refs;
        const first = publicRefs(real).reservePayFirst;
        expect(refs[first]?.actions).toContain("create");
        const types = await rows("room_types");
        const loft = types.find((t) => t["name"] === "Loft suite")!;
        const proof = async () => {
          const challenge = ok(await guest.get<{ data: { id: string; salt: string; difficulty: number } }>("/api/v1/public/challenge?purpose=write")).data;
          return { "x-adminium-proof": `${challenge.id}.${solve(challenge.salt, challenge.difficulty)}` };
        };
        const body = { values: { room_type_id: loft.id, arrive: "2026-08-24", depart: "2026-08-26", guests: 2, first_name: "Ines", last_name: "Hale", email: "ines.hale@wrenhouse.test", arrival_time: "16:00", client_key: "p".repeat(43) }, children: { stay_extras: [] } };
        // While payments are off nobody can be held to pay: the paying door is shut to a stranger.
        expect([(await guest.post(`/api/v1/public/records/${first}`, body, await proof())).status]).toEqual([403]);
        // Payments on, as they are for someone who manages payments rehearsing the checkout: the booking waits for its payment.
        ok(await staff.put("/api/v1/payments/rehearsal", { on: true }));
        const csrf = ok(await staff.get<{ data: { csrfToken: string } }>("/api/v1/bootstrap")).data.csrfToken;
        const rehearsing = new Caller(server.base, { authorization: `Bearer ${config.publishableKey}`, origin: server.base, cookie: staff.cookies, "x-adminium-csrf": csrf });
        const challenge = ok(await rehearsing.get<{ data: { id: string; salt: string; difficulty: number } }>("/api/v1/public/challenge?purpose=write")).data;
        const made = ok(await rehearsing.post<{ data: Row; payUrl?: string | null }>(`/api/v1/public/records/${first}`, body, { "x-adminium-proof": `${challenge.id}.${solve(challenge.salt, challenge.difficulty)}` }), 201);
        ok(await staff.put("/api/v1/payments/rehearsal", { on: false }));
        // Made waiting for its payment, its room held; the rehearsal's reply carries a test link to pay it, or none.
        expect([made.data["status"], money(made.data["pay_due"]), money(made.data["deposit"])]).toEqual(["pending_payment", money(made.data["total"]), money(made.data["total"])]);
        expect(made.payUrl === undefined || made.payUrl === null || typeof made.payUrl === "string").toBe(true);
        const held = byRef(await rows("stays"), String(made.data["ref"]));
        expect([held["status"], held["pay_now"] === true || held["pay_now"] === 1, held["pay_part"]]).toEqual(["pending_payment", true, "whole_stay"]);
        const counted = async () => {
          const answer = ok(await staff.get<{ data: { rows: { pool: string; date: string; taken: number }[] } }>(`${data("stays")}/capacity-counts?rule=0&from=2026-08-24&days=1`)).data.rows;
          return answer.find((c) => c.pool === String(loft.id))!.taken;
        };
        const whileHeld = await counted();
        // The plain reservation is not this house's door while it asks for payment first? It still is: the guest site
        // uses it only while the house takes no payments online, and the server cannot tell the two apart.
        // The hold ends: Adminium lets the room go, cancelled for want of the payment, nothing taken.
        await server.setClock(DEMO_START + 30 * 60_000);
        const gone = await until(async () => {
          const found = byRef(await rows("stays"), String(made.data["ref"]));
          return found["status"] === "cancelled" ? found : undefined;
        }, "the stay let go at the end of its hold", 150_000);
        expect([gone["cancel_code"], gone["pay_lapsed"] === true || gone["pay_lapsed"] === 1, money(gone["paid"] ?? 0)]).toEqual(["unpaid", true, "0.00"]);
        expect(await counted()).toBe(whileHeld - 1);
        ok(await staff.patch(`${data("settings")}/${String(settings.id)}`, { values: { pay_at_booking: "none" } }));
      }, 240_000);

      it("books nobody unpaid while paying first is required and payments are on, and books as ever while they are off — whoever calls", async (ctx) => {
        needsWrites(() => ctx.skip());
        const settings = (await rows("settings"))[0]!;
        ok(await staff.patch(`${data("settings")}/${String(settings.id)}`, { values: { pay_at_booking: "required", pay_how_much: "whole_stay" } }));
        const config = ok(await new Caller(server.base).get<{ publishableKey: string }>("/apps/hotel/customer/surface-config.json"));
        const key = { authorization: `Bearer ${config.publishableKey}`, origin: server.base };
        const refs = publicRefs(real);
        const types = await rows("room_types");
        const garden = types.find((t) => t["name"] === "Garden double")!;
        let n = 0;
        const book = async (caller: Caller, ref: string, more: Record<string, unknown> = {}) => {
          n += 1;
          const challenge = ok(await caller.get<{ data: { id: string; salt: string; difficulty: number } }>("/api/v1/public/challenge?purpose=write")).data;
          const body = { values: { room_type_id: garden.id, arrive: "2026-09-07", depart: "2026-09-08", guests: 2, first_name: "Cora", last_name: "Venn", email: `cora.venn${String(n)}@wrenhouse.test`, arrival_time: "16:00", client_key: `${"g".repeat(40)}${String(n).padStart(3, "0")}`, ...more }, children: { stay_extras: [] } };
          return caller.post<{ data?: Row; error?: { code?: string } }>(`/api/v1/public/records/${ref}`, body, { "x-adminium-proof": `${challenge.id}.${solve(challenge.salt, challenge.difficulty)}` });
        };
        const said = (reply: { status: number; body: { data?: Row; error?: { code?: string } } }) => [reply.status, reply.body.error?.code ?? reply.body.data?.["status"]];
        // Payments off (no service live, the app not switched on): paying first is required and impossible, so the
        // house books as it always did — through the one door open for that, never the paying one.
        const stranger = new Caller(server.base, key);
        expect(said(await book(stranger, refs.reserve))).toEqual([403, "PUBLIC_SWITCHED_OFF"]);
        expect(said(await book(stranger, refs.reservePayFirst))).toEqual([403, "PUBLIC_SWITCHED_OFF"]);
        expect(said(await book(stranger, refs.reserveRequiredOff))).toEqual([201, "booked"]);
        // Payments on, as they are for someone who manages payments rehearsing the checkout: the only booking a
        // caller can make waits for its payment; the unpaid doors are shut, whatever is sent through them.
        ok(await staff.put("/api/v1/payments/rehearsal", { on: true }));
        const csrf = ok(await staff.get<{ data: { csrfToken: string } }>("/api/v1/bootstrap")).data.csrfToken;
        const rehearsing = new Caller(server.base, { ...key, cookie: staff.cookies, "x-adminium-csrf": csrf });
        expect(said(await book(rehearsing, refs.reserve))).toEqual([403, "PUBLIC_SWITCHED_OFF"]);
        expect(said(await book(rehearsing, refs.reserveRequiredOff))).toEqual([403, "PUBLIC_SWITCHED_OFF"]);
        expect(said(await book(rehearsing, refs.reservePay))).toEqual([403, "PUBLIC_SWITCHED_OFF"]);
        // Which state a booking starts in is the door's, never the caller's.
        expect((await book(rehearsing, refs.reservePayFirst, { status: "booked" })).status).toBe(400);
        expect(said(await book(rehearsing, refs.reservePayFirst))).toEqual([201, "pending_payment"]);
        ok(await staff.put("/api/v1/payments/rehearsal", { on: false }));
        ok(await staff.patch(`${data("settings")}/${String(settings.id)}`, { values: { pay_at_booking: "none" } }));
      }, 180_000);

      // ── texts: the box, the number they go to, and what Adminium does with none connected ──

      /** A guest's reservation through the app's own door, with a mobile and the box for texts as given: the first room type open those nights. */
      const reserveWithBox = async (email: string, first: string, arrive: string, depart: string, mobile: string, box: boolean, offers = false) => {
        const types = await rows("room_types");
        let reason = "";
        for (const type of types) {
          try {
            const made = await (await guestOf()).reserve(
              { values: { room_type_id: type.id, arrive, depart, guests: 1, first_name: first, last_name: "Wren", email, mobile, arrival_time: "16:00", language: "en-US", texts_ok: box, offers_ok: offers }, children: { stay_extras: [] } },
              `${email}-${arrive}`.replace(/[^A-Za-z0-9]/g, "").padEnd(43, "t").slice(0, 64),
            );
            const stay = (await rows("stays")).find((st) => st.id === made.data.id)!;
            return { stay, customer: (await rows("customers")).find((c) => c.id === stay["customer_id"])! };
          } catch (error) {
            reason = String((error as { code?: string }).code ?? error);
          }
        }
        throw new Error(`no room type was open ${arrive} → ${depart}: ${reason}`);
      };
      const messagesOf = async (stayId: unknown, kind: string) => (await rows("messages")).filter((m) => m["stay_id"] === stayId && m["kind"] === kind);
      type Purpose = { state: string; answer: { source: string; how: string | null; by: { id: string; label: string } | null; wordingVersion: string | null } | null };
      /** Where the person on a stay stands on the house's texts, for the mobile on it, as Adminium reads it back. */
      const standingOf = async (stayId: unknown) =>
        ok(
          await staff.get<{ data: { app: string | null; ready: boolean; service: Purpose; marketing: Purpose } }>(
            `/api/v1/texts/consent?${new URLSearchParams({ connection: connectionId, table: tableIds["stays"]!, row: String(stayId), column: "mobile" }).toString()}`,
          ),
        ).data;
      const textSaid = (p: Purpose) => [p.state, p.answer?.source ?? null, p.answer?.wordingVersion ?? null];

      it("keeps the box for texts as the guest left it, and texts the number they last ticked it for", async (ctx) => {
        needsWrites(() => ctx.skip());
        const email = `wren.${engine}@wrenhouse.dev`;
        // Numbers with their country, as the house has no country of its own set here. Left empty: the reservation goes as ever, nothing is asked of the log, and the guest has no number for offers.
        const plain = await reserveWithBox(email, "Ada", "2026-09-14", "2026-09-15", "+1 207 555 0101", false);
        expect([ticked(plain.stay["texts_ok"]), ticked(plain.stay["offers_ok"]), plain.customer["mobile"] ?? null]).toEqual([false, false, null]);
        const none = await standingOf(plain.stay.id);
        expect([none.app, none.ready, textSaid(none.service), textSaid(none.marketing)]).toEqual(["hotel", false, ["not-asked", null, null], ["not-asked", null, null]]);
        // Both boxes ticked on a later one, with another mobile: each yes in the log, from the form, in its own words.
        const boxed = await reserveWithBox(email, "Ada", "2026-09-21", "2026-09-22", "+1 207 555 0102", true, true);
        expect([ticked(boxed.stay["texts_ok"]), ticked(boxed.stay["offers_ok"]), boxed.customer.id]).toEqual([true, true, plain.customer.id]);
        const both = await standingOf(boxed.stay.id);
        expect([textSaid(both.service), textSaid(both.marketing)]).toEqual([["yes", "form", "v1 en-US"], ["yes", "form", "v1 en-US"]]);
        // The number a run of offers reads: the one last ticked for offers.
        expect(String(boxed.customer["mobile"]).replace(/\D/g, "")).toBe("12075550102");
        // The room is ready from the house's arrival time on the arrival day, on the house's clock.
        expect(new Date(String(boxed.stay["arrive_at"])).toISOString()).toBe(new Date(Date.parse("2026-09-21T15:00:00-04:00")).toISOString());
        // Its dates move at the desk: the email, as ever, and the text, which goes nowhere while no text service is connected.
        const { desk } = await deskOf(staff);
        await desk.edit(boxed.stay.id, { depart: "2026-09-23" });
        const text = await until(async () => {
          const found = (await messagesOf(boxed.stay.id, "stay-dates-changed-text"))[0];
          return found !== undefined && found["status"] !== "queued" ? found : undefined;
        }, "the dates-changed text to be settled", 150_000);
        expect([text["status"], text["text_reason"]]).toEqual(["skipped", "not-set-up"]);
        expect((await messagesOf(boxed.stay.id, "stay-dates-changed")).length).toBe(1);
      }, 300_000);

      /** The desk's phone booking of the next check, with no guest account behind it. */
      let deskStay: unknown = null;

      it("records the desk's tick as the staff member's yes, in the box's words", async (ctx) => {
        needsWrites(() => ctx.skip());
        const { desk } = await deskOf(staff);
        const h = await desk.house();
        const garden = h.types.find((x) => x["name"] === "Garden double")!;
        // With no text service set up, the desk's own screens would draw no box: Adminium says so to both sides.
        expect(await desk.textsReady()).toBe(false);
        expect(await (await guestOf()).textsReady()).toBe(false);
        const made = await desk.book({
          values: { room_type_id: garden.id, arrive: "2026-09-28", depart: "2026-09-29", guests: 1, first_name: "Cai", last_name: "Wren", mobile: "+1 207 555 0104", language: "en-US", texts_ok: true },
          children: { stay_extras: [] },
        });
        deskStay = made.data.id;
        const yes = await standingOf(made.data.id);
        expect([textSaid(yes.service), yes.service.answer?.by !== null, textSaid(yes.marketing)]).toEqual([["yes", "staff", "v1 en-US"], true, ["not-asked", null, null]]);
      }, 240_000);

      // ENGINE GAP, not worked around: a staff save that changes the box on a row that links no person (a desk booking
      // with no guest account) records nothing after the create; the create keeps the answer on the row itself, a later
      // change finds no person (`people/consent-writes.ts`, `answerOf`). This flips to a pass once the engine falls back
      // to the row on a change too.
      it.fails("records the desk's untick, on a booking with no guest account, as the staff member's no", async () => {
        const { desk } = await deskOf(staff);
        await desk.edit(deskStay as number, { texts_ok: false });
        expect(textSaid((await standingOf(deskStay)).service).slice(0, 2)).toEqual(["no", "staff"]);
      }, 240_000);

      it("sends the arrival message the day before at 10:00: the email, and the text written down", async (ctx) => {
        needsWrites(() => ctx.skip());
        const email = `arrival.${engine}@wrenhouse.dev`;
        const before = await sinkCount();
        // Taken at the desk on the telephone, for tomorrow: the guest's own details on the stay, nobody signed in.
        const { desk } = await deskOf(staff);
        const h = await desk.house();
        let made: { stay: Row } | null = null;
        for (const type of h.types) {
          const body = { values: { room_type_id: type.id, arrive: "2026-07-29", depart: "2026-07-30", guests: 1, first_name: "Bea", last_name: "Wren", email, mobile: "(207) 555-0103", language: "en-US", texts_ok: true }, children: { stay_extras: [] } };
          const booked = await desk.book(body).catch(() => null);
          if (booked !== null) made = { stay: (await rows("stays")).find((st) => st.id === booked.data.id)! };
          if (made !== null) break;
        }
        if (made === null) throw new Error("no room type was open 2026-07-29 → 2026-07-30 at the desk");
        expect(ticked(made.stay["texts_ok"])).toBe(true);
        expect(await messagesOf(made.stay.id, "stay-arriving")).toEqual([]);
        // 10:01 on the day before: the minute's look-over finds it.
        await server.setClock(Date.parse("2026-07-28T10:01:00-04:00"));
        const mail = await mailTo(email, before, /See you on/);
        expect(mail.subject).toContain(String(made.stay["ref"]));
        const text = await until(async () => {
          const found = (await messagesOf(made.stay.id, "stay-arriving-text"))[0];
          return found !== undefined && found["status"] !== "queued" ? found : undefined;
        }, "the arrival text to be settled", 150_000);
        expect([text["status"], text["text_reason"]]).toEqual(["skipped", "not-set-up"]);
        // Once each; the text found the number typed on the stay (no "No mobile number on file").
        expect((await messagesOf(made.stay.id, "stay-arriving")).length).toBe(1);
        expect((await messagesOf(made.stay.id, "stay-arriving-text")).length).toBe(1);
      }, 300_000);

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
