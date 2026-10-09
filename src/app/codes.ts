/**
 * "Have a code?" — the one field the guest's Reserve summary and the desk's
 * Take a booking share, and the reductions it leads to.
 *
 * Every figure is Adminium's: a reduction's name and amount are the quote's
 * own (`applied`), in its order; the page adds nothing up. A code is shown as
 * the guest typed it, in capitals; a voucher only by its last four.
 *
 * WHICH CODE IS WHICH ROW is read from the answer, never from its order: a
 * voucher's row carries the last four of its code; a code's row is paired
 * with the typed code only when there is exactly one of each left. A typed
 * code with no row of its own (a better offer took its place) is still
 * listed, with its own "Remove": what is sent with the save can always be
 * taken off.
 */
import type { Applied, QuoteReply } from "../data/wire.ts";
import { tr } from "../i18n/tr.ts";
import { iso, money, strip } from "./fmt.ts";
import type { HouseApp } from "./house.ts";

type V = Record<string, unknown>;

const plain = (code: string) => code.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

/** Each reduction with the typed code it came from, where the answer says which; and the typed codes no row answers for. */
export function pairCodes(applied: readonly Applied[], codes: readonly string[]): { rows: { one: Applied; code: string | undefined }[]; alone: string[] } {
  const left = [...codes];
  const rows = applied.map((one) => ({ one, code: undefined as string | undefined }));
  for (const row of rows) {
    if (!row.one.typed || row.one.codeLast4 === undefined) continue;
    const at = left.findIndex((code) => plain(code).endsWith(plain(row.one.codeLast4!)));
    if (at >= 0) row.code = left.splice(at, 1)[0];
  }
  const open = rows.filter((row) => row.one.typed && row.code === undefined && row.one.codeLast4 === undefined);
  // One typed row and one typed code left: they are each other's. Any other count, and nothing is guessed.
  if (open.length === 1 && left.length === 1) open[0]!.code = left.splice(0, 1)[0];
  return { rows, alone: left };
}

export function codeVals(app: HouseApp, quote: QuoteReply | undefined, ask: (codes: string[]) => Promise<QuoteReply>, placeholder: string): V {
  const s = app.state;
  const paired = pairCodes(quote?.applied ?? [], s.codes);
  const rows = paired.rows.map(({ one, code }) => {
    const voucher = one.kind === "voucher" || one.kind === "pack";
    return {
      // Adminium names a reduction whole ("Voucher · One night"): it is shown as said.
      name: one.name,
      chip: voucher ? (one.codeLast4 ? iso(`···· ${one.codeLast4}`) : "") : code === undefined ? "" : iso(code.toUpperCase()),
      amount: iso(`− ${strip(money(Number(one.amount)))}`),
      canRemove: code !== undefined,
      removeLabel: code === undefined ? "" : tr("Remove {code}", { code: voucher ? `···· ${plain(code).slice(-4)}` : code.toUpperCase() }),
      remove: () => (code === undefined ? undefined : app.removeCode(code)),
    };
  });
  // A typed code no row answers for — beaten by a better offer, or the price still on its way: listed, and removable.
  for (const code of paired.alone) {
    const shown = plain(code).length > 8 ? `···· ${plain(code).slice(-4)}` : code.toUpperCase();
    rows.push({ name: iso(shown), chip: "", amount: "", canRemove: true, removeLabel: tr("Remove {code}", { code: shown }), remove: () => app.removeCode(code) });
  }
  const apply = () => void app.applyCode(ask);
  return {
    on: app.codesOn,
    rows,
    hasRows: rows.length > 0,
    // What a screen reader is told when the reductions change: each by name and amount, or that there is none now.
    said: rows.length === 0 ? "" : rows.map((row) => `${strip(String(row.name))} ${strip(String(row.amount))}`.trim()).join(", "),
    open: s.codeOpen,
    expanded: s.codeOpen ? "true" : "false",
    linkLabel: s.codes.length > 0 ? tr("Have another code?") : tr("Have a code?"),
    toggle: () => {
      app.setState({ codeOpen: !app.state.codeOpen, codeErr: "" });
      if (!s.codeOpen) app.focusSoon("#code-field");
    },
    text: s.codeText,
    placeholder,
    onText: (e: { target: { value: string } }) => {
      if (!app.state.codeBusy) app.setState({ codeText: e.target.value, codeErr: "" });
    },
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
