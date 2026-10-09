/**
 * "Have a code?" as it is drawn: the reductions a quote answered, one row
 * each before the tax row, and the link that opens the field. Shared by the
 * guest's Reserve summary and the desk's Take a booking.
 */
import { Fragment } from "react";

import { tr } from "../i18n/tr.ts";
import { Icon, st } from "./dom.tsx";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** One row a reduction: its name, the code as a chip, "Remove", and what it takes off. */
export function CodeRows({ v }: { v: any }) {
  if (!v?.on) return null;
  return (
    <>
      {/* Always there, empty until a reduction is: what changes in it is read out, and it takes no room. */}
      <span className="wh-sr" role="status" aria-live="polite" data-code-said>{v.said}</span>
      {(v.rows ?? []).map((r: any, i: number) => (
        <Fragment key={i}>
          <div data-code-row style={st("display:flex;align-items:center;gap:8px;flex-wrap:wrap")}>
            <span data-icon="tag" style={st("display:inline-flex;inline-size:13px;block-size:13px;color:var(--pos);flex:0 0 auto")}><Icon name={"tag"} /></span>
            <span style={st("font-size:12.5px;font-weight:700;color:var(--fg);min-inline-size:0")}>{r.name}</span>
            {r.chip ? <span style={st("padding:2px 7px;border-radius:999px;background:var(--surface-3);font-family:var(--mono);font-size:10.5px;font-weight:700;color:var(--fg-muted)")}>{r.chip}</span> : null}
            {r.canRemove ? (
              <button type="button" onClick={r.remove} aria-label={r.removeLabel} style={st("padding:0;border:0;background:transparent;font-size:12px;font-weight:700;color:var(--fg-muted);text-decoration:underline;cursor:pointer")}>
                {tr("Remove")}
              </button>
            ) : null}
            <span style={st("margin-inline-start:auto;font-family:var(--mono);font-size:13px;font-weight:600;color:var(--pos);white-space:nowrap")}>{r.amount}</span>
          </div>
        </Fragment>
      ))}
    </>
  );
}

/** The link, and the field it opens: a code typed, "Apply", and what the house said of it. */
export function CodeField({ v }: { v: any }) {
  if (!v?.on) return null;
  return (
    <div style={st("margin-block-start:12px")}>
      <button id="code-link" type="button" onClick={v.toggle} aria-expanded={v.expanded} aria-controls="code-box" style={st("display:inline-flex;align-items:center;gap:6px;padding:0;border:0;background:transparent;font-size:12.5px;font-weight:700;color:var(--accent);cursor:pointer")}>
        <span data-icon="tag" style={st("display:inline-flex;inline-size:13px;block-size:13px")}><Icon name={"tag"} /></span>
        {v.linkLabel}
      </button>
      {v.open ? (
        <div id="code-box" style={st("margin-block-start:9px")}>
          <label htmlFor="code-field" style={st("display:block;font-size:12px;font-weight:700;color:var(--fg-muted);margin-block-end:6px")}>
            {tr("Your code")}
          </label>
          <div style={st("display:flex;gap:7px")}>
            <input id="code-field" value={v.text ?? ""} onChange={v.onText} onKeyDown={v.onKey} placeholder={v.placeholder} autoComplete="off" autoCapitalize="characters" spellCheck={false} aria-invalid={v.inv} aria-describedby="code-err" readOnly={v.busy} aria-busy={v.busyAttr} style={st(`flex:1;min-inline-size:0;padding:10px 12px;border:1px solid ${v.border};border-radius:10px;background:var(--surface-2);color:var(--fg);font-family:var(--mono);font-size:13px;font-weight:600;text-transform:uppercase`)} />
            <button type="button" onClick={v.apply} aria-disabled={v.busyAttr} aria-busy={v.busyAttr} style={st("padding:10px 14px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface);color:var(--fg);font-size:12.5px;font-weight:700;cursor:pointer;white-space:nowrap")}>
              {v.applyLabel}
            </button>
          </div>
          <div id="code-err" role="alert" style={st(`margin-block-start:${v.errOn ? "7px" : "0"};font-size:12.5px;font-weight:700;line-height:1.5;color:var(--danger)`)}>
            {v.errOn ? v.err : ""}
          </div>
        </div>
      ) : null}
    </div>
  );
}
