/**
 * The sheets and dialogs: check-in, check-out, one room, a charge, a payment
 * (or money given back), a void, a move, a cancellation, deleting a guest's
 * details, keeping a room for a late guest, and the guest's change of dates.
 * Every price and every refusal is Adminium's: a sheet shows its dry run, and a
 * write it refuses is said in the house's words.
 */
import { isApiError, type Id } from "../../data/wire.ts";
import { tr } from "../../i18n/tr.ts";
import { fD, fDW, fT, guestsW, fsi, iso, money, nights, nightsOf, plus, strip, taxWords } from "../fmt.ts";
import type { HouseApp } from "../house.ts";
import type { RoomV, StV, WorldV } from "../world.ts";
import { cancelStage, chgVals } from "./guest.ts";
import { closedOn, firstClosed, floorInLine, floorName, freeAcross, hasExtra, heldForOther, holds, inRoom, nightFig, parseMoney, roomStatus, statusWord } from "./desk.ts";

type V = Record<string, unknown>;

const CLOSED = {
  ci: { open: false, facts: [], rooms: [], alts: [], ups: [], missed: [] },
  co: { open: false, facts: [], lines: [], modes: [] },
  rm: { open: false, options: [], closures: [], guests: [] },
  ch: { open: false, items: [] },
  se: { open: false, methods: [], quick: [] },
  cx: { open: false, who: [] },
  vd: { open: false },
  mv: { open: false, rooms: [], ups: [] },
  dd: { open: false },
  ex: { open: false, days: [] },
};


export function overlayVals(app: HouseApp, w: WorldV): V {
  const s = app.state;
  const today = app.day;
  const H = w.H;
  const desk = app.ports.desk;
  const v: V = { ...CLOSED };

  // ── check-out
  const os = app.stay(s.checkoutId);
  if (os !== null && desk) {
    const t = w.typeById[os.type]!;
    const early = os.depart > today;
    const left = nightsOf(today, os.depart);
    const sameDay = os.arrive === today;
    // A guest who checked in has had the room: on the arrival day the first night is still charged.
    const from = sameDay ? plus(today, 1) : today;
    const stayed = early && from < os.depart ? app.ask(`take-off:${String(os.id)}:${from}`, () => desk.quoteTakeOff(os.id, from)).value : undefined;
    const stayedBlocked = stayed?.refused ?? false;
    const mode = early && stayed !== undefined && !stayedBlocked ? s.coMode : "booked";
    const basis = mode === "stayed" && stayed !== undefined ? stayed.data : null;
    const num = (k: string, own: number) => (basis === null ? own : Number(basis[k] ?? 0));
    const total = num("total", os.m.total);
    const paid = os.m.paid;
    const bal = Math.round((num("balance", os.m.balance) + Number.EPSILON) * 100) / 100;
    const owing = bal > 0.004;
    const n = mode === "stayed" ? nightsOf(os.arrive, from) : nightsOf(os.arrive, os.depart);
    const goSettle = () => app.openSettle(os.id, bal.toFixed(2), bal);
    const late = hasExtra(w, os, "LATE");
    v["co"] = {
      open: true,
      tint: t.tint,
      icon: t.icon,
      name: os.name,
      ref: iso(os.ref),
      range: iso(`${strip(fDW(os.arrive))} → ${strip(fDW(os.depart))}`),
      close: () => app.setState({ checkoutId: null, coMode: "booked" }),
      title: early && sameDay ? tr("Leaving on the day they arrived") : early ? tr("Leaving {n} night early|Leaving {n} nights early", { n: left }) : tr("Leaving today"),
      earlyOn: early,
      earlyNote: tr("Booked to {day}. The nights after today go back on sale either way.", { day: strip(fDW(os.depart)) }),
      modes: early
        ? [
            { id: "booked", label: tr("Charge the nights booked ({total})", { total: strip(money(os.m.total)) }), sub: tr("{nights} as booked", { nights: strip(nights(nightsOf(os.arrive, os.depart))) }), disabled: false },
            {
              id: "stayed",
              label: sameDay
                ? tr("Charge the first night only ({total})", { total: stayed === undefined ? "…" : strip(money(stayed.total)) })
                : tr("Charge only the nights stayed ({total})", { total: stayed === undefined ? "…" : strip(money(stayed.total)) }),
              sub: stayedBlocked
                ? tr("They have paid more than the new total — record the money given back first")
                : sameDay
                  ? tr("{day} — they have had the room", { day: strip(fDW(today)) })
                  : tr("{nights} up to today", { nights: strip(nights(nightsOf(os.arrive, today))) }),
              disabled: stayedBlocked || stayed === undefined,
            },
          ].map((m) => ({
            id: m.id,
            label: m.label,
            sub: m.sub,
            disabled: m.disabled,
            checked: mode === m.id ? "true" : "false",
            pick: () => {
              if (!m.disabled) app.setState({ coMode: m.id as "booked" | "stayed" });
            },
            border: mode === m.id ? "var(--accent)" : "var(--border-strong)",
            bg: mode === m.id ? "var(--accent-soft)" : "var(--surface)",
            dot: mode === m.id ? "var(--accent)" : "transparent",
            opacity: m.disabled ? ".55" : "1",
            cursor: m.disabled ? "not-allowed" : "pointer",
            subFg: stayedBlocked && m.id === "stayed" ? "var(--warn)" : "var(--fg-subtle)",
          }))
        : [],
      facts: [
        { id: "f1", label: tr("Room"), value: iso(os.room ?? "—"), font: "var(--mono)" },
        { id: "f2", label: tr("Room type"), value: t.name, font: "inherit" },
        { id: "f3", label: tr("Nights"), value: nights(n), font: "var(--mono)" },
        { id: "f4", label: tr("Leaving by"), value: fT(late ? H.lateUntil : H.leaveBy), font: "var(--mono)" },
      ],
      lines: [{ id: "l0", label: tr("{nights} in the room", { nights: strip(nights(nightsOf(os.arrive, os.depart))) }), amount: money(os.m.room), weight: "600" }]
        .concat(os.lines.filter((l) => l.on).map((l) => ({ id: `e${String(l.id)}`, label: l.label, amount: money(l.amount), weight: "600" })))
        .concat(os.charges.filter((c) => !c.voided).map((c) => ({ id: `c${String(c.id)}`, label: c.label, amount: money(c.amount), weight: "600" })))
        .concat(
          basis === null
            ? os.credits.filter((c) => !c.voided).map((c) => ({ id: `k${String(c.id)}`, label: tr("Nights not stayed"), amount: iso(`− ${strip(money(c.amount))}`), weight: "600" }))
            : [{ id: "k", label: tr("Nights not stayed"), amount: iso(`− ${strip(money(stayed!.credit))}`), weight: "600" }],
        )
        .concat([
          { id: "tx", label: taxWords(os.m.taxLabel || w.H.taxLabel, os.m.taxRate || w.H.taxRate), amount: money(num("tax", os.m.tax)), weight: "600" },
          { id: "tt", label: tr("Total"), amount: money(total), weight: "800" },
          { id: "pd", label: tr("Paid so far"), amount: money(paid), weight: "600" },
        ]),
      balance: money(bal),
      balFg: owing ? "var(--danger)" : "var(--pos)",
      balNote: owing ? tr("still to settle") : tr("nothing owing"),
      owing,
      clear: !owing,
      blockTitle: tr("Not while there is {amount} on the account", { amount: strip(money(bal)) }),
      blockBody: tr("Record what they pay — card, cash or a transfer, part of it if that is what they have — and the departure goes straight through."),
      goSettle,
      printOn: false,
      print: () => undefined,
      emailOn: false,
      emailLabel: "",
      email: () => undefined,
      goFolio: () => {
        app.setState({ checkoutId: null });
        app.openFolio(os.id, "today");
      },
      footNote: early ? tr("The nights after today go back on sale either way.") : owing ? tr("Nothing is checked out while money is owing.") : tr("Room {room} flips to being cleaned.", { room: os.room ?? "" }),
      btnLabel: s.coBusy ? tr("Checking out…") : owing ? tr("Record {amount} first", { amount: strip(money(bal)) }) : tr("Check {first} out", { first: os.first || os.name }),
      btnBg: owing ? "var(--warn)" : "var(--accent)",
      btnFg: owing ? "var(--warn-fg)" : "var(--accent-fg)",
      primary: () => {
        if (app.state.coBusy) return;
        if (owing) goSettle();
        else void app.doCheckOut(os, mode === "stayed" ? from : null);
      },
    };
  }

  // ── one room
  const rr = s.roomN === null ? null : w.rooms.find((r) => r.n === s.roomN) ?? null;
  if (rr !== null && desk) v["rm"] = roomVals(app, w, rr);

  // ── check-in
  const cs = app.stay(s.checkinId);
  if (cs !== null && desk) v["ci"] = checkinVals(app, w, cs);

  // ── add a charge
  const fst = app.stay(s.folioId);
  if (s.chargeOpen && fst !== null && desk) {
    const other = s.chargePick === "other";
    const items = [
      ...w.items.map((i) => ({ id: i.id, label: i.label, amount: i.amount as number | null, detail: i.detail, icon: i.icon, extra: i.extra })),
      { id: "other", label: tr("Something else"), amount: null, detail: tr("put in an amount and what it is for"), icon: "pencil-line", extra: null },
    ];
    const chosen = items.find((x) => x.id === s.chargePick) ?? null;
    const amt = other ? parseMoney(s.chargeAmt) : chosen?.amount ?? Number.NaN;
    const amtErr = other && s.chargeTouched && !(amt > 0) ? tr("Put in an amount") : "";
    const noteErr = other && s.chargeTouched && !s.chargeNote.trim() ? tr("What is it for?") : "";
    const already = chosen?.extra != null && fst.extras.includes(chosen.extra) ? tr("{extra} is already on this stay.", { extra: w.extras.find((e) => e.id === chosen.extra)?.short ?? chosen.label }) : "";
    const ok = chosen !== null && amt > 0 && (!other || !!s.chargeNote.trim());
    v["ch"] = {
      open: true,
      note: s.chargeNote,
      amt: s.chargeAmt,
      other,
      alreadyOn: !!already,
      already,
      close: () => app.setState({ chargeOpen: false, chargePick: null, chargeNote: "", chargeAmt: "", chargeTouched: false }),
      onNote: (e: { target: { value: string } }) => app.setState({ chargeNote: e.target.value }),
      onAmt: (e: { target: { value: string } }) => app.setState({ chargeAmt: e.target.value, chargeTouched: true }),
      amtErrOn: !!amtErr,
      amtErr,
      amtInv: amtErr ? "true" : "false",
      amtBorder: amtErr ? "var(--danger)" : "var(--border-strong)",
      noteErrOn: !!noteErr,
      noteErr,
      noteInv: noteErr ? "true" : "false",
      noteBorder: noteErr ? "var(--danger)" : "var(--border-strong)",
      noteLabel: other ? tr("What is it for?") : tr("A note for the line (optional)"),
      notePlaceholder: other ? tr("A taxi booked for the morning") : tr("Taken in the garden"),
      items: items.map((it) => ({
        id: it.id,
        label: it.label,
        detail: it.detail,
        amount: it.amount !== null ? money(it.amount) : "",
        icon: it.icon,
        checked: s.chargePick === it.id ? "true" : "false",
        border: s.chargePick === it.id ? "var(--accent)" : "var(--border)",
        bg: s.chargePick === it.id ? "var(--accent-soft)" : "var(--surface-2)",
        pick: () => app.setState({ chargePick: it.id, chargeTouched: false }),
      })),
      foot: tr("Tax is added on the folio."),
      btnLabel: ok ? tr("Put {amount} on", { amount: strip(money(amt)) }) : tr("Put it on the folio"),
      btnBg: ok ? "var(--accent)" : "var(--surface-3)",
      btnFg: ok ? "var(--accent-fg)" : "var(--fg-subtle)",
      btnCursor: ok ? "pointer" : "not-allowed",
      confirm: () => {
        if (other && !ok) return app.setState({ chargeTouched: true });
        if (!ok || chosen === null) return;
        const what = app.state.chargeNote.trim();
        const body = other ? { label: what, amount: amt.toFixed(2), note: what } : { itemId: Number(chosen.id), note: what || null };
        void app.write(
          () => desk.addCharge(fst.id, body),
          () => {
            app.setState({ chargeOpen: false, chargePick: null, chargeNote: "", chargeAmt: "", chargeTouched: false });
            app.toast(tr("{label} added — {amount}.", { label: other ? app.state.chargeNote.trim() || chosen.label : chosen.label, amount: strip(money(amt)) }));
          },
        );
      },
    };
  }

  // ── record a payment, or money given back
  const sst = app.stay(s.settleId) ?? fst;
  if (s.settleOpen && sst !== null && desk) {
    const back = s.settleKind === "given_back";
    const cap = s.settleCap !== null ? Math.max(0, s.settleCap) : back ? sst.m.paid : Math.max(0, sst.m.balance);
    const amt = parseMoney(s.settleAmount);
    const bad = !(amt > 0);
    const over = !bad && amt > cap + 0.004;
    const err = !s.settleTouched
      ? ""
      : bad
        ? tr("Put in an amount to record.")
        : over
          ? back
            ? tr("That is more than the {amount} paid — record that or less.", { amount: strip(money(cap)) })
            : tr("That is more than the balance of {amount} — record that or less.", { amount: strip(money(cap)) })
          : "";
    // Money given back says why: Adminium keeps the reason on the line.
    const noteErr = back && s.settleTouched && !s.settleNote.trim() ? tr("Say why it goes back") : "";
    const ok = !bad && !over && !(back && !s.settleNote.trim());
    const METHODS = [
      { id: "card" as const, label: tr("Card") },
      { id: "cash" as const, label: tr("Cash") },
      { id: "transfer" as const, label: tr("Transfer") },
    ];
    v["se"] = {
      open: true,
      back,
      title: back ? tr("Record money given back") : tr("Record a payment"),
      balanceLabel: back ? tr("To give back") : tr("Balance"),
      balance: money(cap),
      amount: s.settleAmount,
      refNo: s.settleRefNo,
      note: s.settleNote,
      onNote: (e: { target: { value: string } }) => app.setState({ settleNote: e.target.value }),
      noteErrOn: !!noteErr,
      noteErr,
      noteInv: noteErr ? "true" : "false",
      noteBorder: noteErr ? "var(--danger)" : "var(--border-strong)",
      isTransfer: s.settleMethod === "transfer",
      close: () => app.setState({ settleOpen: false, settleCap: null }),
      onAmount: (e: { target: { value: string } }) => app.setState({ settleAmount: e.target.value, settleTouched: true }),
      onRefNo: (e: { target: { value: string } }) => app.setState({ settleRefNo: e.target.value }),
      methods: METHODS.map((m) => ({
        id: m.id,
        label: m.label,
        pressed: s.settleMethod === m.id ? "true" : "false",
        pick: () => app.setState({ settleMethod: m.id }),
        bg: s.settleMethod === m.id ? "var(--accent-soft)" : "var(--surface-2)",
        fg: s.settleMethod === m.id ? "var(--accent)" : "var(--fg-muted)",
        border: s.settleMethod === m.id ? "var(--accent)" : "var(--border-strong)",
      })),
      quick: [
        { id: "q1", label: tr("All of it — {amount}", { amount: strip(money(cap)) }), use: () => app.setState({ settleAmount: cap.toFixed(2), settleTouched: true }) },
        { id: "q2", label: tr("Half"), use: () => app.setState({ settleAmount: (Math.round(cap * 50) / 100).toFixed(2), settleTouched: true }) },
      ],
      errOn: !!err,
      err,
      inv: err ? "true" : "false",
      inputBorder: err ? "var(--danger)" : "var(--border-strong)",
      foot: back ? tr("Give the money back first — this records it.") : tr("Take the money on your card machine, in cash or by transfer first — this records it."),
      btnLabel: ok ? tr("Record {amount}", { amount: strip(money(amt)) }) : back ? tr("Record the money given back") : tr("Record the payment"),
      btnBg: ok ? "var(--accent)" : "var(--surface-3)",
      btnFg: ok ? "var(--accent-fg)" : "var(--fg-subtle)",
      btnCursor: ok ? "pointer" : "not-allowed",
      confirm: () => {
        if (!ok) return app.setState({ settleTouched: true });
        const S = app.state;
        void app.write(
          () =>
            desk.recordPayment(sst.id, {
              kind: S.settleKind,
              amount: amt.toFixed(2),
              method: S.settleMethod,
              reference: S.settleMethod === "transfer" && S.settleRefNo.trim() ? S.settleRefNo.trim() : null,
              note: S.settleNote.trim() || null,
            }),
          () => {
            app.setState({ settleOpen: false, settleCap: null, blockId: null });
            const after = app.stay(sst.id);
            const leftOn = after === null ? cap - amt : back ? 0 : after.m.balance;
            app.toast(
              back
                ? tr("{amount} given back — recorded.", { amount: strip(money(amt)) })
                : leftOn > 0.004
                  ? tr("{amount} recorded — {left} still on the account.", { amount: strip(money(amt)), left: strip(money(leftOn)) })
                  : tr("{amount} recorded. Nothing owing.", { amount: strip(money(amt)) }),
            );
          },
          (error) => {
            // Another desk moved the account first: the sheet shows it as it is now.
            const code = isApiError(error) ? error.code : "";
            if (code === "BALANCE_EXCEEDED" || code === "WRITE_CONFLICT" || code === "STATE_UNCHANGED") {
              const now = app.stay(sst.id);
              const fresh = now === null ? 0 : back ? now.m.paid : Math.max(0, now.m.balance);
              app.setState({ settleCap: null, settleAmount: fresh.toFixed(2), settleTouched: false });
              app.toast(tr("Someone changed this a moment ago — here it is now."), "warn");
            } else app.toast(app.refused(error), "warn");
          },
        );
      },
    };
  }

  // ── void a charge, a payment or a credit
  const vt = s.voidT;
  if (vt !== null && desk) {
    const vs = app.stay(vt.stay);
    if (vs !== null) {
      const err = s.voidTouched && !s.voidReason.trim() ? tr("Say why it is voided") : "";
      // Money never runs backwards on a stay: Adminium refuses a void that leaves more paid than the total.
      const q = vt.isPay ? undefined : app.ask(`void:${vt.table}:${String(vt.id)}`, () => desk.quoteVoid(vt.table, vt.id)).value;
      const refused = q?.refused ?? false;
      v["vd"] = {
        open: true,
        title: vt.isPay
          ? tr("Void the {amount} {how} payment?", { amount: strip(money(vt.amount)), how: vt.what })
          : tr("Void “{what}” — {amount}?", { amount: strip(money(vt.amount)), what: vt.what }),
        body: vt.isPay
          ? tr("The payment stays on the folio, struck through, and the balance goes back up by {amount}.", { amount: strip(money(vt.amount)) })
          : vt.table === "stay_credits"
            ? tr("The line stays on the folio, struck through, and the nights are charged again.")
            : tr("The line stays on the folio, struck through, and comes off the total."),
        refused,
        notRefused: !refused,
        refusedLine: tr("They have paid {amount} — more than the total would be. Record the money given back first.", { amount: strip(money(q?.paid ?? vs.m.paid)) }),
        btnBg: refused ? "var(--surface-3)" : "var(--danger-solid, var(--danger))",
        btnFg: refused ? "var(--fg-subtle)" : "#fff",
        btnCursor: refused ? "not-allowed" : "pointer",
        reason: s.voidReason,
        onReason: (e: { target: { value: string } }) => app.setState({ voidReason: e.target.value, voidTouched: true }),
        errOn: !!err,
        err,
        inv: err ? "true" : "false",
        border: err ? "var(--danger)" : "var(--border-strong)",
        close: () => app.setState({ voidT: null, voidReason: "", voidTouched: false }),
        confirm: () => {
          if (refused || !app.isManager()) return;
          const why = app.state.voidReason.trim();
          if (!why) {
            app.setState({ voidTouched: true });
            app.focusSoon("#vd-reason");
            return;
          }
          void app.write(
            () => desk.voidRow(vt.table, vt.id, why),
            () => {
              app.setState({ voidT: null, voidReason: "", voidTouched: false });
              app.toast(tr("Voided — {amount}.", { amount: strip(money(vt.amount)) }));
            },
            (error) => {
              app.setState({ voidT: null, voidReason: "", voidTouched: false });
              app.toast(app.refused(error), "warn");
            },
          );
        },
      };
    }
  }

  // ── move to another room (the rest of the stay), or give a room ahead
  const ms = app.stay(s.moveId);
  if (ms !== null && desk) v["mv"] = moveVals(app, w, ms);

  // ── cancel, in the guest's voice or the desk's
  const cst = app.stay(s.cancelId);
  if (cst !== null) {
    const deskVoice = s.cancelVoice === "desk";
    const inside = cancelStage(app, cst.arrive, cst.cancelBy) !== "outside";
    const tn = w.typeById[cst.type]!.name;
    const house = deskVoice && s.cancelWho === "house";
    const emailsOn = w.H.emailsOn;
    const WHO = [
      { id: "guest_asked" as const, label: tr("The guest asked to cancel") },
      { id: "house" as const, label: tr("We are cancelling") },
    ];
    v["cx"] = {
      open: true,
      close: () => app.setState({ cancelId: null }),
      icon: inside && !house ? "triangle-alert" : "calendar-x",
      iconBg: inside && !house ? "var(--warn-soft)" : "var(--surface-3)",
      iconFg: inside && !house ? "var(--warn)" : "var(--fg-muted)",
      title: tr("Cancel {ref}?", { ref: cst.ref }),
      body:
        tr("This lets the {type} go for {from} to {to}.", { type: tn, from: strip(fDW(cst.arrive)), to: strip(fDW(cst.depart)) }) +
        " " +
        (deskVoice
          ? emailsOn && cst.email
            ? tr("We will email {first} to confirm it.", { first: cst.first || tr("them") })
            : tr("There is no email on this stay, so nothing is sent.")
          : emailsOn
            ? tr("We will send you an email to confirm it.")
            : tr("Keep this page's link — it opens your reservation any time.")),
      // the desk says who is cancelling; a house cancellation is never late.
      whoOn: deskVoice,
      who: WHO.map((x) => ({
        id: x.id,
        label: x.label,
        pressed: s.cancelWho === x.id ? "true" : "false",
        pick: () => app.setState({ cancelWho: x.id }),
        bg: s.cancelWho === x.id ? "var(--accent-soft)" : "var(--surface-2)",
        fg: s.cancelWho === x.id ? "var(--accent)" : "var(--fg-muted)",
        border: s.cancelWho === x.id ? "var(--accent)" : "var(--border-strong)",
      })),
      noteOn: inside && !house,
      note: deskVoice ? tr("This is inside the {n} days before arrival, so it will be marked late.", { n: w.H.cancelDays }) : tr("This is a late cancellation. Nothing is charged."),
      noteBg: "var(--warn-soft)",
      noteFg: "var(--warn)",
      confirmLabel: tr("Cancel the reservation"),
      keepLabel: tr("Keep the room"),
      confirm: () => void app.doCancel(),
    };
  }

  // ── delete my details
  if (s.ddOpen) {
    const stale = !s.signedAt || Date.now() - s.signedAt > 10 * 60_000;
    const em = s.signedIn ?? "";
    v["dd"] = {
      open: true,
      close: () => app.setState({ ddOpen: false }),
      confirm: () => void app.deleteDetails(),
      stale,
      fresh: !stale,
      body: stale
        ? tr("To delete your details, confirm it is you — we will send a fresh link to {email}.", { email: em })
        : tr(
            "We will remove your name and email from your guest account, sign you out everywhere and stop your confirmation links. Your reservations keep the name, email and mobile you gave for them, so the desk can still find you when you arrive.",
          ),
      sendLink: () => {
        app.setState({ ddOpen: false, auth: { ...app.state.auth, email: em } });
        void app.sendLink(true);
      },
    };
  }

  // ── keep the room for a late guest
  const es = app.stay(s.expectId);
  if (es !== null && desk) {
    const first = plus(es.arrive, 1) < today ? today : plus(es.arrive, 1);
    const last = plus(es.depart, -1);
    const list: string[] = [];
    for (let d = first; d <= last; d = plus(d, 1)) list.push(d);
    const pick = s.expectPick;
    v["ex"] = {
      open: true,
      title: tr("Keep the room until"),
      sub: iso(`${es.ref} · ${es.name}`),
      body: tr("If they have not come by {time} the morning after, the stay is marked as a no-show.", { time: strip(fT(w.H.noShowAt)) }),
      days: list.map((d) => ({
        id: d,
        label: fDW(d),
        checked: pick === d ? "true" : "false",
        pick: () => app.setState({ expectPick: d }),
        border: pick === d ? "var(--accent)" : "var(--border-strong)",
        bg: pick === d ? "var(--accent-soft)" : "var(--surface)",
        dot: pick === d ? "var(--accent)" : "transparent",
      })),
      clearOn: es.expectBy !== null,
      clear: () =>
        void app.write(
          () => desk.expectBy(es.id, null),
          () => {
            app.setState({ expectId: null, expectPick: null });
            app.toast(tr("{ref} is expected on the day booked.", { ref: es.ref }), "info");
          },
        ),
      close: () => app.setState({ expectId: null, expectPick: null }),
      cant: pick === null,
      btnLabel: pick === null ? tr("Pick a day") : tr("Keep it until {day}", { day: strip(fDW(pick)) }),
      btnBg: pick !== null ? "var(--accent)" : "var(--surface-3)",
      btnFg: pick !== null ? "var(--accent-fg)" : "var(--fg-subtle)",
      btnCursor: pick !== null ? "pointer" : "not-allowed",
      confirm: () => {
        if (pick === null) return;
        void app.write(
          () => desk.expectBy(es.id, pick),
          () => {
            app.setState({ expectId: null, expectPick: null });
            app.toast(tr("{first}'s room is kept until {day}.", { first: es.first || es.name, day: strip(fDW(pick)) }));
          },
        );
      },
    };
  }

  Object.assign(v, chgVals(app, w));
  return v;
}

function roomVals(app: HouseApp, w: WorldV, rr: RoomV): V {
  const s = app.state;
  const today = app.day;
  const desk = app.ports.desk!;
  const t = w.typeById[rr.type]!;
  const st = roomStatus(rr, today);
  const who = inRoom(w, rr.id);
  const next = w.stays.filter((x) => x.roomId === rr.id && x.state === "booked").sort((p, q) => p.arrive.localeCompare(q.arrive))[0] ?? null;
  const o = s.oos;
  const end = o.to && o.to >= o.from ? plus(o.to, 1) : plus(o.from, 14);
  const span = { arrive: o.from, depart: end };
  // What closing it would do: nights over-sold, guests given the room ahead, a guest in it.
  let by = 0;
  const overNights: string[] = [];
  if (o.from)
    for (let d = o.from; d < end; d = plus(d, 1)) {
      if (closedOn(rr, d)) continue;
      const f = nightFig(app, w, rr.type, d);
      if (f.sold > f.cap - 1) {
        overNights.push(d);
        by = Math.max(by, f.sold - (f.cap - 1));
      }
    }
  const touching = o.from ? w.stays.filter((x) => holds(x) && x.roomId === rr.id && x.arrive < span.depart && span.arrive < x.depart) : [];
  const inGuests = touching.filter((x) => x.state === "in");
  const given = touching.filter((x) => x.state === "booked");
  const oversell =
    overNights.length === 0
      ? ""
      : overNights.length === 1
        ? tr("{type}: over-sold by {n} on {day} — someone will need moving.", { type: t.name, n: by, day: strip(fDW(overNights[0]!)) })
        : tr("{type}: over-sold by {by} on {day} and {n} more night — someone will need moving.|{type}: over-sold by {by} on {day} and {n} more nights — someone will need moving.", {
            type: t.name,
            by,
            day: strip(fDW(overNights[0]!)),
            n: overNights.length - 1,
          });
  const inBlock = inGuests.length > 0;
  const warn = !inBlock && (!!oversell || given.length > 0);
  const dateBad = s.oosTried && (!o.from || (!!o.to && o.to < o.from));
  const current = rr.closures.filter((c) => c.to === null || c.to >= today);
  const closeRoom = () => {
    const S = app.state.oos;
    if (!S.from || (S.to && S.to < S.from) || inBlock) return app.setState({ oosTried: true });
    void app.write(
      () => desk.closeRoom({ room_id: rr.id, from_date: S.from, to_date: S.to || null, reason: S.reason.trim() || null }),
      () => {
        app.setState({ oos: { from: app.day, to: "", reason: "" }, oosTried: false });
        const range = S.to ? (S.to === S.from ? strip(fDW(S.from)) : `${strip(fDW(S.from))} – ${strip(fDW(S.to))}`) : "";
        // a stay that was given this room ahead now needs one — each is named.
        const moved = given.map((g) => `${g.name} (${g.ref})`).join(", ");
        app.toast(
          (S.to
            ? tr("Room {room} is out of service {range}, back {day}.", { room: rr.n, range, day: strip(fDW(plus(S.to, 1))) })
            : tr("Room {room} is out of service from {day} until further notice.", { room: rr.n, day: strip(fDW(S.from)) })) + (moved ? ` ${tr("{names} now need a room.", { names: moved })}` : ""),
        );
      },
      (error) => app.setState({ rmMsg: app.refused(error) }),
    );
  };
  return {
    open: true,
    n: iso(rr.n),
    tint: t.tint,
    icon: t.icon,
    code: iso(t.code),
    typeName: t.name,
    floor: floorName(rr.floor),
    close: () => app.setState({ roomN: null, rmMsg: "" }),
    statusLabel: statusWord(st),
    statusColor: st === "ready" ? "var(--pos)" : st === "occupied" ? "var(--accent)" : st === "cleaning" ? "var(--warn)" : "var(--fg-subtle)",
    occupiedOn: who !== null,
    occupiedLine: who === null ? "" : tr("Occupied — {name} is in this room until {day}.", { name: who.name, day: strip(fDW(who.depart)) }),
    msgOn: !!s.rmMsg,
    msg: s.rmMsg,
    options: (["ready", "cleaning"] as const).map((k) => {
      const on = rr.status === k && who === null;
      return {
        id: k,
        label: statusWord(k),
        icon: k === "ready" ? "check" : "spray-can",
        pressed: on ? "true" : "false",
        pick: () => {
          if (!on) void app.setRoomStatus(rr.n, k);
        },
        border: on ? "var(--accent)" : "var(--border-strong)",
        bg: on ? "var(--accent-soft)" : "var(--surface-2)",
        fg: on ? "var(--accent)" : who !== null ? "var(--fg-subtle)" : "var(--fg-muted)",
        cursor: on ? "default" : "pointer",
      };
    }),
    closures: current.map((c) => ({
      id: `cl${String(c.id)}`,
      line: iso(strip(fDW(c.from)) + (c.to !== null ? (c.to === c.from ? "" : ` – ${strip(fDW(c.to))}`) + " · " + tr("back {day}", { day: strip(fDW(plus(c.to, 1))) }) : ` → ${tr("until further notice")}`)),
      reason: c.reason ?? tr("No reason written down"),
      now: c.from <= today,
      when: c.from <= today ? tr("Now") : tr("Next"),
      endLabel: c.from <= today ? tr("End it now") : tr("Remove it"),
      end: () =>
        void app.write(
          () => desk.endClosure(c.id),
          // a room back in service is being cleaned first.
          () => app.toast(tr("Room {room} is back in service — being cleaned first.", { room: rr.n })),
          (error) => app.setState({ rmMsg: app.refused(error) }),
        ),
    })),
    hasClosures: current.length > 0,
    oosFrom: o.from,
    oosTo: o.to,
    oosReason: o.reason,
    minFrom: today,
    minTo: o.from || today,
    onFrom: (e: { target: { value: string } }) => app.setState({ oos: { ...app.state.oos, from: e.target.value } }),
    onTo: (e: { target: { value: string } }) => app.setState({ oos: { ...app.state.oos, to: e.target.value } }),
    onReason: (e: { target: { value: string } }) => app.setState({ oos: { ...app.state.oos, reason: e.target.value } }),
    clearTo: () => app.setState({ oos: { ...app.state.oos, to: "" } }),
    toHint: tr("the last night it is out of service — empty means until further notice"),
    dateErrOn: dateBad,
    dateErr: tr("The last night can't be before the first."),
    dateInv: dateBad ? "true" : "false",
    oversellOn: !!oversell && !inBlock,
    oversell,
    warnOn: warn,
    guests: inBlock ? [] : given.map((g) => ({ id: `g${String(g.id)}`, line: tr("{name} ({ref}) is given this room ahead — {name} will need another room.", { name: g.name, ref: g.ref }) })),
    inOn: inBlock,
    inLine: inBlock ? tr("{name} ({ref}) is in this room on those nights — move them first.", { name: inGuests[0]!.name, ref: inGuests[0]!.ref }) : "",
    moveThem: () => {
      if (inBlock) app.setState({ moveId: inGuests[0]!.id, movePick: null, moveUp: null });
    },
    closeLabel: warn ? tr("Close the room anyway") : tr("Close the room"),
    closeOff: inBlock,
    closeBg: inBlock ? "var(--surface-3)" : "var(--fg)",
    closeFg: inBlock ? "var(--fg-subtle)" : "var(--bg)",
    closeCursor: inBlock ? "not-allowed" : "pointer",
    closeBtn: () => {
      if (!inBlock) closeRoom();
    },
    changeDates: () => app.focusSoon("#oos-from"),
    hasWho: who !== null,
    whoName: who?.name ?? "",
    whoLine: who === null ? "" : fsi(tr("{ref} · in until {day}", { ref: who.ref, day: strip(fDW(who.depart)) })),
    openFolio: () => {
      app.setState({ roomN: null });
      if (who !== null) app.openFolio(who.id, "rack");
    },
    hasNext: next !== null,
    nextName: next?.name ?? "",
    nextLine: next === null ? "" : iso(`${next.ref} · ${strip(fDW(next.arrive))} → ${strip(fDW(next.depart))}${next.given ? ` · ${tr("given ahead")}` : ""}`),
    emptyNext: next === null && who === null,
    emptyNote: tr("Nobody is given this room ahead — it is open on the calendar."),
    footNote: tr("Housekeeping marks a room ready or being cleaned. Out of service takes it off sale for the dates you set."),
  };
}

function checkinVals(app: HouseApp, w: WorldV, cs: StV): V {
  const s = app.state;
  const today = app.day;
  const typeId = s.ciType ?? cs.type;
  const t = w.typeById[typeId]!;
  const picked = s.pickedRoom;
  const span = { id: cs.id, arrive: cs.arrive < today ? today : cs.arrive, depart: cs.depart };
  const readyNow = (r: RoomV) => roomStatus(r, today) === "ready" && inRoom(w, r.id) === null;
  const readyOfType = w.rooms.filter((r) => r.type === typeId && readyNow(r));
  const givenFirst = cs.given && typeId === cs.type ? readyOfType.filter((r) => r.id === cs.roomId) : [];
  const rest = readyOfType.filter((r) => !(cs.given && r.id === cs.roomId));
  const list = givenFirst.concat(rest).map((r) => {
    const other = heldForOther(w, r.id, span);
    const shut = firstClosed(r, span.arrive, cs.depart);
    const on = picked === r.n;
    const given = cs.given && r.id === cs.roomId;
    const off = other !== null || shut !== null;
    return {
      id: `r${r.n}`,
      n: r.n,
      floor: floorName(r.floor),
      disabled: off,
      checked: on ? "true" : "false",
      hasNote: off || given || r.note !== null,
      note: shut !== null ? tr("Out of service on {day}", { day: strip(fDW(shut)) }) : other !== null ? tr("Held for {ref} from {day}", { ref: other.ref, day: strip(fDW(other.arrive)) }) : given ? tr("Given to them ahead") : r.note ?? "",
      noteFg: given && !off ? "var(--accent)" : "var(--fg-subtle)",
      pick: () => {
        if (!off) app.setState({ pickedRoom: r.n, ciErr: "" });
      },
      border: on ? "var(--accent)" : "var(--border-strong)",
      bg: on ? "var(--accent-soft)" : "var(--surface)",
      dotBorder: on ? "var(--accent)" : "var(--border-strong)",
      dotInner: on ? "var(--accent)" : "transparent",
      opacity: off ? ".5" : "1",
      cursor: off ? "not-allowed" : "pointer",
      tag: shut !== null ? tr("Closed") : other !== null ? tr("Held") : tr("Ready"),
      tagBg: off ? "var(--surface-3)" : "var(--pos-soft)",
      tagFg: off ? "var(--fg-subtle)" : "var(--pos)",
    };
  });
  const pickable = list.filter((x) => !x.disabled).length;
  const cleaning = w.rooms.filter((r) => r.type === typeId && roomStatus(r, today) === "cleaning").length;
  const oos = w.rooms.filter((r) => r.type === typeId && roomStatus(r, today) === "oos").length;
  const bodyBits: string[] = [];
  if (cleaning) bodyBits.push(tr("{n} room of this type is being cleaned.|{n} rooms of this type are being cleaned.", { n: cleaning }));
  if (oos) bodyBits.push(tr("{n} room of this type is out of service.|{n} rooms of this type are out of service.", { n: oos }));
  // Another type at its own price: Adminium prices the change.
  const alts = w.types
    .filter((x) => x.id !== cs.type && x.sleeps >= cs.guests && freeAcross(app, w, x.id, span.arrive, cs.depart, cs.id) > 0)
    .map((x) => {
      const q = app.ask(`quote-edit:${String(cs.id)}:type:${x.id}`, () => app.ports.desk!.quoteEdit(cs.id, { room_type_id: Number(x.id) })).value;
      const on = s.ciType === x.id && !s.ciUp;
      return {
        id: x.id,
        label: q === undefined ? x.name : tr("{type} — {total}, was {was}", { type: x.name, total: strip(money(q.data["total"])), was: strip(money(cs.m.total)) }),
        checked: on ? "true" : "false",
        pick: () => app.setState({ ciType: on ? null : x.id, ciUp: false, pickedRoom: null, ciErr: "" }),
        border: on ? "var(--accent)" : "var(--border-strong)",
        bg: on ? "var(--accent-soft)" : "var(--surface)",
        dot: on ? "var(--accent)" : "transparent",
      };
    });
  // A better room at the price they booked, when one is ready for the whole stay.
  const bookedT = w.typeById[cs.type]!;
  const readyFor = (r: RoomV) => readyNow(r) && heldForOther(w, r.id, span) === null && firstClosed(r, span.arrive, cs.depart) === null;
  const ups = w.types
    .filter((x) => x.id !== cs.type && x.base > bookedT.base && x.sleeps >= cs.guests && freeAcross(app, w, x.id, span.arrive, cs.depart, cs.id) > 0 && w.rooms.some((r) => r.type === x.id && readyFor(r)))
    .map((x) => {
      const on = s.ciType === x.id && s.ciUp;
      return {
        id: `up${x.id}`,
        label: tr("Give them a {type} room at the booked price", { type: x.name }),
        checked: on ? "true" : "false",
        pick: () => app.setState({ ciType: on ? null : x.id, ciUp: !on, pickedRoom: null, ciErr: "" }),
        border: on ? "var(--accent)" : "var(--border-strong)",
        bg: on ? "var(--accent-soft)" : "var(--surface)",
        dot: on ? "var(--accent)" : "transparent",
      };
    });
  const late = cs.arrive < today;
  // a no-show who came after all: the night they missed is charged or not.
  const missedDay = cs.state === "noshow" ? cs.expectBy ?? cs.arrive : null;
  const MISSED = [
    { id: "charge" as const, label: tr("Charge it"), sub: tr("the room was kept") },
    { id: "free" as const, label: tr("Don't charge it"), sub: "" },
  ];
  const extrasShort = cs.extras.map((id) => w.extras.find((e) => e.id === id)?.short ?? "").filter(Boolean);
  return {
    open: true,
    tint: t.tint,
    icon: t.icon,
    name: cs.name,
    ref: cs.ref,
    range: iso(`${strip(fDW(cs.arrive))} → ${strip(fDW(cs.depart))}`),
    close: () => app.setState({ checkinId: null, pickedRoom: null, ciAlt: false, ciType: null, ciUp: false, ciErr: "" }),
    dueOn: late,
    dueNote:
      cs.arrive === plus(today, -1)
        ? tr("Due yesterday — {day}. The stay still ends {end}.", { day: strip(fDW(cs.arrive)), end: strip(fDW(cs.depart)) })
        : tr("Due {day}. The stay still ends {end}.", { day: strip(fDW(cs.arrive)), end: strip(fDW(cs.depart)) }),
    missedOn: missedDay !== null,
    missedTitle: missedDay === null ? "" : tr("They missed {day}.", { day: strip(fDW(missedDay)) }),
    missed: MISSED.map((m) => {
      const on = s.ciMissed === m.id;
      return {
        id: m.id,
        label: m.label,
        sub: m.sub,
        hasSub: !!m.sub,
        checked: on ? "true" : "false",
        pick: () => app.setState({ ciMissed: m.id }),
        border: on ? "var(--accent)" : "var(--border-strong)",
        bg: on ? "var(--accent-soft)" : "var(--surface)",
        dot: on ? "var(--accent)" : "transparent",
      };
    }),
    facts: [
      { id: "f1", label: tr("Room type"), value: bookedT.name + (s.ciType !== null ? ` → ${t.name}` : ""), font: "inherit" },
      { id: "f2", label: tr("Nights"), value: nights(nightsOf(cs.arrive, cs.depart)), font: "var(--mono)" },
      { id: "f3", label: tr("Guests"), value: guestsW(cs.guests), font: "var(--mono)" },
      { id: "f4", label: tr("Said they would get here"), value: cs.arrivalTime === "22:30" ? tr("after 22:00") : fT(cs.arrivalTime), font: "var(--mono)" },
      { id: "f5", label: tr("Added on"), value: extrasShort.length ? extrasShort.join(", ") : tr("Nothing yet"), font: "inherit" },
      { id: "f6", label: tr("On the account"), value: money(cs.m.balance), font: "var(--mono)" },
    ],
    noteOn: !!cs.note,
    note: cs.note,
    pickerNote: tr("ready, of the type they booked, and not held for anyone else"),
    hasRooms: list.length > 0 && pickable > 0,
    noRooms: pickable === 0,
    rooms: list,
    noRoomsTitle: tr("No {type} is ready yet", { type: t.name.toLowerCase() }),
    noRoomsBody: bodyBits.join(" ") + (bodyBits.length ? " " : "") + tr("Mark one ready on the rack the moment housekeeping is done and this check-in goes straight through."),
    goRack: () => {
      app.setState({ checkinId: null, pickedRoom: null });
      app.go("rack");
    },
    altOpen: s.ciAlt || pickable === 0,
    altToggle: () => app.setState({ ciAlt: !app.state.ciAlt }),
    altExpanded: s.ciAlt || pickable === 0 ? "true" : "false",
    alts,
    hasAlts: alts.length > 0 || ups.length > 0,
    noAlts: alts.length === 0 && ups.length === 0,
    altNote: tr("The stay is priced at the new type."),
    ups,
    hasUps: ups.length > 0,
    upNote: tr("The stay keeps its {type} price.", { type: bookedT.name }),
    hasOwnAlts: alts.length > 0,
    errOn: !!s.ciErr,
    err: s.ciErr,
    footNote:
      picked !== null
        ? tr("Room {room} will be marked occupied.", { room: picked }) +
          (s.ciType !== null ? ` ${s.ciUp ? tr("The stay keeps its {type} price.", { type: bookedT.name }) : tr("The stay is priced at the new type.")}` : "")
        : tr("Pick a room to carry on."),
    cantConfirm: picked === null || s.ciBusy,
    confirmLabel: s.ciBusy ? tr("Checking in…") : picked !== null ? tr("Check in to {room}", { room: picked }) : tr("Check in"),
    confirmBg: picked !== null && !s.ciBusy ? "var(--accent)" : "var(--surface-3)",
    confirmFg: picked !== null && !s.ciBusy ? "var(--accent-fg)" : "var(--fg-subtle)",
    confirmCursor: picked !== null && !s.ciBusy ? "pointer" : "not-allowed",
    confirm: () => void app.confirmCheckin(),
  };
}

function moveVals(app: HouseApp, w: WorldV, ms: StV): V {
  const s = app.state;
  const today = app.day;
  const desk = app.ports.desk!;
  const ahead = ms.state === "booked";
  const span = { id: ms.id, arrive: ahead ? ms.arrive : today, depart: ms.depart };
  const freeRoom = (r: RoomV) =>
    r.id !== ms.roomId && (ahead || roomStatus(r, today) === "ready") && inRoom(w, r.id) === null && heldForOther(w, r.id, span) === null && firstClosed(r, span.arrive, ms.depart) === null;
  const list = w.rooms.filter((r) => r.type === ms.type && freeRoom(r));
  const pick = s.movePick;
  const bookedT = w.typeById[ms.type]!;
  const ups = ahead
    ? []
    : w.types
        .filter((x) => x.base > bookedT.base && x.sleeps >= ms.guests && freeAcross(app, w, x.id, today, ms.depart, ms.id) > 0)
        .flatMap((x) => {
          const room = w.rooms.find((r) => r.type === x.id && freeRoom(r));
          if (room === undefined) return [];
          const on = pick === room.n;
          return [
            {
              id: `u${x.id}`,
              label: tr("Give them a {type} room at the booked price", { type: x.name }),
              sub: fsi(tr("Room {room} · {floor}", { room: room.n, floor: floorInLine(room.floor) })),
              checked: on ? "true" : "false",
              pick: () => app.setState({ movePick: room.n, moveUp: x.id }),
              border: on ? "var(--accent)" : "var(--border-strong)",
              bg: on ? "var(--accent-soft)" : "var(--surface)",
              dotBorder: on ? "var(--accent)" : "var(--border-strong)",
              dotInner: on ? "var(--accent)" : "transparent",
            },
          ];
        });
  const who = ms.first || ms.name;
  return {
    open: true,
    title: ahead ? tr("Give {first} a room ahead", { first: who }) : tr("Move {first} to another room", { first: who }),
    sub: ahead
      ? fsi(tr("{ref} · {from} → {to}", { ref: ms.ref, from: strip(fDW(ms.arrive)), to: strip(fDW(ms.depart)) }))
      : fsi(tr("{ref} · room {room} · until {day}", { ref: ms.ref, room: ms.room ?? "—", day: strip(fDW(ms.depart)) })),
    rooms: list.map((r) => ({
      id: `m${r.n}`,
      n: r.n,
      floor: floorName(r.floor),
      checked: pick === r.n ? "true" : "false",
      hasNote: r.note !== null,
      note: r.note ?? "",
      pick: () => app.setState({ movePick: r.n, moveUp: null }),
      border: pick === r.n ? "var(--accent)" : "var(--border-strong)",
      bg: pick === r.n ? "var(--accent-soft)" : "var(--surface)",
      dotBorder: pick === r.n ? "var(--accent)" : "var(--border-strong)",
      dotInner: pick === r.n ? "var(--accent)" : "transparent",
    })),
    hasRooms: list.length > 0 || ups.length > 0,
    noRooms: list.length === 0 && ups.length === 0,
    hasSame: list.length > 0,
    ups,
    hasUps: ups.length > 0,
    upNote: tr("The stay keeps its {type} price.", { type: bookedT.name }),
    noRoomsText: ahead
      ? tr("No {type} is open for the whole stay.", { type: bookedT.name.toLowerCase() })
      : tr("No other {type} is ready and open for the rest of the stay.", { type: bookedT.name.toLowerCase() }),
    foot: ahead ? tr("The key can be left out for them. The room is theirs from the day they arrive.") : tr("Room {room} goes to being cleaned. A different room type is chosen before or at check-in only.", { room: ms.room ?? "" }),
    close: () => app.setState({ moveId: null, movePick: null, moveUp: null }),
    btnLabel: pick !== null ? (ahead ? tr("Give them {room}", { room: pick }) : tr("Move to {room}", { room: pick })) : tr("Pick a room"),
    cant: pick === null,
    btnBg: pick !== null ? "var(--accent)" : "var(--surface-3)",
    btnFg: pick !== null ? "var(--accent-fg)" : "var(--fg-subtle)",
    btnCursor: pick !== null ? "pointer" : "not-allowed",
    confirm: () => {
      const n = app.state.movePick;
      if (n === null) return;
      const room = w.rooms.find((r) => r.n === n)!;
      const old = ms.room;
      void app.write(
        () => (ahead ? desk.giveRoom(ms.id, room.id) : desk.moveRoom(ms.id, room.id)),
        () => {
          app.setState({ moveId: null, movePick: null, moveUp: null });
          app.toast(ahead ? tr("Room {room} is given to {first} ahead.", { room: n, first: who }) : tr("{first} is moving to room {room}. Room {old} is being cleaned.", { first: who, room: n, old: old ?? "" }));
        },
        (error) => {
          app.setState({ movePick: null });
          app.toast(isApiError(error) && error.code === "CAPACITY_FULL" ? tr("That room is taken on those nights.") : app.refused(error), "warn");
        },
      );
    },
  };
}

export type { Id };
export { fD };
