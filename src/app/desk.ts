/**
 * The desk's actions: what a button at the front desk does — open a folio,
 * check a guest in or out, take a booking, record what they pay, move a room.
 * Each asks Adminium through the desk's door and shows what it answers, as the
 * controller's shared actions do (`house.ts`).
 *
 * DESK ONLY: the guest's build never imports this module, so a guest's page
 * carries none of it (the surface gate holds that, `surface-nav.ts`).
 */
import { isApiError, type Id, type LinenRow, type QuoteReply, type StayBody } from "../data/wire.ts";
import { tr } from "../i18n/tr.ts";
import { mailable } from "../lib/mail.ts";
import { money, nightsOf, plus, strip } from "./fmt.ts";
import { blankForm, mintKey, type HouseApp, type Nb, type View } from "./house.ts";
import type { StV } from "./world.ts";

export function openFolio(app: HouseApp, id: Id, from?: View): void {
  app.go("folio", { folioId: id, folioBack: from ?? app.state.view ?? "today", blockId: null, settleOpen: false, chargeOpen: false });
}

/** A stay's nights, each priced as Adminium prices it (the folio's). */
export function folio(app: HouseApp, id: Id) {
  return app.get(`desk:folio:${String(id)}`, () => app.ports.desk!.folio(id));
}

export function counts(app: HouseApp) {
  return app.get(`desk:counts:${app.day}`, () => app.ports.desk!.counts(plus(app.day, -1), 16));
}

export async function doCheckOut(app: HouseApp, st: StV, credit: string | null): Promise<void> {
  app.setState({ coBusy: true });
  if (credit !== null) {
    const ok = await app.write(() => app.ports.desk!.takeOffNights(st.id, credit));
    if (ok === undefined) return app.setState({ coBusy: false });
  }
  await app.write(
    () => app.ports.desk!.checkOut(st.id),
    () => {
      app.setState({ checkoutId: null, coMode: "booked", coBusy: false, blockId: null });
      app.toast(tr("{name} checked out. Room {room} is being cleaned.", { name: st.name, room: st.room ?? "" }));
    },
    (error) => {
      app.setState({ coBusy: false });
      if (isApiError(error) && error.params["requires"] === "balance") {
        app.go("folio", { blockId: st.id, folioId: st.id, checkoutId: null });
        app.toast(tr("Cannot check out — {amount} still on the account.", { amount: strip(money(app.stay(st.id)?.m.balance ?? st.m.balance)) }), "warn");
      } else app.toast(app.refused(error), "warn");
    },
  );
}

export function openSettle(app: HouseApp, id: Id, amount?: string, cap?: number, kind: "taken" | "given_back" = "taken"): void {
  const st = app.stay(id);
  const bal = st === null ? 0 : Math.max(0, st.m.balance);
  app.setState({
    settleOpen: true,
    settleId: id,
    settleCap: cap ?? null,
    settleAmount: amount ?? (kind === "given_back" ? (st?.m.paid ?? 0).toFixed(2) : bal.toFixed(2)),
    settleMethod: "card",
    settleRefNo: "",
    settleTouched: false,
    settleKind: kind,
    settleNote: "",
    cardCode: "",
    cardBusy: false,
    cardErr: "",
    cardCheck: null,
    settleAgainst: null,
  });
}

/** "Give back to the card": money back to the gift card one payment came from, up to what that payment can still return. */
export function openGiveBackToCard(app: HouseApp, stayId: Id, paymentId: Id, cap: number): void {
  openSettle(app, stayId, cap.toFixed(2), cap, "given_back");
  app.setState({ settleAgainst: paymentId, settleMethod: "gift_card", rowMenu: null });
}

/** "Check the card": what it would pay of what the stay owes, written nowhere. */
export async function checkCard(app: HouseApp, stayId: Id): Promise<void> {
  const code = app.state.cardCode.trim();
  if (code === "" || app.state.cardBusy) return;
  app.setState({ cardBusy: true, cardErr: "", cardCheck: null });
  try {
    const check = await app.ports.desk!.quoteCard(stayId, code);
    app.setState({ cardBusy: false, cardCheck: check });
  } catch (error) {
    app.setState({ cardBusy: false, cardErr: cardWords(app, error) });
    app.focusSoon("#se-card");
  }
}

/** Why a card was not taken, in the desk's words. */
export function cardWords(app: HouseApp, error: unknown): string {
  if (isApiError(error) && error.code === "VALIDATION_FAILED") {
    const fields = (error.params["fields"] ?? {}) as Record<string, { code?: string }>;
    if (fields["card_code"] !== undefined) return tr("The house does not know that card. Check the code on the back.");
  }
  if (isApiError(error) && (error.code === "COLUMN_FORBIDDEN" || error.code === "FORBIDDEN")) return tr("That is not for your role.");
  if (isApiError(error) && error.code === "POSTING_REFUSED") return app.postingWords(error);
  return app.refused(error);
}

export function openCheckin(app: HouseApp, id: Id): void {
  app.setState({ checkinId: id, pickedRoom: null, ciAlt: false, ciType: null, ciUp: false, ciErr: "", ciBusy: false, ciMissed: "charge" });
}

export async function confirmCheckin(app: HouseApp): Promise<void> {
  const s = app.state;
  const cs = app.stay(s.checkinId);
  const w = app.world();
  const n = s.pickedRoom;
  if (cs === null || n === null || s.ciBusy || w === null) return;
  const room = w.rooms.find((r) => r.n === n)!;
  app.setState({ ciBusy: true, ciErr: "" });
  const desk = app.ports.desk!;
  await app.write(
    async () => {
      // Another type priced at its own rate is a change of the stay first; a better room at the booked price is only the room.
      // …at the price the sheet showed for it: a price moved since is refused, never taken unseen.
      if (s.ciType !== null && !s.ciUp && s.ciType !== cs.type) {
        const shown = app.peek<QuoteReply>(`quote-edit:${String(cs.id)}:type:${s.ciType}`);
        await desk.edit(cs.id, { room_type_id: Number(s.ciType) }, shown === undefined ? undefined : String(shown.data["total"]));
      }
      if (cs.state === "noshow") return desk.cameAfterAll(cs.id, { roomId: room.id, chargeMissed: s.ciMissed === "charge" });
      return desk.checkIn(cs.id, room.id);
    },
    () => {
      app.setState({ checkinId: null, pickedRoom: null, ciAlt: false, ciType: null, ciUp: false, ciBusy: false });
      openFolio(app, cs.id, s.view === "folio" ? s.folioBack : s.view ?? "today");
      app.toast(tr("{first} is in room {room}.", { first: cs.first, room: n }));
    },
    (error) => app.setState({ ciBusy: false, pickedRoom: null, ciErr: isApiError(error) && (error.code === "CAPACITY_FULL" || error.params["requires"] === "linked") ? tr("Room {room} has just been given to another guest — pick another.", { room: n }) : app.refused(error) }),
  );
}

export async function markNoShow(app: HouseApp, st: StV): Promise<void> {
  await app.write(() => app.ports.desk!.noShow(st.id), () => app.toast(tr("{ref} is marked as a no-show.", { ref: st.ref }), "info"));
}

export async function cameAfterAll(app: HouseApp, st: StV): Promise<void> {
  const w = app.world()!;
  // After the no-show time the guest is checked in straight away (the check-in sheet asks about the missed night).
  const deadline = app.mins(plus(st.expectBy ?? st.arrive, 1), w.H.noShowAt);
  if (app.nowMin() >= deadline || st.arrive < app.day) {
    openCheckin(app, st.id);
    return;
  }
  await app.write(() => app.ports.desk!.cameAfterAll(st.id, null), () => app.toast(tr("{ref} is back in the book.", { ref: st.ref })));
}

export function openEdit(app: HouseApp, st: StV): void {
  const extras: Record<string, boolean> = {};
  for (const id of st.extras) extras[id] = true;
  app.go("newbooking", {
    editId: st.id,
    nbErr: "",
    nbTouched: false,
    nb: {
      key: "",
      link: null,
      arrive: st.arrive,
      depart: st.depart,
      guests: st.guests,
      type: st.type,
      first: st.first,
      last: st.last,
      email: st.email,
      mobile: st.mobile,
      arrivalTime: st.arrivalTime || "15:00",
      note: st.note,
      extras,
      language: st.language ?? "en-US",
    },
  });
}

export function blankNb(app: HouseApp): Nb {
  const d = app.day;
  return { ...blankForm(), key: mintKey(), arrive: plus(d, 6), depart: plus(d, 8), guests: 2, type: null, link: null, language: "en-US" };
}

export function walkIn(app: HouseApp): void {
  const d = app.day;
  app.go("newbooking", { editId: null, nbErr: "", nbTouched: false, nb: { ...blankNb(app), arrive: d, depart: plus(d, 1) } });
}

export function nbValues(nb: Nb): Record<string, unknown> {
  return {
    room_type_id: nb.type === null ? null : Number(nb.type),
    arrive: nb.arrive,
    depart: nb.depart,
    guests: nb.guests,
    first_name: nb.first.trim(),
    last_name: nb.last.trim() === "" ? null : nb.last.trim(),
    email: nb.email.trim() === "" ? null : nb.email.trim(),
    mobile: nb.mobile.trim() === "" ? null : nb.mobile.trim(),
    arrival_time: nb.arrivalTime,
    note: nb.note.trim() === "" ? null : nb.note.trim(),
    language: nb.language,
  };
}

/** The columns a change to a stay writes: only what the form moved. A new arrival lets go of the day the room was kept to. */
export function nbChanged(old: StV, nb: Nb): Record<string, unknown> {
  const was: Record<string, unknown> = {
    room_type_id: Number(old.type),
    arrive: old.arrive,
    depart: old.depart,
    guests: old.guests,
    first_name: old.first,
    last_name: old.last || null,
    email: old.email || null,
    mobile: old.mobile || null,
    arrival_time: old.arrivalTime,
    note: old.note || null,
    language: old.language ?? "en-US",
  };
  const changed = Object.fromEntries(Object.entries(nbValues(nb)).filter(([k, v]) => v !== was[k]));
  if ("arrive" in changed && old.expectBy !== null) changed["expect_by"] = null;
  return changed;
}

export function openRoom(app: HouseApp, n: string): void {
  app.setState({ roomN: n, rmMsg: "", oos: { from: app.day, to: "", reason: "" }, oosTried: false });
}

export function signOutStaff(app: HouseApp): void {
  app.setState({ staffMenu: false });
  if (app.ports.desk?.signOut) void app.ports.desk.signOut();
  else app.toast(tr("Signed out of the desk."), "info");
}

export async function saveNb(app: HouseApp, andCheckIn: boolean, known: { customerId: Id } | null, expectTotal: string | undefined): Promise<void> {
  const s = app.state;
  const nb = s.nb;
  if (nb === null || s.nbBusy) return;
  if (!nb.first.trim() || !nb.last.trim()) {
    app.setState({ nbTouched: true });
    app.focusSoon(!nb.first.trim() ? "#nb-first" : "#nb-last");
    return;
  }
  app.setState({ nbBusy: true, nbErr: "", nbTouched: false });
  const desk = app.ports.desk!;
  const values = nbValues(nb);
  if (s.editId !== null) {
    const old = app.stay(s.editId)!;
    const changed = nbChanged(old, nb);
    // The stay and its extras, each put on or dropped as the form says, in one write.
    const toggles = app.world()!
      .extras.filter((e) => !!nb.extras[e.id] !== old.extras.includes(e.id))
      .map((e) => ({ extraId: Number(e.id), on: !!nb.extras[e.id] }));
    await app.write(
      async () => {
        if (Object.keys(changed).length > 0 || toggles.length > 0) await desk.edit(old.id, changed, expectTotal, toggles);
        return old;
      },
      () => {
        app.setState({ nbBusy: false, editId: null, nb: null });
        openFolio(app, old.id, s.folioBack);
        app.toast(tr("{ref} is changed.", { ref: old.ref }));
      },
      (error) => app.setState({ nbBusy: false, nbErr: app.refused(error) }),
    );
    return;
  }
  // One key per booking form: a save sent again after a reply that never came lands on the same stay.
  const key = nb.key || mintKey();
  const body: StayBody = {
    values: { ...values, ...(known !== null && nb.link === "yes" ? { customer_id: known.customerId } : {}) },
    children: { stay_extras: app.pickedExtras(nb).map((extra_id) => ({ values: { extra_id: Number(extra_id) } })), ...app.typedCodes(s.codes) },
    ...(expectTotal ? { expect: { total: expectTotal } } : {}),
    clientKey: key,
  };
  await app.write(
    () => desk.book(body),
    (reply) => {
      const id = reply.data.id;
      const ref = String(reply.data["ref"]);
      app.setState({ nbBusy: false, nb: null, codes: [], codeOpen: false, codeText: "", codeErr: "" });
      app.toast(tr("{ref} · {name} · {nights} in the book.", { ref, name: `${nb.first.trim()} ${nb.last.trim()}`.trim(), nights: strip(tr("{n} night|{n} nights", { n: nightsOf(nb.arrive, nb.depart) })) }));
      if (andCheckIn) {
        app.go("today", { newId: id });
        openCheckin(app, id);
      } else app.go(nb.arrive === app.day ? "today" : "reservations", { newId: id });
    },
    (error) => {
      // Refused for good (Adminium named why): the next save is a new booking. Unanswered, or a server that
      // stumbled after it may have saved: the same key tries again, and lands on the stay if it was made.
      const refusedForGood = isApiError(error) && error.status >= 400 && error.status < 500 && error.status !== 408 && error.status !== 429;
      const t = app.world()?.typeById[nb.type ?? ""];
      app.setState({ nb: { ...nb, key: refusedForGood ? mintKey() : key }, nbBusy: false, nbErr: isApiError(error) && error.code === "CAPACITY_FULL" ? tr("The last {type} went while you were typing — pick another type.", { type: t?.name ?? "" }) : app.refused(error) });
    },
  );
}

export async function setRoomStatus(app: HouseApp, n: string, status: "ready" | "cleaning"): Promise<void> {
  const r = app.world()?.rooms.find((x) => x.n === n);
  if (r === undefined) return;
  await app.write(
    () => app.ports.desk!.setRoom(r.id, { status }),
    () => app.toast(status === "ready" ? tr("Room {room} is ready.", { room: n }) : tr("Room {room} is being cleaned.", { room: n })),
    (error) => (app.state.roomN === n ? app.setState({ rmMsg: app.refused(error) }) : app.toast(app.refused(error), "warn")),
  );
}

/** The folio drawn by Invoices & Receipts, opened to print. */
export async function printFolio(app: HouseApp, st: StV): Promise<void> {
  await app.write(
    () => app.ports.desk!.printFolio(st.id),
    (r) => {
      if (r.url !== null && typeof window !== "undefined") window.open(r.url, "_blank", "noopener");
      app.toast(tr("The folio for {ref} is open to print.", { ref: st.ref }), "info");
    },
  );
}

/** The folio emailed with the document: settled, or so far while money is owing (Adminium's balance decides). */
export async function emailFolio(app: HouseApp, st: StV): Promise<void> {
  if (!st.email) {
    app.toast(tr("There is no email on this stay."), "warn");
    return;
  }
  const soFar = st.state === "in" && st.m.balance > 0.004;
  await app.once("folio-email", () =>
    app.write(
      () => app.ports.desk!.emailFolio(st.id, soFar),
      // Adminium mails no reserved address (a sample guest's): say so, not "on its way".
      () => (mailable(st.email) ? app.toast(tr("The folio is on its way to {email}.", { email: st.email })) : app.toast(tr("No email was sent: {email} is a sample address.", { email: st.email }), "warn")),
    ),
  );
}

// ── linen ───────────────────────────────────────────────────────────────────

/** The linen the house sends to the laundry, and what the books hold of it; none without Inventory. */
export function linen(app: HouseApp): LinenRow[] {
  if (!app.linenOn) return [];
  return app.get("desk:linen", () => app.ports.desk!.linen()) ?? [];
}

/** "Back from the laundry": the sheet opens on what the books say is there. */
export function openLinen(app: HouseApp): void {
  const counts = (rows: LinenRow[]) => Object.fromEntries(rows.map((row) => [String(row.itemId), String(row.atLaundry)]));
  app.setState({ linenOpen: true, linenCounts: counts(linen(app)), linenBusy: false, linenErr: "", linenResume: null });
  // Asked afresh as it opens: the counts it starts from are the books' as they stand now, not as Today last read them.
  app.forget("desk:linen");
  void app.ports.desk!.linen().then(
    (rows) => {
      if (app.state.linenOpen && !app.state.linenBusy) app.setState({ linenCounts: counts(rows) });
    },
    () => undefined,
  );
}

/** A count as typed: a whole number of 0 or more, or null. */
export const linenCount = (typed: string | undefined): number | null => (typed !== undefined && /^\d{1,6}$/.test(typed.trim()) ? Number(typed.trim()) : null);

/** "Put back": one transfer to the store, each kind its own line; a line that failed is sent again by pressing again. */
export async function putBackLinen(app: HouseApp): Promise<void> {
  const s = app.state;
  const rows = linen(app);
  if (s.linenBusy) return;
  const counts = rows.map((row) => ({ row, qty: linenCount(s.linenCounts[String(row.itemId)]) }));
  if (s.linenResume === null && counts.some((one) => one.qty === null)) return app.setState({ linenErr: tr("A count of 0 or more.") });
  if (s.linenResume === null && counts.every((one) => one.qty === 0)) return app.setState({ linenErr: tr("Nothing to put back.") });
  app.setState({ linenBusy: true, linenErr: "" });
  try {
    const reply = await app.ports.desk!.putBackLinen(counts.map((one) => ({ itemId: one.row.itemId, qty: one.qty ?? 0 })), s.linenResume ?? undefined);
    app.forget("desk:linen");
    if (!reply.done) return app.setState({ linenBusy: false, linenResume: reply.transferId, linenErr: tr("Some of it did not go through. Press again to finish.") });
    const place = rows[0]?.store ?? "";
    const over = reply.over.map((one) => tr("{n} more {item} than the house had there", { n: one.by, item: rows.find((row) => row.itemId === one.itemId)?.name ?? "" }));
    app.setState({ linenOpen: false, linenBusy: false, linenResume: null, linenCounts: {} });
    app.toast([tr("Back in {place}.", { place }), ...over].join(" "));
  } catch (error) {
    app.forget("desk:linen");
    app.setState({ linenBusy: false, linenErr: isApiError(error) && error.code === "POSTING_REFUSED" ? tr("The house could not record that. Try again in a moment.") : app.refused(error) });
  }
}
