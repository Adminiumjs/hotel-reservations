// Drawn from the Wren House design (its template ported to JSX): the layout, as drawn.
// Every value comes from the screens' values bag `v` (../app/vals/*.ts).
import { Fragment } from "react";

import { Icon, st } from "./dom.tsx";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ToastsView({ v }: { v: any }) {
  return (
    <>
    <div role="status" aria-live="polite" style={st("position:fixed;inset-block-end:22px;inset-inline:0;z-index:90;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none")}>
      {(v.toasts ?? []).map((t: any, i_t: number) => (
        <Fragment key={i_t}>
          <div style={st(`display:flex;align-items:center;gap:9px;padding:9px 16px;border-radius:999px;background:${t.bg};color:${t.fg};font-size:13px;font-weight:600;box-shadow:var(--shadow-lift);animation:wh-toast .18s ease-out;max-inline-size:min(460px,92vw)`)}>
            <span data-icon={t.icon} style={st("display:inline-flex;inline-size:15px;block-size:15px;flex:0 0 auto")}><Icon name={t.icon} /></span>
            {t.msg}
          </div>
        </Fragment>
      ))}
    </div>
    </>
  );
}
