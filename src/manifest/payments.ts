/**
 * Paying for a stay online, through the payments Adminium takes.
 *
 * A stay is payable: its total, what is due online now (`pay_due`), the
 * connection's currency, and each payment written into the stay's own
 * `payments` table as `online`, with Adminium's reference and the service it
 * went through. They arrive switched off: someone who manages payments
 * switches Hotel Reservations on in Adminium's Payments, and until then every
 * screen reads as it always has.
 *
 *   - when booking, by the house's setting: nothing (the default), the
 *     guest's choice, or before the room is theirs — one night or the whole
 *     stay. Asked to pay first, the stay is made waiting for the payment
 *     (`pending_payment`), its room held; the payment books it. Such a stay is
 *     paid only by the ways that settle at once (a card, a wallet), so no bank
 *     debit holds a room for days;
 *   - the folio: what a stay still owes, by a pay link the desk copies, the
 *     folio email carries and the printed folio shows.
 *
 * Money given back of an online payment is a `given_back` row of the stay's
 * own payments, naming the payment in `refund_of`: the desk writes it (only
 * someone who may refund), and Adminium sends the money back for it and
 * stamps where it stands. A cancellation before the free-cancellation time —
 * by the guest, or by someone at the desk who may refund — gives the online
 * money back by itself, unless the house turns that off in its settings;
 * Adminium then writes that row itself. A late cancellation or a no-show
 * keeps the money unless the desk gives it back.
 *
 * Adminium sends the receipt of an online payment, to the stay's own address.
 */
const setting = (column: string) => ({ table: "settings", column });

export const PAYMENTS = {
  payables: [
    {
      table: "stays",
      label: "ref",
      amount: { column: "total" },
      currency: { connection: true },
      due: { column: "pay_due" },
      payments: {
        kind: "table",
        table: "payments",
        link: "stay_id",
        amount: "amount",
        paidAt: "recorded_at",
        method: { column: "method", values: { "*": "online" } },
        voided: "voided",
        reference: "payment_ref",
        provider: "provider",
        last4: "payment_last4",
        refundedElsewhere: "refunded_elsewhere",
      },
      // Only a stay waiting for its payment is booked by it; a stay already booked or in the house stays as it is.
      status: { column: "status", paid: "booked", from: ["pending_payment"] },
      customerEmail: "email",
      payableWhen: [{ column: "status", in: ["pending_payment", "booked", "in_house"] }],
      returnTo: "/paid",
      receipt: "engine",
      // A room held while its guest pays is paid only by a way that settles at once.
      instantOnly: { where: [{ column: "status", eq: "pending_payment" }] },
      refunds: {
        model: "rows",
        table: "payments",
        payment: "refund_of",
        amount: "amount",
        when: [
          { column: "kind", eq: "given_back" },
          { column: "method", eq: "online" },
        ],
        providerRef: "refund_ref",
        state: "refund_state",
        openIn: "/",
        auto: { values: { kind: "given_back", method: "online", automatic: true, note: "Cancelled in time: given back by itself." } },
      },
      refundOn: {
        moves: [{ from: ["booked"], to: "cancelled", by: ["customer", "refund-right"] }],
        switch: setting("auto_refund"),
        before: { column: "cancel_by", hours: setting("auto_refund_stop_hours") },
      },
    },
  ],
};
