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
 *   6. the sample removed.
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

import { COLUMNS, resolveSample } from "../data/sampleRows.ts";
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
        expect(JSON.stringify(installed.rules.skipped)).toBe("[]");
        expect(Object.keys(installed.publicAccess.keys).sort()).toEqual(["customer", "link"]);
        expect(installed.outbox.defined).toBe(true);
      }, 180_000);

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

      it("removes the sample", async (ctx) => {
        needsWrites(() => ctx.skip());
        const plan = ok(await staff.post<{ total: number }>("/api/v1/apps/hotel/sample-data/remove-plan"));
        expect(plan.total).toBeGreaterThan(0);
        ok(await staff.post("/api/v1/apps/hotel/sample-data/remove", { keepChanged: false }));
        expect(ok(await staff.get<{ loaded: boolean }>("/api/v1/apps/hotel/sample-data")).loaded).toBe(false);
        expect((await rows("stays")).filter((s) => String(s["ref"]).startsWith("WH-S"))).toEqual([]);
      }, 120_000);
    });
  });
});
