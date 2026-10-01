// Drawn from the Wren House design (its template ported to JSX): the layout, as drawn.
// Every value comes from the screens' values bag `v` (../app/vals/*.ts).
import { Fragment } from "react";

import { tr } from "../i18n/tr.ts";
import { fx, Icon, st, trx } from "./dom.tsx";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DeskView({ v }: { v: any }) {
  return (
    <>
    {v.isDesk ? (
      <>
        <div style={st("display:flex;flex:1;min-block-size:0")}>
          {v.showSidebar ? (
            <>
              <aside style={st("inline-size:242px;flex:0 0 242px;background:var(--surface);border-inline-end:1px solid var(--border);display:flex;flex-direction:column;position:sticky;inset-block-start:0;block-size:100vh")}>
                <div style={st("padding:19px 16px 14px;display:flex;align-items:center;gap:10px")}>
                  <span style={st("inline-size:30px;block-size:30px;border-radius:9px;display:grid;place-items:center;background:radial-gradient(110% 85% at 20% 10%, rgba(255,255,255,.24), rgba(255,255,255,0) 60%), linear-gradient(140deg,#25415c,#3a6d92 48%,#4a7a5c);color:rgba(255,255,255,.94)")}>
                    <span data-icon="bird" style={st("display:inline-flex;inline-size:16px;block-size:16px")}><Icon name={"bird"} /></span>
                  </span>
                  {" "}
                  <div>
                    <div style={st("font-size:14.5px;font-weight:800;letter-spacing:-.01em")}>
                      {v.houseName}
                    </div>
                    {" "}
                    <div style={st("font-size:11px;color:var(--fg-subtle);margin-block-start:1px")}>
                      {tr("Front desk")}
                    </div>
                  </div>
                </div>
                {" "}
                <nav style={st("display:flex;flex-direction:column;gap:3px;padding:6px 10px")}>
                  {(v.deskNav ?? []).map((n: any, i_n: number) => (
                    <Fragment key={i_n}>
                      <button onClick={n.go} aria-current={n.current} style={st(`display:flex;align-items:center;gap:10px;padding:10px 11px;border:0;border-radius:9px;background:${n.bg};color:${n.fg};font-size:13.5px;font-weight:${n.weight};cursor:pointer;text-align:start;transition:background .14s`)}>
                        <span data-icon={n.icon} style={st("display:inline-flex;inline-size:17px;block-size:17px")}><Icon name={n.icon} /></span>
                        {n.label}{" "}
                        {n.hasCount ? (
                          <>
                            <span style={st(`margin-inline-start:auto;font-family:var(--mono);font-size:11px;font-weight:600;color:${n.countFg}`)}>
                              {n.count}
                            </span>
                          </>
                        ) : null}
                      </button>
                    </Fragment>
                  ))}
                </nav>
                {" "}
                <div style={st("margin-block-start:auto;padding:14px 14px 16px;border-block-start:1px solid var(--border)")}>
                  <div style={st("font-family:var(--mono);font-size:11px;color:var(--fg-subtle);line-height:1.6")}>
                    {v.clockShort}
                    <br />
                    {tr("Arrivals from {from} · out by {by}", { from: v.arriveFrom, by: v.leaveBy })}
                  </div>
                </div>
              </aside>
            </>
          ) : null}
          {" "}
          <div style={st("flex:1;min-inline-size:0;display:flex;flex-direction:column")}>
            <div style={st("position:sticky;inset-block-start:0;z-index:25;background:var(--surface);border-block-end:1px solid var(--border);padding:11px 20px;display:flex;align-items:center;gap:12px")}>
              {v.isNarrow ? (
                <>
                  <button onClick={v.openNav} aria-label={tr("Open the desk menu")} style={st("inline-size:34px;block-size:34px;display:grid;place-items:center;border:1px solid var(--border-strong);border-radius:9px;background:var(--surface-2);cursor:pointer;flex:0 0 auto")}>
                    <span data-icon="menu" style={st("display:inline-flex;inline-size:17px;block-size:17px")}><Icon name={"menu"} /></span>
                  </button>
                </>
              ) : null}
              {" "}
              <div style={st("position:relative;flex:1;max-inline-size:420px;min-inline-size:0")}>
                {v.canSearch ? (
                  <>
                    <span data-icon="search" style={st("position:absolute;inset-inline-start:11px;inset-block-start:50%;transform:translateY(-50%);inline-size:15px;block-size:15px;color:var(--fg-subtle);display:inline-flex")}><Icon name={"search"} /></span>
                    {" "}
                    <input value={v.deskQuery ?? ""} onChange={v.onDeskQuery} onKeyDown={v.onDeskQueryKey} placeholder={tr("Name, reference or email")} aria-label={tr("Search by name, reference or email")} style={st("inline-size:100%;padding-block:9px;padding-inline:34px 12px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-2);font-size:13.5px")} />
                    {" "}
                    {v.hasResults ? (
                      <>
                        <div style={st("position:absolute;inset-block-start:calc(100% + 6px);inset-inline:0;background:var(--surface);border:1px solid var(--border-strong);border-radius:12px;box-shadow:var(--shadow-lift);padding:6px;z-index:40;max-block-size:380px;overflow:auto;animation:wh-pop .14s ease-out")}>
                          {(v.searchHits ?? []).map((h: any, i_h: number) => (
                            <Fragment key={i_h}>
                              <button onClick={h.go} style={st("inline-size:100%;display:flex;align-items:center;gap:10px;padding:9px 10px;border:0;border-radius:9px;background:transparent;cursor:pointer;text-align:start")} className={fx("background:var(--surface-3)", null)}>
                                <span style={st(`inline-size:26px;block-size:26px;border-radius:7px;background:${h.tint};flex:0 0 auto`)}></span>
                                {" "}
                                <span style={st("min-inline-size:0;flex:1")}>
                                  <span style={st("display:block;font-size:13px;font-weight:700")}>
                                    {h.name}
                                  </span>
                                  {" "}
                                  <span style={st("display:block;font-family:var(--mono);font-size:11px;color:var(--fg-subtle)")}>
                                    {h.sub}
                                  </span>
                                </span>
                                {" "}
                                <span style={st(`font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;background:${h.pillBg};color:${h.pillFg};white-space:nowrap`)}>
                                  {h.pill}
                                </span>
                              </button>
                            </Fragment>
                          ))}
                          {" "}
                          <button onClick={v.seeAll} style={st("inline-size:100%;margin-block-start:4px;padding:10px;border:0;border-block-start:1px solid var(--border);background:transparent;color:var(--accent);font-size:12.5px;font-weight:700;cursor:pointer;text-align:start")} className={fx("background:var(--surface-2)", null)}>
                            {v.hitsMore}
                          </button>
                        </div>
                      </>
                    ) : null}
                    {" "}
                    {v.noResults ? (
                      <>
                        <div role="status" style={st("position:absolute;inset-block-start:calc(100% + 6px);inset-inline:0;background:var(--surface);border:1px solid var(--border-strong);border-radius:12px;box-shadow:var(--shadow-lift);padding:14px;z-index:40;font-size:13px;color:var(--fg-muted);animation:wh-pop .14s ease-out")}>
                          {v.refExample ? trx("Nobody by that name, reference or email. Try a surname, or {ref}.", { ref: <span style={st("font-family:var(--mono)")}>{v.refExample}</span> }) : tr("Nobody by that name, reference or email. Try a surname.")}
                        </div>
                      </>
                    ) : null}
                  </>
                ) : null}
              </div>
              {" "}
              <button onClick={v.toggleTheme} aria-label={tr("Switch between light and dark")} title={v.themeTitle} style={st("margin-inline-start:auto;inline-size:33px;block-size:33px;display:grid;place-items:center;border:1px solid var(--border-strong);border-radius:9px;background:var(--surface-2);cursor:pointer;color:var(--fg-muted);flex:0 0 auto")} className={fx(null, "transform:scale(.97)")}>
                <span data-icon={v.themeIcon} style={st("display:inline-flex;inline-size:16px;block-size:16px")}><Icon name={v.themeIcon} /></span>
              </button>
              {" "}
              <div style={st("position:relative;flex:0 0 auto")}>
                <button onClick={v.toggleStaff} aria-haspopup="menu" aria-expanded={v.staffExpanded} aria-label={tr("Signed in as {name}", { name: v.staffName })} style={st("display:flex;align-items:center;gap:9px;padding-block:5px;padding-inline:6px 10px;border:1px solid var(--border);border-radius:999px;background:var(--surface-2);cursor:pointer")} className={fx("background:var(--surface-3)", null)}>
                  <span style={st("inline-size:25px;block-size:25px;border-radius:999px;background:var(--accent);color:var(--accent-fg);display:grid;place-items:center;font-size:10.5px;font-weight:800")}>
                    {v.staffIni}
                  </span>
                  {" "}
                  {v.isWide ? (
                    <>
                      <span style={st("font-size:12.5px;font-weight:700")}>
                        {v.staffName}
                      </span>
                    </>
                  ) : null}
                  {" "}
                  <span data-icon="chevron-down" style={st("display:inline-flex;inline-size:13px;block-size:13px;color:var(--fg-subtle)")}><Icon name={"chevron-down"} /></span>
                </button>
                {" "}
                {v.staffMenu ? (
                  <>
                    <div role="menu" style={st("position:absolute;inset-block-start:calc(100% + 6px);inset-inline-end:0;inline-size:220px;padding:5px;border-radius:12px;background:var(--surface);border:1px solid var(--border-strong);box-shadow:var(--shadow-lift);z-index:45;animation:wh-pop .14s ease-out")}>
                      <div style={st("padding:9px 10px 10px;border-block-end:1px solid var(--border);margin-block-end:4px")}>
                        <div style={st("font-size:13.5px;font-weight:800")}>
                          {v.staffName}
                        </div>
                        {" "}
                        <div style={st("font-size:12px;color:var(--fg-subtle);margin-block-start:2px")}>
                          {v.staffRole}
                        </div>
                      </div>
                      {" "}
                      <button role="menuitem" onClick={v.signOutStaff} style={st("inline-size:100%;display:flex;align-items:center;gap:8px;padding:9px 10px;border:0;border-radius:8px;background:transparent;font-size:13px;font-weight:600;cursor:pointer;text-align:start")} className={fx("background:var(--surface-3)", null)}>
                        <span data-icon="log-out" style={st("display:inline-flex;inline-size:14px;block-size:14px;color:var(--fg-subtle)")}><Icon name={"log-out"} /></span>
                        {tr("Sign out")}
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
            {" "}
            <main style={st(`flex:1;padding:${v.deskPad}`)}>
              {v.reconnecting ? (
                <>
                  <div role="status" style={st("margin-block-end:12px;padding:9px 13px;border:1px solid var(--warn);border-radius:10px;background:var(--warn-soft);color:var(--fg);font-size:12.5px")}>
                    {tr("Reconnecting — the board may be a moment behind.")}
                  </div>
                </>
              ) : null}
              {v.loading ? (
                <>
                  <div style={st("display:flex;flex-direction:column;gap:16px")}>
                    <div style={st("block-size:26px;inline-size:min(240px,55%);border-radius:8px;background:linear-gradient(90deg,var(--surface-3),var(--surface-2),var(--surface-3));background-size:200% 100%;animation:wh-shimmer 1.15s linear infinite")}></div>
                    {" "}
                    <div style={st("block-size:64px;border-radius:13px;background:linear-gradient(90deg,var(--surface-3),var(--surface-2),var(--surface-3));background-size:200% 100%;animation:wh-shimmer 1.15s linear infinite")}></div>
                    {" "}
                    <div style={st("display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:14px")}>
                      <div style={st("block-size:280px;border-radius:14px;background:linear-gradient(90deg,var(--surface-3),var(--surface-2),var(--surface-3));background-size:200% 100%;animation:wh-shimmer 1.15s linear infinite")}></div>
                      {" "}
                      <div style={st("block-size:280px;border-radius:14px;background:linear-gradient(90deg,var(--surface-3),var(--surface-2),var(--surface-3));background-size:200% 100%;animation:wh-shimmer 1.15s linear infinite")}></div>
                      {" "}
                      <div style={st("block-size:280px;border-radius:14px;background:linear-gradient(90deg,var(--surface-3),var(--surface-2),var(--surface-3));background-size:200% 100%;animation:wh-shimmer 1.15s linear infinite")}></div>
                    </div>
                  </div>
                </>
              ) : null}
              {" "}
              {v.loadError ? (
                <>
                  <div role="alert" style={st("display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:14px 16px;border-radius:12px;background:var(--warn-soft);color:var(--warn);font-size:13.5px;font-weight:700;line-height:1.5")}>
                    <span data-icon="wifi-off" style={st("display:inline-flex;inline-size:17px;block-size:17px;flex:0 0 auto")}><Icon name={"wifi-off"} /></span>
                    {" "}
                    <span style={st("flex:1;min-inline-size:200px")}>
                      {tr("We could not reach the house just now.")}
                    </span>
                    {" "}
                    <button onClick={v.retryLoad} style={st("padding:8px 14px;border:1px solid var(--warn);border-radius:9px;background:transparent;color:var(--warn);font-size:12.5px;font-weight:700;cursor:pointer")} className={fx("background:var(--surface)", null)}>
                      {tr("Try again")}
                    </button>
                  </div>
                </>
              ) : null}
              {" "}
              {v.showToday ? (
                <>
                  <section style={st("animation:wh-fade .22s ease-out")}>
                    <div style={st("display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap")}>
                      <div>
                        <h1 style={st(`margin:0;font-size:${v.h1Size};font-weight:800;letter-spacing:-.02em`)}>
                          {tr("Today")}
                        </h1>
                        {" "}
                        <div style={st("margin-block-start:5px;font-size:13.5px;color:var(--fg-muted)")}>
                          {v.clockLong}
                        </div>
                      </div>
                      {" "}
                      {v.pastCheckout ? (
                        <>
                          <span style={st("display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:700;padding:7px 12px;border-radius:999px;background:var(--warn-soft);color:var(--warn)")}>
                            <span data-icon="clock" style={st("display:inline-flex;inline-size:14px;block-size:14px")}><Icon name={"clock"} /></span>
                            {v.pastLine}
                          </span>
                        </>
                      ) : null}
                    </div>
                    {" "}
                    <div style={st("display:flex;flex-wrap:wrap;gap:9px;margin-block-start:16px")}>
                      {(v.kpis ?? []).map((k: any, i_k: number) => (
                        <Fragment key={i_k}>
                          <div style={st("flex:1 1 150px;min-inline-size:150px;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px 14px")}>
                            <div style={st("font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--fg-subtle)")}>
                              {k.label}
                            </div>
                            {" "}
                            <div style={st(`font-family:var(--mono);font-size:21px;font-weight:700;letter-spacing:-.02em;margin-block-start:5px;color:${k.fg}`)}>
                              {k.value}
                            </div>
                            {" "}
                            <div style={st("font-size:11.5px;color:var(--fg-subtle);margin-block-start:2px")}>
                              {k.sub}
                            </div>
                          </div>
                        </Fragment>
                      ))}
                    </div>
                    {" "}
                    <div style={st("display:flex;gap:9px;flex-wrap:wrap;margin-block-start:10px;align-items:stretch")}>
                      <div style={st("flex:1 1 440px;min-inline-size:0;display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:11px 15px;background:var(--surface-2);border:1px solid var(--border);border-radius:12px")}>
                        <span style={st("font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--fg-subtle)")}>
                          {tr("Tomorrow")}
                        </span>
                        {" "}
                        <span style={st("font-size:12.5px;font-weight:600;color:var(--fg-muted)")}>
                          {v.tomorrow.label}
                        </span>
                        {" "}
                        <span style={st("font-size:12.5px;color:var(--fg-subtle)")}>
                          {trx("in {n}", { n: <span style={st("font-family:var(--mono);font-weight:700;color:var(--fg)")}>{v.tomorrow.arrivals}</span> })}
                        </span>
                        {" "}
                        <span style={st("font-size:12.5px;color:var(--fg-subtle)")}>
                          {trx("out {n}", { n: <span style={st("font-family:var(--mono);font-weight:700;color:var(--fg)")}>{v.tomorrow.departures}</span> })}
                        </span>
                        {" "}
                        <span style={st("font-size:12.5px;color:var(--fg-subtle)")}>
                          {trx("still open {n}", { n: <span style={st("font-family:var(--mono);font-weight:700;color:var(--fg)")}>{v.tomorrow.open}</span> })}
                        </span>
                        {" "}
                        <span style={st("font-size:12.5px;color:var(--fg-subtle)")}>
                          {trx("that is {pct} full", { pct: <span style={st("font-family:var(--mono);font-weight:700;color:var(--fg)")}>{v.tomorrow.pct}</span> })}
                        </span>
                        {" "}
                        <button onClick={v.tomorrow.goCal} style={st("margin-inline-start:auto;display:flex;align-items:center;gap:6px;padding:6px 12px;border:1px solid var(--border-strong);border-radius:9px;background:var(--surface);font-size:12px;font-weight:700;color:var(--fg-muted);cursor:pointer;white-space:nowrap")} className={fx("filter:brightness(.97)", null)}>
                          <span data-icon="calendar-days" style={st("display:inline-flex;inline-size:13px;block-size:13px")}><Icon name={"calendar-days"} /></span>
                          {tr("The next 14 nights")}
                        </button>
                      </div>
                      {" "}
                      <div style={st("flex:0 0 auto;display:flex;align-items:center;gap:9px;padding:11px 15px;background:var(--surface-2);border:1px solid var(--border);border-radius:12px")}>
                        <span data-icon="car" style={st("display:inline-flex;inline-size:15px;block-size:15px;color:var(--fg-subtle)")}><Icon name={"car"} /></span>
                        {" "}
                        <span style={st("font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--fg-subtle)")}>
                          {tr("Parking tonight")}
                        </span>
                        {" "}
                        <span style={st("font-family:var(--mono);font-size:12.5px;font-weight:700;padding:3px 9px;border-radius:8px;background:var(--surface);border:1px solid var(--border)")}>
                          {v.parkingTonight}
                        </span>
                      </div>
                    </div>
                    {" "}
                    <div style={st(`display:grid;grid-template-columns:${v.boardCols};gap:14px;margin-block-start:18px;align-items:start`)}>
                      {(v.columns ?? []).map((c: any, i_c: number) => (
                        <Fragment key={i_c}>
                          <div style={st("background:var(--surface-2);border:1px solid var(--border);border-radius:14px;padding:12px")}>
                            <div style={st("display:flex;align-items:center;gap:9px;padding:2px 4px 12px")}>
                              <span style={st(`inline-size:8px;block-size:8px;border-radius:999px;background:${c.dot}`)}></span>
                              {" "}
                              <span style={st("font-size:11.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--fg-muted)")}>
                                {c.title}
                              </span>
                              {" "}
                              <span style={st("margin-inline-start:auto;font-family:var(--mono);font-size:12px;font-weight:700;color:var(--fg-subtle)")}>
                                {c.count}
                              </span>
                            </div>
                            {" "}
                            <div style={st("display:flex;flex-direction:column;gap:9px")}>
                              {(c.cards ?? []).map((d: any, i_d: number) => (
                                <Fragment key={i_d}>
                                  <article style={st(`background:var(--surface);border:1px solid var(--border-strong);border-radius:12px;padding:13px;opacity:${d.opacity};transition:transform .16s,box-shadow .16s`)} className={fx("transform:translateY(-3px);box-shadow:var(--shadow-lift)", null)}>
                                    <div style={st("display:flex;align-items:flex-start;flex-wrap:wrap;gap:8px 10px")}>
                                      <span style={st(`inline-size:36px;block-size:36px;border-radius:9px;background:${d.tint};flex:0 0 auto;display:grid;place-items:center`)}>
                                        <span data-icon={d.icon} style={st("display:inline-flex;inline-size:18px;block-size:18px;color:rgba(255,255,255,.84)")}><Icon name={d.icon} /></span>
                                      </span>
                                      {" "}
                                      <div style={st("min-inline-size:130px;flex:1 1 130px")}>
                                        <div style={st("font-size:14px;font-weight:800;letter-spacing:-.01em")}>
                                          {d.name}
                                        </div>
                                        {" "}
                                        <div style={st("font-family:var(--mono);font-size:11.5px;color:var(--fg-subtle);margin-block-start:2px")}>
                                          {d.sub}
                                        </div>
                                      </div>
                                      {" "}
                                      <span style={st(`font-size:10.5px;font-weight:700;padding:3px 8px;border-radius:999px;background:${d.pillBg};color:${d.pillFg};white-space:nowrap;flex:0 0 auto;margin-inline-start:auto`)}>
                                        {d.pill}
                                      </span>
                                    </div>
                                    {" "}
                                    <div style={st("font-size:12.5px;color:var(--fg-muted);margin-block-start:9px")}>
                                      {d.meta}
                                    </div>
                                    {" "}
                                    {d.keyOn ? (
                                      <button onClick={d.giveAhead} style={st("display:flex;align-items:flex-start;gap:7px;inline-size:100%;margin-block-start:9px;padding:9px 10px;border:0;border-radius:9px;background:var(--info-soft);color:var(--info);font-size:12px;font-weight:700;line-height:1.5;text-align:start;cursor:pointer")} className={fx("filter:brightness(.97)", null)}>
                                        <span data-icon="key-round" style={st("display:inline-flex;inline-size:14px;block-size:14px;flex:0 0 auto;margin-block-start:1px")}><Icon name={"key-round"} /></span>
                                        <span style={st("flex:1")}>{d.keyLine}</span>
                                        <span data-icon="chevron-right" style={st("display:inline-flex;inline-size:14px;block-size:14px;flex:0 0 auto;margin-block-start:1px")}><Icon name={"chevron-right"} /></span>
                                      </button>
                                    ) : null}
                                    {d.noteOn ? (
                                      <>
                                        <div style={st("display:flex;align-items:flex-start;gap:7px;margin-block-start:9px;padding:9px 10px;border-radius:9px;background:var(--warn-soft);color:var(--warn);font-size:12px;font-weight:600;line-height:1.5")}>
                                          <span data-icon="notebook-pen" style={st("display:inline-flex;inline-size:14px;block-size:14px;flex:0 0 auto;margin-block-start:1px")}><Icon name={"notebook-pen"} /></span>
                                          {d.note}
                                        </div>
                                      </>
                                    ) : null}
                                    {" "}
                                    <div style={st("display:flex;flex-wrap:wrap;gap:7px;margin-block-start:12px")}>
                                      {d.hasPrimary ? (
                                        <>
                                          <button onClick={d.primary} style={st(`flex:1 1 auto;white-space:nowrap;padding:9px 12px;border:0;border-radius:9px;background:${d.primaryBg};color:${d.primaryFg};font-size:12.5px;font-weight:700;cursor:pointer;transition:filter .14s`)} className={fx("filter:brightness(1.08)", "transform:scale(.97)")}>
                                            {d.primaryLabel}
                                          </button>
                                        </>
                                      ) : null}
                                      {" "}
                                      <button onClick={d.openFolio} style={st("padding:9px 12px;border:1px solid var(--border-strong);border-radius:9px;background:var(--surface-2);font-size:12.5px;font-weight:700;color:var(--fg-muted);cursor:pointer")} className={fx("background:var(--surface-3)", null)}>
                                        {tr("The folio")}
                                      </button>
                                    </div>
                                    {d.lateOn ? (
                                      <button onClick={d.late} style={st("display:flex;align-items:center;gap:6px;margin-block-start:9px;padding:0;border:0;background:transparent;color:var(--fg-muted);font-size:12px;font-weight:700;cursor:pointer")} className={fx("color:var(--fg)", null)}>
                                        <span data-icon="clock" style={st("display:inline-flex;inline-size:13px;block-size:13px")}><Icon name={"clock"} /></span>
                                        {d.lateLabel}
                                      </button>
                                    ) : null}
                                  </article>
                                </Fragment>
                              ))}
                              {" "}
                              {c.empty ? (
                                <>
                                  <div style={st("padding:22px 14px;text-align:center;font-size:12.5px;color:var(--fg-subtle);border:1px dashed var(--border-strong);border-radius:11px")}>
                                    {c.emptyText}
                                  </div>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </Fragment>
                      ))}
                    </div>
                  </section>
                </>
              ) : null}
              {" "}
              {v.showNew ? (
                <>
                  <section style={st("animation:wh-fade .22s ease-out")}>
                    <h1 style={st(`margin:0;font-size:${v.h1Size};font-weight:800;letter-spacing:-.02em`)}>
                      {v.nb.title}
                    </h1>
                    {" "}
                    <p style={st("margin:6px 0 0;font-size:13.5px;color:var(--fg-muted);max-inline-size:70ch;text-wrap:pretty")}>
                      {v.nb.intro}
                    </p>
                    {" "}
                    <div style={st(`display:grid;grid-template-columns:${v.nb.cols};gap:16px;margin-block-start:18px;align-items:start`)}>
                      <div style={st("display:flex;flex-direction:column;gap:14px;min-inline-size:0")}>
                        <div style={st("background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 18px")}>
                          <div style={st("font-size:11.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--fg-subtle)")}>
                            {tr("The stay")}
                          </div>
                          {" "}
                          <div style={st(`display:grid;grid-template-columns:${v.nb.fieldCols};gap:12px;margin-block-start:12px`)}>
                            <label style={st("display:flex;flex-direction:column;gap:6px")}>
                              <span style={st("font-size:12px;font-weight:700;color:var(--fg-muted)")}>
                                {tr("Arriving")}
                              </span>
                              {" "}
                              <input type="date" value={v.nb.arrive ?? ""} min={v.nb.minDate} onChange={v.nb.onArrive} disabled={v.nb.arriveLocked} style={st("padding:10px 12px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-2);font-size:13.5px;font-weight:600")} />
                            </label>
                            {" "}
                            <label style={st("display:flex;flex-direction:column;gap:6px")}>
                              <span style={st("font-size:12px;font-weight:700;color:var(--fg-muted)")}>
                                {tr("Leaving")}
                              </span>
                              {" "}
                              <input type="date" value={v.nb.depart ?? ""} min={v.nb.minDepart} onChange={v.nb.onDepart} style={st("padding:10px 12px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-2);font-size:13.5px;font-weight:600")} />
                            </label>
                            {" "}
                            <label style={st("display:flex;flex-direction:column;gap:6px")}>
                              <span style={st("font-size:12px;font-weight:700;color:var(--fg-muted)")}>
                                {tr("Guests")}
                              </span>
                              {" "}
                              <select value={v.nb.guests} onChange={v.nb.onGuests} style={st("padding:10px 12px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-2);font-family:var(--mono);font-size:13.5px;font-weight:600")}>
                                {[1, 2, 3, 4].map((g) => (
                                  <option key={g} value={String(g)}>
                                    {tr("{n} guest|{n} guests", { n: g })}
                                  </option>
                                ))}
                              </select>
                            </label>
                            {" "}
                            <div style={st("display:flex;flex-direction:column;gap:6px")}>
                              <span style={st("font-size:12px;font-weight:700;color:var(--fg-muted)")}>
                                {tr("Nights")}
                              </span>
                              {" "}
                              <span style={st("padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:var(--surface-3);font-family:var(--mono);font-size:13.5px;font-weight:700")}>
                                {v.nb.nightsLabel}
                              </span>
                            </div>
                          </div>
                          {" "}
                          {v.nb.problemOn ? (
                            <>
                              <div style={st("display:flex;align-items:flex-start;gap:9px;margin-block-start:12px;padding:11px 13px;border-radius:11px;background:var(--warn-soft);color:var(--warn);font-size:13px;font-weight:600;line-height:1.55")}>
                                <span data-icon="info" style={st("display:inline-flex;inline-size:15px;block-size:15px;flex:0 0 auto;margin-block-start:1px")}><Icon name={"info"} /></span>
                                {v.nb.problem}
                              </div>
                            </>
                          ) : null}
                        </div>
                        {" "}
                        <div style={st("background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 18px")}>
                          <div style={st("font-size:11.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--fg-subtle)")}>
                            {tr("Which room type")}
                          </div>
                          {" "}
                          {v.nb.typeLocked ? (
                            <>
                              <p style={st("margin:6px 0 0;font-size:12.5px;color:var(--fg-subtle)")}>
                                {tr("They are in the house, so the type stays. Move them within it from the folio.")}
                              </p>
                            </>
                          ) : null}
                          {" "}
                          <div style={st(`display:grid;grid-template-columns:${v.nb.typeCols};gap:10px;margin-block-start:12px`)}>
                            {(v.nb.types ?? []).map((t: any, i_t: number) => (
                              <Fragment key={i_t}>
                                <button onClick={t.pick} aria-pressed={t.pressed} disabled={t.disabled} style={st(`display:flex;align-items:center;gap:11px;padding:12px 13px;border:1px solid ${t.border};border-radius:12px;background:${t.bg};opacity:${t.opacity};cursor:${t.cursor};text-align:start;transition:border-color .14s`)}>
                                  <span style={st(`inline-size:34px;block-size:34px;border-radius:9px;background:${t.tintFlat};flex:0 0 auto;display:grid;place-items:center`)}>
                                    <span data-icon={t.icon} style={st("display:inline-flex;inline-size:17px;block-size:17px;color:rgba(255,255,255,.86)")}><Icon name={t.icon} /></span>
                                  </span>
                                  {" "}
                                  <span style={st("flex:1;min-inline-size:0")}>
                                    <span style={st("display:block;font-size:13.5px;font-weight:800")}>
                                      {t.name}
                                    </span>
                                    {" "}
                                    <span style={st("display:block;font-size:11.5px;color:var(--fg-subtle);margin-block-start:2px")}>
                                      {t.sleeps}{" · "}
                                      <span style={st(`color:${t.leftFg};font-weight:700`)}>
                                        {t.left}
                                      </span>
                                    </span>
                                  </span>
                                  {" "}
                                  <span style={st("font-family:var(--mono);font-size:14px;font-weight:700;flex:0 0 auto")}>
                                    {t.total}
                                  </span>
                                </button>
                              </Fragment>
                            ))}
                          </div>
                        </div>
                        {" "}
                        <div style={st("background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 18px")}>
                          <div style={st("font-size:11.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--fg-subtle)")}>
                            {tr("Who is coming")}
                          </div>
                          {" "}
                          <div style={st(`display:grid;grid-template-columns:${v.nb.fieldCols};gap:12px;margin-block-start:12px`)}>
                            <div style={st("display:flex;flex-direction:column;gap:6px")}>
                              <label htmlFor="nb-first" style={st("font-size:12px;font-weight:700;color:var(--fg-muted)")}>
                                {tr("First name")}
                              </label>
                              {" "}
                              <input id="nb-first" value={v.nb.first ?? ""} onChange={v.nb.onFirst} placeholder={tr("Elin")} aria-invalid={v.nb.firstInv} aria-describedby="nb-first-err" style={st(`padding:10px 12px;border:1px solid ${v.nb.firstBorder};border-radius:10px;background:var(--surface-2);font-size:13.5px`)} />
                              {" "}
                              {v.nb.firstErrOn ? (
                                <>
                                  <span id="nb-first-err" style={st("font-size:12px;font-weight:700;color:var(--danger)")}>
                                    {v.nb.firstErr}
                                  </span>
                                </>
                              ) : null}
                            </div>
                            {" "}
                            <div style={st("display:flex;flex-direction:column;gap:6px")}>
                              <label htmlFor="nb-last" style={st("font-size:12px;font-weight:700;color:var(--fg-muted)")}>
                                {tr("Surname")}
                              </label>
                              {" "}
                              <input id="nb-last" value={v.nb.last ?? ""} onChange={v.nb.onLast} placeholder={tr("Marsh")} aria-invalid={v.nb.lastInv} aria-describedby="nb-last-err" style={st(`padding:10px 12px;border:1px solid ${v.nb.lastBorder};border-radius:10px;background:var(--surface-2);font-size:13.5px`)} />
                              {" "}
                              {v.nb.lastErrOn ? (
                                <>
                                  <span id="nb-last-err" style={st("font-size:12px;font-weight:700;color:var(--danger)")}>
                                    {v.nb.lastErr}
                                  </span>
                                </>
                              ) : null}
                            </div>
                            {" "}
                            <div style={st("display:flex;flex-direction:column;gap:6px")}>
                              <label htmlFor="nb-email" style={st("font-size:12px;font-weight:700;color:var(--fg-muted)")}>
                                {tr("Email")}{" "}
                                <span style={st("font-weight:600;color:var(--fg-subtle)")}>
                                  {tr("(optional)")}
                                </span>
                              </label>
                              {" "}
                              <input id="nb-email" type="email" inputMode="email" value={v.nb.email ?? ""} onChange={v.nb.onEmail} placeholder={tr("elin@example.com")} aria-describedby="nb-email-hint" style={st("padding:10px 12px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-2);font-family:var(--mono);font-size:13px")} />
                              {" "}
                              <span id="nb-email-hint" style={st("font-size:11.5px;color:var(--fg-subtle)")}>
                                {v.nb.emailHint}
                              </span>
                            </div>
                            {" "}
                            <div style={st("display:flex;flex-direction:column;gap:6px")}>
                              <label htmlFor="nb-mobile" style={st("font-size:12px;font-weight:700;color:var(--fg-muted)")}>
                                {tr("Mobile")}
                              </label>
                              {" "}
                              <input id="nb-mobile" type="tel" inputMode="tel" value={v.nb.mobile ?? ""} onChange={v.nb.onMobile} placeholder="(207) 555-0199" style={st("padding:10px 12px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-2);font-family:var(--mono);font-size:13px")} />
                            </div>
                            {" "}
                            <label style={st("display:flex;flex-direction:column;gap:6px")}>
                              <span style={st("font-size:12px;font-weight:700;color:var(--fg-muted)")}>
                                {tr("Says they will arrive")}
                              </span>
                              {" "}
                              <select value={v.nb.arrivalTime} onChange={v.nb.onTime} style={st("padding:10px 12px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-2);font-size:13.5px;font-weight:600")}>
                                {(v.nb.times ?? []).map((o: any, i_o: number) => (
                                  <Fragment key={i_o}>
                                    <option value={o.value}>
                                      {o.label}
                                    </option>
                                  </Fragment>
                                ))}
                              </select>
                            </label>
                            {" "}
                            <label style={st("display:flex;flex-direction:column;gap:6px")}>
                              <span style={st("font-size:12px;font-weight:700;color:var(--fg-muted)")}>
                                {tr("Their language")}
                              </span>
                              {" "}
                              <select value={v.nb.language} onChange={v.nb.onLanguage} style={st("padding:10px 12px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-2);font-size:13.5px;font-weight:600")}>
                                {(v.nb.languages ?? []).map((o: any, i_o: number) => (
                                  <Fragment key={i_o}>
                                    <option value={o.value} lang={o.value}>
                                      {o.label}
                                    </option>
                                  </Fragment>
                                ))}
                              </select>
                            </label>
                            {" "}
                            <label style={st("display:flex;flex-direction:column;gap:6px")}>
                              <span style={st("font-size:12px;font-weight:700;color:var(--fg-muted)")}>
                                {tr("Anything we should know")}
                              </span>
                              {" "}
                              <input value={v.nb.note ?? ""} onChange={v.nb.onNote} placeholder={tr("Late train, quiet room, a dog")} style={st("padding:10px 12px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-2);font-size:13.5px")} />
                            </label>
                          </div>
                          {" "}
                          {v.nb.knownOn ? (
                            <>
                              <div role="status" style={st("display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-block-start:12px;padding:11px 13px;border-radius:11px;background:var(--info-soft);color:var(--info);font-size:12.5px;font-weight:700;line-height:1.5")}>
                                <span data-icon="user-round" style={st("display:inline-flex;inline-size:15px;block-size:15px;flex:0 0 auto")}><Icon name={"user-round"} /></span>
                                {" "}
                                <span style={st("flex:1;min-inline-size:180px")}>
                                  {v.nb.knownLine}
                                </span>
                                {" "}
                                <div role="group" aria-label={tr("Link this booking")} style={st("display:flex;gap:7px;flex-wrap:wrap")}>
                                  <button onClick={v.nb.linkYes} aria-pressed={v.nb.linkYesPressed} style={st(`padding:7px 12px;border:1px solid var(--border-strong);border-radius:9px;background:${v.nb.linkYesBg};color:${v.nb.linkYesFg};font-size:12.5px;font-weight:700;cursor:pointer;white-space:nowrap`)}>
                                    {v.nb.linkYesLabel}
                                  </button>
                                  {" "}
                                  <button onClick={v.nb.linkNo} aria-pressed={v.nb.linkNoPressed} style={st(`padding:7px 12px;border:1px solid var(--border-strong);border-radius:9px;background:${v.nb.linkNoBg};color:${v.nb.linkNoFg};font-size:12.5px;font-weight:700;cursor:pointer;white-space:nowrap`)}>
                                    {tr("Book without linking")}
                                  </button>
                                </div>
                              </div>
                            </>
                          ) : null}
                        </div>
                        {" "}
                        <div style={st("background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 18px")}>
                          <div style={st("font-size:11.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--fg-subtle)")}>
                            {tr("Anything added")}
                          </div>
                          {" "}
                          <div style={st("display:flex;flex-direction:column;gap:9px;margin-block-start:12px")}>
                            {(v.nb.extras ?? []).map((e: any, i_e: number) => (
                              <Fragment key={i_e}>
                                <button onClick={e.toggle} aria-pressed={e.pressed} style={st(`display:flex;align-items:center;gap:12px;padding:12px 13px;border:1px solid ${e.border};border-radius:12px;background:${e.bg};cursor:pointer;text-align:start;transition:border-color .14s`)}>
                                  <span data-icon={e.icon} style={st("display:inline-flex;inline-size:16px;block-size:16px;color:var(--fg-muted);flex:0 0 auto")}><Icon name={e.icon} /></span>
                                  {" "}
                                  <span style={st("flex:1;min-inline-size:0")}>
                                    <span style={st("display:block;font-size:13.5px;font-weight:700")}>
                                      {e.label}
                                    </span>
                                    {" "}
                                    <span style={st("display:block;font-family:var(--mono);font-size:11.5px;color:var(--fg-subtle);margin-block-start:2px")}>
                                      {e.how}
                                    </span>
                                  </span>
                                  {" "}
                                  <span style={st(`inline-size:34px;block-size:20px;border-radius:999px;background:${e.knobBg};position:relative;flex:0 0 auto;transition:background .16s`)}>
                                    <span style={st(`position:absolute;inset-block-start:2px;inset-inline-start:${e.knobX};inline-size:16px;block-size:16px;border-radius:999px;background:#fff;transition:inset-inline-start .16s`)}></span>
                                  </span>
                                </button>
                              </Fragment>
                            ))}
                          </div>
                        </div>
                      </div>
                      {" "}
                      <div style={st("background:var(--surface);border:1px solid var(--border-strong);border-radius:14px;overflow:hidden;position:sticky;inset-block-start:16px")}>
                        <div style={st("padding:15px 17px;border-block-end:1px solid var(--border);background:var(--surface-2)")}>
                          <div style={st("font-size:11.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--fg-subtle)")}>
                            {tr("The account")}
                          </div>
                          {" "}
                          <div style={st("font-family:var(--mono);font-size:12.5px;color:var(--fg-muted);margin-block-start:6px")}>
                            {v.nb.range}
                          </div>
                          {" "}
                          <div style={st("font-size:13px;font-weight:700;margin-block-start:4px")}>
                            {v.nb.typeName}
                          </div>
                        </div>
                        {" "}
                        {v.nb.nothingChosen ? (
                          <>
                            <div style={st("padding:22px 17px;text-align:center")}>
                              <span data-icon="bed-double" style={st("display:inline-flex;inline-size:26px;block-size:26px;color:var(--fg-subtle)")}><Icon name={"bed-double"} /></span>
                              {" "}
                              <p style={st("margin:10px 0 0;font-size:13px;line-height:1.6;color:var(--fg-muted)")}>
                                {tr("Pick a room type and the house prices the nights here.")}
                              </p>
                            </div>
                          </>
                        ) : null}
                        {" "}
                        {v.nb.chosen ? (
                          <>
                            <div style={st("padding:14px 17px;border-block-end:1px solid var(--border);display:flex;flex-direction:column;gap:7px")}>
                              {(v.nb.nightRows ?? []).map((r: any, i_r: number) => (
                                <Fragment key={i_r}>
                                  <div style={st("display:flex;align-items:center;gap:10px;font-size:12.5px")}>
                                    <span style={st("font-family:var(--mono);color:var(--fg-muted);min-inline-size:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>
                                      {r.label}
                                    </span>
                                    {" "}
                                    <span style={st("margin-inline-start:auto;font-family:var(--mono);font-weight:700")}>
                                      {r.amount}
                                    </span>
                                  </div>
                                </Fragment>
                              ))}
                              {" "}
                              <div style={st("display:flex;align-items:center;gap:10px;font-size:12.5px;padding-block-start:7px;border-block-start:1px solid var(--border)")}>
                                <span style={st("font-weight:700")}>
                                  {v.nb.nightsLabel}
                                </span>
                                {" "}
                                <span style={st("margin-inline-start:auto;font-family:var(--mono);font-weight:700")}>
                                  {v.nb.roomSub}
                                </span>
                              </div>
                            </div>
                            {" "}
                            {(v.nb.extraLines ?? []).map((x: any, i_x: number) => (
                              <Fragment key={i_x}>
                                <div style={st("padding:11px 17px;border-block-end:1px solid var(--border);display:flex;align-items:flex-start;gap:10px")}>
                                  <span style={st("min-inline-size:0")}>
                                    <span style={st("display:block;font-size:12.5px;font-weight:700")}>
                                      {x.label}
                                    </span>
                                    {" "}
                                    <span style={st("display:block;font-family:var(--mono);font-size:11px;color:var(--fg-subtle);margin-block-start:2px")}>
                                      {x.detail}
                                    </span>
                                  </span>
                                  {" "}
                                  <span style={st("margin-inline-start:auto;font-family:var(--mono);font-size:12.5px;font-weight:700")}>
                                    {x.amount}
                                  </span>
                                </div>
                              </Fragment>
                            ))}
                            {" "}
                            <div style={st("padding:12px 17px;border-block-end:1px solid var(--border);display:flex;align-items:center;gap:10px;font-size:12.5px;color:var(--fg-muted)")}>
                              <span>
                                {v.nb.taxLabel}
                              </span>
                              {" "}
                              <span style={st("margin-inline-start:auto;font-family:var(--mono);font-weight:700;color:var(--fg)")}>
                                {v.nb.tax}
                              </span>
                            </div>
                            {" "}
                            {v.nb.compare ? (
                              <>
                                <div style={st("padding:14px 17px;display:grid;grid-template-columns:1fr 1fr;gap:10px")}>
                                  <div style={st("padding:10px 12px;border-radius:10px;background:var(--surface-2);border:1px solid var(--border)")}>
                                    <div style={st("font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--fg-subtle)")}>
                                      {tr("Before")}
                                    </div>
                                    {" "}
                                    <div style={st("font-family:var(--mono);font-size:15px;font-weight:700;color:var(--fg-muted);margin-block-start:4px")}>
                                      {v.nb.oldTotal}
                                    </div>
                                  </div>
                                  {" "}
                                  <div style={st("padding:10px 12px;border-radius:10px;background:var(--accent-soft);border:1px solid var(--accent)")}>
                                    <div style={st("font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--accent)")}>
                                      {tr("After")}
                                    </div>
                                    {" "}
                                    <div style={st("font-family:var(--mono);font-size:15px;font-weight:700;margin-block-start:4px")}>
                                      {v.nb.total}
                                    </div>
                                  </div>
                                </div>
                              </>
                            ) : null}
                            {" "}
                            {v.nb.notEditing ? (
                              <>
                                <div style={st("padding:14px 17px;display:flex;align-items:baseline;gap:10px")}>
                                  <span style={st("font-size:13.5px;font-weight:800")}>
                                    {tr("Total")}
                                  </span>
                                  {" "}
                                  <span style={st("margin-inline-start:auto;font-family:var(--mono);font-size:19px;font-weight:700;letter-spacing:-.02em")}>
                                    {v.nb.total}
                                  </span>
                                </div>
                              </>
                            ) : null}
                          </>
                        ) : null}
                        {" "}
                        <div style={st("padding:14px 17px;border-block-start:1px solid var(--border);background:var(--surface-2)")}>
                          <div style={st("display:flex;align-items:center;gap:9px;font-size:12px;color:var(--fg-subtle)")}>
                            <span>
                              {tr("Reference")}
                            </span>
                            {" "}
                            <span style={st("margin-inline-start:auto;font-family:var(--mono);font-weight:700;color:var(--fg-muted)")}>
                              {v.nb.refLine}
                            </span>
                          </div>
                          {" "}
                          {v.nb.stopOn ? (
                            <>
                              <div role="alert" style={st("display:flex;align-items:flex-start;gap:8px;margin-block-start:11px;padding:10px 12px;border-radius:10px;background:var(--warn-soft);color:var(--warn);font-size:12.5px;font-weight:700;line-height:1.5")}>
                                <span data-icon="triangle-alert" style={st("display:inline-flex;inline-size:14px;block-size:14px;flex:0 0 auto;margin-block-start:2px")}><Icon name={"triangle-alert"} /></span>
                                {v.nb.stop}
                              </div>
                            </>
                          ) : null}
                          {" "}
                          {v.nb.errOn ? (
                            <>
                              <div role="alert" style={st("display:flex;align-items:flex-start;gap:8px;margin-block-start:11px;padding:10px 12px;border-radius:10px;background:var(--warn-soft);color:var(--warn);font-size:12.5px;font-weight:700;line-height:1.5")}>
                                <span data-icon="triangle-alert" style={st("display:inline-flex;inline-size:14px;block-size:14px;flex:0 0 auto;margin-block-start:2px")}><Icon name={"triangle-alert"} /></span>
                                {v.nb.err}
                              </div>
                            </>
                          ) : null}
                          {" "}
                          <button onClick={v.nb.confirm} disabled={v.nb.cantSave} style={st(`inline-size:100%;margin-block-start:12px;padding:12px;border:0;border-radius:11px;background:${v.nb.btnBg};color:${v.nb.btnFg};font-size:14px;font-weight:700;cursor:${v.nb.btnCursor};display:flex;align-items:center;justify-content:center;gap:8px;transition:filter .14s`)} className={fx("filter:brightness(1.08)", "transform:scale(.97)")}>
                            {v.nb.busy ? (
                              <>
                                <span aria-hidden="true" style={st("inline-size:13px;block-size:13px;border-radius:999px;border:2px solid currentColor;border-inline-end-color:transparent;animation:wh-spin .7s linear infinite")}></span>
                              </>
                            ) : null}
                            {v.nb.btnLabel}
                          </button>
                          {" "}
                          {v.nb.showCheckIn ? (
                            <>
                              <button onClick={v.nb.confirmCheckIn} disabled={v.nb.cantSave} style={st("inline-size:100%;margin-block-start:8px;padding:11px;border:1px solid var(--accent);border-radius:11px;background:transparent;color:var(--accent);font-size:13px;font-weight:700;cursor:pointer")} className={fx("background:var(--accent-soft)", null)}>
                                {tr("Put it in the book and check in now")}
                              </button>
                            </>
                          ) : null}
                          {" "}
                          {v.nb.editing ? (
                            <>
                              <button onClick={v.nb.cancelEdit} style={st("inline-size:100%;margin-block-start:8px;padding:10px;border:1px solid var(--border-strong);border-radius:11px;background:var(--surface);font-size:13px;font-weight:700;cursor:pointer")} className={fx("background:var(--surface-3)", null)}>
                                {tr("Leave it as it was")}
                              </button>
                            </>
                          ) : null}
                          {" "}
                          <p style={st("margin:9px 0 0;font-size:11.5px;line-height:1.5;color:var(--fg-subtle)")}>
                            {v.nb.foot}
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>
                </>
              ) : null}
              {" "}
              {v.showRack ? (
                <>
                  <section style={st("animation:wh-fade .22s ease-out")}>
                    <div style={st("display:flex;align-items:center;gap:12px;flex-wrap:wrap")}>
                      <h1 style={st(`margin:0;font-size:${v.h1Size};font-weight:800;letter-spacing:-.02em`)}>
                        {tr("Room rack")}
                      </h1>
                      {" "}
                      {v.hk ? (
                        <>
                          <span style={st("display:flex;align-items:center;gap:6px;font-size:12px;font-weight:800;padding:5px 11px;border-radius:999px;background:var(--warn-soft);color:var(--warn)")}>
                            <span data-icon="spray-can" style={st("display:inline-flex;inline-size:13px;block-size:13px")}><Icon name={"spray-can"} /></span>
                            {tr("Housekeeping")}
                          </span>
                        </>
                      ) : null}
                    </div>
                    {" "}
                    <p style={st("margin:6px 0 0;font-size:13.5px;color:var(--fg-muted);max-inline-size:66ch;text-wrap:pretty")}>
                      {tr("Every room in the house and what state it is in. A room a guest has left flips to being cleaned on its own; mark it ready when it is done.")}
                    </p>
                    {" "}
                    <div style={st("display:flex;flex-wrap:wrap;gap:8px;margin-block-start:16px;align-items:center")}>
                      {(v.rackLegend ?? []).map((l: any, i_l: number) => (
                        <Fragment key={i_l}>
                          <button onClick={l.pick} aria-pressed={l.pressed} style={st(`display:flex;align-items:center;gap:8px;padding:7px 12px;border-radius:999px;background:${l.bg};border:1px solid ${l.border};font-size:12.5px;font-weight:${l.weight};cursor:pointer;transition:background .14s`)} className={fx("background:var(--surface-3)", null)}>
                            <span style={st(`inline-size:9px;block-size:9px;border-radius:999px;background:${l.color}`)}></span>
                            {l.label}{" "}
                            <span style={st("font-family:var(--mono);color:var(--fg-subtle)")}>
                              {l.count}
                            </span>
                          </button>
                        </Fragment>
                      ))}
                      {" "}
                      <span style={st("font-family:var(--mono);font-size:11.5px;color:var(--fg-subtle);margin-inline-start:4px")}>
                        {v.rackFilterNote}
                      </span>
                      {" "}
                      {v.rackFiltered ? (
                        <>
                          <button onClick={v.clearRackFilter} style={st("display:flex;align-items:center;gap:6px;padding:6px 11px;border:1px solid var(--border-strong);border-radius:999px;background:var(--surface-2);font-size:11.5px;font-weight:700;color:var(--fg-muted);cursor:pointer")} className={fx("filter:brightness(.97)", null)}>
                            <span data-icon="x" style={st("display:inline-flex;inline-size:12px;block-size:12px")}><Icon name={"x"} /></span>
                            {tr("Show them all")}
                          </button>
                        </>
                      ) : null}
                    </div>
                    {" "}
                    <div style={st("display:flex;flex-direction:column;gap:20px;margin-block-start:22px")}>
                      {(v.rackFloors ?? []).map((f: any, i_f: number) => (
                        <Fragment key={i_f}>
                          <div style={st(`display:${f.display}`)}>
                            <div style={st("display:flex;align-items:baseline;gap:10px;margin-block-end:11px")}>
                              <h2 style={st("margin:0;font-size:14.5px;font-weight:800")}>
                                {f.title}
                              </h2>
                              {" "}
                              <span style={st("font-family:var(--mono);font-size:11.5px;color:var(--fg-subtle)")}>
                                {f.sub}
                              </span>
                            </div>
                            {" "}
                            <div style={st("display:grid;grid-template-columns:repeat(auto-fill,minmax(146px,1fr));gap:10px")}>
                              {(f.rooms ?? []).map((r: any, i_r: number) => (
                                <Fragment key={i_r}>
                                  <div style={st(`background:${r.bg};border:1px solid ${r.border};border-radius:12px;overflow:hidden;opacity:${r.opacity};transition:transform .16s,box-shadow .16s`)} className={fx("transform:translateY(-3px);box-shadow:var(--shadow-lift)", null)}>
                                    <button onClick={r.open} aria-label={r.label} style={st(`display:block;inline-size:100%;padding:0;border:0;background:transparent;text-align:start;cursor:${r.tileCursor};color:inherit`)}>
                                      <span style={st(`display:block;block-size:5px;background:${r.tintFlat}`)}></span>
                                      {" "}
                                      <span style={st("display:block;padding:11px 12px 4px")}>
                                        <span style={st("display:flex;align-items:center;gap:8px")}>
                                          <span style={st("font-family:var(--mono);font-size:17px;font-weight:700;letter-spacing:-.01em")}>
                                            {r.n}
                                          </span>
                                          {" "}
                                          <span data-icon={r.icon} style={st("display:inline-flex;inline-size:15px;block-size:15px;color:var(--fg-subtle);margin-inline-start:auto")}><Icon name={r.icon} /></span>
                                        </span>
                                        {" "}
                                        <span style={st("display:block;font-size:11.5px;color:var(--fg-subtle);margin-block-start:3px")}>
                                          {r.typeName}
                                        </span>
                                        {" "}
                                        <span style={st("display:flex;align-items:center;gap:6px;margin-block-start:9px")}>
                                          <span style={st(`inline-size:7px;block-size:7px;border-radius:999px;background:${r.statusColor}`)}></span>
                                          {" "}
                                          <span style={st(`font-size:12px;font-weight:700;color:${r.statusColor}`)}>
                                            {r.statusLabel}
                                          </span>
                                        </span>
                                        {" "}
                                        {r.hasWho ? (
                                          <>
                                            <span style={st("display:block;font-size:11.5px;color:var(--fg-muted);margin-block-start:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>
                                              {r.who}
                                            </span>
                                          </>
                                        ) : null}
                                        {" "}
                                        {r.hasReason ? (
                                          <>
                                            <span style={st("display:block;font-size:11px;color:var(--fg-subtle);margin-block-start:6px;line-height:1.45")}>
                                              {r.reason}
                                            </span>
                                          </>
                                        ) : null}
                                        {" "}
                                        {r.hasNote ? (
                                          <>
                                            <span style={st("display:block;font-size:11px;color:var(--fg-subtle);margin-block-start:6px;line-height:1.45")}>
                                              {r.note}
                                            </span>
                                          </>
                                        ) : null}
                                      </span>
                                    </button>
                                    {" "}
                                    <div style={st("padding:4px 12px 12px")}>
                                      {r.canReady ? (
                                        <>
                                          <button onClick={r.markReady} style={st("inline-size:100%;margin-block-start:6px;padding:7px;border:1px solid var(--pos);border-radius:8px;background:transparent;color:var(--pos);font-size:11.5px;font-weight:700;cursor:pointer")} className={fx("background:var(--pos-soft)", null)}>
                                            {tr("Mark ready")}
                                          </button>
                                        </>
                                      ) : null}
                                      {" "}
                                      {r.canClean ? (
                                        <>
                                          <button onClick={r.markClean} style={st("inline-size:100%;margin-block-start:6px;padding:7px;border:1px solid var(--warn);border-radius:8px;background:transparent;color:var(--warn);font-size:11.5px;font-weight:700;cursor:pointer")} className={fx("background:var(--warn-soft)", null)}>
                                            {tr("Being cleaned")}
                                          </button>
                                        </>
                                      ) : null}
                                    </div>
                                  </div>
                                </Fragment>
                              ))}
                            </div>
                          </div>
                        </Fragment>
                      ))}
                    </div>
                  </section>
                </>
              ) : null}
              {" "}
              {v.showCal ? (
                <>
                  <section style={st("animation:wh-fade .22s ease-out")}>
                    <h1 style={st(`margin:0;font-size:${v.h1Size};font-weight:800;letter-spacing:-.02em`)}>
                      {tr("The next two weeks")}
                    </h1>
                    {" "}
                    <p style={st("margin:6px 0 0;font-size:13.5px;color:var(--fg-muted);max-inline-size:70ch;text-wrap:pretty")}>
                      {tr("Rooms sold of rooms open, one row per room type, one column per night. A stay holds the nights from arrival up to but not including departure — so a room given up on the 26th is open again to someone arriving on the 26th.")}
                    </p>
                    {" "}
                    <div style={st("margin-block-start:18px;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:14px;overflow-x:auto;scroll-snap-type:inline mandatory")}>
                      <div style={st(`min-inline-size:${v.calMin}`)}>
                        <div style={st(`display:grid;grid-template-columns:${v.calCols};gap:5px`)}>
                          <div></div>
                          {" "}
                          {(v.calDays ?? []).map((h: any, i_h: number) => (
                            <Fragment key={i_h}>
                              <div style={st("text-align:center;padding-block-end:7px;scroll-snap-align:start")}>
                                <div style={st(`font-family:var(--mono);font-size:10.5px;font-weight:700;color:${h.wdFg}`)}>
                                  {h.wd}
                                </div>
                                {" "}
                                <div style={st(`font-family:var(--mono);font-size:12.5px;font-weight:700;color:${h.dmFg};margin-block-start:2px`)}>
                                  {h.dm}
                                </div>
                              </div>
                            </Fragment>
                          ))}
                        </div>
                        {" "}
                        {(v.calRows ?? []).map((row: any, i_row: number) => (
                          <Fragment key={i_row}>
                            <div style={st(`display:grid;grid-template-columns:${v.calCols};gap:5px;padding-block-start:14px`)}>
                              <div style={st("display:flex;align-items:center;gap:8px;padding-inline-end:8px;min-inline-size:0")}>
                                <span style={st(`inline-size:9px;block-size:9px;border-radius:3px;background:${row.flat};flex:0 0 auto`)}></span>
                                {" "}
                                <span style={st("font-size:12.5px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>
                                  {row.name}
                                </span>
                              </div>
                              {" "}
                              {(row.cells ?? []).map((c: any, i_c: number) => (
                                <Fragment key={i_c}>
                                  <button onClick={c.go} aria-label={c.aria} style={st(`position:relative;padding:11px 4px 9px;border:1px solid ${c.border};border-radius:9px;background:${c.bg};cursor:pointer;scroll-snap-align:start;transition:transform .14s`)} className={fx("transform:translateY(-2px)", null)}>
                                    <span style={st(`font-family:var(--mono);font-size:12.5px;font-weight:700;color:${c.fg}`)}>
                                      {c.label}
                                    </span>
                                    {" "}
                                    {c.full ? (
                                      <>
                                        <span style={st("position:absolute;inset-block-start:-8px;inset-inline:0;margin-inline:auto;inline-size:fit-content;font-family:var(--mono);font-size:9.5px;font-weight:700;letter-spacing:.06em;padding:2px 7px;border-radius:5px;background:var(--danger);color:var(--accent-fg);white-space:nowrap")}>
                                          {tr("FULL")}
                                        </span>
                                      </>
                                    ) : null}
                                  </button>
                                </Fragment>
                              ))}
                            </div>
                          </Fragment>
                        ))}
                        {" "}
                        <div style={st(`display:grid;grid-template-columns:${v.calCols};gap:5px;padding-block-start:16px;margin-block-start:10px;border-block-start:1px solid var(--border)`)}>
                          <div style={st("display:flex;align-items:center;gap:8px;padding-inline-end:8px;min-inline-size:0")}>
                            <span data-icon="house" style={st("display:inline-flex;inline-size:14px;block-size:14px;color:var(--fg-subtle);flex:0 0 auto")}><Icon name={"house"} /></span>
                            {" "}
                            <span style={st("font-size:12.5px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>
                              {tr("The whole house")}
                            </span>
                          </div>
                          {" "}
                          {(v.calTotals ?? []).map((c: any, i_c: number) => (
                            <Fragment key={i_c}>
                              <button onClick={c.go} style={st(`padding:9px 4px;border:1px solid ${c.border};border-radius:9px;background:${c.bg};cursor:pointer;scroll-snap-align:start;display:flex;flex-direction:column;gap:2px;align-items:center;transition:transform .14s`)} className={fx("transform:translateY(-2px)", null)}>
                                <span style={st(`font-family:var(--mono);font-size:12px;font-weight:700;color:${c.fg}`)}>
                                  {c.label}
                                </span>
                                {" "}
                                <span style={st(`font-family:var(--mono);font-size:9.5px;color:${c.fg}`)}>
                                  {c.pct}
                                </span>
                              </button>
                            </Fragment>
                          ))}
                        </div>
                      </div>
                    </div>
                    {" "}
                    {v.dayOpen ? (
                      <>
                        <div style={st("margin-block-start:16px;background:var(--surface);border:1px solid var(--border-strong);border-radius:14px;padding:18px;animation:wh-fade .18s ease-out")}>
                          <div style={st("display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap")}>
                            <div>
                              <h2 style={st("margin:0;font-size:16px;font-weight:800")}>
                                {tr("The night of {day}", { day: v.day.label })}
                              </h2>
                              {" "}
                              <div style={st("font-family:var(--mono);font-size:12.5px;color:var(--fg-muted);margin-block-start:4px")}>
                                {tr("{sold} of {n} rooms sold · {pct} full", { sold: v.day.sold, n: v.day.sellable, pct: v.day.pct })}
                              </div>
                            </div>
                            {" "}
                            <button onClick={v.day.close} aria-label={tr("Close")} style={st("inline-size:30px;block-size:30px;border:1px solid var(--border-strong);border-radius:8px;background:var(--surface-2);display:grid;place-items:center;cursor:pointer")}>
                              <span data-icon="x" style={st("display:inline-flex;inline-size:15px;block-size:15px")}><Icon name={"x"} /></span>
                            </button>
                          </div>
                          {" "}
                          <div style={st(`display:grid;grid-template-columns:${v.day.cols};gap:16px;margin-block-start:16px`)}>
                            <div>
                              <div style={st("font-size:11.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--fg-subtle);margin-block-end:9px")}>
                                {tr("Arriving that day — {n}", { n: v.day.arrCount })}
                              </div>
                              {" "}
                              <div style={st("display:flex;flex-direction:column;gap:7px;max-block-size:320px;overflow:auto;padding-inline-end:2px")}>
                                {(v.day.arrivals ?? []).map((a: any, i_a: number) => (
                                  <Fragment key={i_a}>
                                    <button onClick={a.go} style={st("display:flex;align-items:center;gap:9px;padding:9px 11px;border:1px solid var(--border);border-radius:10px;background:var(--surface-2);cursor:pointer;text-align:start;flex:0 0 auto")} className={fx("background:var(--surface-3)", null)}>
                                      <span style={st(`inline-size:8px;block-size:8px;border-radius:3px;background:${a.flat};flex:0 0 auto`)}></span>
                                      {" "}
                                      <span style={st("flex:1;min-inline-size:0")}>
                                        <span style={st("display:block;font-size:12.5px;font-weight:700")}>
                                          {a.name}
                                        </span>
                                        {" "}
                                        <span style={st("display:block;font-family:var(--mono);font-size:11px;color:var(--fg-subtle)")}>
                                          {a.sub}
                                        </span>
                                      </span>
                                    </button>
                                  </Fragment>
                                ))}
                                {" "}
                                {v.day.noArrivals ? (
                                  <>
                                    <div style={st("font-size:12.5px;color:var(--fg-subtle);padding:8px 2px")}>
                                      {tr("Nobody arriving.")}
                                    </div>
                                  </>
                                ) : null}
                              </div>
                            </div>
                            {" "}
                            <div>
                              <div style={st("font-size:11.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--fg-subtle);margin-block-end:9px")}>
                                {tr("Leaving that day — {n}", { n: v.day.depCount })}
                              </div>
                              {" "}
                              <div style={st("display:flex;flex-direction:column;gap:7px;max-block-size:320px;overflow:auto;padding-inline-end:2px")}>
                                {(v.day.departures ?? []).map((p: any, i_p: number) => (
                                  <Fragment key={i_p}>
                                    <button onClick={p.go} style={st("display:flex;align-items:center;gap:9px;padding:9px 11px;border:1px solid var(--border);border-radius:10px;background:var(--surface-2);cursor:pointer;text-align:start;flex:0 0 auto")} className={fx("background:var(--surface-3)", null)}>
                                      <span style={st(`inline-size:8px;block-size:8px;border-radius:3px;background:${p.flat};flex:0 0 auto`)}></span>
                                      {" "}
                                      <span style={st("flex:1;min-inline-size:0")}>
                                        <span style={st("display:block;font-size:12.5px;font-weight:700")}>
                                          {p.name}
                                        </span>
                                        {" "}
                                        <span style={st("display:block;font-family:var(--mono);font-size:11px;color:var(--fg-subtle)")}>
                                          {p.sub}
                                        </span>
                                      </span>
                                    </button>
                                  </Fragment>
                                ))}
                                {" "}
                                {v.day.noDepartures ? (
                                  <>
                                    <div style={st("font-size:12.5px;color:var(--fg-subtle);padding:8px 2px")}>
                                      {tr("Nobody leaving.")}
                                    </div>
                                  </>
                                ) : null}
                              </div>
                            </div>
                          </div>
                          {" "}
                          <div style={st("display:flex;align-items:center;gap:9px;margin-block-start:14px;font-size:12.5px;color:var(--fg-muted)")}>
                            <span data-icon="car" style={st("display:inline-flex;inline-size:14px;block-size:14px;color:var(--fg-subtle)")}><Icon name={"car"} /></span>
                            {tr("Parking that night")}{" "}
                            <span style={st("font-family:var(--mono);font-weight:700;color:var(--fg)")}>
                              {v.day.parking}
                            </span>
                          </div>
                          {" "}
                          <div style={st("margin-block-start:12px;padding:11px 13px;border-radius:11px;background:var(--surface-2);border:1px solid var(--border);font-size:12.5px;color:var(--fg-muted);line-height:1.55")}>
                            {v.day.turnNote}
                          </div>
                        </div>
                      </>
                    ) : null}
                  </section>
                </>
              ) : null}
              {" "}
              {v.showRes ? (
                <>
                  <section style={st("animation:wh-fade .22s ease-out")}>
                    <h1 style={st(`margin:0;font-size:${v.h1Size};font-weight:800;letter-spacing:-.02em`)}>
                      {tr("Reservations")}
                    </h1>
                    {" "}
                    {v.resQueryOn ? (
                      <>
                        <div style={st("display:flex;align-items:center;gap:8px;margin-block-start:10px;font-size:12.5px;color:var(--fg-muted)")}>
                          <span>{trx("Matching {q}", { q: <span style={st("font-family:var(--mono);font-weight:700;color:var(--fg)")}>{v.resQuery}</span> })}</span>
                          {" "}
                          <button onClick={v.clearResQuery} style={st("display:flex;align-items:center;gap:5px;padding:4px 9px;border:1px solid var(--border-strong);border-radius:999px;background:var(--surface-2);font-size:11.5px;font-weight:700;color:var(--fg-muted);cursor:pointer")}>
                            <span data-icon="x" style={st("display:inline-flex;inline-size:11px;block-size:11px")}><Icon name={"x"} /></span>
                            {tr("Clear")}
                          </button>
                        </div>
                      </>
                    ) : null}
                    {" "}
                    <div role="group" aria-label={tr("Show")} style={st("display:flex;flex-wrap:wrap;gap:7px;margin-block-start:14px")}>
                      {(v.resFilters ?? []).map((f: any, i_f: number) => (
                        <Fragment key={i_f}>
                          <button onClick={f.go} aria-pressed={f.pressed} style={st(`display:flex;align-items:center;gap:7px;padding:7px 13px;border:1px solid ${f.border};border-radius:999px;background:${f.bg};color:${f.fg};font-size:12.5px;font-weight:700;cursor:pointer`)}>
                            {f.label}
                            <span style={st("font-family:var(--mono)")}>
                              {f.count}
                            </span>
                          </button>
                        </Fragment>
                      ))}
                    </div>
                    {" "}
                    <div style={st("margin-block-start:16px;background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden")}>
                      {(v.resRows ?? []).map((r: any, i_r: number) => (
                        <Fragment key={i_r}>
                          <button onClick={r.go} style={st(`inline-size:100%;display:grid;grid-template-columns:${v.resCols};gap:12px;align-items:center;padding:12px 16px;border:0;border-block-end:1px solid var(--border);background:${r.rowBg};cursor:pointer;text-align:start`)} className={fx("background:var(--surface-2)", null)}>
                            <span style={st("display:flex;align-items:center;gap:9px;min-inline-size:0")}>
                              <span style={st(`inline-size:9px;block-size:9px;border-radius:3px;background:${r.flat};flex:0 0 auto`)}></span>
                              {" "}
                              <span style={st("min-inline-size:0")}>
                                <span style={st("display:block;font-size:13.5px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>
                                  {r.name}
                                </span>
                                {" "}
                                <span style={st("display:flex;align-items:center;gap:7px")}>
                                  <span style={st("font-family:var(--mono);font-size:11px;color:var(--fg-subtle)")}>
                                    {r.ref}
                                  </span>
                                  {" "}
                                  {r.isNew ? (
                                    <>
                                      <span style={st("font-size:10px;font-weight:700;padding:2px 7px;border-radius:999px;background:var(--accent);color:var(--accent-fg)")}>
                                        {tr("Just taken")}
                                      </span>
                                    </>
                                  ) : null}
                                </span>
                              </span>
                            </span>
                            {" "}
                            <span style={st("font-family:var(--mono);font-size:12px;color:var(--fg-muted)")}>
                              {r.range}
                            </span>
                            {" "}
                            {v.isWide ? (
                              <>
                                <span style={st("font-size:12.5px;color:var(--fg-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>
                                  {r.typeName}
                                </span>
                              </>
                            ) : null}
                            {" "}
                            <span style={st("display:flex;align-items:center;gap:5px;flex-wrap:wrap;justify-self:start")}>
                              <span style={st(`font-size:10.5px;font-weight:700;padding:3px 9px;border-radius:999px;background:${r.pillBg};color:${r.pillFg};white-space:nowrap`)}>
                                {r.pill}
                              </span>
                              {" "}
                              {r.lateOn ? (
                                <>
                                  <span style={st("font-size:10px;font-weight:700;padding:2px 7px;border-radius:999px;border:1px solid var(--warn);color:var(--warn)")}>
                                    {tr("late")}
                                  </span>
                                </>
                              ) : null}
                            </span>
                            {" "}
                            <span style={st(`font-family:var(--mono);font-size:12.5px;font-weight:600;color:${r.balFg};justify-self:end;white-space:nowrap`)}>
                              {r.balance}
                            </span>
                          </button>
                        </Fragment>
                      ))}
                      {" "}
                      {v.resEmpty ? (
                        <>
                          <div style={st("padding:26px 16px;text-align:center;font-size:13px;color:var(--fg-subtle)")}>
                            {v.resEmptyText}
                          </div>
                        </>
                      ) : null}
                      {" "}
                      <div style={st("display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:13px 16px;font-size:12.5px;color:var(--fg-subtle)")}>
                        <span>
                          {v.resCount}
                        </span>
                        {" "}
                        {v.resMore ? (
                          <>
                            <button onClick={v.showMore} style={st("margin-inline-start:auto;padding:7px 13px;border:1px solid var(--border-strong);border-radius:9px;background:var(--surface-2);font-size:12px;font-weight:700;color:var(--fg-muted);cursor:pointer")} className={fx("background:var(--surface-3)", null)}>
                              {tr("Show more")}
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </section>
                </>
              ) : null}
              {" "}
              {v.showFolio ? (
                <>
                  <section data-screen-label="Folio" style={st("animation:wh-fade .22s ease-out;max-inline-size:920px")}>
                    <button onClick={v.fo.back} style={st("display:flex;align-items:center;gap:7px;padding:7px 11px;margin-block-end:14px;border:1px solid var(--border-strong);border-radius:9px;background:var(--surface);font-size:12.5px;font-weight:700;color:var(--fg-muted);cursor:pointer")} className={fx("background:var(--surface-2)", null)}>
                      <span data-icon="arrow-left" style={st("display:inline-flex;inline-size:14px;block-size:14px")}><Icon name={"arrow-left"} /></span>
                      {v.fo.backLabel}
                    </button>
                    {" "}
                    <div style={st("background:var(--surface);border:1px solid var(--border-strong);border-radius:16px;overflow:hidden;box-shadow:var(--shadow)")}>
                      <div style={st("padding:18px 20px;border-block-end:1px solid var(--border)")}>
                        <div style={st("display:flex;align-items:flex-start;gap:13px;flex-wrap:wrap")}>
                          <span style={st(`inline-size:48px;block-size:48px;border-radius:11px;background:${v.fo.tint};flex:0 0 auto;display:grid;place-items:center`)}>
                            <span data-icon={v.fo.icon} style={st("display:inline-flex;inline-size:24px;block-size:24px;color:rgba(255,255,255,.84)")}><Icon name={v.fo.icon} /></span>
                          </span>
                          {" "}
                          <div style={st("min-inline-size:0;flex:1 1 240px")}>
                            <div style={st("display:flex;align-items:center;gap:9px;flex-wrap:wrap")}>
                              <h1 style={st("margin:0;font-size:17px;font-weight:800;letter-spacing:-.015em")}>
                                {v.fo.name}
                              </h1>
                              {" "}
                              <span style={st(`font-size:10.5px;font-weight:700;padding:3px 9px;border-radius:999px;background:${v.fo.pillBg};color:${v.fo.pillFg}`)}>
                                {v.fo.pill}
                              </span>
                            </div>
                            {" "}
                            <div style={st("font-family:var(--mono);font-size:12px;color:var(--fg-subtle);margin-block-start:4px")}>
                              {v.fo.ref}{" · "}{v.fo.range}{" · "}{v.fo.nightsLabel}
                            </div>
                            {" "}
                            <div style={st("font-size:12.5px;color:var(--fg-muted);margin-block-start:3px")}>
                              {v.fo.roomLine}
                            </div>
                          </div>
                          {" "}
                          <div style={st("text-align:end;flex:0 0 auto")}>
                            <div style={st("font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--fg-subtle)")}>
                              {tr("Balance")}
                            </div>
                            {" "}
                            <div style={st(`font-family:var(--mono);font-size:24px;font-weight:700;letter-spacing:-.02em;color:${v.fo.balFg};margin-block-start:3px`)}>
                              {v.fo.balance}
                            </div>
                          </div>
                        </div>
                        {" "}
                        {v.fo.hasActions ? (
                          <>
                            <div style={st("display:flex;gap:8px;flex-wrap:wrap;margin-block-start:15px")}>
                              {(v.fo.actions ?? []).map((a: any, i_a: number) => (
                                <Fragment key={i_a}>
                                  {a.secondary ? (
                                    <>
                                      <button onClick={a.go} style={st("display:flex;align-items:center;gap:7px;padding:9px 13px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface);font-size:12.5px;font-weight:700;cursor:pointer")} className={fx("background:var(--surface-3)", null)}>
                                        <span data-icon={a.icon} style={st("display:inline-flex;inline-size:14px;block-size:14px")}><Icon name={a.icon} /></span>
                                        {a.label}
                                      </button>
                                    </>
                                  ) : null}
                                  {" "}
                                  {a.primary ? (
                                    <>
                                      <button onClick={a.go} style={st("margin-inline-start:auto;display:flex;align-items:center;gap:7px;padding:9px 16px;border:0;border-radius:10px;background:var(--accent);color:var(--accent-fg);font-size:12.5px;font-weight:700;cursor:pointer;transition:filter .14s")} className={fx("filter:brightness(1.08)", "transform:scale(.97)")}>
                                        <span data-icon={a.icon} style={st("display:inline-flex;inline-size:14px;block-size:14px")}><Icon name={a.icon} /></span>
                                        {a.label}
                                      </button>
                                    </>
                                  ) : null}
                                </Fragment>
                              ))}
                            </div>
                          </>
                        ) : null}
                      </div>
                      {" "}
                      <div style={st("padding:13px 20px;border-block-end:1px solid var(--border);background:var(--surface-2);display:flex;align-items:center;gap:10px;flex-wrap:wrap")}>
                        {(v.fo.chips ?? []).map((c: any, i_c: number) => (
                          <Fragment key={i_c}>
                            <span style={st("display:flex;align-items:baseline;gap:6px;padding:5px 11px;border:1px solid var(--border);border-radius:999px;background:var(--surface);font-size:11.5px;color:var(--fg-subtle)")}>
                              {c.label}
                              <span style={st("font-family:var(--mono);font-size:12.5px;font-weight:700;color:var(--fg)")}>
                                {c.value}
                              </span>
                            </span>
                          </Fragment>
                        ))}
                        {" "}
                        <span style={st("font-size:12.5px;color:var(--fg-muted);margin-inline-start:auto")}>
                          {v.fo.onTheDay}
                        </span>
                      </div>
                      {" "}
                      {v.fo.giveBackOn ? (
                        <>
                          <div role="status" style={st("margin:14px 20px 0;display:flex;align-items:flex-start;gap:9px;padding:12px 13px;border-radius:11px;background:var(--warn-soft);color:var(--warn);font-size:13px;font-weight:700;line-height:1.5")}>
                            <span data-icon="triangle-alert" style={st("display:inline-flex;inline-size:15px;block-size:15px;flex:0 0 auto;margin-block-start:2px")}><Icon name={"triangle-alert"} /></span>
                            {v.fo.giveBack}
                          </div>
                        </>
                      ) : null}
                      {" "}
                      <div style={st("padding:4px 20px 0")}>
                        <div style={st(`display:grid;grid-template-columns:${v.fo.rowCols};gap:10px;padding:11px 0 9px;border-block-end:1px solid var(--border-strong)`)}>
                          <span style={st("font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--fg-subtle)")}>
                            {tr("What it was")}
                          </span>
                          {" "}
                          <span style={st("font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--fg-subtle);text-align:end")}>
                            {tr("Amount")}
                          </span>
                          {" "}
                          {v.isWide ? (
                            <>
                              <span style={st("font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--fg-subtle);text-align:end")}>
                                {tr("Balance")}
                              </span>
                            </>
                          ) : null}
                          {" "}
                          <span></span>
                        </div>
                        {" "}
                        {(v.fo.rows ?? []).map((r: any, i_r: number) => (
                          <Fragment key={i_r}>
                            <div style={st(`position:relative;display:grid;grid-template-columns:${v.fo.rowCols};gap:10px;align-items:center;padding:10px 0;border-block-end:1px solid var(--border);background:${r.rowBg}`)}>
                              <span style={st("min-inline-size:0")}>
                                <span style={st(`display:block;font-size:13px;font-weight:${r.weight};color:${r.labelFg};text-decoration:${r.strike}`)}>
                                  {r.label}
                                </span>
                                {" "}
                                {r.hasDetail ? (
                                  <>
                                    <span style={st("display:block;font-size:11.5px;color:var(--fg-subtle);margin-block-start:2px")}>
                                      {r.detail}
                                    </span>
                                  </>
                                ) : null}
                              </span>
                              {" "}
                              <span style={st(`font-family:var(--mono);font-size:13px;font-weight:600;text-align:end;color:${r.amountFg};white-space:nowrap;text-decoration:${r.strike}`)}>
                                {r.amount}
                              </span>
                              {" "}
                              {v.isWide ? (
                                <>
                                  <span style={st("font-family:var(--mono);font-size:12.5px;text-align:end;color:var(--fg-subtle);white-space:nowrap")}>
                                    {r.balance}
                                  </span>
                                </>
                              ) : null}
                              {" "}
                              <span style={st("display:flex;justify-content:flex-end")}>
                                {r.menu ? (
                                  <>
                                    <button onClick={r.toggleMenu} aria-haspopup="menu" aria-label={tr("More for this line")} title={tr("More")} style={st("inline-size:26px;block-size:26px;display:grid;place-items:center;border:0;border-radius:7px;background:transparent;color:var(--fg-subtle);cursor:pointer")} className={fx("background:var(--surface-3)", null)}>
                                      <span data-icon="ellipsis" style={st("display:inline-flex;inline-size:15px;block-size:15px")}><Icon name={"ellipsis"} /></span>
                                    </button>
                                  </>
                                ) : null}
                                {" "}
                                {r.lockOn ? (
                                  <>
                                    <span tabIndex={0} role="note" aria-label={tr("A manager can void this")} onMouseEnter={r.showTip} onMouseLeave={r.hideTip} onFocus={r.showTip} onBlur={r.hideTip} style={st("inline-size:26px;block-size:26px;display:grid;place-items:center;border-radius:7px;color:var(--fg-subtle);cursor:default")}>
                                      <span data-icon="lock" style={st("display:inline-flex;inline-size:13px;block-size:13px")}><Icon name={"lock"} /></span>
                                    </span>
                                  </>
                                ) : null}
                              </span>
                              {" "}
                              {r.tipOpen ? (
                                <>
                                  <div role="tooltip" style={st("position:absolute;inset-block-start:calc(100% - 4px);inset-inline-end:0;z-index:20;padding:7px 10px;border-radius:9px;background:var(--fg);color:var(--bg);font-size:12px;font-weight:700;white-space:nowrap;box-shadow:var(--shadow-lift);animation:wh-pop .14s ease-out")}>
                                    {tr("A manager can void this")}
                                  </div>
                                </>
                              ) : null}
                              {" "}
                              {r.menuOpen ? (
                                <>
                                  <div role="menu" style={st("position:absolute;inset-block-start:calc(100% - 4px);inset-inline-end:0;z-index:20;inline-size:170px;padding:5px;border-radius:11px;background:var(--surface);border:1px solid var(--border-strong);box-shadow:var(--shadow-lift);animation:wh-pop .14s ease-out")}>
                                    <div style={st("padding:5px 8px 6px;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--fg-subtle)")}>
                                      {tr("Manager")}
                                    </div>
                                    {" "}
                                    <button role="menuitem" onClick={r.askVoid} style={st("inline-size:100%;display:flex;align-items:center;gap:8px;padding:8px 9px;border:0;border-radius:8px;background:transparent;color:var(--danger);font-size:13px;font-weight:600;cursor:pointer;text-align:start")} className={fx("background:var(--danger-soft)", null)}>
                                      <span data-icon="ban" style={st("display:inline-flex;inline-size:14px;block-size:14px")}><Icon name={"ban"} /></span>
                                      {tr("Void…")}
                                    </button>
                                  </div>
                                </>
                              ) : null}
                            </div>
                          </Fragment>
                        ))}
                        {" "}
                        <div style={st(`display:grid;grid-template-columns:${v.fo.rowCols};gap:10px;padding:14px 0 16px`)}>
                          <span style={st("font-size:14px;font-weight:800")}>
                            {v.fo.dueLabel}
                          </span>
                          {" "}
                          <span style={st(`font-family:var(--mono);font-size:17px;font-weight:700;text-align:end;color:${v.fo.balFg}`)}>
                            {v.fo.dueAmount}
                          </span>
                          {" "}
                          {v.isWide ? (
                            <>
                              <span></span>
                            </>
                          ) : null}
                          {" "}
                          <span></span>
                        </div>
                      </div>
                      {" "}
                      {v.fo.blocked ? (
                        <>
                          <div role="alert" style={st("margin:0 20px 16px;padding:13px 14px;border-radius:12px;background:var(--danger-soft);border:1px solid var(--danger);display:flex;align-items:flex-start;gap:10px;animation:wh-fade .16s ease-out")}>
                            <span data-icon="circle-alert" style={st("display:inline-flex;inline-size:17px;block-size:17px;color:var(--danger);flex:0 0 auto;margin-block-start:1px")}><Icon name={"circle-alert"} /></span>
                            {" "}
                            <div>
                              <div style={st("font-size:13.5px;font-weight:800;color:var(--danger)")}>
                                {v.fo.blockTitle}
                              </div>
                              {" "}
                              <div style={st("font-size:12.5px;color:var(--fg-muted);margin-block-start:4px;line-height:1.55")}>
                                {v.fo.blockBody}
                              </div>
                            </div>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </section>
                </>
              ) : null}
              {" "}
              {v.show404desk ? (
                <>
                  <section style={st("animation:wh-fade .22s ease-out;max-inline-size:520px;margin-inline:auto;text-align:center;padding-block:36px")}>
                    <div style={st("font-family:var(--mono);font-size:56px;font-weight:700;letter-spacing:-.03em;color:var(--fg-subtle)")}>
                      {"404"}
                    </div>
                    {" "}
                    <h1 style={st("margin:12px 0 0;font-size:22px;font-weight:800;letter-spacing:-.02em")}>
                      {tr("Nothing at that address")}
                    </h1>
                    {" "}
                    <p style={st("margin:11px 0 0;font-size:14px;line-height:1.6;color:var(--fg-muted)")}>
                      {tr("The board has everything you need for the day.")}
                    </p>
                    {" "}
                    <button onClick={v.goToday} style={st("margin-block-start:20px;padding:11px 18px;border:0;border-radius:10px;background:var(--accent);color:var(--accent-fg);font-size:13.5px;font-weight:700;cursor:pointer")} className={fx("filter:brightness(1.08)", null)}>
                      {tr("Back to Today")}
                    </button>
                  </section>
                </>
              ) : null}
            </main>
            {" "}
            <footer style={st("border-block-start:1px solid var(--border);background:var(--surface);padding:16px 20px;display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between")}>
              <span style={st("font-size:12.5px;color:var(--fg-subtle)")}>
                {v.footLine}
              </span>
              {" "}
              <div style={st("display:flex;align-items:center;gap:12px")}></div>
            </footer>
          </div>
        </div>
      </>
    ) : null}
    </>
  );
}
