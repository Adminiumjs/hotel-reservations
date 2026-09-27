/**
 * The add-ons this app works better with. It needs none: a stay — reserved,
 * checked in, settled and checked out — works without any.
 *
 * Invoices & Receipts draws the folio the desk prints and emails at
 * check-out, and a receipt for each payment; it is offered ticked, and the
 * folio is the feature `folio`. Without it the desk's print and email buttons
 * are not there and everything else is the same.
 *
 * The range names the add-ons' release that first prints a stay's nights one
 * line each.
 */
import { l } from "./labels.ts";

export const ADD_ONS_RANGE = ">=1.0.6";

export const ADD_ONS = {
  suggests: [
    {
      key: "invoices",
      range: ADD_ONS_RANGE,
      checked: true,
      reason: l("Print a guest's folio at the desk and email it at check-out, with a receipt for each payment."),
    },
  ],
  features: [{ id: "folio", label: l("Folio and receipts"), requires: ["invoices"] }],
};
