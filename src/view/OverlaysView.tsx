// Drawn from the Wren House design (its template ported to JSX): the layout, as drawn.
// Every value comes from the screens' values bag `v` (../app/vals/*.ts).
import { Fragment } from "react";

import { DESK, GUEST } from "../app/sides.ts";
import { tr } from "../i18n/tr.ts";
import { fx, Icon, st, trx } from "./dom.tsx";
import { OverlaysDeskView } from "./OverlaysDeskView.tsx";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function OverlaysView({ v }: { v: any }) {
  return (
    <>
    {v.navOpen ? (
      <>
        <div onClick={v.closeNav} style={st("position:fixed;inset:0;z-index:70;background:rgba(10,10,15,.55);backdrop-filter:blur(3px)")}>
          <aside data-nav-sheet="" role="dialog" aria-modal="true" aria-label={tr("Menu")} onClick={v.stop} style={st("position:absolute;inset-block:0;inset-inline-start:0;inline-size:264px;background:var(--surface);border-inline-end:1px solid var(--border);display:flex;flex-direction:column;padding:18px 14px")}>
            <div style={st("display:flex;align-items:center;gap:10px;padding-inline:4px;margin-block-end:16px")}>
              <span style={st("inline-size:30px;block-size:30px;border-radius:9px;display:grid;place-items:center;background:radial-gradient(110% 85% at 20% 10%, rgba(255,255,255,.24), rgba(255,255,255,0) 60%), linear-gradient(140deg,#25415c,#3a6d92 48%,#4a7a5c);color:rgba(255,255,255,.94)")}>
                <span data-icon="bird" style={st("display:inline-flex;inline-size:16px;block-size:16px")}><Icon name={"bird"} /></span>
              </span>
              {" "}
              <div style={st("font-size:14.5px;font-weight:800")}>
                {v.houseName}
              </div>
              {" "}
              <button onClick={v.closeNav} aria-label={tr("Close")} style={st("margin-inline-start:auto;inline-size:30px;block-size:30px;border:1px solid var(--border-strong);border-radius:8px;background:var(--surface-2);display:grid;place-items:center;cursor:pointer")}>
                <span data-icon="x" style={st("display:inline-flex;inline-size:15px;block-size:15px")}><Icon name={"x"} /></span>
              </button>
            </div>
            {" "}
            <nav style={st("display:flex;flex-direction:column;gap:3px")}>
              {(v.deskNav ?? []).map((n: any, i_n: number) => (
                <Fragment key={i_n}>
                  <button onClick={n.go} aria-current={n.current} style={st(`display:flex;align-items:center;gap:11px;padding:12px;border:0;border-radius:9px;background:${n.bg};color:${n.fg};font-size:14px;font-weight:${n.weight};cursor:pointer;text-align:start`)}>
                    <span data-icon={n.icon} style={st("display:inline-flex;inline-size:17px;block-size:17px")}><Icon name={n.icon} /></span>
                    {n.label}{" "}
                    {n.hasCount ? (
                      <>
                        <span style={st(`margin-inline-start:auto;font-family:var(--mono);font-size:11.5px;font-weight:600;color:${n.countFg}`)}>
                          {n.count}
                        </span>
                      </>
                    ) : null}
                  </button>
                </Fragment>
              ))}
            </nav>
            {" "}
            <div style={st("margin-block-start:auto;font-family:var(--mono);font-size:11px;color:var(--fg-subtle);line-height:1.6")}>
              {v.clockShort}
              <br />
              {tr("Arrivals from {from} · out by {by}", { from: v.arriveFrom, by: v.leaveBy })}
            </div>
          </aside>
        </div>
      </>
    ) : null}
    {" "}
    {DESK ? <OverlaysDeskView v={v} /> : null}
    {" "}
    {v.cx.open ? (
      <>
        <div onClick={v.cx.close} style={st("position:fixed;inset:0;z-index:80;background:rgba(10,10,15,.55);backdrop-filter:blur(3px);display:grid;place-items:center;padding:20px")}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="cx-title" aria-describedby="cx-body" onClick={v.stop} style={st("inline-size:min(440px,100%);background:var(--surface);border:1px solid var(--border-strong);border-radius:16px;box-shadow:var(--shadow-lift);animation:wh-pop .18s ease-out;padding:20px")}>
            <div style={st("display:flex;align-items:center;gap:10px")}>
              <span style={st(`inline-size:34px;block-size:34px;border-radius:9px;background:${v.cx.iconBg};color:${v.cx.iconFg};display:grid;place-items:center;flex:0 0 auto`)}>
                <span data-icon={v.cx.icon} style={st("display:inline-flex;inline-size:17px;block-size:17px")}><Icon name={v.cx.icon} /></span>
              </span>
              {" "}
              <div id="cx-title" style={st("font-size:16px;font-weight:800")}>
                {v.cx.title}
              </div>
            </div>
            {" "}
            <p id="cx-body" style={st("margin:13px 0 0;font-size:13.5px;line-height:1.6;color:var(--fg-muted);text-wrap:pretty")}>
              {v.cx.body}
            </p>
            {v.cx.whoOn ? (
              <div role="radiogroup" aria-label={tr("Who is cancelling")} style={st("display:flex;gap:7px;flex-wrap:wrap;margin-block-start:14px")}>
                {(v.cx.who ?? []).map((m: any, i_m: number) => (
                  <Fragment key={i_m}>
                    <button role="radio" aria-checked={m.pressed} onClick={m.pick} style={st(`flex:1;min-inline-size:150px;padding:10px;border:1px solid ${m.border};border-radius:10px;background:${m.bg};color:${m.fg};font-size:12.5px;font-weight:700;cursor:pointer`)}>
                      {m.label}
                    </button>
                  </Fragment>
                ))}
              </div>
            ) : null}
            {" "}
            {v.cx.noteOn ? (
              <>
                <div style={st(`margin-block-start:15px;padding:12px 13px;border-radius:11px;background:${v.cx.noteBg};color:${v.cx.noteFg};font-size:12.5px;font-weight:700;line-height:1.55`)}>
                  {v.cx.note}
                </div>
              </>
            ) : null}
            {" "}
            <div style={st("display:flex;gap:9px;margin-block-start:18px;flex-wrap:wrap")}>
              <button onClick={v.cx.confirm} style={st("flex:1;min-inline-size:150px;padding:12px;border:0;border-radius:10px;background:var(--danger-solid);color:#fff;font-size:13.5px;font-weight:700;cursor:pointer")} className={fx("filter:brightness(1.08)", "transform:scale(.97)")}>
                {v.cx.confirmLabel}
              </button>
              {" "}
              <button data-autofocus="true" onClick={v.cx.close} style={st("flex:1;min-inline-size:130px;padding:12px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-2);font-size:13.5px;font-weight:700;cursor:pointer")} className={fx("background:var(--surface-3)", null)}>
                {v.cx.keepLabel}
              </button>
            </div>
          </div>
        </div>
      </>
    ) : null}
    {" "}
    {GUEST && v.dd.open ? (
      <>
        <div onClick={v.dd.close} style={st("position:fixed;inset:0;z-index:80;background:rgba(10,10,15,.55);backdrop-filter:blur(3px);display:grid;place-items:center;padding:20px")}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="dd-title" aria-describedby="dd-body" onClick={v.stop} style={st("inline-size:min(440px,100%);background:var(--surface);border:1px solid var(--border-strong);border-radius:16px;box-shadow:var(--shadow-lift);animation:wh-pop .18s ease-out;padding:20px")}>
            <div style={st("display:flex;align-items:center;gap:10px")}>
              <span style={st("inline-size:34px;block-size:34px;border-radius:9px;background:var(--danger-soft);color:var(--danger);display:grid;place-items:center;flex:0 0 auto")}>
                <span data-icon="trash-2" style={st("display:inline-flex;inline-size:17px;block-size:17px")}><Icon name={"trash-2"} /></span>
              </span>
              {" "}
              <div id="dd-title" style={st("font-size:16px;font-weight:800")}>
                {tr("Delete my details?")}
              </div>
            </div>
            {" "}
            <p id="dd-body" style={st("margin:13px 0 0;font-size:13.5px;line-height:1.6;color:var(--fg-muted);text-wrap:pretty")}>
              {v.dd.body}
            </p>
            {" "}
            <div style={st("display:flex;gap:9px;margin-block-start:18px;flex-wrap:wrap")}>
              {v.dd.fresh ? (
                <>
                  <button onClick={v.dd.confirm} style={st("flex:1;min-inline-size:150px;padding:12px;border:0;border-radius:10px;background:var(--danger);color:#fff;font-size:13.5px;font-weight:700;cursor:pointer")} className={fx("filter:brightness(1.08)", null)}>
                    {tr("Delete my details")}
                  </button>
                </>
              ) : null}
              {" "}
              {v.dd.stale ? (
                <>
                  <button onClick={v.dd.sendLink} style={st("flex:1;min-inline-size:150px;padding:12px;border:0;border-radius:10px;background:var(--accent);color:var(--accent-fg);font-size:13.5px;font-weight:700;cursor:pointer")} className={fx("filter:brightness(1.08)", null)}>
                    {tr("Send me a link")}
                  </button>
                </>
              ) : null}
              {" "}
              <button data-autofocus="true" onClick={v.dd.close} style={st("flex:1;min-inline-size:130px;padding:12px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-2);font-size:13.5px;font-weight:700;cursor:pointer")} className={fx("background:var(--surface-3)", null)}>
                {tr("Keep them")}
              </button>
            </div>
          </div>
        </div>
      </>
    ) : null}
    {" "}
    {GUEST && v.cd.open ? (
      <>
        <div onClick={v.cd.close} style={st("position:fixed;inset:0;z-index:75;background:rgba(10,10,15,.55);backdrop-filter:blur(3px);display:flex;justify-content:flex-end")}>
          <aside data-sheet="" role="dialog" aria-modal="true" aria-label={tr("Change the dates")} onClick={v.stop} style={st("inline-size:min(540px,100%);background:var(--bg);block-size:100%;overflow:auto;border-inline-start:1px solid var(--border-strong);display:flex;flex-direction:column")}>
            <div style={st("position:sticky;inset-block-start:0;background:var(--surface);border-block-end:1px solid var(--border);padding:16px 20px;display:flex;align-items:flex-start;gap:12px;z-index:5")}>
              <span style={st(`inline-size:44px;block-size:44px;border-radius:10px;background:${v.cd.tint};flex:0 0 auto;display:grid;place-items:center`)}>
                <span data-icon="calendar-range" style={st("display:inline-flex;inline-size:22px;block-size:22px;color:rgba(255,255,255,.84)")}><Icon name={"calendar-range"} /></span>
              </span>
              {" "}
              <div style={st("min-inline-size:0;flex:1")}>
                <div style={st("font-size:16.5px;font-weight:800;letter-spacing:-.015em")}>
                  {v.cd.title}
                </div>
                {" "}
                <div style={st("font-family:var(--mono);font-size:11.5px;color:var(--fg-subtle);margin-block-start:3px")}>
                  {v.cd.sub}
                </div>
              </div>
              {" "}
              <button onClick={v.cd.close} aria-label={tr("Close")} style={st("inline-size:31px;block-size:31px;border:1px solid var(--border-strong);border-radius:8px;background:var(--surface-2);display:grid;place-items:center;cursor:pointer;flex:0 0 auto")}>
                <span data-icon="x" style={st("display:inline-flex;inline-size:15px;block-size:15px")}><Icon name={"x"} /></span>
              </button>
            </div>
            {" "}
            <div style={st("padding:18px 20px;display:flex;flex-direction:column;gap:16px;flex:1")}>
              <div style={st("background:var(--surface);border:1px solid var(--border);border-radius:13px;padding:15px")}>
                <div style={st("display:grid;grid-template-columns:1fr 1fr;gap:12px")}>
                  <label style={st("display:flex;flex-direction:column;gap:6px")}>
                    <span style={st("font-size:12px;font-weight:700;color:var(--fg-muted)")}>
                      {tr("Arriving")}
                    </span>
                    {" "}
                    <input type="date" value={v.cd.arrive ?? ""} min={v.cd.minDate} onChange={v.cd.onArrive} style={st("padding:10px 12px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-2);font-size:13.5px")} />
                  </label>
                  {" "}
                  <label style={st("display:flex;flex-direction:column;gap:6px")}>
                    <span style={st("font-size:12px;font-weight:700;color:var(--fg-muted)")}>
                      {tr("Leaving")}
                    </span>
                    {" "}
                    <input type="date" value={v.cd.depart ?? ""} min={v.cd.minDepart} onChange={v.cd.onDepart} style={st("padding:10px 12px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-2);font-size:13.5px")} />
                  </label>
                </div>
                {" "}
                <div style={st("display:flex;gap:9px;flex-wrap:wrap;margin-block-start:12px")}>
                  <span style={st("font-family:var(--mono);font-size:12.5px;font-weight:700;padding:5px 10px;border-radius:8px;background:var(--accent-soft);color:var(--accent)")}>
                    {v.cd.nightsLabel}
                  </span>
                  {" "}
                  <span style={st("font-family:var(--mono);font-size:12.5px;font-weight:600;padding:5px 10px;border-radius:8px;background:var(--surface-3);color:var(--fg-muted)")}>
                    {v.cd.guestsLabel}
                  </span>
                </div>
                {" "}
                {v.cd.problemOn ? (
                  <>
                    <div role="alert" style={st("display:flex;align-items:flex-start;gap:9px;margin-block-start:12px;padding:11px 13px;border-radius:11px;background:var(--warn-soft);color:var(--warn);font-size:13px;font-weight:600;line-height:1.5")}>
                      <span data-icon="info" style={st("display:inline-flex;inline-size:15px;block-size:15px;flex:0 0 auto;margin-block-start:2px")}><Icon name={"info"} /></span>
                      {v.cd.problem}
                    </div>
                  </>
                ) : null}
              </div>
              {" "}
              {v.cd.sameOn ? (
                <>
                  <div style={st("padding:14px;border-radius:12px;background:var(--surface-2);border:1px solid var(--border);font-size:13px;color:var(--fg-muted)")}>
                    {tr("These are the dates you have now. Pick the new ones above.")}
                  </div>
                </>
              ) : null}
              {" "}
              {v.cd.noneOn ? (
                <>
                  <div role="status" style={st("padding:14px;border-radius:12px;background:var(--surface);border:1px solid var(--border-strong)")}>
                    <div style={st("display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:800")}>
                      <span data-icon="calendar-x" style={st("display:inline-flex;inline-size:16px;block-size:16px;color:var(--fg-muted)")}><Icon name={"calendar-x"} /></span>
                      {tr("Nothing open for these dates")}
                    </div>
                    {" "}
                    {v.cd.hasEarliest ? (
                      <>
                        <p style={st("margin:8px 0 12px;font-size:13px;color:var(--fg-muted)")}>
                          {trx("The earliest the same room type is open is {day}.", { day: <span style={st("font-family:var(--mono);font-weight:700;color:var(--fg)")}>{v.cd.earliest}</span> })}
                        </p>
                        {" "}
                        <button onClick={v.cd.goEarliest} style={st("padding:9px 14px;border:1px solid var(--accent);border-radius:10px;background:transparent;color:var(--accent);font-size:12.5px;font-weight:700;cursor:pointer")} className={fx("background:var(--accent-soft)", null)}>
                          {v.cd.moveLabel}
                        </button>
                      </>
                    ) : null}
                  </div>
                </>
              ) : null}
              {" "}
              {v.cd.openOn ? (
                <>
                  <div style={st("background:var(--surface);border:1px solid var(--border);border-radius:13px;overflow:hidden")}>
                    <div style={st("padding:13px 15px;border-block-end:1px solid var(--border);font-size:11.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--fg-subtle)")}>
                      {tr("The new nights")}
                    </div>
                    {" "}
                    <div style={st("padding:4px 15px")}>
                      {(v.cd.rows ?? []).map((n: any, i_n: number) => (
                        <Fragment key={i_n}>
                          <div style={st("display:flex;align-items:center;gap:8px;padding:8px 0;border-block-end:1px solid var(--border)")}>
                            <span style={st("font-family:var(--mono);font-size:12.5px;color:var(--fg-muted);min-inline-size:96px")}>
                              {n.date}
                            </span>
                            {" "}
                            {n.hasTags ? (
                              <>
                                <span style={st("font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:999px;background:var(--surface-3);color:var(--fg-subtle)")}>
                                  {n.tags}
                                </span>
                              </>
                            ) : null}
                            {" "}
                            <span style={st("margin-inline-start:auto;font-family:var(--mono);font-size:13px;font-weight:600")}>
                              {n.rate}
                            </span>
                          </div>
                        </Fragment>
                      ))}
                      {" "}
                      {(v.cd.lines ?? []).map((l: any, i_l: number) => (
                        <Fragment key={i_l}>
                          <div style={st("display:flex;align-items:center;gap:8px;padding:8px 0;border-block-end:1px solid var(--border)")}>
                            <span style={st("font-size:12.5px;color:var(--fg-muted)")}>
                              {l.label}
                            </span>
                            {" "}
                            <span style={st("margin-inline-start:auto;font-family:var(--mono);font-size:13px;font-weight:600")}>
                              {l.amount}
                            </span>
                          </div>
                        </Fragment>
                      ))}
                      {" "}
                      <div style={st("display:flex;align-items:center;gap:8px;padding:8px 0;border-block-end:1px solid var(--border)")}>
                        <span style={st("font-size:12.5px;color:var(--fg-muted)")}>
                          {v.taxLabel}
                        </span>
                        {" "}
                        <span style={st("margin-inline-start:auto;font-family:var(--mono);font-size:13px;font-weight:600")}>
                          {v.cd.tax}
                        </span>
                      </div>
                      {" "}
                      <div style={st("display:flex;align-items:baseline;gap:10px;padding:12px 0 14px")}>
                        <span style={st("font-size:14px;font-weight:800")}>
                          {tr("Total")}
                        </span>
                        {" "}
                        <span style={st("margin-inline-start:auto;font-family:var(--mono);font-size:12px;color:var(--fg-subtle)")}>
                          {v.cd.was}
                        </span>
                        {" "}
                        <span style={st("font-family:var(--mono);font-size:19px;font-weight:700;letter-spacing:-.02em")}>
                          {v.cd.total}
                        </span>
                      </div>
                    </div>
                  </div>
                  {" "}
                  <div style={st(`display:flex;align-items:flex-start;gap:9px;padding:12px 13px;border-radius:11px;background:${v.cd.lineBg};color:${v.cd.lineFg};font-size:13px;font-weight:600;line-height:1.5`)}>
                    <span data-icon={v.cd.lineIcon} style={st("display:inline-flex;inline-size:15px;block-size:15px;flex:0 0 auto;margin-block-start:2px")}><Icon name={v.cd.lineIcon} /></span>
                    {v.cd.lineNew}
                  </div>
                </>
              ) : null}
              {" "}
              {v.cd.roomKeptOn ? (
                <>
                  <div role="status" style={st("display:flex;align-items:flex-start;gap:9px;padding:12px 13px;border-radius:11px;background:var(--warn-soft);color:var(--warn);font-size:13px;font-weight:700;line-height:1.5")}>
                    <span data-icon="door-closed" style={st("display:inline-flex;inline-size:15px;block-size:15px;flex:0 0 auto;margin-block-start:2px")}><Icon name={"door-closed"} /></span>
                    <span>
                      {trx("Your room is kept for your current dates. To move them, ring us on {phone}.", { phone: <a href={v.telHref} style={st("font-family:var(--mono)")}>{v.phone}</a> })}
                    </span>
                  </div>
                </>
              ) : null}
              {" "}
              {v.cd.movedOn ? (
                <>
                  <div role="alert" style={st("display:flex;align-items:flex-start;gap:9px;padding:12px 13px;border-radius:11px;background:var(--warn-soft);color:var(--warn);font-size:13px;font-weight:700;line-height:1.5")}>
                    <span data-icon="tag" style={st("display:inline-flex;inline-size:15px;block-size:15px;flex:0 0 auto;margin-block-start:2px")}><Icon name={"tag"} /></span>
                    {v.cd.movedMsg}
                  </div>
                </>
              ) : null}
            </div>
            {" "}
            <div style={st("position:sticky;inset-block-end:0;background:var(--surface);border-block-start:1px solid var(--border);padding:14px 20px;display:flex;align-items:center;gap:12px")}>
              <div style={st("font-size:12.5px;color:var(--fg-subtle);min-inline-size:0;flex:1")}>
                {v.cd.foot}
              </div>
              {" "}
              <button onClick={v.cd.confirm} disabled={v.cd.cantGo} style={st(`padding:12px 18px;border:0;border-radius:10px;background:${v.cd.btnBg};color:${v.cd.btnFg};font-size:13.5px;font-weight:700;cursor:${v.cd.btnCursor};white-space:nowrap;display:flex;align-items:center;gap:8px`)} className={fx("filter:brightness(1.08)", "transform:scale(.97)")}>
                {v.cd.busy ? (
                  <>
                    <span aria-hidden="true" style={st("inline-size:13px;block-size:13px;border-radius:999px;border:2px solid currentColor;border-inline-end-color:transparent;animation:wh-spin .7s linear infinite")}></span>
                  </>
                ) : null}
                {v.cd.btnLabel}
              </button>
            </div>
          </aside>
        </div>
      </>
    ) : null}
    </>
  );
}
