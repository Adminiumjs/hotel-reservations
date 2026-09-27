import { describe, expect, it } from "vitest";

import { keptSession } from "./keptSession.ts";

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

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("a guest's session kept for the tab", () => {
  it("keeps the session a sign-in opens, sends it after a reload, and drops it on signing out", async () => {
    const storage = new Memory();
    const seen: (string | null)[] = [];
    const server: typeof fetch = async (input, init) => {
      const url = String(input);
      seen.push(new Headers(init?.headers).get("x-adminium-public-session"));
      if (url.endsWith("/claim/link/verify")) return json({ data: { session: "s-1", expiresAt: 1, level: "verified" } });
      return json({ data: [] });
    };
    const first = keptSession("customer", storage, server, () => 1000);
    await first.fetch("https://h.test/api/v1/public/claim/link/verify", { method: "POST", body: "{}" });
    expect(first.kept()).toEqual({ token: "s-1", at: 1000 });

    // The page is loaded again: a new keeper on the same tab reads it back.
    const again = keptSession("customer", storage, server);
    await again.fetch("https://h.test/api/v1/public/records/hotel_stays_verified");
    expect(seen.at(-1)).toBe("s-1");

    // The client's own header wins over the kept one.
    await again.fetch("https://h.test/api/v1/public/records/x", { headers: { "x-adminium-public-session": "s-2" } });
    expect(seen.at(-1)).toBe("s-2");

    await again.fetch("https://h.test/api/v1/public/session", { method: "DELETE" });
    expect(again.kept()).toBeNull();
    await again.fetch("https://h.test/api/v1/public/records/x");
    expect(seen.at(-1)).toBeNull();
  });

  it("keeps a stay's own link session under its own key, and nothing from a refused open", async () => {
    const storage = new Memory();
    const server: typeof fetch = async (input) => (String(input).endsWith("/claim/token") ? json({ data: { session: "l-1", expiresAt: 1 } }) : json({ error: { code: "LINK_EXPIRED" } }, 410));
    const link = keptSession("link", storage, server);
    const customer = keptSession("customer", storage, server);
    await link.fetch("/api/v1/public/claim/token", { method: "POST" });
    expect(link.kept()?.token).toBe("l-1");
    expect(customer.kept()).toBeNull();
    link.drop();
    const refused = keptSession("link", storage, async () => json({ error: { code: "LINK_EXPIRED" } }, 410));
    await refused.fetch("/api/v1/public/claim/token", { method: "POST" });
    expect(refused.kept()).toBeNull();
  });

  it("works without storage, for the page's life", async () => {
    const server: typeof fetch = async () => json({ data: { session: "m-1", expiresAt: 1 } });
    const kept = keptSession("customer", null, server);
    await kept.fetch("/api/v1/public/claim/link/verify", { method: "POST" });
    expect(kept.kept()?.token).toBe("m-1");
  });
});
