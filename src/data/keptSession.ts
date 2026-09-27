/**
 * A guest's session, kept for the tab.
 *
 * The public client holds the session a sign-in (or a stay's own link) opens
 * in memory only, so a reload — and a sign-in link always lands on a fresh
 * page — would sign the guest out. This keeps the session token in the tab's
 * own storage, per key, and puts it back on the client's requests:
 *
 *   - a reply that opens a session (`/claim/link/verify`, `/claim/token`)
 *     is read for its token, which is kept with the moment it was opened;
 *   - a request that carries no session gets the kept one;
 *   - signing out (`DELETE /public/session`) drops it, whatever the server
 *     answered — a guest who signed out must not be signed in by a reload.
 *
 * The tab's storage dies with the tab, never with a sign-out, which is why
 * every sign-out drops it here and the port drops it on a session that has
 * ended (the server's "not found" for a guest's own rows).
 */

const SESSION_HEADER = "x-adminium-public-session";
const OPENS = /\/api\/v1\/public\/claim(\/link\/verify|\/token)$/;
const ENDS = /\/api\/v1\/public\/session$/;

export interface Kept {
  token: string;
  /** When it was opened, as this browser's clock said. */
  at: number;
}

export interface KeptSession {
  /** The client's `fetch`: the kept session goes out on every request that carries none. */
  fetch: typeof fetch;
  kept: () => Kept | null;
  drop: () => void;
}

/** The tab's storage, or none (a private window, a test). */
export function tabStorage(): Storage | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

export function keptSession(name: string, storage: Storage | null, base: typeof fetch, clock: () => number = Date.now): KeptSession {
  const slot = `wh.session.${name}`;
  let memory: Kept | null = null;

  const kept = (): Kept | null => {
    if (storage === null) return memory;
    try {
      const raw = storage.getItem(slot);
      if (raw === null) return null;
      const value = JSON.parse(raw) as Partial<Kept>;
      return typeof value.token === "string" && typeof value.at === "number" ? { token: value.token, at: value.at } : null;
    } catch {
      return memory;
    }
  };
  const keep = (value: Kept | null): void => {
    memory = value;
    if (storage === null) return;
    try {
      if (value === null) storage.removeItem(slot);
      else storage.setItem(slot, JSON.stringify(value));
    } catch {
      // storage refused (full, blocked): the memory copy lasts until the page goes
    }
  };

  const wrapped: typeof fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const path = url.replace(/^https?:\/\/[^/]+/, "").split("?")[0] ?? "";
    const headers = new Headers(init?.headers);
    const held = kept();
    if (!headers.has(SESSION_HEADER) && held !== null) headers.set(SESSION_HEADER, held.token);
    const ending = ENDS.test(path) && (init?.method ?? "GET").toUpperCase() === "DELETE";
    if (ending) keep(null);
    const res = await base(input, { ...init, headers });
    if (res.ok && OPENS.test(path)) {
      try {
        const body = (await res.clone().json()) as { data?: { session?: unknown } };
        if (typeof body.data?.session === "string") keep({ token: body.data.session, at: clock() });
      } catch {
        // not a session reply
      }
    }
    return res;
  };

  return { fetch: wrapped, kept, drop: () => keep(null) };
}
