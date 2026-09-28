// Drawn from the Wren House design (its template ported to JSX): the layout, as drawn.
// The desk's sheets and dialogs — DESK ONLY: `OverlaysView` draws them only in a desk's build.
// Every value comes from the screens' values bag `v` (../app/vals/overlaysDesk.ts).
import { Fragment } from "react";

import { DESK } from "../app/sides.ts";
import { tr } from "../i18n/tr.ts";
import { fx, Icon, st } from "./dom.tsx";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function OverlaysDeskView({ v }: { v: any }) {
  return (
    <>
    {DESK && v.ci.open ? (
      <>
        <div onClick={v.ci.close} style={st("position:fixed;inset:0;z-index:75;background:rgba(10,10,15,.55);backdrop-filter:blur(3px);display:flex;justify-content:flex-end")}>
          <aside data-sheet="" role="dialog" aria-modal="true" aria-label={tr("Check in")} onClick={v.stop} style={st("inline-size:min(560px,100%);background:var(--bg);block-size:100%;overflow:auto;border-inline-start:1px solid var(--border-strong);display:flex;flex-direction:column")}>
            <div style={st("position:sticky;inset-block-start:0;background:var(--surface);border-block-end:1px solid var(--border);padding:16px 20px;display:flex;align-items:flex-start;gap:12px;z-index:5")}>
              <span style={st(`inline-size:44px;block-size:44px;border-radius:10px;background:${v.ci.tint};flex:0 0 auto;display:grid;place-items:center`)}>
                <span data-icon={v.ci.icon} style={st("display:inline-flex;inline-size:22px;block-size:22px;color:rgba(255,255,255,.84)")}><Icon name={v.ci.icon} /></span>
              </span>
              {" "}
              <div style={st("min-inline-size:0;flex:1")}>
                <div style={st("font-size:16.5px;font-weight:800;letter-spacing:-.015em")}>
                  {v.ci.name}
                </div>
                {" "}
                <div style={st("font-family:var(--mono);font-size:11.5px;color:var(--fg-subtle);margin-block-start:3px")}>
                  {v.ci.ref}{" · "}{v.ci.range}
                </div>
              </div>
              {" "}
              <button onClick={v.ci.close} aria-label={tr("Close")} style={st("inline-size:31px;block-size:31px;border:1px solid var(--border-strong);border-radius:8px;background:var(--surface-2);display:grid;place-items:center;cursor:pointer;flex:0 0 auto")}>
                <span data-icon="x" style={st("display:inline-flex;inline-size:15px;block-size:15px")}><Icon name={"x"} /></span>
              </button>
            </div>
            {" "}
            <div style={st("padding:18px 20px;display:flex;flex-direction:column;gap:16px;flex:1")}>
              {v.ci.dueOn ? (
                <>
                  <div style={st("display:flex;align-items:flex-start;gap:9px;padding:12px 13px;border-radius:11px;background:var(--warn-soft);color:var(--warn);font-size:13px;font-weight:700;line-height:1.5")}>
                    <span data-icon="clock-alert" style={st("display:inline-flex;inline-size:15px;block-size:15px;flex:0 0 auto;margin-block-start:2px")}><Icon name={"clock-alert"} /></span>
                    {v.ci.dueNote}
                  </div>
                </>
              ) : null}
              {v.ci.missedOn ? (
                <div>
                  <div id="ci-missed-l" style={st("font-size:11.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--fg-subtle);margin-block-end:9px")}>
                    {v.ci.missedTitle}
                  </div>
                  <div role="radiogroup" aria-labelledby="ci-missed-l" style={st("display:flex;flex-direction:column;gap:8px")}>
                    {(v.ci.missed ?? []).map((m: any, i_m: number) => (
                      <Fragment key={i_m}>
                          <button role="radio" aria-checked={m.checked} onClick={m.pick} style={st(`display:flex;align-items:flex-start;gap:11px;padding:13px 14px;border:1px solid ${m.border};border-radius:12px;background:${m.bg};cursor:pointer;text-align:start`)}>
                            <span style={st("inline-size:18px;block-size:18px;border-radius:999px;border:2px solid var(--border-strong);flex:0 0 auto;display:grid;place-items:center;margin-block-start:1px")}>
                              <span style={st(`inline-size:8px;block-size:8px;border-radius:999px;background:${m.dot}`)}></span>
                            </span>
                            {" "}
                            <span style={st("min-inline-size:0")}>
                              <span style={st("display:block;font-size:13.5px;font-weight:700")}>
                                {m.label}
                              </span>
                              {m.hasSub ? (
                                <span style={st("display:block;font-size:12px;font-weight:600;color:var(--fg-subtle);margin-block-start:3px")}>
                                  {m.sub}
                                </span>
                              ) : null}
                            </span>
                          </button>
                      </Fragment>
                    ))}
                  </div>
                </div>
              ) : null}
              {" "}
              <div style={st("background:var(--surface);border:1px solid var(--border);border-radius:13px;padding:15px")}>
                <div style={st("font-size:11.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--fg-subtle);margin-block-end:11px")}>
                  {tr("The reservation")}
                </div>
                {" "}
                <div style={st("display:grid;grid-template-columns:1fr 1fr;gap:12px 16px")}>
                  {(v.ci.facts ?? []).map((f: any, i_f: number) => (
                    <Fragment key={i_f}>
                      <div>
                        <div style={st("font-size:11.5px;color:var(--fg-subtle)")}>
                          {f.label}
                        </div>
                        {" "}
                        <div style={st(`font-size:13.5px;font-weight:700;margin-block-start:2px;font-family:${f.font}`)}>
                          {f.value}
                        </div>
                      </div>
                    </Fragment>
                  ))}
                </div>
                {" "}
                {v.ci.noteOn ? (
                  <>
                    <div style={st("display:flex;align-items:flex-start;gap:8px;margin-block-start:13px;padding:11px 12px;border-radius:10px;background:var(--warn-soft);color:var(--warn);font-size:12.5px;font-weight:600;line-height:1.55")}>
                      <span data-icon="notebook-pen" style={st("display:inline-flex;inline-size:15px;block-size:15px;flex:0 0 auto;margin-block-start:1px")}><Icon name={"notebook-pen"} /></span>
                      {v.ci.note}
                    </div>
                  </>
                ) : null}
              </div>
              {" "}
              <div>
                <div style={st("display:flex;align-items:baseline;gap:9px;flex-wrap:wrap;margin-block-end:11px")}>
                  <div id="ci-rooms-l" style={st("font-size:11.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--fg-subtle)")}>
                    {tr("Which room")}
                  </div>
                  {" "}
                  <div style={st("font-size:12px;color:var(--fg-subtle)")}>
                    {v.ci.pickerNote}
                  </div>
                </div>
                {" "}
                {v.ci.errOn ? (
                  <>
                    <div role="alert" style={st("display:flex;align-items:flex-start;gap:9px;margin-block-end:11px;padding:12px 13px;border-radius:11px;background:var(--danger-soft);color:var(--danger);font-size:13px;font-weight:700;line-height:1.5")}>
                      <span data-icon="circle-alert" style={st("display:inline-flex;inline-size:15px;block-size:15px;flex:0 0 auto;margin-block-start:2px")}><Icon name={"circle-alert"} /></span>
                      {v.ci.err}
                    </div>
                  </>
                ) : null}
                {" "}
                {v.ci.hasRooms ? (
                  <>
                    <div role="radiogroup" aria-labelledby="ci-rooms-l" style={st("display:flex;flex-direction:column;gap:8px")}>
                      {(v.ci.rooms ?? []).map((r: any, i_r: number) => (
                        <Fragment key={i_r}>
                          <button role="radio" aria-checked={r.checked} onClick={r.pick} disabled={r.disabled} style={st(`display:flex;align-items:center;gap:13px;padding:13px 14px;border:1px solid ${r.border};border-radius:12px;background:${r.bg};opacity:${r.opacity};cursor:${r.cursor};text-align:start;transition:border-color .14s`)}>
                            <span style={st(`inline-size:20px;block-size:20px;border-radius:999px;border:2px solid ${r.dotBorder};flex:0 0 auto;display:grid;place-items:center`)}>
                              <span style={st(`inline-size:8px;block-size:8px;border-radius:999px;background:${r.dotInner}`)}></span>
                            </span>
                            {" "}
                            <span style={st("font-family:var(--mono);font-size:17px;font-weight:700;min-inline-size:44px")}>
                              {r.n}
                            </span>
                            {" "}
                            <span style={st("flex:1;min-inline-size:0")}>
                              <span style={st("display:block;font-size:12.5px;color:var(--fg-muted);font-weight:600")}>
                                {r.floor}
                              </span>
                              {" "}
                              {r.hasNote ? (
                                <>
                                  <span style={st(`display:block;font-size:12px;font-weight:600;color:${r.noteFg};margin-block-start:2px`)}>
                                    {r.note}
                                  </span>
                                </>
                              ) : null}
                            </span>
                            {" "}
                            <span style={st(`font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;background:${r.tagBg};color:${r.tagFg};flex:0 0 auto`)}>
                              {r.tag}
                            </span>
                          </button>
                        </Fragment>
                      ))}
                    </div>
                  </>
                ) : null}
                {" "}
                {v.ci.noRooms ? (
                  <>
                    <div style={st("padding:16px;border:1px solid var(--warn);border-radius:13px;background:var(--warn-soft)")}>
                      <div style={st("display:flex;align-items:center;gap:9px;font-size:13.5px;font-weight:800;color:var(--warn)")}>
                        <span data-icon="triangle-alert" style={st("display:inline-flex;inline-size:16px;block-size:16px")}><Icon name={"triangle-alert"} /></span>
                        {v.ci.noRoomsTitle}
                      </div>
                      {" "}
                      <p style={st("margin:9px 0 13px;font-size:13px;line-height:1.6;color:var(--fg-muted)")}>
                        {v.ci.noRoomsBody}
                      </p>
                      {" "}
                      <button onClick={v.ci.goRack} style={st("display:flex;align-items:center;gap:7px;padding:9px 14px;border:1px solid var(--warn);border-radius:10px;background:transparent;color:var(--warn);font-size:12.5px;font-weight:700;cursor:pointer")} className={fx("background:var(--surface)", null)}>
                        <span data-icon="grid-3x3" style={st("display:inline-flex;inline-size:14px;block-size:14px")}><Icon name={"grid-3x3"} /></span>
                        {tr("Open the room rack")}
                      </button>
                    </div>
                  </>
                ) : null}
                {" "}
                <button onClick={v.ci.altToggle} aria-expanded={v.ci.altExpanded} style={st("display:flex;align-items:center;gap:7px;margin-block-start:12px;padding:8px 12px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface);font-size:12.5px;font-weight:700;color:var(--fg-muted);cursor:pointer")} className={fx("background:var(--surface-2)", null)}>
                  <span data-icon="arrow-left-right" style={st("display:inline-flex;inline-size:14px;block-size:14px")}><Icon name={"arrow-left-right"} /></span>
                  {tr("Give them another room type…")}
                </button>
                {" "}
                {v.ci.altOpen ? (
                  <>
                    <div style={st("margin-block-start:10px;padding:13px;border:1px solid var(--border);border-radius:12px;background:var(--surface);animation:wh-fade .16s ease-out")}>
                      {v.ci.hasAlts ? (
                        <>
                          {v.ci.hasUps ? (
                            <>
                              <div role="radiogroup" aria-label={tr("A better room at the booked price")} style={st("display:flex;flex-direction:column;gap:7px;margin-block-end:10px")}>
                                {(v.ci.ups ?? []).map((a: any, i_a: number) => (
                                  <Fragment key={i_a}>
                                    <button role="radio" aria-checked={a.checked} onClick={a.pick} style={st(`display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid ${a.border};border-radius:10px;background:${a.bg};cursor:pointer;text-align:start`)}>
                                      <span style={st("inline-size:18px;block-size:18px;border-radius:999px;border:2px solid var(--border-strong);flex:0 0 auto;display:grid;place-items:center")}>
                                        <span style={st(`inline-size:8px;block-size:8px;border-radius:999px;background:${a.dot}`)}></span>
                                      </span>
                                      {" "}
                                      <span data-icon="sparkles" style={st("display:inline-flex;inline-size:14px;block-size:14px;color:var(--accent);flex:0 0 auto")}><Icon name={"sparkles"} /></span>
                                      {" "}
                                      <span style={st("font-size:13px;font-weight:700")}>
                                        {a.label}
                                      </span>
                                    </button>
                                  </Fragment>
                                ))}
                                {" "}
                                <p style={st("margin:2px 0 0;font-size:12px;color:var(--fg-subtle)")}>
                                  {v.ci.upNote}
                                </p>
                              </div>
                            </>
                          ) : null}
                          {" "}
                          {v.ci.hasOwnAlts ? (
                            <>
                              <div role="radiogroup" aria-label={tr("Another room type")} style={st("display:flex;flex-direction:column;gap:7px")}>
                                {(v.ci.alts ?? []).map((a: any, i_a: number) => (
                                  <Fragment key={i_a}>
                                    <button role="radio" aria-checked={a.checked} onClick={a.pick} style={st(`display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid ${a.border};border-radius:10px;background:${a.bg};cursor:pointer;text-align:start`)}>
                                      <span style={st("inline-size:18px;block-size:18px;border-radius:999px;border:2px solid var(--border-strong);flex:0 0 auto;display:grid;place-items:center")}>
                                        <span style={st(`inline-size:8px;block-size:8px;border-radius:999px;background:${a.dot}`)}></span>
                                      </span>
                                      {" "}
                                      <span style={st("font-family:var(--mono);font-size:12.5px;font-weight:700")}>
                                        {a.label}
                                      </span>
                                    </button>
                                  </Fragment>
                                ))}
                              </div>
                              {" "}
                              <p style={st("margin:9px 0 0;font-size:12px;color:var(--fg-subtle)")}>
                                {v.ci.altNote}
                              </p>
                            </>
                          ) : null}
                        </>
                      ) : null}
                      {" "}
                      {v.ci.noAlts ? (
                        <>
                          <p style={st("margin:0;font-size:12.5px;color:var(--fg-muted)")}>
                            {tr("Nothing else that sleeps the party is open for the whole stay.")}
                          </p>
                        </>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
            {" "}
            <div style={st("position:sticky;inset-block-end:0;background:var(--surface);border-block-start:1px solid var(--border);padding:14px 20px;display:flex;align-items:center;gap:12px")}>
              <div style={st("font-size:12.5px;color:var(--fg-subtle);min-inline-size:0;flex:1")}>
                {v.ci.footNote}
              </div>
              {" "}
              <button onClick={v.ci.confirm} disabled={v.ci.cantConfirm} style={st(`padding:12px 18px;border:0;border-radius:10px;background:${v.ci.confirmBg};color:${v.ci.confirmFg};font-size:13.5px;font-weight:700;cursor:${v.ci.confirmCursor};white-space:nowrap;transition:filter .14s`)} className={fx("filter:brightness(1.08)", "transform:scale(.97)")}>
                {v.ci.confirmLabel}
              </button>
            </div>
          </aside>
        </div>
      </>
    ) : null}
    {" "}
    {DESK && v.co.open ? (
      <>
        <div onClick={v.co.close} style={st("position:fixed;inset:0;z-index:75;background:rgba(10,10,15,.55);backdrop-filter:blur(3px);display:flex;justify-content:flex-end")}>
          <aside data-sheet="" role="dialog" aria-modal="true" aria-label={tr("Check out")} onClick={v.stop} style={st("inline-size:min(540px,100%);background:var(--bg);block-size:100%;overflow:auto;border-inline-start:1px solid var(--border-strong);display:flex;flex-direction:column")}>
            <div style={st("position:sticky;inset-block-start:0;background:var(--surface);border-block-end:1px solid var(--border);padding:16px 20px;display:flex;align-items:flex-start;gap:12px;z-index:5")}>
              <span style={st(`inline-size:44px;block-size:44px;border-radius:10px;background:${v.co.tint};flex:0 0 auto;display:grid;place-items:center`)}>
                <span data-icon={v.co.icon} style={st("display:inline-flex;inline-size:22px;block-size:22px;color:rgba(255,255,255,.84)")}><Icon name={v.co.icon} /></span>
              </span>
              {" "}
              <div style={st("min-inline-size:0;flex:1")}>
                <div style={st("font-size:16.5px;font-weight:800;letter-spacing:-.015em")}>
                  {v.co.name}
                </div>
                {" "}
                <div style={st("font-family:var(--mono);font-size:11.5px;color:var(--fg-subtle);margin-block-start:3px")}>
                  {v.co.ref}{" · "}{v.co.range}
                </div>
              </div>
              {" "}
              <button onClick={v.co.close} aria-label={tr("Close")} style={st("inline-size:31px;block-size:31px;border:1px solid var(--border-strong);border-radius:8px;background:var(--surface-2);display:grid;place-items:center;cursor:pointer;flex:0 0 auto")}>
                <span data-icon="x" style={st("display:inline-flex;inline-size:15px;block-size:15px")}><Icon name={"x"} /></span>
              </button>
            </div>
            {" "}
            <div style={st("padding:18px 20px;display:flex;flex-direction:column;gap:16px;flex:1")}>
              <div style={st("background:var(--surface);border:1px solid var(--border);border-radius:13px;padding:15px")}>
                <div style={st("font-size:11.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--fg-subtle);margin-block-end:11px")}>
                  {v.co.title}
                </div>
                {" "}
                <div style={st("display:grid;grid-template-columns:1fr 1fr;gap:12px 16px")}>
                  {(v.co.facts ?? []).map((f: any, i_f: number) => (
                    <Fragment key={i_f}>
                      <div>
                        <div style={st("font-size:11.5px;color:var(--fg-subtle)")}>
                          {f.label}
                        </div>
                        {" "}
                        <div style={st(`font-size:13.5px;font-weight:700;margin-block-start:2px;font-family:${f.font}`)}>
                          {f.value}
                        </div>
                      </div>
                    </Fragment>
                  ))}
                </div>
              </div>
              {" "}
              {v.co.earlyOn ? (
                <>
                  <div>
                    <div id="co-mode-l" style={st("font-size:11.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--fg-subtle);margin-block-end:9px")}>
                      {tr("What to charge")}
                    </div>
                    {" "}
                    <div role="radiogroup" aria-labelledby="co-mode-l" style={st("display:flex;flex-direction:column;gap:8px")}>
                      {(v.co.modes ?? []).map((m: any, i_m: number) => (
                        <Fragment key={i_m}>
                          <button role="radio" aria-checked={m.checked} onClick={m.pick} disabled={m.disabled} style={st(`display:flex;align-items:flex-start;gap:11px;padding:13px 14px;border:1px solid ${m.border};border-radius:12px;background:${m.bg};opacity:${m.opacity};cursor:${m.cursor};text-align:start`)}>
                            <span style={st("inline-size:18px;block-size:18px;border-radius:999px;border:2px solid var(--border-strong);flex:0 0 auto;display:grid;place-items:center;margin-block-start:1px")}>
                              <span style={st(`inline-size:8px;block-size:8px;border-radius:999px;background:${m.dot}`)}></span>
                            </span>
                            {" "}
                            <span style={st("min-inline-size:0")}>
                              <span style={st("display:block;font-size:13.5px;font-weight:700")}>
                                {m.label}
                              </span>
                              {" "}
                              <span style={st(`display:block;font-size:12px;font-weight:600;color:${m.subFg};margin-block-start:3px`)}>
                                {m.sub}
                              </span>
                            </span>
                          </button>
                        </Fragment>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
              {" "}
              <div style={st("background:var(--surface);border:1px solid var(--border);border-radius:13px;overflow:hidden")}>
                <div style={st("padding:13px 15px;border-block-end:1px solid var(--border);font-size:11.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--fg-subtle)")}>
                  {tr("The account")}
                </div>
                {" "}
                {(v.co.lines ?? []).map((l: any, i_l: number) => (
                  <Fragment key={i_l}>
                    <div style={st("padding:11px 15px;border-block-end:1px solid var(--border);display:flex;align-items:center;gap:12px")}>
                      <span style={st(`font-size:13px;font-weight:${l.weight};min-inline-size:0`)}>
                        {l.label}
                      </span>
                      {" "}
                      <span style={st("margin-inline-start:auto;font-family:var(--mono);font-size:13px;font-weight:700")}>
                        {l.amount}
                      </span>
                    </div>
                  </Fragment>
                ))}
                {" "}
                <div style={st("padding:14px 15px;display:flex;align-items:baseline;gap:12px;background:var(--surface-2)")}>
                  <span style={st("font-size:13.5px;font-weight:800")}>
                    {tr("Balance")}
                  </span>
                  {" "}
                  <span style={st("font-size:12px;color:var(--fg-subtle)")}>
                    {v.co.balNote}
                  </span>
                  {" "}
                  <span style={st(`margin-inline-start:auto;font-family:var(--mono);font-size:20px;font-weight:700;letter-spacing:-.02em;color:${v.co.balFg}`)}>
                    {v.co.balance}
                  </span>
                </div>
              </div>
              {" "}
              {v.co.owing ? (
                <>
                  <div style={st("padding:16px;border:1px solid var(--warn);border-radius:13px;background:var(--warn-soft)")}>
                    <div style={st("display:flex;align-items:center;gap:9px;font-size:13.5px;font-weight:800;color:var(--warn)")}>
                      <span data-icon="triangle-alert" style={st("display:inline-flex;inline-size:16px;block-size:16px")}><Icon name={"triangle-alert"} /></span>
                      {v.co.blockTitle}
                    </div>
                    {" "}
                    <p style={st("margin:9px 0 13px;font-size:13px;line-height:1.6;color:var(--fg-muted);text-wrap:pretty")}>
                      {v.co.blockBody}
                    </p>
                    {" "}
                    <button onClick={v.co.goSettle} style={st("display:flex;align-items:center;gap:7px;padding:9px 14px;border:1px solid var(--warn);border-radius:10px;background:transparent;color:var(--warn);font-size:12.5px;font-weight:700;cursor:pointer")} className={fx("background:var(--surface)", null)}>
                      <span data-icon="wallet" style={st("display:inline-flex;inline-size:14px;block-size:14px")}><Icon name={"wallet"} /></span>
                      {tr("Record the balance now")}
                    </button>
                  </div>
                </>
              ) : null}
              {" "}
              {v.co.clear ? (
                <>
                  <div style={st("display:flex;align-items:flex-start;gap:9px;padding:13px 14px;border-radius:12px;background:var(--pos-soft);color:var(--pos);font-size:13px;font-weight:700;line-height:1.55")}>
                    <span data-icon="check" style={st("display:inline-flex;inline-size:16px;block-size:16px;flex:0 0 auto;margin-block-start:1px")}><Icon name={"check"} /></span>
                    {tr("Nothing owing. Check them out and the room goes to housekeeping as being cleaned.")}
                  </div>
                </>
              ) : null}
              {" "}
              <div style={st("display:flex;gap:8px;flex-wrap:wrap")}>
                <button onClick={v.co.goFolio} style={st("display:flex;align-items:center;gap:7px;padding:9px 14px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface);font-size:12.5px;font-weight:700;color:var(--fg-muted);cursor:pointer")} className={fx("filter:brightness(.97)", null)}>
                  <span data-icon="receipt-text" style={st("display:inline-flex;inline-size:14px;block-size:14px")}><Icon name={"receipt-text"} /></span>
                  {tr("Read the whole folio")}
                </button>
                {" "}
                {v.co.printOn ? (
                  <>
                    <button onClick={v.co.print} style={st("display:flex;align-items:center;gap:7px;padding:9px 14px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface);font-size:12.5px;font-weight:700;color:var(--fg-muted);cursor:pointer")} className={fx("filter:brightness(.97)", null)}>
                      <span data-icon="printer" style={st("display:inline-flex;inline-size:14px;block-size:14px")}><Icon name={"printer"} /></span>
                      {tr("Print the folio")}
                    </button>
                    {" "}
                    {v.co.emailOn ? (
                      <>
                        <button onClick={v.co.email} style={st("display:flex;align-items:center;gap:7px;padding:9px 14px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface);font-size:12.5px;font-weight:700;color:var(--fg-muted);cursor:pointer")} className={fx("filter:brightness(.97)", null)}>
                          <span data-icon="mail" style={st("display:inline-flex;inline-size:14px;block-size:14px")}><Icon name={"mail"} /></span>
                          {v.co.emailLabel}
                        </button>
                      </>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>
            {" "}
            <div style={st("position:sticky;inset-block-end:0;background:var(--surface);border-block-start:1px solid var(--border);padding:14px 20px;display:flex;align-items:center;gap:12px")}>
              <div style={st("font-size:12.5px;color:var(--fg-subtle);min-inline-size:0;flex:1")}>
                {v.co.footNote}
              </div>
              {" "}
              <button onClick={v.co.primary} style={st(`padding:12px 18px;border:0;border-radius:10px;background:${v.co.btnBg};color:${v.co.btnFg};font-size:13.5px;font-weight:700;cursor:pointer;white-space:nowrap;transition:filter .14s`)} className={fx("filter:brightness(1.08)", "transform:scale(.97)")}>
                {v.co.btnLabel}
              </button>
            </div>
          </aside>
        </div>
      </>
    ) : null}
    {" "}
    {DESK && v.rm.open ? (
      <>
        <div onClick={v.rm.close} style={st("position:fixed;inset:0;z-index:78;background:rgba(10,10,15,.55);backdrop-filter:blur(3px);display:grid;place-items:center;padding:20px")}>
          <div role="dialog" aria-modal="true" aria-label={tr("Room {room}", { room: v.rm.n })} onClick={v.stop} style={st("inline-size:min(500px,100%);max-block-size:90vh;overflow:auto;background:var(--surface);border:1px solid var(--border-strong);border-radius:16px;box-shadow:var(--shadow-lift);animation:wh-pop .18s ease-out")}>
            <div style={st(`position:relative;block-size:104px;background:${v.rm.tint}`)}>
              <span data-icon={v.rm.icon} style={st("position:absolute;inset-block-start:50%;inset-inline-start:22px;transform:translateY(-50%);inline-size:64px;block-size:64px;color:rgba(255,255,255,.24);display:inline-flex")}><Icon name={v.rm.icon} /></span>
              {" "}
              <span style={st("position:absolute;inset-block-end:10px;inset-inline-start:12px;font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.05em;padding:3px 8px;border-radius:6px;background:rgba(0,0,0,.28);color:rgba(255,255,255,.92)")}>
                {v.rm.code}
              </span>
              {" "}
              <div style={st("position:absolute;inset-block-start:14px;inset-inline-end:14px;display:flex;align-items:center;gap:8px")}>
                <button onClick={v.rm.close} aria-label={tr("Close")} style={st("inline-size:30px;block-size:30px;border:0;border-radius:8px;background:rgba(0,0,0,.28);color:rgba(255,255,255,.92);display:grid;place-items:center;cursor:pointer")}>
                  <span data-icon="x" style={st("display:inline-flex;inline-size:15px;block-size:15px")}><Icon name={"x"} /></span>
                </button>
              </div>
              {" "}
              <div style={st("position:absolute;inset-block-end:12px;inset-inline-end:14px;text-align:end")}>
                <div style={st("font-family:var(--mono);font-size:28px;font-weight:700;letter-spacing:-.02em;color:#fff")}>
                  {v.rm.n}
                </div>
              </div>
            </div>
            {" "}
            <div style={st("padding:16px 18px;border-block-end:1px solid var(--border);display:flex;align-items:center;gap:10px")}>
              <div style={st("min-inline-size:0")}>
                <div style={st("font-size:15px;font-weight:800")}>
                  {v.rm.typeName}
                </div>
                {" "}
                <div style={st("font-size:12.5px;color:var(--fg-subtle);margin-block-start:2px")}>
                  {v.rm.floor}
                </div>
              </div>
              {" "}
              <span style={st(`margin-inline-start:auto;display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;color:${v.rm.statusColor}`)}>
                <span style={st(`inline-size:8px;block-size:8px;border-radius:999px;background:${v.rm.statusColor}`)}></span>
                {v.rm.statusLabel}
              </span>
            </div>
            {" "}
            <div style={st("padding:16px 18px;border-block-end:1px solid var(--border)")}>
              <div style={st("font-size:11.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--fg-subtle)")}>
                {tr("Housekeeping")}
              </div>
              {" "}
              {v.rm.occupiedOn ? (
                <>
                  <div style={st("display:flex;align-items:center;gap:8px;margin-block-start:11px;padding:10px 12px;border-radius:10px;background:var(--accent-soft);color:var(--accent);font-size:12.5px;font-weight:700")}>
                    <span data-icon="lock" style={st("display:inline-flex;inline-size:14px;block-size:14px;flex:0 0 auto")}><Icon name={"lock"} /></span>
                    {v.rm.occupiedLine}
                  </div>
                </>
              ) : null}
              {" "}
              <div style={st("display:flex;gap:8px;margin-block-start:11px;flex-wrap:wrap")}>
                {(v.rm.options ?? []).map((o: any, i_o: number) => (
                  <Fragment key={i_o}>
                    <button onClick={o.pick} aria-pressed={o.pressed} disabled={o.disabled} style={st(`flex:1;min-inline-size:120px;display:flex;align-items:center;justify-content:center;gap:7px;padding:10px;border:1px solid ${o.border};border-radius:10px;background:${o.bg};color:${o.fg};font-size:12.5px;font-weight:700;cursor:${o.cursor}`)}>
                      <span data-icon={o.icon} style={st("display:inline-flex;inline-size:14px;block-size:14px")}><Icon name={o.icon} /></span>
                      {o.label}
                    </button>
                  </Fragment>
                ))}
              </div>
              {" "}
              {v.rm.msgOn ? (
                <>
                  <div role="alert" style={st("display:flex;align-items:center;gap:8px;margin-block-start:10px;font-size:12.5px;font-weight:700;color:var(--warn)")}>
                    <span data-icon="info" style={st("display:inline-flex;inline-size:14px;block-size:14px")}><Icon name={"info"} /></span>
                    {v.rm.msg}
                  </div>
                </>
              ) : null}
            </div>
            {" "}
            <div style={st("padding:16px 18px;border-block-end:1px solid var(--border)")}>
              <div style={st("display:flex;align-items:center;gap:8px")}>
                <span data-icon="wrench" style={st("display:inline-flex;inline-size:14px;block-size:14px;color:var(--fg-subtle)")}><Icon name={"wrench"} /></span>
                {" "}
                <div style={st("font-size:11.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--fg-subtle)")}>
                  {tr("Out of service")}
                </div>
              </div>
              {" "}
              {v.rm.hasClosures ? (
                <>
                  <div style={st("display:flex;flex-direction:column;gap:7px;margin-block-start:11px")}>
                    {(v.rm.closures ?? []).map((c: any, i_c: number) => (
                      <Fragment key={i_c}>
                        <div style={st("display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:var(--surface-2)")}>
                          <span style={st("font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--fg-subtle);min-inline-size:34px")}>
                            {c.when}
                          </span>
                          {" "}
                          <span style={st("flex:1;min-inline-size:0")}>
                            <span style={st("display:block;font-family:var(--mono);font-size:12px;font-weight:700")}>
                              {c.line}
                            </span>
                            {" "}
                            <span style={st("display:block;font-size:12px;color:var(--fg-muted);margin-block-start:2px")}>
                              {c.reason}
                            </span>
                          </span>
                          {" "}
                          <button onClick={c.end} style={st("padding:6px 10px;border:1px solid var(--border-strong);border-radius:8px;background:var(--surface);font-size:11.5px;font-weight:700;color:var(--fg-muted);cursor:pointer;white-space:nowrap")} className={fx("background:var(--surface-3)", null)}>
                            {c.endLabel}
                          </button>
                        </div>
                      </Fragment>
                    ))}
                  </div>
                </>
              ) : null}
              {" "}
              <div style={st("display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-block-start:12px")}>
                <label style={st("display:flex;flex-direction:column;gap:6px")}>
                  <span style={st("font-size:12px;font-weight:700;color:var(--fg-muted)")}>
                    {tr("Out of service from")}
                  </span>
                  {" "}
                  <input id="oos-from" type="date" value={v.rm.oosFrom ?? ""} min={v.rm.minFrom} onChange={v.rm.onFrom} aria-invalid={v.rm.dateInv} aria-describedby="oos-err" style={st("padding:9px 11px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-2);font-size:13px")} />
                </label>
                {" "}
                <label style={st("display:flex;flex-direction:column;gap:6px")}>
                  <span style={st("font-size:12px;font-weight:700;color:var(--fg-muted)")}>
                    {tr("to")}{" "}
                    <span style={st("font-weight:600;color:var(--fg-subtle)")}>
                      {tr("(optional)")}
                    </span>
                  </span>
                  {" "}
                  <input type="date" value={v.rm.oosTo ?? ""} min={v.rm.minTo} onChange={v.rm.onTo} aria-invalid={v.rm.dateInv} aria-describedby="oos-to-hint oos-err" style={st("padding:9px 11px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-2);font-size:13px")} />
                  {" "}
                  <span id="oos-to-hint" style={st("font-size:11.5px;color:var(--fg-subtle)")}>
                    {v.rm.toHint}
                  </span>
                </label>
              </div>
              {" "}
              {v.rm.dateErrOn ? (
                <>
                  <div id="oos-err" role="alert" style={st("margin-block-start:8px;font-size:12px;font-weight:700;color:var(--danger)")}>
                    {v.rm.dateErr}
                  </div>
                </>
              ) : null}
              {" "}
              <label style={st("display:flex;flex-direction:column;gap:6px;margin-block-start:10px")}>
                <span style={st("font-size:12px;font-weight:700;color:var(--fg-muted)")}>
                  {tr("Why it is out of service")}
                </span>
                {" "}
                <input value={v.rm.oosReason ?? ""} onChange={v.rm.onReason} placeholder={tr("Radiator being replaced")} style={st("padding:10px 12px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-2);font-size:13px")} />
              </label>
              {" "}
              {v.rm.warnOn ? (
                <>
                  <div role="alert" style={st("margin-block-start:12px;padding:12px 13px;border-radius:11px;background:var(--warn-soft);color:var(--warn);display:flex;flex-direction:column;gap:7px")}>
                    {v.rm.oversellOn ? (
                      <>
                        <div style={st("display:flex;align-items:flex-start;gap:8px;font-size:12.5px;font-weight:700;line-height:1.5")}>
                          <span data-icon="triangle-alert" style={st("display:inline-flex;inline-size:14px;block-size:14px;flex:0 0 auto;margin-block-start:2px")}><Icon name={"triangle-alert"} /></span>
                          {v.rm.oversell}
                        </div>
                      </>
                    ) : null}
                    {" "}
                    {(v.rm.guests ?? []).map((g: any, i_g: number) => (
                      <Fragment key={i_g}>
                        <div style={st("display:flex;align-items:flex-start;gap:8px;font-size:12.5px;font-weight:700;line-height:1.5")}>
                          <span data-icon="user-round" style={st("display:inline-flex;inline-size:14px;block-size:14px;flex:0 0 auto;margin-block-start:2px")}><Icon name={"user-round"} /></span>
                          {g.line}
                        </div>
                      </Fragment>
                    ))}
                  </div>
                </>
              ) : null}
              {" "}
              {v.rm.inOn ? (
                <>
                  <div role="alert" style={st("margin-block-start:12px;padding:12px 13px;border-radius:11px;background:var(--danger-soft);color:var(--danger);display:flex;align-items:flex-start;gap:9px;flex-wrap:wrap")}>
                    <span data-icon="user-round" style={st("display:inline-flex;inline-size:14px;block-size:14px;flex:0 0 auto;margin-block-start:2px")}><Icon name={"user-round"} /></span>
                    {" "}
                    <span style={st("flex:1;min-inline-size:200px;font-size:12.5px;font-weight:700;line-height:1.5")}>
                      {v.rm.inLine}
                    </span>
                    {" "}
                    <button onClick={v.rm.moveThem} style={st("display:flex;align-items:center;gap:6px;padding:6px 11px;border:1px solid var(--danger);border-radius:8px;background:transparent;color:var(--danger);font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap")} className={fx("background:var(--surface)", null)}>
                      <span data-icon="arrow-left-right" style={st("display:inline-flex;inline-size:13px;block-size:13px")}><Icon name={"arrow-left-right"} /></span>
                      {tr("Move them…")}
                    </button>
                  </div>
                </>
              ) : null}
              {" "}
              <div style={st("display:flex;gap:8px;flex-wrap:wrap;margin-block-start:12px")}>
                <button onClick={v.rm.closeBtn} disabled={v.rm.closeOff} style={st(`padding:10px 15px;border:0;border-radius:10px;background:${v.rm.closeBg};color:${v.rm.closeFg};font-size:12.5px;font-weight:700;cursor:${v.rm.closeCursor}`)} className={fx("filter:brightness(1.1)", null)}>
                  {v.rm.closeLabel}
                </button>
                {" "}
                {v.rm.warnOn ? (
                  <>
                    <button onClick={v.rm.changeDates} style={st("padding:10px 15px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface);font-size:12.5px;font-weight:700;cursor:pointer")} className={fx("background:var(--surface-2)", null)}>
                      {tr("Change the dates")}
                    </button>
                  </>
                ) : null}
              </div>
            </div>
            {" "}
            {v.rm.hasWho ? (
              <>
                <div style={st("padding:16px 18px;border-block-end:1px solid var(--border)")}>
                  <div style={st("font-size:11.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--fg-subtle)")}>
                    {tr("In it now")}
                  </div>
                  {" "}
                  <div style={st("display:flex;align-items:center;gap:11px;margin-block-start:10px")}>
                    <div style={st("min-inline-size:0")}>
                      <div style={st("font-size:13.5px;font-weight:700")}>
                        {v.rm.whoName}
                      </div>
                      {" "}
                      <div style={st("font-family:var(--mono);font-size:11.5px;color:var(--fg-subtle);margin-block-start:2px")}>
                        {v.rm.whoLine}
                      </div>
                    </div>
                    {" "}
                    <button onClick={v.rm.openFolio} style={st("margin-inline-start:auto;display:flex;align-items:center;gap:7px;padding:8px 13px;border:1px solid var(--border-strong);border-radius:9px;background:var(--surface-2);font-size:12px;font-weight:700;color:var(--fg-muted);cursor:pointer;white-space:nowrap")} className={fx("filter:brightness(.97)", null)}>
                      <span data-icon="receipt-text" style={st("display:inline-flex;inline-size:13px;block-size:13px")}><Icon name={"receipt-text"} /></span>
                      {tr("Their folio")}
                    </button>
                  </div>
                </div>
              </>
            ) : null}
            {" "}
            {v.rm.hasNext ? (
              <>
                <div style={st("padding:16px 18px;border-block-end:1px solid var(--border)")}>
                  <div style={st("font-size:11.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--fg-subtle)")}>
                    {tr("Given ahead")}
                  </div>
                  {" "}
                  <div style={st("font-size:13.5px;font-weight:700;margin-block-start:10px")}>
                    {v.rm.nextName}
                  </div>
                  {" "}
                  <div style={st("font-family:var(--mono);font-size:11.5px;color:var(--fg-subtle);margin-block-start:2px")}>
                    {v.rm.nextLine}
                  </div>
                </div>
              </>
            ) : null}
            {" "}
            {v.rm.emptyNext ? (
              <>
                <div style={st("padding:16px 18px;border-block-end:1px solid var(--border);font-size:13px;color:var(--fg-muted)")}>
                  {v.rm.emptyNote}
                </div>
              </>
            ) : null}
            {" "}
            <div style={st("padding:13px 18px;background:var(--surface-2);font-size:11.5px;line-height:1.55;color:var(--fg-subtle)")}>
              {v.rm.footNote}
            </div>
          </div>
        </div>
      </>
    ) : null}
    {" "}
    {DESK && v.ch.open ? (
      <>
        <div onClick={v.ch.close} style={st("position:fixed;inset:0;z-index:80;background:rgba(10,10,15,.55);backdrop-filter:blur(3px);display:grid;place-items:center;padding:20px")}>
          <div role="dialog" aria-modal="true" aria-labelledby="ch-title" onClick={v.stop} style={st("inline-size:min(470px,100%);max-block-size:88vh;overflow:auto;background:var(--surface);border:1px solid var(--border-strong);border-radius:16px;box-shadow:var(--shadow-lift);animation:wh-pop .18s ease-out")}>
            <div style={st("padding:16px 18px;border-block-end:1px solid var(--border);display:flex;align-items:center;gap:10px")}>
              <span data-icon="plus" style={st("display:inline-flex;inline-size:17px;block-size:17px;color:var(--fg-muted)")}><Icon name={"plus"} /></span>
              {" "}
              <div id="ch-title" style={st("font-size:15.5px;font-weight:800")}>
                {tr("Add a charge")}
              </div>
              {" "}
              <button onClick={v.ch.close} aria-label={tr("Close")} style={st("margin-inline-start:auto;inline-size:29px;block-size:29px;border:1px solid var(--border-strong);border-radius:8px;background:var(--surface-2);display:grid;place-items:center;cursor:pointer")}>
                <span data-icon="x" style={st("display:inline-flex;inline-size:14px;block-size:14px")}><Icon name={"x"} /></span>
              </button>
            </div>
            {" "}
            <div style={st("padding:16px 18px")}>
              <div role="radiogroup" aria-label={tr("What to add")} style={st("display:flex;flex-direction:column;gap:7px")}>
                {(v.ch.items ?? []).map((i: any, i_i: number) => (
                  <Fragment key={i_i}>
                    <button role="radio" aria-checked={i.checked} onClick={i.pick} style={st(`display:flex;align-items:center;gap:11px;padding:11px 12px;border:1px solid ${i.border};border-radius:11px;background:${i.bg};cursor:pointer;text-align:start`)}>
                      <span style={st("inline-size:30px;block-size:30px;border-radius:8px;background:var(--surface-3);color:var(--fg-muted);display:grid;place-items:center;flex:0 0 auto")}>
                        <span data-icon={i.icon} style={st("display:inline-flex;inline-size:15px;block-size:15px")}><Icon name={i.icon} /></span>
                      </span>
                      {" "}
                      <span style={st("flex:1;min-inline-size:0")}>
                        <span style={st("display:block;font-size:13px;font-weight:700")}>
                          {i.label}
                        </span>
                        {" "}
                        <span style={st("display:block;font-size:11.5px;color:var(--fg-subtle);margin-block-start:1px")}>
                          {i.detail}
                        </span>
                      </span>
                      {" "}
                      <span style={st("font-family:var(--mono);font-size:13px;font-weight:700;white-space:nowrap")}>
                        {i.amount}
                      </span>
                    </button>
                  </Fragment>
                ))}
              </div>
              {" "}
              {v.ch.alreadyOn ? (
                <>
                  <div role="status" style={st("display:flex;align-items:flex-start;gap:8px;margin-block-start:12px;padding:10px 12px;border-radius:10px;background:var(--info-soft);color:var(--info);font-size:12.5px;font-weight:700;line-height:1.5")}>
                    <span data-icon="info" style={st("display:inline-flex;inline-size:14px;block-size:14px;flex:0 0 auto;margin-block-start:2px")}><Icon name={"info"} /></span>
                    {v.ch.already}
                  </div>
                </>
              ) : null}
              {" "}
              {v.ch.other ? (
                <>
                  <div style={st("display:flex;flex-direction:column;gap:6px;margin-block-start:14px")}>
                    <label htmlFor="ch-amt" style={st("font-size:12px;font-weight:700;color:var(--fg-muted)")}>
                      {tr("How much")}
                    </label>
                    {" "}
                    <input id="ch-amt" inputMode="decimal" value={v.ch.amt ?? ""} onChange={v.ch.onAmt} placeholder="0.00" aria-invalid={v.ch.amtInv} aria-describedby="ch-amt-err" style={st(`padding:10px 12px;border:1px solid ${v.ch.amtBorder};border-radius:10px;background:var(--surface-2);font-family:var(--mono);font-size:14px;font-weight:600`)} />
                    {" "}
                    {v.ch.amtErrOn ? (
                      <>
                        <span id="ch-amt-err" style={st("font-size:12px;font-weight:700;color:var(--danger)")}>
                          {v.ch.amtErr}
                        </span>
                      </>
                    ) : null}
                  </div>
                </>
              ) : null}
              {" "}
              <div style={st("display:flex;flex-direction:column;gap:6px;margin-block-start:14px")}>
                <label htmlFor="ch-note" style={st("font-size:12px;font-weight:700;color:var(--fg-muted)")}>
                  {v.ch.noteLabel}
                </label>
                {" "}
                <input id="ch-note" value={v.ch.note ?? ""} onChange={v.ch.onNote} placeholder={v.ch.notePlaceholder} aria-invalid={v.ch.noteInv} aria-describedby="ch-note-err" style={st(`padding:10px 12px;border:1px solid ${v.ch.noteBorder};border-radius:10px;background:var(--surface-2);font-size:13px`)} />
                {" "}
                {v.ch.noteErrOn ? (
                  <>
                    <span id="ch-note-err" style={st("font-size:12px;font-weight:700;color:var(--danger)")}>
                      {v.ch.noteErr}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
            {" "}
            <div style={st("padding:14px 18px;border-block-start:1px solid var(--border);background:var(--surface-2);display:flex;align-items:center;gap:12px")}>
              <div style={st("font-size:12.5px;color:var(--fg-subtle);flex:1")}>
                {v.ch.foot}
              </div>
              {" "}
              <button onClick={v.ch.confirm} disabled={v.ch.busy} style={st(`padding:11px 17px;border:0;border-radius:10px;background:${v.ch.btnBg};color:${v.ch.btnFg};font-size:13px;font-weight:700;cursor:${v.ch.btnCursor};white-space:nowrap`)} className={fx("filter:brightness(1.08)", "transform:scale(.97)")}>
                {v.ch.btnLabel}
              </button>
            </div>
          </div>
        </div>
      </>
    ) : null}
    {" "}
    {DESK && v.se.open ? (
      <>
        <div onClick={v.se.close} style={st("position:fixed;inset:0;z-index:80;background:rgba(10,10,15,.55);backdrop-filter:blur(3px);display:grid;place-items:center;padding:20px")}>
          <div role="dialog" aria-modal="true" aria-labelledby="se-title" onClick={v.stop} style={st("inline-size:min(440px,100%);max-block-size:90vh;overflow:auto;background:var(--surface);border:1px solid var(--border-strong);border-radius:16px;box-shadow:var(--shadow-lift);animation:wh-pop .18s ease-out")}>
            <div style={st("padding:16px 18px;border-block-end:1px solid var(--border);display:flex;align-items:center;gap:10px")}>
              <span data-icon="wallet" style={st("display:inline-flex;inline-size:17px;block-size:17px;color:var(--fg-muted)")}><Icon name={"wallet"} /></span>
              {" "}
              <div id="se-title" style={st("font-size:15.5px;font-weight:800")}>
                {v.se.title}
              </div>
              {" "}
              <button onClick={v.se.close} aria-label={tr("Close")} style={st("margin-inline-start:auto;inline-size:29px;block-size:29px;border:1px solid var(--border-strong);border-radius:8px;background:var(--surface-2);display:grid;place-items:center;cursor:pointer")}>
                <span data-icon="x" style={st("display:inline-flex;inline-size:14px;block-size:14px")}><Icon name={"x"} /></span>
              </button>
            </div>
            {" "}
            <div style={st("padding:16px 18px")}>
              <div style={st("display:flex;align-items:baseline;justify-content:space-between;gap:10px;padding:12px 13px;border-radius:11px;background:var(--surface-2);border:1px solid var(--border)")}>
                <span style={st("font-size:12.5px;color:var(--fg-muted);font-weight:600")}>
                  {v.se.balanceLabel}
                </span>
                {" "}
                <span style={st("font-family:var(--mono);font-size:17px;font-weight:700")}>
                  {v.se.balance}
                </span>
              </div>
              {" "}
              <div id="se-how" style={st("font-size:12px;font-weight:700;color:var(--fg-muted);margin:15px 0 7px")}>
                {v.se.back ? tr("How did it go back?") : tr("How did they pay?")}
              </div>
              {" "}
              <div role="group" aria-labelledby="se-how" style={st("display:flex;gap:7px;flex-wrap:wrap")}>
                {(v.se.methods ?? []).map((m: any, i_m: number) => (
                  <Fragment key={i_m}>
                    <button onClick={m.pick} aria-pressed={m.pressed} style={st(`flex:1;min-inline-size:88px;padding:10px;border:1px solid ${m.border};border-radius:10px;background:${m.bg};color:${m.fg};font-size:12.5px;font-weight:700;cursor:pointer`)}>
                      {m.label}
                    </button>
                  </Fragment>
                ))}
              </div>
              {" "}
              <div style={st("display:flex;flex-direction:column;gap:6px;margin-block-start:15px")}>
                <label htmlFor="se-amt" style={st("font-size:12px;font-weight:700;color:var(--fg-muted)")}>
                  {tr("How much")}
                </label>
                {" "}
                <input id="se-amt" inputMode="decimal" value={v.se.amount ?? ""} onChange={v.se.onAmount} aria-invalid={v.se.inv} aria-describedby="se-err" style={st(`padding:11px 12px;border:1px solid ${v.se.inputBorder};border-radius:10px;background:var(--surface-2);font-family:var(--mono);font-size:15px;font-weight:600`)} />
              </div>
              {" "}
              <div style={st("display:flex;gap:7px;margin-block-start:9px;flex-wrap:wrap")}>
                {(v.se.quick ?? []).map((q: any, i_q: number) => (
                  <Fragment key={i_q}>
                    <button onClick={q.use} style={st("padding:6px 11px;border:1px solid var(--border-strong);border-radius:999px;background:var(--surface-2);font-family:var(--mono);font-size:11.5px;font-weight:700;color:var(--fg-muted);cursor:pointer")} className={fx("background:var(--surface-3)", null)}>
                      {q.label}
                    </button>
                  </Fragment>
                ))}
              </div>
              {" "}
              {v.se.errOn ? (
                <>
                  <div id="se-err" role="alert" style={st("display:flex;align-items:flex-start;gap:8px;margin-block-start:10px;font-size:12.5px;font-weight:700;line-height:1.5;color:var(--danger)")}>
                    <span data-icon="circle-alert" style={st("display:inline-flex;inline-size:14px;block-size:14px;flex:0 0 auto;margin-block-start:2px")}><Icon name={"circle-alert"} /></span>
                    {v.se.err}
                  </div>
                </>
              ) : null}
              {" "}
              <div style={st("display:flex;flex-direction:column;gap:6px;margin-block-start:15px")}>
                <label htmlFor="se-ref" style={st("font-size:12px;font-weight:700;color:var(--fg-muted)")}>
                  {tr("Reference (for a transfer)")}{" "}
                  <span style={st("font-weight:600;color:var(--fg-subtle)")}>
                    {tr("optional")}
                  </span>
                </label>
                {" "}
                <input id="se-ref" value={v.se.refNo ?? ""} onChange={v.se.onRefNo} placeholder={tr("From the bank statement")} style={st("padding:10px 12px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-2);font-family:var(--mono);font-size:13px")} />
              </div>
              {v.se.back ? (
                <div style={st("display:flex;flex-direction:column;gap:6px;margin-block-start:15px")}>
                  <label htmlFor="se-note" style={st("font-size:12px;font-weight:700;color:var(--fg-muted)")}>
                    {tr("Why it goes back")}
                  </label>
                  <input id="se-note" value={v.se.note ?? ""} onChange={v.se.onNote} placeholder={tr("They paid ahead and did not come")} aria-invalid={v.se.noteInv} aria-describedby="se-note-err" style={st(`padding:10px 12px;border:1px solid ${v.se.noteBorder};border-radius:10px;background:var(--surface-2);font-size:13px`)} />
                  {v.se.noteErrOn ? (
                    <span id="se-note-err" style={st("font-size:12px;font-weight:700;color:var(--danger)")}>
                      {v.se.noteErr}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
            {" "}
            <div style={st("padding:14px 18px;border-block-start:1px solid var(--border);background:var(--surface-2);display:flex;align-items:center;gap:12px")}>
              <div style={st("font-size:12px;line-height:1.5;color:var(--fg-subtle);flex:1")}>
                {v.se.foot}
              </div>
              {" "}
              <button onClick={v.se.confirm} disabled={v.se.busy} style={st(`padding:12px 18px;border:0;border-radius:10px;background:${v.se.btnBg};color:${v.se.btnFg};font-size:13.5px;font-weight:700;cursor:${v.se.btnCursor};white-space:nowrap`)} className={fx("filter:brightness(1.08)", "transform:scale(.97)")}>
                {v.se.btnLabel}
              </button>
            </div>
          </div>
        </div>
      </>
    ) : null}
    {" "}
    {DESK && v.ex.open ? (
      <>
        <div onClick={v.ex.close} style={st("position:fixed;inset:0;z-index:80;background:rgba(10,10,15,.55);backdrop-filter:blur(3px);display:grid;place-items:center;padding:20px")}>
          <div role="dialog" aria-modal="true" aria-labelledby="ex-title" aria-describedby="ex-body" onClick={v.stop} style={st("inline-size:min(440px,100%);max-block-size:90vh;overflow:auto;background:var(--surface);border:1px solid var(--border-strong);border-radius:16px;box-shadow:var(--shadow-lift);animation:wh-pop .18s ease-out;padding:20px")}>
            <div style={st("display:flex;align-items:center;gap:10px")}>
              <span style={st("inline-size:34px;block-size:34px;border-radius:9px;background:var(--info-soft);color:var(--info);display:grid;place-items:center;flex:0 0 auto")}>
                <span data-icon="clock" style={st("display:inline-flex;inline-size:17px;block-size:17px")}><Icon name={"clock"} /></span>
              </span>
              {" "}
              <div>
                <div id="ex-title" style={st("font-size:16px;font-weight:800")}>
                  {v.ex.title}
                </div>
                <div style={st("font-family:var(--mono);font-size:11.5px;color:var(--fg-subtle);margin-block-start:2px")}>
                  {v.ex.sub}
                </div>
              </div>
            </div>
            {" "}
            <p id="ex-body" style={st("margin:13px 0 0;font-size:13.5px;line-height:1.6;color:var(--fg-muted);text-wrap:pretty")}>
              {v.ex.body}
            </p>
            {" "}
            <div role="radiogroup" aria-labelledby="ex-title" style={st("display:flex;flex-direction:column;gap:8px;margin-block-start:14px")}>
              {(v.ex.days ?? []).map((m: any, i_m: number) => (
                <Fragment key={i_m}>
                  <button role="radio" aria-checked={m.checked} onClick={m.pick} style={st(`display:flex;align-items:center;gap:11px;padding:11px 14px;border:1px solid ${m.border};border-radius:12px;background:${m.bg};cursor:pointer;text-align:start`)}>
                    <span style={st("inline-size:18px;block-size:18px;border-radius:999px;border:2px solid var(--border-strong);flex:0 0 auto;display:grid;place-items:center")}>
                      <span style={st(`inline-size:8px;block-size:8px;border-radius:999px;background:${m.dot}`)}></span>
                    </span>
                    <span style={st("font-family:var(--mono);font-size:13px;font-weight:700")}>
                      {m.label}
                    </span>
                  </button>
                </Fragment>
              ))}
            </div>
            {" "}
            <div style={st("display:flex;gap:9px;margin-block-start:18px;flex-wrap:wrap")}>
              <button onClick={v.ex.confirm} disabled={v.ex.cant} style={st(`flex:1;min-inline-size:150px;padding:12px;border:0;border-radius:10px;background:${v.ex.btnBg};color:${v.ex.btnFg};font-size:13.5px;font-weight:700;cursor:${v.ex.btnCursor}`)} className={fx("filter:brightness(1.08)", "transform:scale(.97)")}>
                {v.ex.btnLabel}
              </button>
              {" "}
              <button data-autofocus="true" onClick={v.ex.close} style={st("flex:1;min-inline-size:130px;padding:12px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-2);font-size:13.5px;font-weight:700;cursor:pointer")} className={fx("background:var(--surface-3)", null)}>
                {tr("Keep it as it is")}
              </button>
            </div>
            {v.ex.clearOn ? (
              <button onClick={v.ex.clear} style={st("margin-block-start:12px;padding:0;border:0;background:transparent;color:var(--accent);font-size:12.5px;font-weight:700;cursor:pointer;text-decoration:underline")}>
                {tr("They are coming on the day booked after all")}
              </button>
            ) : null}
          </div>
        </div>
      </>
    ) : null}
    {" "}
    {DESK && v.vd.open ? (
      <>
        <div onClick={v.vd.close} style={st("position:fixed;inset:0;z-index:82;background:rgba(10,10,15,.55);backdrop-filter:blur(3px);display:grid;place-items:center;padding:20px")}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="vd-title" onClick={v.stop} style={st("inline-size:min(440px,100%);background:var(--surface);border:1px solid var(--border-strong);border-radius:16px;box-shadow:var(--shadow-lift);animation:wh-pop .18s ease-out;padding:20px")}>
            <div style={st("display:flex;align-items:center;gap:10px")}>
              <span style={st("inline-size:34px;block-size:34px;border-radius:9px;background:var(--danger-soft);color:var(--danger);display:grid;place-items:center;flex:0 0 auto")}>
                <span data-icon="ban" style={st("display:inline-flex;inline-size:17px;block-size:17px")}><Icon name={"ban"} /></span>
              </span>
              {" "}
              <div id="vd-title" style={st("font-size:16px;font-weight:800")}>
                {v.vd.title}
              </div>
            </div>
            {" "}
            <p style={st("margin:13px 0 0;font-size:13.5px;line-height:1.6;color:var(--fg-muted);text-wrap:pretty")}>
              {v.vd.body}
            </p>
            {" "}
            {v.vd.refused ? (
              <>
                <div role="alert" style={st("display:flex;align-items:flex-start;gap:8px;margin-block-start:13px;padding:12px 13px;border-radius:11px;background:var(--warn-soft);color:var(--warn);font-size:12.5px;font-weight:700;line-height:1.55")}>
                  <span data-icon="triangle-alert" style={st("display:inline-flex;inline-size:14px;block-size:14px;flex:0 0 auto;margin-block-start:2px")}><Icon name={"triangle-alert"} /></span>
                  {v.vd.refusedLine}
                </div>
              </>
            ) : null}
            {" "}
            <div style={st("display:flex;flex-direction:column;gap:6px;margin-block-start:14px")}>
              <label htmlFor="vd-reason" style={st("font-size:12px;font-weight:700;color:var(--fg-muted)")}>
                {tr("Why")}
              </label>
              {" "}
              <input id="vd-reason" value={v.vd.reason ?? ""} onChange={v.vd.onReason} placeholder={tr("Put on the wrong room")} aria-invalid={v.vd.inv} aria-describedby="vd-err" style={st(`padding:10px 12px;border:1px solid ${v.vd.border};border-radius:10px;background:var(--surface-2);font-size:13px`)} />
              {" "}
              {v.vd.errOn ? (
                <>
                  <span id="vd-err" style={st("font-size:12px;font-weight:700;color:var(--danger)")}>
                    {v.vd.err}
                  </span>
                </>
              ) : null}
            </div>
            {" "}
            <div style={st("display:flex;gap:9px;margin-block-start:18px;flex-wrap:wrap")}>
              <button onClick={v.vd.confirm} disabled={v.vd.refused} style={st(`flex:1;min-inline-size:130px;padding:12px;border:0;border-radius:10px;background:${v.vd.btnBg};color:${v.vd.btnFg};font-size:13.5px;font-weight:700;cursor:${v.vd.btnCursor}`)} className={fx("filter:brightness(1.08)", "transform:scale(.97)")}>
                {tr("Void it")}
              </button>
              {" "}
              <button data-autofocus="true" onClick={v.vd.close} style={st("flex:1;min-inline-size:130px;padding:12px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-2);font-size:13.5px;font-weight:700;cursor:pointer")} className={fx("background:var(--surface-3)", null)}>
                {tr("Keep it")}
              </button>
            </div>
          </div>
        </div>
      </>
    ) : null}
    {" "}
    {DESK && v.mv.open ? (
      <>
        <div onClick={v.mv.close} style={st("position:fixed;inset:0;z-index:80;background:rgba(10,10,15,.55);backdrop-filter:blur(3px);display:grid;place-items:center;padding:20px")}>
          <div role="dialog" aria-modal="true" aria-labelledby="mv-title" onClick={v.stop} style={st("inline-size:min(460px,100%);max-block-size:88vh;overflow:auto;background:var(--surface);border:1px solid var(--border-strong);border-radius:16px;box-shadow:var(--shadow-lift);animation:wh-pop .18s ease-out")}>
            <div style={st("padding:16px 18px;border-block-end:1px solid var(--border);display:flex;align-items:flex-start;gap:10px")}>
              <span data-icon="arrow-left-right" style={st("display:inline-flex;inline-size:17px;block-size:17px;color:var(--fg-muted);margin-block-start:2px")}><Icon name={"arrow-left-right"} /></span>
              {" "}
              <div style={st("min-inline-size:0;flex:1")}>
                <div id="mv-title" style={st("font-size:15.5px;font-weight:800")}>
                  {v.mv.title}
                </div>
                {" "}
                <div style={st("font-family:var(--mono);font-size:11.5px;color:var(--fg-subtle);margin-block-start:3px")}>
                  {v.mv.sub}
                </div>
              </div>
              {" "}
              <button onClick={v.mv.close} aria-label={tr("Close")} style={st("inline-size:29px;block-size:29px;border:1px solid var(--border-strong);border-radius:8px;background:var(--surface-2);display:grid;place-items:center;cursor:pointer;flex:0 0 auto")}>
                <span data-icon="x" style={st("display:inline-flex;inline-size:14px;block-size:14px")}><Icon name={"x"} /></span>
              </button>
            </div>
            {" "}
            <div style={st("padding:16px 18px")}>
              {v.mv.hasRooms ? (
                <>
                  {v.mv.hasUps ? (
                    <>
                      <div role="radiogroup" aria-label={tr("A better room at the booked price")} style={st("display:flex;flex-direction:column;gap:8px;margin-block-end:12px")}>
                        {(v.mv.ups ?? []).map((u: any, i_u: number) => (
                          <Fragment key={i_u}>
                            <button role="radio" aria-checked={u.checked} onClick={u.pick} style={st(`display:flex;align-items:center;gap:13px;padding:12px 13px;border:1px solid ${u.border};border-radius:12px;background:${u.bg};cursor:pointer;text-align:start`)}>
                              <span style={st(`inline-size:20px;block-size:20px;border-radius:999px;border:2px solid ${u.dotBorder};flex:0 0 auto;display:grid;place-items:center`)}>
                                <span style={st(`inline-size:8px;block-size:8px;border-radius:999px;background:${u.dotInner}`)}></span>
                              </span>
                              {" "}
                              <span style={st("flex:1;min-inline-size:0")}>
                                <span style={st("display:block;font-size:13px;font-weight:700")}>
                                  {u.label}
                                </span>
                                {" "}
                                <span style={st("display:block;font-family:var(--mono);font-size:11.5px;color:var(--fg-subtle);margin-block-start:2px")}>
                                  {u.sub}
                                </span>
                              </span>
                            </button>
                          </Fragment>
                        ))}
                        {" "}
                        <p style={st("margin:0;font-size:12px;color:var(--fg-subtle)")}>
                          {v.mv.upNote}
                        </p>
                      </div>
                    </>
                  ) : null}
                  {" "}
                  <div role="radiogroup" aria-label={tr("Rooms open for the rest of the stay")} style={st("display:flex;flex-direction:column;gap:8px")}>
                    {(v.mv.rooms ?? []).map((r: any, i_r: number) => (
                      <Fragment key={i_r}>
                        <button role="radio" aria-checked={r.checked} onClick={r.pick} style={st(`display:flex;align-items:center;gap:13px;padding:12px 13px;border:1px solid ${r.border};border-radius:12px;background:${r.bg};cursor:pointer;text-align:start`)}>
                          <span style={st(`inline-size:20px;block-size:20px;border-radius:999px;border:2px solid ${r.dotBorder};flex:0 0 auto;display:grid;place-items:center`)}>
                            <span style={st(`inline-size:8px;block-size:8px;border-radius:999px;background:${r.dotInner}`)}></span>
                          </span>
                          {" "}
                          <span style={st("font-family:var(--mono);font-size:17px;font-weight:700;min-inline-size:44px")}>
                            {r.n}
                          </span>
                          {" "}
                          <span style={st("flex:1;min-inline-size:0")}>
                            <span style={st("display:block;font-size:12.5px;color:var(--fg-muted);font-weight:600")}>
                              {r.floor}
                            </span>
                            {" "}
                            {r.hasNote ? (
                              <>
                                <span style={st("display:block;font-size:12px;color:var(--fg-subtle);margin-block-start:2px")}>
                                  {r.note}
                                </span>
                              </>
                            ) : null}
                          </span>
                        </button>
                      </Fragment>
                    ))}
                  </div>
                </>
              ) : null}
              {" "}
              {v.mv.noRooms ? (
                <>
                  <div style={st("padding:14px;border-radius:11px;background:var(--surface-2);border:1px solid var(--border);font-size:13px;color:var(--fg-muted)")}>
                    {v.mv.noRoomsText}
                  </div>
                </>
              ) : null}
            </div>
            {" "}
            <div style={st("padding:14px 18px;border-block-start:1px solid var(--border);background:var(--surface-2);display:flex;align-items:center;gap:12px")}>
              <div style={st("font-size:12px;line-height:1.5;color:var(--fg-subtle);flex:1")}>
                {v.mv.foot}
              </div>
              {" "}
              <button onClick={v.mv.confirm} disabled={v.mv.cant} style={st(`padding:11px 17px;border:0;border-radius:10px;background:${v.mv.btnBg};color:${v.mv.btnFg};font-size:13px;font-weight:700;cursor:${v.mv.btnCursor};white-space:nowrap`)} className={fx("filter:brightness(1.08)", null)}>
                {v.mv.btnLabel}
              </button>
            </div>
          </div>
        </div>
      </>
    ) : null}
    </>
  );
}
