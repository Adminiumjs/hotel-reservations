/**
 * The documents this app declares, drawn by Invoices & Receipts (the feature
 * `folio`): the folio of a stay, printed at the desk and emailed at check-out,
 * and a receipt for each payment.
 *
 * The folio's lines are the stay's nights, one per night with its rate and
 * what made it (a weekend, a season), then each extra on the stay, each
 * charge not voided and the nights not stayed, taken off. The tax is the
 * stay's own, as it was on the day the stay was made.
 */
import { l } from "./labels.ts";

export const DOCUMENTS = [
  {
    kind: "invoice",
    addOn: "invoices",
    table: "stays",
    feature: "folio",
    name: l("Folio"),
    mapping: {
      number: { column: "ref" },
      customerName: { column: "guest_name" },
      customerEmail: { column: "email" },
      serviceFrom: { column: "arrive" },
      serviceTo: { column: "depart" },
      reference: { via: "room_id", column: "number" },
      items: {
        collections: [
          { nightly: "room_total", columns: { desc: "room_type_id.name", date: "date", rate: "rate", qty: "qty" } },
          { table: "stay_extras", via: "stay_id", orderBy: "id", where: { column: "state", in: ["on"] }, columns: { desc: "label", rate: "amount", amount: "amount" } },
          { table: "charges", via: "stay_id", orderBy: "id", unless: "voided", columns: { desc: "label", date: "charged_on", rate: "amount", amount: "amount" } },
          // One line a credit: its amount is the nights' together (they may each have had their own rate).
          { table: "stay_credits", via: "stay_id", orderBy: "id", unless: "voided", columns: { desc: "label", date: "from_date", rate: "line_amount", amount: "line_amount" } },
        ],
      },
      subtotal: { column: "subtotal" },
      taxName: { column: "tax_label" },
      taxRate: { column: "tax_rate" },
      tax: { column: "tax" },
      total: { column: "total" },
      paid: { column: "paid" },
      balance: { column: "balance" },
      // "Payments so far": each one taken, as recorded; a voided one left off.
      payments: {
        collection: { table: "payments", via: "stay_id", orderBy: "recorded_at", unless: "voided", columns: { number: "reference", paidOn: "paid_on", method: "method", amount: "signed" } },
      },
    },
  },
  {
    kind: "receipt",
    addOn: "invoices",
    table: "payments",
    feature: "folio",
    name: l("Receipt"),
    mapping: {
      issuedAt: { column: "recorded_at" },
      amount: { column: "amount" },
      paidWith: { column: "method" },
      voided: { column: "voided" },
      reference: { via: "stay_id", column: "ref" },
      customerName: { via: "stay_id", column: "guest_name" },
      attendedBy: { column: "recorded_by" },
      // No "balance left": the stay's balance is today's, not the one after this payment, once another is recorded.
    },
  },
];
