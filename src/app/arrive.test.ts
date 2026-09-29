/**
 * Where a guest's page was opened from: a sign-in link waits for Continue, a
 * stay's own link opens the stay, and a session the tab kept brings the guest
 * back as they were.
 */
import { describe, expect, it } from "vitest";

import type { GuestPort, StayWithLines } from "../data/ports.ts";
import { ApiError } from "../data/wire.ts";
import { entryOf } from "./bootAdminium.tsx";
import { HouseApp } from "./house.ts";

const stay = (id: number): StayWithLines => ({ stay: { id, first_name: "Ines" }, extras: [], charges: [], credits: [], payments: [] });

/** A guest door that answers only what these checks ask. */
function door(over: Partial<GuestPort>): GuestPort {
  const no = () => Promise.reject(new ApiError(404, "PUBLIC_REF_NOT_FOUND", "no"));
  return new Proxy(over as GuestPort, { get: (target, name) => (target as unknown as Record<string | symbol, unknown>)[name] ?? no });
}

describe("where a guest's page was opened from", () => {
  it("reads the sign-in link and the stay's own link from the address", () => {
    expect(entryOf("/apps/hotel/customer/c", "#abcdEFGH1234_-xy")).toEqual({ place: "c", token: "abcdEFGH1234_-xy" });
    expect(entryOf("/r/", "#tok-41-link-code&to=x")).toEqual({ place: "r", token: "tok-41-link-code" });
    expect(entryOf("/apps/hotel/customer/rooms", "#abcdEFGH1234")).toEqual({ place: null, token: null });
    expect(entryOf("/c", "#short")).toEqual({ place: "c", token: null });
  });

  it("holds a sign-in link for Continue, then signs the guest in by it", async () => {
    let used = "";
    const app = new HouseApp(
      { guest: door({ verifyLink: async (t) => ((used = t), { session: "k", expiresAt: 0 }), signedIn: async () => ({ email: "Ines@Example.com", name: "Ines", at: "2026-07-28T13:05:00Z" }), myStays: async () => [] }) },
      "guest",
    );
    await app.arrive("c", "sign-in-code-1");
    expect(app.state.view).toBe("signin");
    expect(app.state.auth).toMatchObject({ stage: "link", token: "sign-in-code-1" });
    expect(used).toBe("");
    await app.continueLink();
    expect(used).toBe("sign-in-code-1");
    expect(app.state.signedIn).toBe("ines@example.com");
    expect(app.state.view).toBe("list");
  });

  it("says a sign-in link that was used or ran out", async () => {
    const app = new HouseApp({ guest: door({ verifyLink: async () => Promise.reject(new ApiError(410, "LINK_EXPIRED", "used")) }) }, "guest");
    await app.arrive("c", "sign-in-code-1");
    await app.continueLink();
    expect(app.state.auth.stage).toBe("expired");
    expect(app.state.signedIn).toBeNull();
  });

  it("opens the stay a stay's own link names, or says the link opens nothing now", async () => {
    const app = new HouseApp({ guest: door({ openLink: async () => ({ session: "k", expiresAt: 0 }), linkedStay: async () => stay(41) }) }, "guest");
    await app.arrive("r", "stay-link-code");
    expect(app.state.linkStay).toBe(41);
    expect(app.state.view).toBe("one");
    expect(app.state.oneId).toBe(41);

    const gone = new HouseApp({ guest: door({ openLink: async () => Promise.reject(new ApiError(410, "LINK_EXPIRED", "stopped")) }) }, "guest");
    await gone.arrive("r", "stay-link-code");
    expect(gone.state.view).toBe("signin");
    expect(gone.state.auth.stage).toBe("expired");
  });

  it("brings a guest back as the tab kept them", async () => {
    const app = new HouseApp({ guest: door({ signedIn: async () => ({ email: "ines@example.com", name: null, at: "2026-07-28T13:05:00Z" }), linkedStay: async () => stay(41) }) }, "guest");
    await app.arrive(null, null);
    expect(app.state.signedIn).toBe("ines@example.com");
    expect(app.state.signedAt).toBe(Date.parse("2026-07-28T13:05:00Z"));
    expect(app.state.linkStay).toBe(41);

    const stranger = new HouseApp({ guest: door({ signedIn: async () => null }) }, "guest");
    await stranger.arrive(null, null);
    expect(stranger.state.signedIn).toBeNull();
    expect(stranger.state.linkStay).toBeNull();
  });
});

describe("a value the house refuses on the reservation form", () => {
  const refused = (column: string) => new ApiError(400, "PUBLIC_WRITE_REFUSED", "refused", { column });
  it("is said about the field the guest typed, never as the dates", () => {
    const app = new HouseApp({ guest: door({}) }, "guest");
    expect(app.ruleWords(refused("mobile"))).toBe("That does not look like a mobile number — check it, or leave it empty.");
    expect(app.ruleWords(refused("last_name"))).toBe("Please write your name in letters only.");
    expect(app.ruleWords(refused("first_name"))).toBe("Please write your name in letters only.");
    expect(app.ruleWords(refused("email"))).toBe("An email we can write to");
    expect(app.ruleWords(refused("guests"))).toBe("That room type does not sleep that many.");
  });
});
