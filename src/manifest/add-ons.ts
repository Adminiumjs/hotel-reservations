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

/**
 * Inventory and Offers & gift cards, from the release that first works with
 * this app: linen and amenities counted as guests leave, and codes, vouchers
 * and gift cards on a stay. Neither is needed and neither is ticked: with
 * both away the house runs as it always has.
 */
export const LEDGER_ADD_ONS_RANGE = ">=1.0.9";
/** Offers & gift cards from the release that keeps a card whole in either order a payment and its give-back are voided. */
export const OFFERS_RANGE = ">=1.0.10";

export const ADD_ONS = {
  suggests: [
    {
      key: "invoices",
      range: ADD_ONS_RANGE,
      checked: true,
      reason: l("Print a guest's folio at the desk and email it at check-out, with a receipt for each payment."),
    },
    { key: "inventory", range: LEDGER_ADD_ONS_RANGE, reason: l("Count linen and amenities as guests leave.") },
    { key: "offers", range: OFFERS_RANGE, reason: l("Take codes, vouchers and gift cards.") },
  ],
  features: [
    { id: "folio", label: l("Folio and receipts"), requires: ["invoices"] },
    { id: "linen-and-supplies", label: l("Linen and supplies"), requires: ["inventory"] },
    { id: "codes", label: l("Codes and vouchers"), requires: ["offers"] },
    { id: "gift-cards", label: l("Gift cards"), requires: ["offers"] },
  ],
};
