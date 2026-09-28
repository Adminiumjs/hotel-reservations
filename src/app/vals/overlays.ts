/**
 * The sheets and dialogs over either side: a cancellation (in the guest's
 * voice or the desk's), deleting a guest's details, and the guest's change of
 * dates. The desk's own sheets — check-in, check-out, one room, a charge, a
 * payment, a void, a move, keeping a room — are `overlaysDesk.ts`, which only
 * a desk's build carries. Every price and every refusal is Adminium's.
 */
import { tr } from "../../i18n/tr.ts";
import { fDW, strip } from "../fmt.ts";
import type { HouseApp } from "../house.ts";
import type { WorldV } from "../world.ts";
import { DESK, GUEST } from "../sides.ts";
import { cancelStage, chgVals } from "./guest.ts";
import { deskOverlayVals } from "./overlaysDesk.ts";

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
  const desk = app.ports.desk;
  const v: V = { ...CLOSED };

  // The desk's sheets: only a desk's build draws them (`overlaysDesk.ts`).
  if (DESK && desk) deskOverlayVals(app, w, v);

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
      note: deskVoice ? tr("This is inside the notice period ({n} day), so it will be marked late.|This is inside the notice period ({n} days), so it will be marked late.", { n: w.H.cancelDays }) : tr("This is a late cancellation. Nothing is charged."),
      noteBg: "var(--warn-soft)",
      noteFg: "var(--warn)",
      confirmLabel: tr("Cancel the reservation"),
      keepLabel: tr("Keep the room"),
      confirm: () => void app.doCancel(),
    };
  }

  // ── delete my details
  if (GUEST && s.ddOpen) {
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

  if (GUEST) Object.assign(v, chgVals(app, w));
  return v;
}
