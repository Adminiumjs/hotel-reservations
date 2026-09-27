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
 *                              nights are released, with the house's phone.
 *
 * The log is the dedupe: a kind already queued or sent for the same stay is
 * not queued again. A reservation linked to a signed-in guest is addressed to
 * them; any other to the address typed on it, in the language it was made in.
 * A cancellation email is picked by who cancelled and whether it was late,
 * both written in the same write as the move.
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
] as const;
export type Kind = (typeof KINDS)[number];

const GATE = { gate: { setting: { table: "settings", column: "guest_emails_on" } } };
const onStay = (column: string, to: unknown, where?: Record<string, unknown>) => ({
  onChange: { table: "stays", column, to, ...(where === undefined ? {} : { where }) },
});
/**
 * A cancellation, by who made it: the reason is written in the same write as
 * the move, and so is the late flag, which picks the on-time or the late words.
 */
const cancelled = (code: string, late?: boolean) =>
  onStay("cancel_code", code, late === undefined ? undefined : { column: "late_cancel", eq: late });

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
  },
  links: { stay: "stay_id", customer: "customer_id" },
  recipient: {
    via: "customer_id",
    table: "customers",
    email: "email",
    name: "first_name",
    // A reservation nobody signed in for — and every desk booking — carries its own details.
    fallback: { via: "stay_id", email: "email", name: "first_name", language: "language" },
  },
  settings: { table: "settings", name: "name", phone: "phone" },
  // A reservation's own link opens it on the guest site; its code rides the fragment.
  pages: { manage: "/r", booking: "/" },
  kinds: Object.fromEntries(KINDS.map((kind) => [kind, `hotel-${kind}`])),
  producers: [
    { kind: "stay-made", link: "stay_id", ...GATE, onCreate: { table: "stays", where: { column: "channel", eq: "online" } } },
    { kind: "stay-made-desk", link: "stay_id", ...GATE, onCreate: { table: "stays", where: { column: "channel", eq: "desk" } } },
    { kind: "stay-cancelled-self", link: "stay_id", ...GATE, ...cancelled("self", false) },
    { kind: "stay-cancelled-self-late", link: "stay_id", ...GATE, ...cancelled("self", true) },
    { kind: "stay-cancelled-desk", link: "stay_id", ...GATE, ...cancelled("guest_asked", false) },
    { kind: "stay-cancelled-desk-late", link: "stay_id", ...GATE, ...cancelled("guest_asked", true) },
    { kind: "stay-cancelled-house", link: "stay_id", ...GATE, ...cancelled("house") },
    { kind: "stay-no-show", link: "stay_id", ...GATE, ...onStay("status", "no_show") },
  ],
};
