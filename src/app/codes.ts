/**
 * "Have a code?" — the one field the guest's Reserve summary and the desk's
 * Take a booking share, and the reductions it leads to.
 *
 * Every figure is Adminium's: a reduction's name and amount are the quote's
 * own (`applied`), in its order; the page adds nothing up. A code is shown as
 * the guest typed it, in capitals; a voucher only by its last four.
 */
import type { QuoteReply } from "../data/wire.ts";
import { tr } from "../i18n/tr.ts";
import { iso, money, strip } from "./fmt.ts";
import type { HouseApp } from "./house.ts";

type V = Record<string, unknown>;

export function codeVals(app: HouseApp, quote: QuoteReply | undefined, ask: (codes: string[]) => Promise<QuoteReply>, placeholder: string): V {
  const s = app.state;
  const applied = quote?.applied ?? [];
  // A typed reduction is one of the codes held here, in the order typed: each can be taken off again.
  const typedOnes = applied.filter((one) => one.typed);
  const rows = applied.map((one) => {
    const at = typedOnes.indexOf(one);
    const code = at >= 0 ? s.codes[at] : undefined;
    return {
      name: one.kind === "voucher" || one.kind === "pack" ? tr("Voucher · {name}", { name: one.name }) : one.name,
      chip: one.kind === "voucher" || one.kind === "pack" ? (one.codeLast4 ? iso(`···· ${one.codeLast4}`) : "") : code === undefined ? "" : iso(code.toUpperCase()),
      amount: iso(`− ${strip(money(Number(one.amount)))}`),
      canRemove: code !== undefined,
      remove: () => (code === undefined ? undefined : app.removeCode(code)),
    };
  });
  // No answer to show them in (the price is on its way, or these dates or this room refuse a code typed before):
  // the codes are still listed as typed, so one can always be taken off.
  if (quote === undefined) for (const code of s.codes) rows.push({ name: iso(code.toUpperCase()), chip: "", amount: "", canRemove: true, remove: () => app.removeCode(code) });
  const apply = () => void app.applyCode(ask);
  return {
    on: app.codesOn,
    rows,
    hasRows: rows.length > 0,
    open: s.codeOpen,
    expanded: s.codeOpen ? "true" : "false",
    linkLabel: s.codes.length > 0 ? tr("Have another code?") : tr("Have a code?"),
    toggle: () => {
      app.setState({ codeOpen: !app.state.codeOpen, codeErr: "" });
      if (!s.codeOpen) app.focusSoon("#code-field");
    },
    text: s.codeText,
    placeholder,
    onText: (e: { target: { value: string } }) => app.setState({ codeText: e.target.value, codeErr: "" }),
    onKey: (e: { key: string; preventDefault(): void }) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      apply();
    },
    apply,
    busy: s.codeBusy,
    busyAttr: s.codeBusy ? "true" : "false",
    applyLabel: s.codeBusy ? tr("Checking") : tr("Apply"),
    errOn: s.codeErr !== "",
    err: s.codeErr,
    inv: s.codeErr !== "" ? "true" : "false",
    border: s.codeErr !== "" ? "var(--danger)" : "var(--border-strong)",
    // The figures keep their last answer while a code is checked, and dim.
    dim: s.codeBusy ? "0.45" : "1",
  };
}
