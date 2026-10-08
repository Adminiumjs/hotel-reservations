/**
 * A house stood up for a contract: the BUILT Adminium booted on one engine,
 * this app installed on it as an operator installs it (with the add-ons the
 * check names, ticked in the install), the house's clock and money set, the
 * sample added at 09:05 on Tuesday 28 July 2026, the public API on and the
 * links in its emails pointed at it — and the app's own two doors onto it,
 * booted as the builds boot them.
 *
 * Tests only; nothing that ships imports it.
 */
import { AdminiumDesk } from "../data/adminiumDesk.ts";
import { AdminiumGuest } from "../data/adminiumGuest.ts";
import { createSessionTransport } from "../data/sessionSource.ts";
import type { Row } from "../data/wire.ts";
import { DEMO_CURRENCY, DEMO_START, DEMO_ZONE } from "../demo/world.ts";
import { loadStaffConfig, type StaffConfig } from "../staffConnection.ts";
import { addOnBundle, appBundle, boot, Caller, ok, until, type Engine, type Server } from "./harness.ts";

export const ADMIN = { email: process.env["E2E_ADMIN_EMAIL"] ?? "e2e@adminium.local", password: process.env["E2E_ADMIN_PASSWORD"] ?? "adminium-e2e-password" };

/** One email the server's mail sink caught. */
export interface Mail {
  to: string[];
  subject: string;
  text: string;
  html: string;
  attachments: { filename: string; contentType: string; size: number }[];
}

export interface Door {
  desk: AdminiumDesk;
  cfg: StaffConfig;
  caller: Caller;
}

export interface Stand {
  server: Server;
  staff: Caller;
  connectionId: string;
  /** The app's tables by their manifest name, and every other table by its real one, as this server keys them. */
  ids: Record<string, string>;
  /** The desk's door on a caller's session: the app's own code, through the staff config the server hands its screens. */
  deskOf(caller?: Caller): Promise<Door>;
  /** A fresh guest page in a fresh tab, booted from the customer config as the customer build boots it. */
  guestOf(): Promise<AdminiumGuest>;
  /** A person with one of the app's roles, invited and signed in to the desk's screens. */
  person(slug: string, email: string, name: string): Promise<Door>;
  /** The relation a parent's tree write names a child table by. */
  relation(childTable: string, column: string): Promise<string>;
  data(ref: string): string;
  rows(ref: string, where?: unknown): Promise<Row[]>;
  one(ref: string, id: unknown): Promise<Row>;
  mailCount(): Promise<number>;
  mailTo(address: string, after: number, ms?: number): Promise<Mail>;
}

export interface StandOptions {
  /** The add-ons installed with the app (the boxes the operator ticks). */
  addOns?: string[];
  /** The add-ons whose own sample goes in too, before the app's. */
  addOnSamples?: string[];
  /** The add-ons installed beside the app and NOT connected to it. */
  beside?: string[];
  built?: boolean;
  /** Leave the app's sample out. */
  noSample?: boolean;
}

export async function standUp(engine: Engine, port: number, database: string, options: StandOptions = {}): Promise<Stand> {
  const server = await boot(engine, port, DEMO_START, { database });
  const staff = new Caller(server.base, { origin: server.base });
  await staff.signIn(ADMIN.email, ADMIN.password);
  const connectionId = ok(await staff.get<{ connections: { id: string; name: string }[] }>("/api/v1/connections")).connections.find((c) => c.name === "northwind")!.id;

  const stage = async (key: string) => {
    const addOn = addOnBundle(key);
    const staged = await staff.post(`/api/v1/add-ons/upload?expectedSha512=${encodeURIComponent(addOn.integrity)}`, addOn.buffer);
    if (![200, 201].includes(staged.status)) throw new Error(`add-on upload ${key}: ${JSON.stringify(staged.body).slice(0, 400)}`);
    return { key: addOn.key, version: addOn.version };
  };
  for (const key of options.beside ?? []) {
    const addOn = await stage(key);
    const installed = await staff.post("/api/v1/add-ons", { ...addOn, attachTo: [] });
    if (installed.status >= 300) throw new Error(`add-on install ${key}: ${JSON.stringify(installed.body).slice(0, 800)}`);
  }
  const listed: { key: string; version: string }[] = [];
  for (const key of options.addOns ?? []) listed.push(await stage(key));
  const app = appBundle({ built: options.built === true });
  const staged = await staff.post(`/api/v1/apps/upload?expectedSha512=${encodeURIComponent(app.integrity)}`, app.buffer);
  if (![200, 201].includes(staged.status)) throw new Error(`upload: ${JSON.stringify(staged.body).slice(0, 400)}`);
  const body = { key: app.key, version: app.version, connectionId };
  const plan = ok(await staff.post<{ plan: { checksum: string } }>("/api/v1/apps/plan", body)).plan;
  const installed = ok(
    await staff.post<{ schema: { created: string[] }; rules: { skipped: unknown[] } }>("/api/v1/apps/install", { ...body, planChecksum: plan.checksum, ...(listed.length === 0 ? {} : { addOns: listed }) }),
  );
  if (installed.rules.skipped.length > 0) throw new Error(`the install skipped rules: ${JSON.stringify(installed.rules.skipped).slice(0, 1500)}`);
  ok(await staff.patch(`/api/v1/connections/${connectionId}`, { timezone: DEMO_ZONE, currency: DEMO_CURRENCY }));
  const ids: Record<string, string> = {};
  const learn = async () => {
    const schema = ok(await staff.get<{ model: { tables: { id: string; name: string }[] } }>(`/api/v1/connections/${connectionId}/schema`));
    for (const table of schema.model.tables) ids[table.name.startsWith("hotel_") ? table.name.slice("hotel_".length) : table.name] = table.id;
  };
  await learn();

  for (const key of options.addOnSamples ?? []) {
    const asked = await staff.post(`/api/v1/add-ons/${key}/sample-data`);
    if (asked.status >= 300) throw new Error(`${key}'s sample: ${JSON.stringify(asked.body).slice(0, 600)}`);
    await until(async () => (ok(await staff.get<{ loaded: boolean }>(`/api/v1/add-ons/${key}/sample-data`)).loaded ? true : undefined), `${key}'s sample to be added`, 300_000);
  }
  if (options.noSample !== true) {
    const asked = await staff.post("/api/v1/apps/hotel/sample-data");
    if (asked.status >= 300) throw new Error(`the sample: ${JSON.stringify(asked.body).slice(0, 600)}`);
    await until(async () => (ok(await staff.get<{ loaded: boolean }>("/api/v1/apps/hotel/sample-data")).loaded ? true : undefined), "the sample to be added", 300_000);
  }
  ok(await staff.put("/api/v1/public-api", { enabled: true }));
  // Where the links in its emails point.
  ok(await staff.put("/api/v1/settings/email", { publicOrigin: server.base }));

  const deskOf = async (caller: Caller = staff): Promise<Door> => {
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
    return { desk: new AdminiumDesk(t, cfg), cfg, caller };
  };
  const guestOf = async () => {
    const c = ok(await new Caller(server.base).get<{ publishableKey: string; publicKeys?: Record<string, string>; tables: Record<string, string> }>("/apps/hotel/customer/surface-config.json"));
    const fetchIn: typeof fetch = (input, init) => {
      const headers = new Headers(init?.headers);
      headers.set("origin", server.base);
      return fetch(new URL(String(input), server.base), { ...init, headers });
    };
    return new AdminiumGuest({ baseUrl: server.base, publishableKey: c.publishableKey, publicKeys: c.publicKeys ?? {}, tables: c.tables }, { fetch: fetchIn, storage: null });
  };
  const person = async (slug: string, email: string, name: string) => {
    const roles = ok(await staff.get<{ roles?: { id: string; slug: string }[] }>("/api/v1/roles")).roles ?? [];
    const role = roles.find((r) => r.slug === slug)!;
    const password = `contract-${slug}-password`;
    const invited = ok(await staff.post<{ invite: { token: string } }>("/api/v1/users", { email, name, roleIds: [role.id] }), 201);
    ok(await new Caller(server.base, { origin: server.base }).post("/api/v1/auth/password/reset", { token: invited.invite.token, newPassword: password }));
    const caller = new Caller(server.base, { origin: server.base });
    await caller.signInToScreens(email, password);
    return deskOf(caller);
  };
  const data = (ref: string) => {
    if (ids[ref] === undefined) throw new Error(`no table ${ref} on this server`);
    return `/api/v1/data/${connectionId}/${encodeURIComponent(ids[ref]!)}`;
  };
  const rows = async (ref: string, where?: unknown): Promise<Row[]> => {
    if (ids[ref] === undefined) await learn();
    const out: Row[] = [];
    const filter = where === undefined ? "" : `&where=${encodeURIComponent(JSON.stringify(where))}`;
    for (let offset = 0; ; offset += 200) {
      const page = ok(await staff.get<{ data: Row[] }>(`${data(ref)}?limit=200&offset=${String(offset)}${filter}`)).data;
      out.push(...page);
      if (page.length < 200) return out;
    }
  };
  const inbox = async () => (await (await fetch(`${server.sink}/messages`)).json()) as Mail[];

  return {
    server,
    staff,
    connectionId,
    ids,
    deskOf,
    guestOf,
    person,
    relation: async (childTable, column) => {
      await learn();
      const schema = ok(await staff.get<{ model: { relations: { id: string; from: { tableId: string; columns: string[] } }[] } }>(`/api/v1/connections/${connectionId}/schema`));
      return schema.model.relations.find((relation) => relation.from.tableId === ids[childTable] && relation.from.columns.join() === column)!.id;
    },
    data,
    rows,
    one: async (ref, id) => ok(await staff.get<{ data: Row }>(`${data(ref)}/${String(id)}`)).data,
    mailCount: async () => (await inbox()).length,
    mailTo: (address, after, ms = 150_000) =>
      until(async () => (await inbox()).slice(after).find((m) => m.to.includes(address)), `an email to ${address}`, ms),
  };
}
