/**
 * THE HOTEL'S UPDATE CONTRACT: THE RELEASED 0.2.3, UPDATED IN PLACE.
 *
 * On SQLite, Postgres and MySQL, along the path a house takes:
 *
 *   1. install the RELEASED 0.2.3 — the published package's own bytes
 *      (`CONTRACT_FROM_TARBALL`), refused unless they hash to what
 *      RELEASES.json recorded — on the Adminium it was released for
 *      (`CONTRACT_FROM_ADMINIUM`, 0.3.9);
 *   2. its own sample, added at the demo's moment (09:05 on 28 July);
 *   3. a desk at work in 0.2.3, through 0.2.3's own doors: a guest checked in
 *      and a payment taken from them; another guest settled and checked out;
 *   4. ADMINIUM UPGRADED IN PLACE: that Adminium stopped, and the one this
 *      build needs (`ADMINIUM_REPO`) started on the same data directory,
 *      secret and database — the app still 0.2.3, and nothing in its tables
 *      moved by the upgrade;
 *   5. every table of the app read straight from the database (each value as
 *      the engine spells it, each column as the engine declares it) and over
 *      HTTP: the snapshot;
 *   6. THIS build uploaded: the plan is exactly one new table (a code typed on
 *      a stay), the new columns of a stay, an extra and a payment, and one new
 *      way to pay — nothing dropped, renamed or rewritten — and it applies;
 *   7. every row that was there is unchanged, byte for byte: every stay's
 *      tax, total and balance are the cents 0.2.3 stored; every column
 *      declaration too; the new table exists and is empty; the new columns
 *      are empty on the rows that were there; a given-back payment's link to
 *      the payment it returns to arrives with its foreign key;
 *   8. ONE WRITE ON AN OLD ROW: the guest checked in under 0.2.3 pays some
 *      more in cash, exactly as a 0.2.3 desk sends it, and the stay's money
 *      is what it was but for what was paid; the stay checked out under 0.2.3
 *      is closed and stays as it was;
 *   9. THE SAMPLE ON UPDATE: the update adds no sample rows; removing the
 *      sample afterwards keeps what the desk itself moved.
 *
 * It runs twice on each engine: as above, and once more with Offers & gift
 * cards and Inventory installed BEFORE the update and connected by it. Then
 * the same must hold — connecting an add-on writes nothing into the house's
 * rows — and a guest checked in under 0.2.3 pays with a gift card.
 *
 * It runs where the plain contract runs, with the published package of the
 * release it updates and a built checkout of the Adminium that release was
 * made for; `ADMINIUM_REQUIRE_CONTRACT=1` makes a missing one a failure. Its
 * servers take ports from `CONTRACT_UPDATE_PORT_BASE`.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { DEMO_CURRENCY, DEMO_START, DEMO_ZONE } from "../demo/world.ts";
import { TABLES } from "../manifest/tables.ts";
import { addOnBundle, appBundle, boot, Caller, ENGINES, FROM_ADMINIUM, missing, missingAddOn, ok, PORTS_PER_ENGINE, rawTables, releasedBundle, releasedMissing, until, type Engine, type RawTable, type Server } from "./harness.ts";

type Row = Record<string, unknown> & { id: number };

const REQUIRED = ["1", "true"].includes(process.env["ADMINIUM_REQUIRE_CONTRACT"] ?? "");
const why = missing() ?? releasedMissing();
if (why !== null && REQUIRED) throw new Error(`the update contract must run here, and cannot: ${why}`);
const PORT_BASE = Number(process.env["CONTRACT_UPDATE_PORT_BASE"] ?? Number(process.env["CONTRACT_PORT_BASE"] ?? 4870) + 65);
const ADMIN = { email: process.env["E2E_ADMIN_EMAIL"] ?? "e2e@adminium.local", password: process.env["E2E_ADMIN_PASSWORD"] ?? "adminium-e2e-password" };
const PREFIX = "hotel_";

/** What 0.3.0 adds to 0.2.3's tables, from the manifest: the update's plan must be exactly this. */
const NEW_TABLES = ["stay_codes"];
const NEW_COLUMNS: Record<string, string[]> = {
  stays: ["customer_proved", "discount", "room_discount"],
  stay_extras: ["discount"],
  payments: ["against_id", "asked", "card_balance_after", "card_code", "card_id", "card_last4", "client_key", "settle_as"],
};
const NEW_ENUM_VALUES: Record<string, Record<string, string[]>> = {
  payments: { method: ["gift_card"] },
};

const yesNoColumns = (ref: string): string[] => (TABLES.find((t) => t.ref === ref)?.columns ?? []).filter((c) => c.type === "bool").map((c) => c.ref);
const realNow = () => performance.timeOrigin + performance.now();

const released = why === null ? releasedBundle() : null;
const FROM = released?.version ?? "0.2.3";
const TO = why === null ? appBundle().version : "0.3.0";
const addOnsWhy = missingAddOn("offers") ?? missingAddOn("inventory");

const RUNS = [
  { id: "plain", addOns: false, title: "" },
  { id: "addons", addOns: true, title: ", with Offers & gift cards and Inventory installed before the update" },
] as const;

describe.skipIf(why !== null)(`the update of a live ${FROM} house to ${TO}${why === null ? "" : ` — skipped: ${why}`}`, () => {
  ENGINES.forEach(([engine, available], index) => {
    RUNS.forEach((run, r) => {
      describe.skipIf(!available || (run.addOns && addOnsWhy !== null))(`on ${engine}${run.title}`, () => {
        const port = PORT_BASE + (index * RUNS.length + r) * PORTS_PER_ENGINE;
        const database = `hotel_update_${run.id}_${engine}${process.env["CONTRACT_DB_SUFFIX"] ?? ""}`;
        let server: Server;
        let staff: Caller;
        let connectionId = "";
        let tableIds: Record<string, string> = {};
        let before: Record<string, RawTable> = {};
        let beforeHttp: Record<string, Row[]> = {};
        let sampleBefore = { loaded: false, total: 0 };
        /** What the desk did in 0.2.3: the stays the later steps come back to. */
        const made = { inHouse: 0, left: 0 };
        const startedAt = realNow();
        const house = mkdtempSync(join(tmpdir(), `hotel-update-${run.id}-${engine}-`));
        const ran = { from: "", to: "" };

        const signIn = async () => {
          staff = new Caller(server.base, { origin: server.base });
          await staff.signIn(ADMIN.email, ADMIN.password);
          const connections = ok(await staff.get<{ connections: { id: string; name: string }[] }>("/api/v1/connections"));
          connectionId = connections.connections.find((c) => c.name === "northwind")!.id;
          return ok(await staff.get<{ version: string }>("/api/v1/healthz")).version;
        };
        const learnTables = async () => {
          const schema = ok(await staff.get<{ model: { tables: { id: string; name: string }[] } }>(`/api/v1/connections/${connectionId}/schema`));
          tableIds = Object.fromEntries(schema.model.tables.map((t) => [t.name, t.id]));
        };
        const dataOf = (table: string) => `/api/v1/data/${connectionId}/${encodeURIComponent(tableIds[table]!)}`;
        const data = (ref: string) => dataOf(`${PREFIX}${ref}`);
        const rowsOf = async (table: string): Promise<Row[]> => {
          const out: Row[] = [];
          for (let offset = 0; ; offset += 200) {
            const page = ok(await staff.get<{ data: Row[] }>(`${dataOf(table)}?limit=200&offset=${String(offset)}`)).data;
            out.push(...page);
            if (page.length < 200) return out.sort((a, b) => Number(a.id) - Number(b.id));
          }
        };
        const rows = (ref: string) => rowsOf(`${PREFIX}${ref}`);
        const row = async (ref: string, id: number) => (await rows(ref)).find((found) => Number(found.id) === id)!;
        const appRefs = () => Object.keys(tableIds).filter((name) => name.startsWith(PREFIX) && name !== `${PREFIX}sample_data`).map((name) => name.slice(PREFIX.length));
        const all = async () => Object.fromEntries(await Promise.all(appRefs().map(async (ref) => [ref, await rows(ref)] as const)));
        const raw = () => rawTables(engine as Engine, port, database, PREFIX);
        const sample = async () => ok(await staff.get<{ loaded: boolean; total: number }>("/api/v1/apps/hotel/sample-data"));
        const upload = async (kind: "add-ons" | "apps", bundle: { buffer: Buffer; integrity: string }) => {
          const reply = await staff.post(`/api/v1/${kind}/upload?expectedSha512=${encodeURIComponent(bundle.integrity)}`, bundle.buffer);
          expect([200, 201], JSON.stringify(reply.body).slice(0, 800)).toContain(reply.status);
        };
        const move = async (id: number, values: Record<string, unknown>) => {
          const reply = await staff.patch(`${data("stays")}/${String(id)}`, { values });
          expect(reply.status, JSON.stringify(reply.body).slice(0, 800)).toBe(200);
        };
        const pay = async (stayId: number, values: Record<string, unknown>) => {
          const reply = await staff.post<{ data: Row }>(data("payments"), { values: { stay_id: stayId, kind: "taken", ...values } });
          expect(reply.status, JSON.stringify(reply.body).slice(0, 800)).toBe(201);
          return reply.body.data;
        };
        const cents = (value: unknown) => Math.round(Number(value) * 100);
        /** The money of a stay, as Adminium keeps it, in cents. */
        const money = (stay: Row) => ["room_total", "extras_total", "charges_total", "credits_total", "subtotal", "tax", "total"].map((column) => cents(stay[column] ?? 0));

        beforeAll(async () => {
          server = await boot(engine as Engine, port, DEMO_START - 60_000, { database, adminium: FROM_ADMINIUM, keep: house });
          ran.from = await signIn();
          ok(await staff.patch(`/api/v1/connections/${connectionId}`, { timezone: DEMO_ZONE, currency: DEMO_CURRENCY }));
        }, 240_000);

        afterAll(async () => {
          await server?.stop();
          rmSync(house, { recursive: true, force: true });
          rmSync(join(tmpdir(), `adminium-e2e-source-sqlite-${String(port)}.db`), { force: true });
        });

        // ── 0.2.3, released, at work ──────────────────────────────────────────

        it(`installs the RELEASED ${FROM} — the published package, byte for byte — on the Adminium it was released for`, async () => {
          const app = released!;
          await upload("apps", app);
          const body = { key: app.key, version: app.version, connectionId };
          const plan = ok(await staff.post<{ plan: { installable: boolean; checksum: string } }>("/api/v1/apps/plan", body)).plan;
          expect(plan.installable).toBe(true);
          ok(await staff.post("/api/v1/apps/install", { ...body, planChecksum: plan.checksum }));
          await learnTables();
          expect(appRefs().sort()).toEqual(TABLES.map((t) => t.ref).filter((ref) => !NEW_TABLES.includes(ref)).sort());
        }, 180_000);

        it(`adds ${FROM}'s own sample at the demo's moment`, async () => {
          await server.setClock(DEMO_START, true);
          expect((await staff.post("/api/v1/apps/hotel/sample-data")).status).toBeLessThan(300);
          await until(async () => ((await sample()).loaded ? true : undefined), "the sample to be added");
          await server.setClock(DEMO_START);
          expect((await rows("stays")).length).toBeGreaterThan(40);
        }, 240_000);

        it(`lets the desk work in ${FROM}, through its own doors: a guest checked in and a payment taken, another settled and checked out`, async () => {
          const stays = await rows("stays");
          const rooms = await rows("rooms");
          const arriving = stays.find((stay) => stay["ref"] === "WH-S3304")!;
          const room = rooms.find((found) => found["number"] === "304")!;
          await move(Number(arriving.id), { room_id: room.id, status: "in_house" });
          await pay(Number(arriving.id), { amount: 50, method: "cash" });
          made.inHouse = Number(arriving.id);
          // A guest in the house who still owes settles in cash and leaves: a closed stay.
          const leaving = stays.find((stay) => stay["ref"] === "WH-S3283")!;
          expect(cents(leaving["balance"])).toBeGreaterThan(0);
          await pay(Number(leaving.id), { amount: Number(leaving["balance"]), method: "cash" });
          await move(Number(leaving.id), { status: "departed" });
          made.left = Number(leaving.id);
          const now = await row("stays", made.inHouse);
          expect([now["status"], cents(now["paid"])]).toEqual(["in_house", 5000]);
          const gone = await row("stays", made.left);
          expect([gone["status"], cents(gone["balance"])]).toEqual(["departed", 0]);
        }, 120_000);

        // ── Adminium upgraded ─────────────────────────────────────────────────

        it("upgrades Adminium in place to the one this build needs, on the same data, the app still at its release", async () => {
          const rawUnder = await raw();
          await server.stop();
          server = await boot(engine as Engine, port, Math.round(DEMO_START + (realNow() - startedAt)), { database, keep: house });
          ran.to = await signIn();
          console.info(`[upgrade, ${engine}${run.title}] Adminium ${ran.from} → ${ran.to}`);
          expect(ran.to).not.toBe(ran.from);
          const apps = ok(await staff.get<{ apps: { key: string; version: string; connectionId: string }[] }>("/api/v1/apps"));
          expect(apps.apps.filter((a) => a.key === "hotel").map((a) => [a.version, a.connectionId])).toEqual([[FROM, connectionId]]);
          // The upgrade itself writes nothing into the app's tables.
          expect(await raw()).toEqual(rawUnder);
        }, 300_000);

        it.skipIf(!run.addOns)("installs Offers & gift cards and Inventory beside the house, and writes nothing into the house's rows", async () => {
          const rawUnder = await raw();
          for (const key of ["inventory", "offers"]) {
            const addOn = addOnBundle(key);
            await upload("add-ons", addOn);
            const installed = await staff.post("/api/v1/add-ons", { key, version: addOn.version, attachTo: [] });
            expect(installed.status, JSON.stringify(installed.body).slice(0, 1200)).toBeLessThan(300);
          }
          expect(await raw()).toEqual(rawUnder);
        }, 300_000);

        it("reads every table of the app, straight from the database and over HTTP, once nothing is moving", async () => {
          await until(
            async () => {
              const a = await raw();
              await new Promise((resolve) => setTimeout(resolve, 3_000));
              const b = await raw();
              return JSON.stringify(a) === JSON.stringify(b) ? (before = b) : undefined;
            },
            "the database to be still",
            120_000,
          );
          await learnTables();
          beforeHttp = await all();
          expect(Object.keys(beforeHttp).sort()).toEqual(TABLES.map((t) => t.ref).filter((ref) => !NEW_TABLES.includes(ref)).sort());
          sampleBefore = await sample();
          expect(sampleBefore.loaded).toBe(true);
        }, 180_000);

        // ── the update ────────────────────────────────────────────────────────

        let plan: {
          installable: boolean;
          checksum: string;
          problems: unknown[];
          tables: { ref: string; table: string; class: string; action: string; edits: { kind: string; column: string; values?: string[] }[]; blocked: unknown[]; renameExistingTo?: string }[];
          addOns?: { key: string; need: string; action: string | null }[];
        };

        it(`plans the update to ${TO}: one new table, the new columns and one new way to pay, nothing dropped, renamed or rewritten`, async () => {
          const app = appBundle();
          await upload("apps", app);
          plan = ok(await staff.post<{ plan: typeof plan }>("/api/v1/apps/plan", { key: app.key, version: app.version, connectionId })).plan;
          console.info(
            `[update plan, ${engine}${run.title}] ` +
              JSON.stringify({
                installable: plan.installable,
                problems: plan.problems,
                changed: plan.tables.filter((t) => t.action !== "reuse" || t.edits.length > 0 || t.blocked.length > 0).map((t) => ({ ref: t.ref, action: t.action, edits: t.edits, blocked: t.blocked })),
                addOns: plan.addOns?.map((a) => ({ key: a.key, need: a.need, action: a.action })),
              }),
          );
          expect([plan.installable, plan.problems]).toEqual([true, []]);
          const byRef = Object.fromEntries(plan.tables.map((t) => [t.ref, t]));
          expect(Object.keys(byRef).sort()).toEqual(TABLES.map((t) => t.ref).sort());
          for (const ref of NEW_TABLES) expect([ref, byRef[ref]!.action, byRef[ref]!.table, byRef[ref]!.class]).toEqual([ref, "create", `${PREFIX}${ref}`, "new"]);
          for (const ref of Object.keys(beforeHttp)) {
            const planned = byRef[ref]!;
            // The app's own table, kept where it is, under its name.
            expect([ref, planned.action, planned.class, planned.table, planned.renameExistingTo, planned.blocked]).toEqual([ref, "reuse", "own-leftover", `${PREFIX}${ref}`, undefined, []]);
            // Only additions: a column, a value of a list. Never a column changed in type or width.
            expect([ref, planned.edits.filter((e) => e.kind === "add-column").map((e) => e.column).sort()]).toEqual([ref, NEW_COLUMNS[ref] ?? []]);
            expect([ref, Object.fromEntries(planned.edits.filter((e) => e.kind === "enum-values").map((e) => [e.column, e.values]))]).toEqual([ref, NEW_ENUM_VALUES[ref] ?? {}]);
            expect([ref, planned.edits.filter((e) => !["add-column", "enum-values"].includes(e.kind))]).toEqual([ref, []]);
          }
        }, 120_000);

        it(`updates in place to ${TO}, as planned`, async () => {
          const reply = await staff.post<{ from: string; to: string; app: { version: string; schema?: { created: string[] }; rules?: { skipped: unknown[] } } }>("/api/v1/apps/hotel/update", {
            planChecksum: plan.checksum,
            // What the new version lets a guest's page do (a code on a reservation) is the operator's to allow.
            publicAccess: true,
            // The house that set the add-ons up first connects them as it updates.
            ...(run.addOns ? { addOns: ["inventory", "offers"].map((key) => ({ key, version: addOnBundle(key).version })) } : {}),
          });
          expect(reply.status, JSON.stringify(reply.body).slice(0, 1500)).toBe(200);
          const updated = reply.body;
          console.info(`[update reply, ${engine}${run.title}] ${JSON.stringify({ from: updated.from, to: updated.to, schema: updated.app.schema, rulesSkipped: updated.app.rules?.skipped })}`);
          expect([updated.from, updated.to, updated.app.version]).toEqual([FROM, TO, TO]);
          expect([...(updated.app.schema?.created ?? [])].sort()).toEqual(NEW_TABLES.map((t) => `${PREFIX}${t}`).sort());
          expect(JSON.stringify(updated.app.rules?.skipped ?? [])).toBe("[]");
          await learnTables();
          const staffConfig = ok(await staff.get<{ addOns?: Record<string, unknown> }>("/apps/hotel/staff/surface-config.json"));
          expect(Object.keys(staffConfig.addOns ?? {}).sort()).toEqual(run.addOns ? ["inventory", "offers"] : []);
        }, 240_000);

        it("keeps every row that was there, byte for byte — every stay's tax, total and balance the cents it stored — and every column as it was", async () => {
          const after = await raw();
          const added: Record<string, string[]> = {};
          const redeclared: string[] = [];
          for (const [name, was] of Object.entries(before)) {
            const now = after[name];
            expect(now, `${name} is still there`).toBeDefined();
            expect([name, now!.key]).toEqual([name, was.key]);
            added[name] = Object.keys(now!.columns).filter((c) => !(c in was.columns)).sort();
            const widened = Object.keys(NEW_ENUM_VALUES[name.slice(PREFIX.length)] ?? {});
            for (const [column, declared] of Object.entries(was.columns)) {
              expect(now!.columns[column], `${name}.${column} is still there`).toBeDefined();
              // A list that gained values is declared with them (MySQL's enum, a check elsewhere): that is the addition.
              if (now!.columns[column] !== declared && !widened.includes(column)) redeclared.push(`${name}.${column}: ${declared} → ${now!.columns[column]!}`);
            }
            expect([name, now!.rows.length]).toEqual([name, was.rows.length]);
            const kept = now!.rows.map((found) => Object.fromEntries(Object.keys(was.columns).map((c) => [c, found[c]])));
            expect(kept, `the rows of ${name}`).toEqual(was.rows);
            // A column the update adds holds nothing on a row that was there.
            for (const column of added[name]!) expect([name, column, now!.rows.filter((found) => found[column] !== null).length]).toEqual([name, column, 0]);
          }
          console.info(`[redeclared, ${engine}${run.title}] ${JSON.stringify(redeclared)}`);
          expect(redeclared).toEqual([]);
          expect(Object.fromEntries(Object.entries(added).filter(([, list]) => list.length > 0))).toEqual(Object.fromEntries(Object.entries(NEW_COLUMNS).map(([ref, list]) => [`${PREFIX}${ref}`, list])));
          // And over HTTP: every row Adminium hands out is the one it handed out before.
          const nowHttp = await all();
          for (const [ref, list] of Object.entries(beforeHttp)) {
            const extra = NEW_COLUMNS[ref] ?? [];
            const trimmed = nowHttp[ref]!.map((found) => Object.fromEntries(Object.entries(found).filter(([column]) => !extra.includes(column))));
            const bools = yesNoColumns(ref);
            const said = (list2: Record<string, unknown>[]) => list2.map((found) => Object.fromEntries(Object.entries(found).map(([column, value]) => [column, bools.includes(column) && (value === 1 || value === 0) ? value === 1 : value])));
            expect(said(trimmed), `${ref} over HTTP`).toEqual(said(list));
          }
          // The new tables, with the manifest's columns, and nothing in them.
          for (const ref of NEW_TABLES) {
            const table = after[`${PREFIX}${ref}`];
            expect(table, `${PREFIX}${ref} exists`).toBeDefined();
            expect([ref, Object.keys(table!.columns).sort()]).toEqual([ref, TABLES.find((t) => t.ref === ref)!.columns.map((c) => c.ref).sort()]);
            expect([ref, table!.rows.length]).toEqual([ref, 0]);
          }
        }, 120_000);

        // ── one write on an old row ───────────────────────────────────────────

        it("brings a given-back payment's link to the payment it returns to with its foreign key", async () => {
          const payments = (await raw())[`${PREFIX}payments`]!;
          expect(payments.constraints.filter((c) => /against_id/.test(c) && /payments/.test(c)).length, JSON.stringify(payments.constraints)).toBeGreaterThan(0);
        }, 60_000);

        it(`takes $10.00 more in cash from the guest checked in under ${FROM}: as a ${FROM} desk sends it, and the stay's money is what it was`, async () => {
          const was = await row("stays", made.inHouse);
          const paid = await pay(made.inHouse, { amount: 10, method: "cash" });
          // Nothing of a gift card on a cash payment: the new columns stay empty, and it settles as it always did.
          expect([paid["card_id"], paid["card_last4"], paid["card_balance_after"], paid["against_id"], Number(paid["settle_as"])]).toEqual([null, null, null, null, 0]);
          const now = await row("stays", made.inHouse);
          expect(money(now)).toEqual(money(was));
          expect([cents(now["paid"]), cents(now["balance"])]).toEqual([cents(was["paid"]) + 1000, cents(was["balance"]) - 1000]);
          // No code was typed on it and none is: nothing was taken off, by anybody.
          expect([now["discount"], now["room_discount"]].map((v) => cents(v ?? 0))).toEqual([0, 0]);
        }, 120_000);

        it.skipIf(!run.addOns)(`lets the guest checked in under ${FROM} pay $40.00 with a gift card: the card is emptied, the stay owes $40.00 less`, async () => {
          await learnTables();
          const schema = ok(await staff.get<{ model: { relations: { id: string; from: { tableId: string; columns: string[] } }[] } }>(`/api/v1/connections/${connectionId}/schema`));
          const actions = schema.model.relations.find((relation) => relation.from.tableId === tableIds["offers_card_actions"] && relation.from.columns.join() === "card_id")!.id;
          const card = ok(await staff.post<{ data: Row }>(dataOf("offers_gift_cards"), { values: { kind: "card" }, children: { [actions]: [{ values: { action: "issue", amount: 40, reason: "Sold at the desk", paid_by: "cash" } }] } }), 201).data;
          const code = String(ok(await staff.get<{ data: Row }>(`${dataOf("offers_gift_cards")}/${String(card.id)}`)).data["code"]);
          const was = await row("stays", made.inHouse);
          const paid = await pay(made.inHouse, { amount: 40, asked: 40, method: "gift_card", card_code: code });
          expect([cents(paid["amount"]), cents(paid["card_balance_after"]), paid["card_last4"], Number(paid["card_id"])]).toEqual([4000, 0, code.replace(/[^A-Za-z0-9]/g, "").slice(-4), Number(card.id)]);
          const now = await row("stays", made.inHouse);
          expect(money(now)).toEqual(money(was));
          expect([cents(now["paid"]), cents(now["balance"])]).toEqual([cents(was["paid"]) + 4000, cents(was["balance"]) - 4000]);
          expect(cents(ok(await staff.get<{ data: Row }>(`${dataOf("offers_gift_cards")}/${String(card.id)}`)).data["balance"])).toBe(0);
        }, 120_000);

        it(`leaves the stay checked out under ${FROM} closed and as it was`, async () => {
          const before2 = before[`${PREFIX}stays`]!.rows.find((found) => Number(found["id"]) === made.left)!;
          const refused = await staff.patch(`${data("stays")}/${String(made.left)}`, { values: { guests: 1 } });
          expect(refused.status, JSON.stringify(refused.body).slice(0, 400)).toBe(409);
          const after = (await raw())[`${PREFIX}stays`]!.rows.find((found) => Number(found["id"]) === made.left)!;
          expect(Object.fromEntries(Object.keys(before2).map((column) => [column, after[column]]))).toEqual(before2);
        }, 60_000);

        // ── the sample on update ──────────────────────────────────────────────

        it(`leaves the sample as ${FROM} added it: the update adds no sample rows`, async () => {
          const now = await sample();
          expect([now.loaded, now.total]).toEqual([sampleBefore.loaded, sampleBefore.total]);
        }, 60_000);

        it("removes the sample afterwards, keeping what the desk itself moved", async () => {
          const removed = await staff.post<{ removed: number; kept: number }>("/api/v1/apps/hotel/sample-data/remove", { keepChanged: true });
          expect(removed.status, JSON.stringify(removed.body).slice(0, 800)).toBe(200);
          expect(removed.body.removed).toBeGreaterThan(0);
          expect((await sample()).loaded).toBe(false);
          const stays = (await rows("stays")).map((stay) => Number(stay.id));
          expect(stays).toContain(made.inHouse);
          expect(stays).toContain(made.left);
        }, 180_000);
      });
    });
  });
});
