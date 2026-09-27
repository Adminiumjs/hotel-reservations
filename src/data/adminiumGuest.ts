/**
 * The guest site's door into a real Adminium: the public API through the
 * house's two browser keys, as `surface-config.json` serves them.
 *
 *   customer  the site's own key: the house, what is open, reserving, signing
 *             in by an emailed link, and the signed-in guest's own stays;
 *   link      the key a stay's own link opens it by (`…/r#<code>`): that one
 *             stay, its extras, charges, credits and payments.
 *
 * A session belongs to the key that opened it, so each key has its own client,
 * and the tab keeps each client's session across a reload (`keptSession.ts`).
 * Every figure is Adminium's: a price comes from its dry run, a reservation's
 * reference and total from its reply. A refusal reaches the screens as an
 * `ApiError` with the public API's own code.
 *
 * What this Adminium does not offer yet is said, not faked: `offers` names
 * the guest's account actions it serves, and each one it does not answers
 * `NOT_OFFERED` — the screens leave those actions out.
 */
import { createPublicClient, PublicApiError, type PublicClient } from "@adminiumjs/public-client";

import type { GuestOffers, GuestPort, House, NightQuestion, StayWithLines } from "./ports.ts";
import { keptSession, tabStorage, type KeptSession } from "./keptSession.ts";
import { publicRefs, type Refs } from "./publicRefs.ts";
import { ApiError, type ClaimReply, type ExtraAvailability, type Id, type PublicConfig, type QuoteReply, type Row, type StayBody, type StayReply, type NightAnswer, type Night } from "./wire.ts";

export interface GuestConfig {
  /** Where the public API is: `""` for this same origin. */
  baseUrl: string;
  /** The `customer` key. */
  publishableKey: string;
  /** The app's other browser keys, by what they open: `link`. */
  publicKeys?: Readonly<Record<string, string>>;
  /** The app's tables' real names by their short ones. */
  tables?: Readonly<Record<string, string>>;
}

export interface GuestOptions {
  fetch?: typeof fetch;
  storage?: Storage | null;
  clock?: () => number;
}

/**
 * None yet: a guest-made new link, signing out everywhere and deleting one's
 * details have no public route in the Adminium this app is built against.
 */
export const REAL_OFFERS: GuestOffers = { newLink: false, signOutEverywhere: false, forget: false };

const PAGE = 200;

/** The public client's refusal as the screens read one. */
export function asApiError(error: unknown): unknown {
  if (error instanceof PublicApiError) return new ApiError(error.status, error.code, error.message, { ...error.params });
  return error;
}

async function answer<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw asApiError(error);
  }
}

const notOffered = (what: string) => new ApiError(501, "NOT_OFFERED", `${what} is not offered by this Adminium.`);

/** The rows of a list, every page. */
async function all(client: PublicClient, ref: string): Promise<Row[]> {
  const rows: Row[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 50; page += 1) {
    const got = await client.list<Row>(ref, { limit: PAGE, ...(cursor === undefined ? {} : { cursor }) });
    rows.push(...got.data);
    const next = got.cursor?.next ?? null;
    if (next !== null && next !== "") {
      cursor = next;
      continue;
    }
    if (got.page !== undefined && got.data.length === PAGE && (got.page.total === null || got.page.offset + PAGE < got.page.total)) {
      const more = await client.list<Row>(ref, { limit: PAGE, offset: got.page.offset + PAGE });
      rows.push(...more.data);
      if (more.data.length < PAGE) break;
      continue;
    }
    break;
  }
  return rows;
}

const byPosition = (a: Row, b: Row) => Number(a["position"] ?? 0) - Number(b["position"] ?? 0) || Number(a.id) - Number(b.id);

/** A quote's nights as the screens read them: the rate Adminium priced each at, its tags. */
function nightsOf(value: unknown): Night[] {
  if (!Array.isArray(value)) return [];
  return value.map((n: Record<string, unknown>) => ({
    date: String(n["date"]),
    rate: Number(n["rate"]),
    base: n["base"] === undefined || n["base"] === null ? Number(n["rate"]) : Number(n["base"]),
    tags: Array.isArray(n["tags"]) ? n["tags"].map(String) : [],
  }));
}

export class AdminiumGuest implements GuestPort {
  readonly offers: GuestOffers = REAL_OFFERS;
  private readonly customer: PublicClient;
  private readonly link: PublicClient | null;
  private readonly customerSession: KeptSession;
  private readonly linkSession: KeptSession | null;
  private readonly refs: Refs;
  /** The stay the link key's session opened, when one is open. */
  private linkedId: Id | null = null;
  private readonly baseUrl: string;
  private readonly keys: { customer: string; link: string | null };
  /** The own link the last reservation was answered with, when the server sent one. */
  private lastLink: { key: string; token: string } | null = null;

  constructor(config: GuestConfig, options: GuestOptions = {}) {
    const base = options.fetch ?? globalThis.fetch.bind(globalThis);
    const storage = options.storage === undefined ? tabStorage() : options.storage;
    this.refs = publicRefs(config.tables);
    this.baseUrl = config.baseUrl;
    const linkKey = config.publicKeys?.["link"] ?? null;
    this.keys = { customer: config.publishableKey, link: linkKey };
    this.customerSession = keptSession("customer", storage, base, options.clock);
    const reserveAt = `/api/v1/public/records/${this.refs.reserve}`;
    // The client answers a create without the stay's own link: read it off the reply as it passes.
    const tapped: typeof fetch = async (input, init) => {
      const res = await this.customerSession.fetch(input, init);
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (res.ok && (init?.method ?? "GET").toUpperCase() === "POST" && url.split("?")[0]!.endsWith(reserveAt)) {
        try {
          const link = ((await res.clone().json()) as { link?: { key?: unknown; token?: unknown } }).link;
          this.lastLink = typeof link?.key === "string" && typeof link.token === "string" ? { key: link.key, token: link.token } : null;
        } catch {
          this.lastLink = null;
        }
      }
      return res;
    };
    const customer = createPublicClient({ baseUrl: config.baseUrl, publishableKey: config.publishableKey, fetch: tapped });
    if (customer === null) throw new Error("the guest site needs Adminium's address and the house's browser key");
    this.customer = customer;
    this.linkSession = linkKey === null ? null : keptSession("link", storage, base, options.clock);
    this.link = linkKey === null || this.linkSession === null ? null : createPublicClient({ baseUrl: config.baseUrl, publishableKey: linkKey, fetch: this.linkSession.fetch });
  }

  // ── the house ──────────────────────────────────────────────────────────────

  config(): Promise<PublicConfig> {
    return answer(async () => {
      const c = await this.customer.config();
      return { timezone: c.timezone, currency: c.currency };
    });
  }

  house(): Promise<House> {
    return answer(async () => {
      const r = this.refs;
      const [settings, types, features, rooms, extras, notes] = await Promise.all([
        all(this.customer, r.settings),
        all(this.customer, r.types),
        all(this.customer, r.features),
        all(this.customer, r.rooms),
        all(this.customer, r.extras),
        all(this.customer, r.notes),
      ]);
      return {
        settings: settings[0] ?? ({ id: 0 } as Row),
        types: types.sort(byPosition),
        features: features.sort(byPosition),
        rooms: rooms.sort((a, b) => String(a["number"]).localeCompare(String(b["number"]))),
        extras: extras.sort(byPosition),
        notes: notes.sort(byPosition),
      };
    });
  }

  availability(q: NightQuestion): Promise<NightAnswer> {
    return answer(async () => {
      const got = await this.customer.nightAvailability(this.refs.nights, {
        from: q.from,
        to: q.to,
        guests: q.guests,
        ...(q.earliest === undefined ? {} : { earliest: q.earliest }),
        ...(q.exclude === undefined ? {} : { exclude: String(q.exclude) }),
      });
      return { types: got.pools.map((p) => ({ pool: p.pool, state: p.state, ...(p.left === undefined ? {} : { left: p.left }), ...(p.earliest === undefined ? {} : { earliest: p.earliest }) })), earliest: got.earliest };
    });
  }

  extrasOpen(from: string, to: string): Promise<ExtraAvailability[]> {
    return answer(async () => {
      const got = await this.customer.nightAvailability(this.refs.parking, { from, to });
      return got.pools.map((p) => ({ extra_id: Number(p.pool), state: p.state === "open" ? "open" : "full", ...(p.left === undefined ? {} : { left: p.left }) }));
    });
  }

  // ── reserving ──────────────────────────────────────────────────────────────

  quote(body: StayBody): Promise<QuoteReply> {
    return answer(async () => {
      const got = await this.customer.quote(this.refs.reserve, { values: body.values, children: body.children });
      const raw = got as unknown as { nights?: unknown };
      return {
        data: got.data,
        nights: nightsOf(raw.nights),
        children: { stay_extras: (got.children["stay_extras"] ?? []).map((c) => ({ data: c.data })) },
        capacity: got.capacity,
        exact: got.exact,
      };
    });
  }

  reserve(body: StayBody, clientKey: string): Promise<StayReply> {
    return answer(async () => {
      this.lastLink = null;
      const got = await this.customer.createTree<Row>(this.refs.reserve, {
        values: { ...body.values, client_key: clientKey },
        children: body.children,
        ...(body.expect === undefined ? {} : { expect: body.expect }),
      });
      const link = this.lastLink;
      return {
        data: got.data,
        children: { stay_extras: (got.children["stay_extras"] ?? []).map((c) => ({ data: c.data })) },
        ...(got.replayed ? { replayed: true as const } : {}),
        ...(link === null || got.replayed ? {} : { link }),
      };
    });
  }

  // ── the stay's own link ─────────────────────────────────────────────────────

  openLink(token: string): Promise<ClaimReply> {
    return answer(async () => {
      if (this.link === null || this.linkSession === null) throw new ApiError(410, "LINK_EXPIRED", "This house opens no stay by its link.");
      const opened = await this.link.openShared(token);
      if (opened !== "opened") throw new ApiError(410, "LINK_EXPIRED", "This link does not open anything now.");
      const stay = await this.linkedStay();
      const kept = this.linkSession.kept();
      return { session: "kept", expiresAt: (kept?.at ?? Date.now()) + 30 * 60_000, firstName: String(stay.stay["first_name"] ?? "") };
    });
  }

  linkedStay(): Promise<StayWithLines> {
    return answer(async () => {
      // No link session in this tab: nothing to ask the server.
      if (this.link === null || (this.linkSession?.kept() === null && !this.link.isClaimed())) throw new ApiError(404, "PUBLIC_REF_NOT_FOUND", "No stay is open by its link.");
      const r = this.refs;
      try {
        const stays = await all(this.link, r.linkStay);
        const stay = stays[0];
        if (stay === undefined) throw new ApiError(404, "PUBLIC_REF_NOT_FOUND", "Open the link again.");
        this.linkedId = stay.id;
        const [extras, charges, credits, payments] = await Promise.all([all(this.link, r.linkExtras), all(this.link, r.linkCharges), all(this.link, r.linkCredits), all(this.link, r.linkPayments)]);
        return { stay, extras, charges, credits, payments };
      } catch (error) {
        // A session that has ended reads as nothing to read: drop it, so a reload does not send it again.
        if (error instanceof PublicApiError && error.code === "PUBLIC_REF_NOT_FOUND") this.linkSession?.drop();
        throw error;
      }
    });
  }

  // ── signing in ──────────────────────────────────────────────────────────────

  requestSignIn(email: string, lang?: string): Promise<{ sentTo: string }> {
    return answer(() => this.customer.requestLink({ email: email.trim(), ...(lang === undefined ? {} : { lang }) }));
  }

  /** The first name a sign-in link's page greets its guest by; spends nothing, signs nobody in. */
  peekLink(token: string): Promise<string | null> {
    return answer(() => this.customer.peekLink(token));
  }

  verifyLink(token: string): Promise<ClaimReply> {
    return answer(async () => {
      const opened = await this.customer.openLink(token);
      if (!opened) throw new ApiError(410, "LINK_EXPIRED", "This link has been used or has run out.");
      return this.claimed();
    });
  }

  verifyCode(email: string, code: string): Promise<ClaimReply> {
    return answer(async () => {
      const got = await this.customer.verifyLinkCode({ email: email.trim(), code: code.replace(/\s/g, "") });
      if (!got.ok) throw new ApiError(403, "PUBLIC_CODE_WRONG", "That code is not right.", { triesLeft: got.triesLeft });
      return this.claimed();
    });
  }

  private async claimed(): Promise<ClaimReply> {
    const kept = this.customerSession.kept();
    const who = await this.signedIn();
    return { session: "kept", expiresAt: (kept?.at ?? Date.now()) + 30 * 60_000, ...(who?.name ? { firstName: who.name.split(" ")[0] ?? "" } : {}) };
  }

  signedIn(): Promise<{ email: string; name: string | null; at: string } | null> {
    return answer(async () => {
      const kept = this.customerSession.kept();
      if (kept === null && !this.customer.isClaimed()) return null;
      try {
        const rows = await all(this.customer, this.refs.account);
        const me = rows[0];
        if (me === undefined || me["email"] === null || me["email"] === undefined || me["email"] === "") {
          this.customerSession.drop();
          return null;
        }
        const name = [me["first_name"], me["last_name"]].filter((p) => typeof p === "string" && p.trim() !== "").join(" ");
        return { email: String(me["email"]), name: name === "" ? null : name, at: new Date(kept?.at ?? Date.now()).toISOString() };
      } catch (error) {
        if (error instanceof PublicApiError && (error.code === "PUBLIC_REF_NOT_FOUND" || error.code === "PUBLIC_CLAIM_LEVEL")) {
          this.customerSession.drop();
          return null;
        }
        throw error;
      }
    });
  }

  myStays(): Promise<StayWithLines[]> {
    return answer(async () => {
      const r = this.refs;
      const [stays, extras, charges, credits, payments] = await Promise.all([
        all(this.customer, r.myStays),
        all(this.customer, r.myExtras),
        all(this.customer, r.myCharges),
        all(this.customer, r.myCredits),
        all(this.customer, r.myPayments),
      ]);
      const of = (rows: Row[], id: Id) => rows.filter((row) => row["stay_id"] === id);
      return stays
        .sort((a, b) => String(a["arrive"]).localeCompare(String(b["arrive"])))
        .map((stay) => ({ stay, extras: of(extras, stay.id), charges: of(charges, stay.id), credits: of(credits, stay.id), payments: of(payments, stay.id) }));
    });
  }

  // ── the guest's changes ─────────────────────────────────────────────────────

  /** Whose door a change to a stay goes through: the link that opened it, or the signed-in guest. */
  private byLink(id: Id): boolean {
    return this.link !== null && this.linkedId === id && !this.customer.isClaimed() && this.customerSession.kept() === null;
  }

  changeStay(id: Id, values: { arrival_time?: string; status?: "cancelled" }): Promise<Row> {
    return answer(() => (this.byLink(id) ? this.link!.update<Row>(this.refs.linkStay, String(id), values) : this.customer.update<Row>(this.refs.myStays, String(id), values)));
  }

  addExtra(stayId: Id, extraId: Id): Promise<Row> {
    return answer(() =>
      this.byLink(stayId)
        ? this.link!.create<Row>(this.refs.linkExtras, { stay_id: stayId, extra_id: extraId })
        : this.customer.create<Row>(this.refs.myExtras, { stay_id: stayId, extra_id: extraId }),
    );
  }

  setExtra(lineId: Id, state: "on" | "off"): Promise<Row> {
    return answer(async () => {
      // The line is the linked stay's when a link opened it and nobody is signed in.
      const viaLink = this.link !== null && this.linkedId !== null && this.byLink(this.linkedId);
      return viaLink ? this.link!.update<Row>(this.refs.linkExtraState, String(lineId), { state }) : this.customer.update<Row>(this.refs.myExtraState, String(lineId), { state });
    });
  }

  quoteDates(id: Id, arrive: string, depart: string): Promise<QuoteReply> {
    return answer(async () => {
      const got = await this.customer.quoteChange<Row>(this.refs.myDates, String(id), { arrive, depart });
      const raw = got as unknown as { nights?: unknown };
      return { data: got.data, nights: nightsOf(raw.nights), capacity: [], exact: got.exact };
    });
  }

  moveDates(id: Id, arrive: string, depart: string, expectTotal: string): Promise<Row> {
    return answer(() => this.customer.update<Row>(this.refs.myDates, String(id), { arrive, depart }, { expect: { total: expectTotal } }));
  }

  newLink(_id: Id): Promise<{ sentTo: string }> {
    return Promise.reject(notOffered("A new link"));
  }

  signOut(): Promise<void> {
    return answer(async () => {
      await Promise.all([
        this.endSession(this.customer, this.customerSession, this.keys.customer),
        this.link === null || this.linkSession === null || this.keys.link === null ? undefined : this.endSession(this.link, this.linkSession, this.keys.link),
      ]);
      this.linkedId = null;
    });
  }

  /** Ends a key's session on the server, whether the client or only the tab holds it; dropped here either way. */
  private async endSession(client: PublicClient, kept: KeptSession, key: string): Promise<void> {
    try {
      // After a reload only the tab holds the session, and the client's own sign-out would send nothing.
      if (client.isClaimed()) await client.signOut();
      else if (kept.kept() !== null) await kept.fetch(`${this.baseUrl}/api/v1/public/session`, { method: "DELETE", headers: { authorization: `Bearer ${key}` } });
    } finally {
      kept.drop();
    }
  }

  signOutEverywhere(): Promise<void> {
    return Promise.reject(notOffered("Signing out everywhere"));
  }

  forget(): Promise<void> {
    return Promise.reject(notOffered("Deleting a guest's details"));
  }
}
