/**
 * The real guest door over a stand-in public API: which ref each call reads
 * and writes, with which key and session, and how a refusal reaches the
 * screens.
 */
import { describe, expect, it } from "vitest";

import { AdminiumGuest } from "./adminiumGuest.ts";
import { isApiError } from "./wire.ts";

interface Call {
  method: string;
  path: string;
  key: string | null;
  session: string | null;
  body: unknown;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/** A public API answering from `routes` (method + path → reply), recording every call. */
function server(routes: Record<string, (call: Call) => Response>) {
  const calls: Call[] = [];
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const headers = new Headers(init?.headers);
    const call: Call = {
      method: (init?.method ?? "GET").toUpperCase(),
      path: url.pathname + url.search,
      key: headers.get("authorization"),
      session: headers.get("x-adminium-public-session"),
      body: init?.body === undefined ? undefined : JSON.parse(String(init.body)),
    };
    calls.push(call);
    const route = routes[`${call.method} ${url.pathname}`];
    return route === undefined ? json({ error: { code: "PUBLIC_REF_NOT_FOUND", message: "no such ref" } }, 404) : route(call);
  };
  return { calls, fetch };
}

class Memory implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
}

const CONFIG = { baseUrl: "https://wren.test", publishableKey: "adm_pub_customer", publicKeys: { link: "adm_pub_link" }, tables: { stays: "hotel_stays" } };
const R = "/api/v1/public/records";

describe("the real guest door", () => {
  it("reads the house through the customer key, every table on its own ref", async () => {
    const list = (rows: unknown[]) => () => json({ data: rows });
    const s = server({
      [`GET ${R}/hotel_settings`]: () => json({ data: [{ name: "Wren House", arrive_from: "15:00" }] }),
      [`GET ${R}/hotel_room_types`]: list([{ id: 2, position: 2 }, { id: 1, position: 1 }]),
      [`GET ${R}/hotel_room_type_features`]: list([]),
      [`GET ${R}/hotel_rooms`]: list([{ id: 9, number: "301" }, { id: 8, number: "104" }]),
      [`GET ${R}/hotel_extras`]: list([]),
      [`GET ${R}/hotel_house_notes`]: list([]),
    });
    const guest = new AdminiumGuest(CONFIG, { fetch: s.fetch, storage: new Memory() });
    const house = await guest.house();
    expect(house.settings["name"]).toBe("Wren House");
    expect(house.types.map((t) => t.id)).toEqual([1, 2]);
    expect(house.rooms.map((r) => r["number"])).toEqual(["104", "301"]);
    expect(new Set(s.calls.map((c) => c.key))).toEqual(new Set(["Bearer adm_pub_customer"]));
  });

  it("asks what is open by night, and hands back each type's pool", async () => {
    const s = server({
      "GET /api/v1/public/availability/hotel_stays_availability": () => json({ data: [{ pool: "1", state: "open", left: 2 }, { pool: "2", state: "full", earliest: "2026-08-10" }], earliest: "2026-08-10" }),
    });
    const guest = new AdminiumGuest(CONFIG, { fetch: s.fetch, storage: new Memory() });
    const answer = await guest.availability({ from: "2026-08-03", to: "2026-08-05", guests: 2, earliest: 42 });
    expect(answer).toEqual({ types: [{ pool: "1", state: "open", left: 2 }, { pool: "2", state: "full", earliest: "2026-08-10" }], earliest: "2026-08-10" });
    expect(s.calls[0]!.path).toBe("/api/v1/public/availability/hotel_stays_availability?from=2026-08-03&to=2026-08-05&guests=2&earliest=42");
  });

  it("reserves a stay with its extras in one write, with the retry key and the total the guest saw", async () => {
    const s = server({
      [`POST ${R}/hotel_stays_verified_3`]: () =>
        json({ data: { id: 41, ref: "WH-1001", total: "570.07" }, children: { stay_extras: [{ data: { id: 5, extra_id: 1 } }] }, link: { key: "link", token: "tok-41" } }, 201),
    });
    const guest = new AdminiumGuest(CONFIG, { fetch: s.fetch, storage: new Memory() });
    const reply = await guest.reserve(
      { values: { room_type_id: 1, arrive: "2026-08-03", depart: "2026-08-05", guests: 2 }, children: { stay_extras: [{ values: { extra_id: 1 } }] }, expect: { total: "570.07" } },
      "key-1",
    );
    expect(s.calls[0]!.body).toEqual({
      values: { room_type_id: 1, arrive: "2026-08-03", depart: "2026-08-05", guests: 2, client_key: "key-1" },
      children: { stay_extras: [{ values: { extra_id: 1 } }] },
      expect: { total: "570.07" },
    });
    expect(reply.data["ref"]).toBe("WH-1001");
    expect(reply.children?.stay_extras?.[0]?.data["extra_id"]).toBe(1);
    expect(reply.link).toEqual({ key: "link", token: "tok-41" });
  });

  it("says a changed price in the public API's own code, with the new total", async () => {
    const s = server({
      [`POST ${R}/hotel_stays_verified_3`]: () => json({ error: { code: "PUBLIC_PRICE_CHANGED", message: "The price has changed.", params: { total: "575.07", lines: {} } } }, 409),
    });
    const guest = new AdminiumGuest(CONFIG, { fetch: s.fetch, storage: new Memory() });
    const error = await guest.reserve({ values: {}, children: { stay_extras: [] }, expect: { total: "570.07" } }, "k").catch((e: unknown) => e);
    expect(isApiError(error)).toBe(true);
    expect(error).toMatchObject({ status: 409, code: "PUBLIC_PRICE_CHANGED", params: { total: "575.07" } });
  });

  it("opens a stay by its own link on the link key, and reads it and its lines there", async () => {
    const s = server({
      "POST /api/v1/public/claim/token": () => json({ data: { session: "link-session", expiresAt: 1 } }),
      [`GET ${R}/hotel_stays_claimed`]: () => json({ data: [{ id: 41, first_name: "Ines" }] }),
      [`GET ${R}/hotel_stay_extras_verified_3`]: () => json({ data: [{ id: 5, stay_id: 41 }] }),
      [`GET ${R}/hotel_charges_verified_2`]: () => json({ data: [] }),
      [`GET ${R}/hotel_stay_credits_verified_2`]: () => json({ data: [] }),
      [`GET ${R}/hotel_payments_verified_2`]: () => json({ data: [] }),
      [`PATCH ${R}/hotel_stays_claimed/41`]: (c) => json({ data: { id: 41, ...((c.body as { values: object }).values) } }),
    });
    const storage = new Memory();
    const guest = new AdminiumGuest(CONFIG, { fetch: s.fetch, storage });
    const opened = await guest.openLink("tok-41");
    expect(opened.firstName).toBe("Ines");
    const reads = s.calls.filter((c) => c.method === "GET");
    expect(reads.every((c) => c.key === "Bearer adm_pub_link" && c.session === "link-session")).toBe(true);
    // A change made by the link goes through the link's own entry.
    await guest.changeStay(41, { arrival_time: "18:00" });
    expect(s.calls.at(-1)).toMatchObject({ method: "PATCH", path: `${R}/hotel_stays_claimed/41`, key: "Bearer adm_pub_link", body: { values: { arrival_time: "18:00" } } });

    // After a reload the tab still holds the link's session.
    const again = new AdminiumGuest(CONFIG, { fetch: s.fetch, storage });
    await again.linkedStay();
    expect(s.calls.at(-1)!.session).toBe("link-session");
  });

  it("signs a guest in by the emailed code, reads who they are and their own stays", async () => {
    const s = server({
      "POST /api/v1/public/claim/link/verify": (c) =>
        (c.body as { code?: string }).code === "482913" ? json({ data: { session: "guest-session", expiresAt: 1, level: "verified" } }) : json({ data: { ok: false, triesLeft: 3 } }, 200),
      [`GET ${R}/hotel_customers_claimed`]: () => json({ data: [{ id: 3, email: "ines@example.com", first_name: "Ines", last_name: "Ortega" }] }),
      [`GET ${R}/hotel_stays_verified`]: () => json({ data: [{ id: 42, arrive: "2026-09-01" }, { id: 41, arrive: "2026-08-03" }] }),
      [`GET ${R}/hotel_stay_extras_verified`]: () => json({ data: [{ id: 5, stay_id: 41 }, { id: 6, stay_id: 42 }] }),
      [`GET ${R}/hotel_charges_verified`]: () => json({ data: [] }),
      [`GET ${R}/hotel_stay_credits_verified`]: () => json({ data: [] }),
      [`GET ${R}/hotel_payments_verified`]: () => json({ data: [{ id: 7, stay_id: 41 }] }),
    });
    const guest = new AdminiumGuest(CONFIG, { fetch: s.fetch, storage: new Memory(), clock: () => Date.parse("2026-07-28T13:05:00Z") });
    const claim = await guest.verifyCode("Ines@Example.com ", "482 913");
    expect(claim.firstName).toBe("Ines");
    expect(await guest.signedIn()).toEqual({ email: "ines@example.com", name: "Ines Ortega", at: "2026-07-28T13:05:00.000Z" });
    const mine = await guest.myStays();
    expect(mine.map((m) => m.stay.id)).toEqual([41, 42]);
    expect(mine[0]!.extras.map((e) => e.id)).toEqual([5]);
    expect(mine[0]!.payments.map((p) => p.id)).toEqual([7]);
    expect(s.calls.filter((c) => c.path.startsWith(R)).every((c) => c.session === "guest-session")).toBe(true);
  });

  it("says a wrong code with the tries left, as the screens read it", async () => {
    const s = server({ "POST /api/v1/public/claim/link/verify": () => json({ error: { code: "PUBLIC_CODE_WRONG", message: "wrong", params: { triesLeft: 3 } } }, 403) });
    const guest = new AdminiumGuest(CONFIG, { fetch: s.fetch, storage: new Memory() });
    const error = await guest.verifyCode("ines@example.com", "000000").catch((e: unknown) => e);
    expect(error).toMatchObject({ code: "PUBLIC_CODE_WRONG", params: { triesLeft: 3 } });
  });

  it("is signed out when the kept session has ended, and forgets it", async () => {
    const storage = new Memory();
    storage.setItem("wh.session.customer", JSON.stringify({ token: "old", at: 1 }));
    const s = server({});
    const guest = new AdminiumGuest(CONFIG, { fetch: s.fetch, storage });
    expect(await guest.signedIn()).toBeNull();
    expect(storage.getItem("wh.session.customer")).toBeNull();
  });

  it("ends a session the tab kept across a reload, with the key it belongs to", async () => {
    const storage = new Memory();
    storage.setItem("wh.session.customer", JSON.stringify({ token: "guest-session", at: 1 }));
    const s = server({ "DELETE /api/v1/public/session": () => json({ data: {} }) });
    const guest = new AdminiumGuest(CONFIG, { fetch: s.fetch, storage });
    await guest.signOut();
    expect(s.calls).toEqual([expect.objectContaining({ method: "DELETE", path: "/api/v1/public/session", key: "Bearer adm_pub_customer", session: "guest-session" })]);
    expect(storage.getItem("wh.session.customer")).toBeNull();
  });

  it("offers none of the account actions this Adminium has no route for, and refuses them if asked", async () => {
    const guest = new AdminiumGuest(CONFIG, { fetch: server({}).fetch, storage: new Memory() });
    expect(guest.offers).toEqual({ newLink: false, signOutEverywhere: false, forget: false });
    for (const run of [() => guest.newLink(1), () => guest.signOutEverywhere(), () => guest.forget()]) {
      await expect(run()).rejects.toMatchObject({ code: "NOT_OFFERED" });
    }
  });
});
