/**
 * A SECOND INSTALL OF THE DESK: the same bundle, served at another database's
 * mount, must say it is that install on every call.
 *
 * Adminium installs one app once per database. Each install's staff side is
 * served at its own mount (`/apps/hotel/<slug>/staff/`) with its own
 * `surface-config.json`, naming its `installId`. The desk reads that document
 * from the mount it was opened at and sends the id back as
 * `X-Adminium-Install`, so the server prints the folio and looks up a gift
 * card for THIS house, not the first install's (with two installs and no
 * header, those routes answer 409).
 */
import { describe, expect, it, vi } from "vitest";

import { AdminiumDesk } from "./data/adminiumDesk.ts";
import { createSessionTransport, INSTALL_HEADER } from "./data/sessionSource.ts";
import { configBase, loadStaffConfig } from "./staffConnection.ts";

const BAKED = "/apps/hotel/staff/";

/** Two installs' documents, each at its own mount. */
const DOCS: Record<string, unknown> = {
  "/apps/hotel/staff/surface-config.json": { connectionId: "conn-1", installId: "install-1", csrfToken: "tok-1", timezone: "America/New_York", user: { id: "u1", name: "Maeve" } },
  "/apps/hotel/harbour/staff/surface-config.json": { connectionId: "conn-2", installId: "install-2", csrfToken: "tok-2", timezone: "Europe/Lisbon", user: { id: "u2", name: "Rui" } },
};

interface Sent {
  url: string;
  headers: Record<string, string>;
}

function server() {
  const sent: Sent[] = [];
  const fetchImpl = vi.fn(async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    sent.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
    const path = url.split("?")[0] ?? url;
    const payload =
      DOCS[path] ??
      (path.endsWith("/documents/render")
        ? { printUrl: "/api/v1/documents/d1/print" }
        : path.endsWith("/offers/look-up")
          ? { found: true, kind: "gift_card", last4: "4242", record: {} }
          : { data: [] });
    return new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json" } });
  });
  return { sent, fetchImpl: fetchImpl as unknown as typeof fetch };
}

async function deskAt(pathname: string) {
  const { sent, fetchImpl } = server();
  const staff = await loadStaffConfig({ hostedStaff: true, base: configBase(BAKED, pathname), fetchImpl });
  if (staff === null || staff.csrfToken === null) throw new Error("no staff config");
  // Built the way `bootAdminium.tsx` builds the desk's transport.
  const transport = createSessionTransport({
    tableOfRef: staff.tables,
    connectionId: staff.connectionId ?? undefined,
    installId: staff.installId,
    staff: { csrfToken: staff.csrfToken, timezone: staff.timezone, timezoneSource: staff.timezoneSource, serverTimezone: staff.serverTimezone, currency: staff.currency },
    fetchImpl,
  });
  await transport.port.config();
  return { staff, desk: new AdminiumDesk(transport, staff), transport, sent };
}

describe("a second install of the desk", () => {
  it("reads its own install from its own mount", async () => {
    const first = await deskAt("/apps/hotel/staff/arrivals");
    const second = await deskAt("/apps/hotel/harbour/staff/arrivals");
    expect([first.staff.installId, first.staff.connectionId]).toEqual(["install-1", "conn-1"]);
    expect([second.staff.installId, second.staff.connectionId]).toEqual(["install-2", "conn-2"]);
  });

  it("says which install it is on the folio, the gift-card look-up and its reads", async () => {
    const { desk, transport, sent } = await deskAt("/apps/hotel/harbour/staff/stays/41");
    const before = sent.length;
    expect(await desk.printFolio(41)).toEqual({ url: "/api/v1/documents/d1/print" });
    expect(await desk.lookUpCode(" GIFT-1234 ")).toMatchObject({ kind: "gift_card", last4: "4242" });
    await transport.get(`/api/v1/data/conn-2/hotel_stays?limit=1`);
    const calls = sent.slice(before);
    expect(calls.map((c) => c.url.split("?")[0])).toEqual([
      "/api/v1/apps/hotel/documents/render",
      "/api/v1/add-ons/offers/look-up",
      "/api/v1/data/conn-2/hotel_stays",
    ]);
    for (const call of calls) expect(call.headers[INSTALL_HEADER]).toBe("install-2");
  });

  it("sends no install header when an older Adminium names no install", async () => {
    const { sent, fetchImpl } = server();
    const transport = createSessionTransport({ tableOfRef: {}, connectionId: "conn-1", installId: null, staff: { csrfToken: "tok-1" }, fetchImpl });
    await transport.get("/api/v1/data/conn-1/hotel_stays?limit=1");
    await transport.mutate("/api/v1/add-ons/offers/look-up", "POST", { value: "x" });
    expect(sent.every((c) => !(INSTALL_HEADER in c.headers))).toBe(true);
  });
});
