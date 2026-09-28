/**
 * The house's emails to its guests: the `messages` table is the outbox, and
 * every email is a row in it the dashboard lists. All of them wait while the
 * house's "Email guests" switch in Settings is off.
 *
 *   stay-made                  a reservation made online: the dates, the room
 *                              type, the nights and extras, what it costs, when
 *                              it can be cancelled at no charge, and the link
 *                              that opens it;
 *   stay-made-desk             a reservation the desk took, when the guest
 *                              gave an email: the same without the link (a
 *                              desk booking is nobody's signed-in reservation
 *                              until the guest signs in);
 *   stay-cancelled-self(-late) the guest cancelled online — on time, or after
 *                              the cancel-by moment (said, never charged);
 *   stay-cancelled-desk(-late) the desk cancelled it as the guest asked;
 *   stay-cancelled-house       the house had to cancel: never late, and said
 *                              in the house's voice;
 *   stay-no-show               "we missed you": the room was kept and the
 *                              nights are released, with the house's phone;
 *   stay-dates-changed         the dates moved, by the guest or the desk: the
 *                              dates before and now, and the new total beside
 *                              the old one — one email for each change;
 *   stay-new-link              a signed-in guest asked for a new link to a
 *                              reservation: the new one, the old one stopped;
 *   stay-folio(-owing)         the desk emails the folio, with Invoices &
 *                              Receipts' document attached: settled ("thank
 *                              you for staying") or so far, with what is still
 *                              to settle — the desk picks by Adminium's balance.
 *
 * The log is the dedupe: a kind already queued or sent for the same stay is
 * not queued again (a change of dates is told each time). A reservation linked
 * to a signed-in guest is addressed to them, any other to the address typed on
 * it; always in the language the reservation is kept in. A reply goes to the
 * house's own address.
 * A cancellation email is picked by who cancelled and whether it was late,
 * both written in the same write as the move to `cancelled`.
 */

export const KINDS = [
  "stay-made",
  "stay-made-desk",
  "stay-cancelled-self",
  "stay-cancelled-self-late",
  "stay-cancelled-desk",
  "stay-cancelled-desk-late",
  "stay-cancelled-house",
  "stay-no-show",
  "stay-dates-changed",
  "stay-new-link",
  "stay-folio",
  "stay-folio-owing",
] as const;
export type Kind = (typeof KINDS)[number];

const GATE = { gate: { setting: { table: "settings", column: "guest_emails_on" } } };
const onStay = (column: string, to: unknown, where?: Record<string, unknown>) => ({
  onChange: { table: "stays", column, to, ...(where === undefined ? {} : { where }) },
});
/**
 * A cancellation, by who made it — heard on the move to `cancelled` (never on
 * the reason alone). The late flag is set in the same write: a late one is
 * heard on the flag, and the on-time words wait a few seconds and are dropped
 * when that write was late.
 */
const cancelled = (code: string) => onStay("status", "cancelled", { column: "cancel_code", eq: code });
const cancelledLate = (code: string) => onStay("late_cancel", true, { column: "cancel_code", eq: code });
const unlessLate = { holdSeconds: 30, dropWhen: [{ column: "late_cancel", eq: true, reason: "no-longer-needed" }] };

export const OUTBOX = {
  table: "messages",
  columns: {
    kind: "kind",
    status: "status",
    to: "to_address",
    language: "language",
    due: "due",
    sentAt: "sent_at",
    error: "error",
    skipReason: "skip_reason",
    was: "was",
    repeatKey: "repeat_key",
  },
  links: { stay: "stay_id", customer: "customer_id" },
  recipient: {
    via: "customer_id",
    table: "customers",
    email: "email",
    name: "first_name",
    // The reservation's own language, whatever the guest's account says.
    language: { column: "language" },
    // A reservation nobody signed in for — and every desk booking — carries its own details.
    fallback: { via: "stay_id", email: "email", name: "first_name", language: "language" },
  },
  settings: { table: "settings", name: "name", phone: "phone", replyTo: "email" },
  // A reservation's own link opens it on the guest site; its code rides the fragment.
  pages: { manage: "/r", booking: "/" },
  kinds: Object.fromEntries(KINDS.map((kind) => [kind, `hotel-${kind}`])),
  producers: [
    { kind: "stay-made", link: "stay_id", ...GATE, onCreate: { table: "stays", where: { column: "channel", eq: "online" } } },
    { kind: "stay-made-desk", link: "stay_id", ...GATE, onCreate: { table: "stays", where: { column: "channel", eq: "desk" } } },
    { kind: "stay-cancelled-self", link: "stay_id", ...GATE, ...cancelled("self"), ...unlessLate },
    { kind: "stay-cancelled-self-late", link: "stay_id", ...GATE, ...cancelledLate("self") },
    { kind: "stay-cancelled-desk", link: "stay_id", ...GATE, ...cancelled("guest_asked"), ...unlessLate },
    { kind: "stay-cancelled-desk-late", link: "stay_id", ...GATE, ...cancelledLate("guest_asked") },
    { kind: "stay-cancelled-house", link: "stay_id", ...GATE, ...cancelled("house") },
    { kind: "stay-no-show", link: "stay_id", ...GATE, ...onStay("status", "no_show") },
    // Dates moved on a stay still to come: the old ones and the old total kept on the message.
    {
      kind: "stay-dates-changed",
      link: "stay_id",
      ...GATE,
      onChange: { table: "stays", columns: ["arrive", "depart"], changed: true, where: { column: "status", eq: "booked" } },
      repeat: true,
      was: ["arrive", "depart", "total"],
    },
    // "stay-new-link" is sent by Adminium when a signed-in guest makes a new link (no producer).
    // The folio, each time the desk sends it.
    { kind: "stay-folio", link: "stay_id", ...GATE, onChange: { table: "stays", columns: ["folio_sent_at"], changed: true }, repeat: true },
    { kind: "stay-folio-owing", link: "stay_id", ...GATE, onChange: { table: "stays", columns: ["folio_so_far_at"], changed: true }, repeat: true },
  ],
};
