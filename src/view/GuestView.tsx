// Drawn from the Wren House design (its template ported to JSX): the layout, as drawn.
// Every value comes from the screens' values bag `v` (../app/vals/*.ts).
import { Fragment } from "react";

import { tr } from "../i18n/tr.ts";
import { fx, Icon, st } from "./dom.tsx";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function GuestView({ v }: { v: any }) {
  return (
    <>
    {v.isGuest ? (
      <>
        <header style={st("position:sticky;inset-block-start:0;z-index:30;background:var(--surface);border-block-end:1px solid var(--border)")}>
          <div style={st("max-inline-size:1120px;margin-inline:auto;padding:13px 22px;display:flex;align-items:center;gap:12px 18px;flex-wrap:wrap")}>
            <button onClick={v.goHome} style={st("display:flex;align-items:center;gap:11px;border:0;background:transparent;padding:0;cursor:pointer;text-align:start")}>
              <span style={st("inline-size:32px;block-size:32px;border-radius:10px;display:grid;place-items:center;background:radial-gradient(110% 85% at 20% 10%, rgba(255,255,255,.24), rgba(255,255,255,0) 60%), linear-gradient(140deg,#25415c,#3a6d92 48%,#4a7a5c);color:rgba(255,255,255,.94)")}>
                <span data-icon="bird" style={st("display:inline-flex;inline-size:17px;block-size:17px")}><Icon name={"bird"} /></span>
              </span>
              {" "}
              <span style={st("font-size:17px;font-weight:800;letter-spacing:-.015em")}>
                {v.houseName}
              </span>
            </button>
            {" "}
            <nav style={st("display:flex;gap:2px;margin-inline-start:auto;align-items:center;flex-wrap:wrap")}>
              {(v.guestNav ?? []).map((g: any, i_g: number) => (
                <Fragment key={i_g}>
                  <button onClick={g.go} aria-current={g.current} style={st(`padding:8px 12px;border:0;border-radius:9px;background:${g.bg};color:${g.fg};font-size:13.5px;font-weight:${g.weight};cursor:pointer;transition:background .14s`)} className={fx("background:var(--surface-3)", null)}>
                    {g.label}
                  </button>
                </Fragment>
              ))}
            </nav>
            {" "}
            <button onClick={v.toggleTheme} aria-label={tr("Switch between light and dark")} title={v.themeTitle} style={st("inline-size:33px;block-size:33px;display:grid;place-items:center;border:1px solid var(--border-strong);border-radius:9px;background:var(--surface-2);cursor:pointer;color:var(--fg-muted);transition:filter .14s")} className={fx("filter:brightness(.97)", "transform:scale(.97)")}>
              <span data-icon={v.themeIcon} style={st("display:inline-flex;inline-size:16px;block-size:16px")}><Icon name={v.themeIcon} /></span>
            </button>
          </div>
        </header>
        {" "}
        <main style={st("flex:1")}>
          <div style={st(`max-inline-size:1120px;margin-inline:auto;padding:${v.guestPad}`)}>
            {v.loading ? (
              <>
                <div style={st("display:flex;flex-direction:column;gap:16px")}>
                  <div style={st("block-size:30px;inline-size:min(280px,60%);border-radius:9px;background:linear-gradient(90deg,var(--surface-3),var(--surface-2),var(--surface-3));background-size:200% 100%;animation:wh-shimmer 1.15s linear infinite")}></div>
                  {" "}
                  <div style={st("block-size:190px;border-radius:16px;background:linear-gradient(90deg,var(--surface-3),var(--surface-2),var(--surface-3));background-size:200% 100%;animation:wh-shimmer 1.15s linear infinite")}></div>
                  {" "}
                  <div style={st("display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px")}>
                    <div style={st("block-size:120px;border-radius:14px;background:linear-gradient(90deg,var(--surface-3),var(--surface-2),var(--surface-3));background-size:200% 100%;animation:wh-shimmer 1.15s linear infinite")}></div>
                    {" "}
                    <div style={st("block-size:120px;border-radius:14px;background:linear-gradient(90deg,var(--surface-3),var(--surface-2),var(--surface-3));background-size:200% 100%;animation:wh-shimmer 1.15s linear infinite")}></div>
                    {" "}
                    <div style={st("block-size:120px;border-radius:14px;background:linear-gradient(90deg,var(--surface-3),var(--surface-2),var(--surface-3));background-size:200% 100%;animation:wh-shimmer 1.15s linear infinite")}></div>
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
            {v.showHome ? (
              <>
                <section style={st("animation:wh-fade .22s ease-out")}>
                  <div style={st(`position:relative;border-radius:20px;overflow:hidden;background:radial-gradient(120% 90% at 16% 8%, rgba(255,255,255,.22), rgba(255,255,255,0) 58%), linear-gradient(140deg,#25415c,#3a6d92 46%,#4a7a5c);padding:${v.heroPad};min-block-size:${v.heroH};display:flex;flex-direction:column;justify-content:flex-end`)}>
                    <span data-icon="bird" style={st("position:absolute;inset-block-start:-18px;inset-inline-end:-14px;inline-size:210px;block-size:210px;color:rgba(255,255,255,.13);display:inline-flex")}><Icon name={"bird"} /></span>
                    {" "}
                    <span style={st("position:absolute;inset-block-end:14px;inset-inline-start:20px;font-family:var(--mono);font-size:10.5px;font-weight:600;letter-spacing:.06em;color:rgba(255,255,255,.7)")}>
                      {v.heroMark}
                    </span>
                    {" "}
                    <div style={st("position:relative")}>
                      <div style={st(`font-size:${v.heroSize};font-weight:800;letter-spacing:-.03em;line-height:1;color:#fff`)}>
                        {v.houseName}
                      </div>
                      {" "}
                      <p style={st("margin:12px 0 30px;max-inline-size:44ch;font-size:15.5px;line-height:1.55;color:rgba(255,255,255,.86);text-wrap:pretty")}>
                        {v.heroLine}
                      </p>
                    </div>
                  </div>
                  {" "}
                  <div style={st("margin-block-start:-38px;position:relative;z-index:2;background:var(--surface);border:1px solid var(--border-strong);border-radius:16px;box-shadow:var(--shadow-lift);padding:18px")}>
                    <div style={st("display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-block-end:14px")}>
                      <h2 style={st("margin:0;font-size:17px;font-weight:800;letter-spacing:-.01em")}>
                        {tr("When would you like to come?")}
                      </h2>
                      {" "}
                      <span style={st("font-size:12.5px;color:var(--fg-subtle)")}>
                        {tr("Arrive from")}{" "}{v.arriveFrom}{" "}{tr("· leave by")}{" "}{v.leaveBy}
                      </span>
                    </div>
                    {" "}
                    <div style={st(`display:grid;grid-template-columns:${v.searchCols};gap:12px;align-items:end`)}>
                      <label style={st("display:flex;flex-direction:column;gap:6px")}>
                        <span style={st("font-size:12px;font-weight:700;color:var(--fg-muted)")}>
                          {tr("Arriving")}
                        </span>
                        {" "}
                        <input id="s-arrive" type="date" value={v.sArrive ?? ""} min={v.minDate} onChange={v.onArrive} style={st("padding:10px 12px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-2);font-size:13.5px")} />
                      </label>
                      {" "}
                      <label style={st("display:flex;flex-direction:column;gap:6px")}>
                        <span style={st("font-size:12px;font-weight:700;color:var(--fg-muted)")}>
                          {tr("Leaving")}
                        </span>
                        {" "}
                        <input type="date" value={v.sDepart ?? ""} min={v.minDepart} onChange={v.onDepart} style={st("padding:10px 12px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-2);font-size:13.5px")} />
                      </label>
                      {" "}
                      <label style={st("display:flex;flex-direction:column;gap:6px")}>
                        <span style={st("font-size:12px;font-weight:700;color:var(--fg-muted)")}>
                          {tr("Guests")}
                        </span>
                        {" "}
                        <select value={v.sGuests} onChange={v.onGuests} style={st("padding:10px 12px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-2);font-size:13.5px;cursor:pointer")}>
                          <option value="1">
                            {tr("1 guest")}
                          </option>
                          {" "}
                          <option value="2">
                            {tr("2 guests")}
                          </option>
                          {" "}
                          <option value="3">
                            {tr("3 guests")}
                          </option>
                          {" "}
                          <option value="4">
                            {tr("4 guests")}
                          </option>
                        </select>
                      </label>
                      {" "}
                      <button onClick={v.doSearch} disabled={v.searchBad} style={st(`padding:11px 20px;border:0;border-radius:10px;background:${v.searchBtnBg};color:${v.searchBtnFg};font-size:14px;font-weight:700;cursor:${v.searchCursor};transition:filter .14s`)} className={fx("filter:brightness(1.08)", "transform:scale(.97)")}>
                        {tr("See what is open")}
                      </button>
                    </div>
                    {" "}
                    <div style={st("display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-block-start:14px;padding-block-start:13px;border-block-start:1px solid var(--border)")}>
                      <span style={st("font-family:var(--mono);font-size:14px;font-weight:700;padding:5px 11px;border-radius:9px;background:var(--accent-soft);color:var(--accent)")}>
                        {v.searchNights}
                      </span>
                      {" "}
                      <span style={st("font-size:12.5px;color:var(--fg-muted)")}>
                        {tr("A stay here runs from one night to")}{" "}{v.maxNights}{"."}
                      </span>
                    </div>
                    {" "}
                    <div style={st("display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-block-start:12px")}>
                      <span style={st("font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--fg-subtle)")}>
                        {v.openTonightLabel}
                      </span>
                      {" "}
                      {(v.openTonight ?? []).map((o: any, i_o: number) => (
                        <Fragment key={i_o}>
                          <span style={st(`display:flex;align-items:center;gap:7px;padding:5px 11px;border:1px solid var(--border);border-radius:999px;background:var(--surface-2);font-size:12px;font-weight:600;color:${o.fg};opacity:${o.opacity}`)}>
                            <span style={st(`inline-size:8px;block-size:8px;border-radius:3px;background:${o.flat}`)}></span>
                            {o.name}{" "}
                            <span style={st("font-family:var(--mono);font-weight:700")}>
                              {o.count}
                            </span>
                          </span>
                        </Fragment>
                      ))}
                    </div>
                    {" "}
                    {v.searchMsgOn ? (
                      <>
                        <div style={st("display:flex;align-items:flex-start;gap:9px;margin-block-start:12px;padding:11px 13px;border-radius:11px;background:var(--warn-soft);color:var(--warn);font-size:13px;font-weight:600;line-height:1.5")}>
                          <span data-icon="info" style={st("display:inline-flex;inline-size:16px;block-size:16px;flex:0 0 auto;margin-block-start:1px")}><Icon name={"info"} /></span>
                          {v.searchMsg}
                        </div>
                      </>
                    ) : null}
                  </div>
                  {" "}
                  <div style={st(`display:grid;grid-template-columns:${v.triCols};gap:14px;margin-block-start:26px`)}>
                    <div style={st("background:var(--surface);border:1px solid var(--border);border-radius:15px;padding:18px;transition:transform .16s,box-shadow .16s")} className={fx("transform:translateY(-3px);box-shadow:var(--shadow-lift)", null)}>
                      <span style={st("inline-size:34px;block-size:34px;border-radius:10px;background:var(--surface-3);color:var(--fg-muted);display:grid;place-items:center")}>
                        <span data-icon="house" style={st("display:inline-flex;inline-size:18px;block-size:18px")}><Icon name={"house"} /></span>
                      </span>
                      {" "}
                      <h3 style={st("margin:13px 0 7px;font-size:15.5px;font-weight:800")}>
                        {tr("The house")}
                      </h3>
                      {" "}
                      <p style={st("margin:0 0 12px;font-size:13.5px;line-height:1.6;color:var(--fg-muted);text-wrap:pretty")}>
                        {v.houseLine}
                      </p>
                      {" "}
                      <div style={st("display:flex;flex-wrap:wrap;gap:6px")}>
                        {(v.typeChips ?? []).map((c: any, i_c: number) => (
                          <Fragment key={i_c}>
                            <span style={st("display:flex;align-items:center;gap:6px;font-size:11.5px;font-weight:700;padding:4px 9px;border-radius:999px;background:var(--surface-2);border:1px solid var(--border-strong)")}>
                              <span style={st(`inline-size:9px;block-size:9px;border-radius:3px;background:${c.flat}`)}></span>
                              {c.label}
                            </span>
                          </Fragment>
                        ))}
                      </div>
                    </div>
                    {" "}
                    <div style={st("background:var(--surface);border:1px solid var(--border);border-radius:15px;padding:18px;transition:transform .16s,box-shadow .16s")} className={fx("transform:translateY(-3px);box-shadow:var(--shadow-lift)", null)}>
                      <span style={st("inline-size:34px;block-size:34px;border-radius:10px;background:var(--surface-3);color:var(--fg-muted);display:grid;place-items:center")}>
                        <span data-icon="sunrise" style={st("display:inline-flex;inline-size:18px;block-size:18px")}><Icon name={"sunrise"} /></span>
                      </span>
                      {" "}
                      <h3 style={st("margin:13px 0 7px;font-size:15.5px;font-weight:800")}>
                        {tr("In the morning")}
                      </h3>
                      {" "}
                      <p style={st("margin:0 0 12px;font-size:13.5px;line-height:1.6;color:var(--fg-muted);text-wrap:pretty")}>
                        {v.morningLine}
                      </p>
                      {" "}
                      <div style={st("font-size:13px;color:var(--fg-subtle);line-height:1.6")}>
                        {tr("A proper breakfast in the dining room is")}{" "}
                        <strong style={st("color:var(--fg-muted);font-weight:700")}>
                          {v.breakfastHow}
                        </strong>
                        {" "}{tr("— add it when you reserve or later on.")}
                      </div>
                    </div>
                    {" "}
                    <div style={st("background:var(--surface);border:1px solid var(--border);border-radius:15px;overflow:hidden;transition:transform .16s,box-shadow .16s")} className={fx("transform:translateY(-3px);box-shadow:var(--shadow-lift)", null)}>
                      <div style={st("position:relative;block-size:118px;background:radial-gradient(110% 85% at 22% 12%, rgba(255,255,255,.22), rgba(255,255,255,0) 60%), linear-gradient(135deg,#3a6d92,#25415c)")}>
                        <span data-icon="map-pin" style={st("position:absolute;inset-block-start:-8px;inset-inline-end:6px;inline-size:104px;block-size:104px;color:rgba(255,255,255,.2);display:inline-flex")}><Icon name={"map-pin"} /></span>
                      </div>
                      {" "}
                      <div style={st("padding:16px 18px 18px")}>
                        <h3 style={st("margin:0 0 7px;font-size:15.5px;font-weight:800")}>
                          {tr("Finding us")}
                        </h3>
                        {" "}
                        <p style={st("margin:0;font-size:13.5px;line-height:1.6;color:var(--fg-muted);text-wrap:pretty")}>
                          {v.findingLine}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              </>
            ) : null}
            {" "}
            {v.showRooms ? (
              <>
                <section style={st("animation:wh-fade .22s ease-out")}>
                  <h1 style={st(`margin:0;font-size:${v.h1Size};font-weight:800;letter-spacing:-.02em`)}>
                    {tr("The rooms")}
                  </h1>
                  {" "}
                  <p style={st("margin:8px 0 0;max-inline-size:64ch;font-size:14.5px;line-height:1.6;color:var(--fg-muted);text-wrap:pretty")}>
                    {v.roomsIntro}
                  </p>
                  {" "}
                  <div style={st("display:flex;flex-direction:column;gap:16px;margin-block-start:22px")}>
                    {(v.roomsList ?? []).map((r: any, i_r: number) => (
                      <Fragment key={i_r}>
                        <article style={st("background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden;transition:transform .16s,box-shadow .16s")} className={fx("transform:translateY(-3px);box-shadow:var(--shadow-lift)", null)}>
                          <div style={st(`display:grid;grid-template-columns:${v.roomsCols}`)}>
                            <div style={st(`position:relative;min-block-size:190px;background:${r.tint}`)}>
                              <span data-icon={r.icon} style={st("position:absolute;inset-block-start:50%;inset-inline:0;margin-inline:auto;transform:translateY(-50%);inline-size:96px;block-size:96px;color:rgba(255,255,255,.26);display:inline-flex")}><Icon name={r.icon} /></span>
                              {" "}
                              <span style={st("position:absolute;inset-block-end:10px;inset-inline-start:10px;font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.05em;padding:3px 8px;border-radius:6px;background:rgba(0,0,0,.28);color:rgba(255,255,255,.92)")}>
                                {r.code}
                              </span>
                              {" "}
                              <span style={st("position:absolute;inset-block-start:10px;inset-inline-end:10px;font-family:var(--mono);font-size:10px;font-weight:600;padding:3px 8px;border-radius:6px;background:rgba(0,0,0,.28);color:rgba(255,255,255,.92)")}>
                                {r.count}
                              </span>
                            </div>
                            {" "}
                            <div style={st("padding:20px 22px")}>
                              <div style={st("display:flex;align-items:baseline;gap:10px;flex-wrap:wrap")}>
                                <h2 style={st("margin:0;font-size:19px;font-weight:800;letter-spacing:-.02em")}>
                                  {r.name}
                                </h2>
                                {" "}
                                <span style={st("font-size:12.5px;font-weight:600;color:var(--fg-subtle)")}>
                                  {r.sleeps}
                                </span>
                              </div>
                              {" "}
                              <p style={st("margin:9px 0 0;font-size:14px;line-height:1.65;color:var(--fg-muted);max-inline-size:60ch;text-wrap:pretty")}>
                                {r.long}
                              </p>
                              {" "}
                              <div style={st("display:flex;flex-wrap:wrap;gap:7px;margin-block-start:14px")}>
                                {(r.has ?? []).map((h: any, i_h: number) => (
                                  <Fragment key={i_h}>
                                    <span style={st("display:flex;align-items:center;gap:6px;padding:5px 10px;border:1px solid var(--border);border-radius:999px;background:var(--surface-2);font-size:12px;font-weight:600;color:var(--fg-muted)")}>
                                      <span data-icon={h.icon} style={st("display:inline-flex;inline-size:13px;block-size:13px;color:var(--fg-subtle)")}><Icon name={h.icon} /></span>
                                      {h.label}
                                    </span>
                                  </Fragment>
                                ))}
                              </div>
                              {" "}
                              <div style={st("display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-block-start:14px;font-size:12px;color:var(--fg-subtle)")}>
                                <span style={st("font-weight:600")}>
                                  {r.floors}
                                </span>
                                {" "}
                                <span style={st("font-family:var(--mono);letter-spacing:.02em")}>
                                  {r.numbers}
                                </span>
                              </div>
                              {" "}
                              <div style={st("display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-block-start:18px;padding-block-start:15px;border-block-start:1px solid var(--border)")}>
                                <div>
                                  <div style={st("font-size:12.5px;font-weight:600;color:var(--fg-subtle)")}>
                                    {tr("from")}{" "}
                                    <span style={st("font-family:var(--mono);font-size:20px;font-weight:700;letter-spacing:-.02em;color:var(--fg)")}>
                                      {r.from}
                                    </span>
                                    {" "}{tr("a night")}
                                  </div>
                                  {" "}
                                  <div style={st("font-size:12px;color:var(--fg-subtle);margin-block-start:3px")}>
                                    {r.fromNote}
                                  </div>
                                </div>
                                {" "}
                                <div style={st("display:flex;align-items:center;gap:11px;margin-inline-start:auto")}>
                                  {r.hasOpenNote ? (
                                    <>
                                      <span style={st("font-family:var(--mono);font-size:12px;font-weight:600;color:var(--fg-subtle)")}>
                                        {r.openNote}
                                      </span>
                                    </>
                                  ) : null}
                                  {" "}
                                  <button onClick={r.goType} style={st("padding:10px 17px;border:0;border-radius:10px;background:var(--accent);color:var(--accent-fg);font-size:13.5px;font-weight:700;cursor:pointer;white-space:nowrap;transition:filter .14s")} className={fx("filter:brightness(1.08)", "transform:scale(.97)")}>
                                    {tr("Look at this room")}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </article>
                      </Fragment>
                    ))}
                  </div>
                  {" "}
                  <div style={st("display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-block-start:20px;padding:16px 18px;background:var(--surface-2);border:1px solid var(--border);border-radius:14px")}>
                    <span style={st("font-size:13.5px;color:var(--fg-muted)")}>
                      {v.roomsSearchLine}
                    </span>
                    {" "}
                    <button onClick={v.goSearch} style={st("margin-inline-start:auto;display:flex;align-items:center;gap:7px;padding:9px 15px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface);font-size:13px;font-weight:700;cursor:pointer")} className={fx("filter:brightness(.97)", null)}>
                      <span data-icon="calendar-search" style={st("display:inline-flex;inline-size:14px;block-size:14px")}><Icon name={"calendar-search"} /></span>
                      {tr("Search your dates")}
                    </button>
                  </div>
                </section>
              </>
            ) : null}
            {" "}
            {v.showFind ? (
              <>
                <section style={st("animation:wh-fade .22s ease-out;max-inline-size:860px;margin-inline:auto")}>
                  <div style={st("position:relative;border-radius:18px;overflow:hidden;min-block-size:170px;background:radial-gradient(110% 85% at 22% 12%, rgba(255,255,255,.22), rgba(255,255,255,0) 60%), linear-gradient(135deg,#3a6d92,#25415c);padding:24px 26px;display:flex;flex-direction:column;justify-content:flex-end")}>
                    <span data-icon="map-pin" style={st("position:absolute;inset-block-start:-14px;inset-inline-end:8px;inline-size:150px;block-size:150px;color:rgba(255,255,255,.18);display:inline-flex")}><Icon name={"map-pin"} /></span>
                    {" "}
                    <div style={st("position:relative")}>
                      <div style={st("font-size:11.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.72)")}>
                        {tr("Find us")}
                      </div>
                      {" "}
                      <div style={st("font-size:26px;font-weight:800;letter-spacing:-.02em;color:#fff;margin-block-start:6px")}>
                        {v.address}
                      </div>
                    </div>
                  </div>
                  {" "}
                  <div style={st(`display:grid;grid-template-columns:${v.triCols};gap:14px;margin-block-start:16px`)}>
                    <div style={st("background:var(--surface);border:1px solid var(--border);border-radius:15px;padding:18px;transition:transform .16s,box-shadow .16s")} className={fx("transform:translateY(-3px);box-shadow:var(--shadow-lift)", null)}>
                      <span style={st("inline-size:34px;block-size:34px;border-radius:10px;background:var(--surface-3);color:var(--fg-muted);display:grid;place-items:center")}>
                        <span data-icon="train-front" style={st("display:inline-flex;inline-size:18px;block-size:18px")}><Icon name={"train-front"} /></span>
                      </span>
                      {" "}
                      <h3 style={st("margin:13px 0 7px;font-size:15.5px;font-weight:800")}>
                        {tr("By train")}
                      </h3>
                      {" "}
                      <p style={st("margin:0;font-size:13.5px;line-height:1.6;color:var(--fg-muted);text-wrap:pretty")}>
                        {v.trainLine}
                      </p>
                    </div>
                    {" "}
                    <div style={st("background:var(--surface);border:1px solid var(--border);border-radius:15px;padding:18px;transition:transform .16s,box-shadow .16s")} className={fx("transform:translateY(-3px);box-shadow:var(--shadow-lift)", null)}>
                      <span style={st("inline-size:34px;block-size:34px;border-radius:10px;background:var(--surface-3);color:var(--fg-muted);display:grid;place-items:center")}>
                        <span data-icon="car-front" style={st("display:inline-flex;inline-size:18px;block-size:18px")}><Icon name={"car-front"} /></span>
                      </span>
                      {" "}
                      <h3 style={st("margin:13px 0 7px;font-size:15.5px;font-weight:800")}>
                        {tr("By car")}
                      </h3>
                      {" "}
                      <p style={st("margin:0;font-size:13.5px;line-height:1.6;color:var(--fg-muted);text-wrap:pretty")}>
                        {v.carLine}
                      </p>
                    </div>
                    {" "}
                    <div style={st("background:var(--surface);border:1px solid var(--border);border-radius:15px;padding:18px;transition:transform .16s,box-shadow .16s")} className={fx("transform:translateY(-3px);box-shadow:var(--shadow-lift)", null)}>
                      <span style={st("inline-size:34px;block-size:34px;border-radius:10px;background:var(--surface-3);color:var(--fg-muted);display:grid;place-items:center")}>
                        <span data-icon="footprints" style={st("display:inline-flex;inline-size:18px;block-size:18px")}><Icon name={"footprints"} /></span>
                      </span>
                      {" "}
                      <h3 style={st("margin:13px 0 7px;font-size:15.5px;font-weight:800")}>
                        {tr("On foot")}
                      </h3>
                      {" "}
                      <p style={st("margin:0;font-size:13.5px;line-height:1.6;color:var(--fg-muted);text-wrap:pretty")}>
                        {tr("From the harbour wall, keep the water on your right until the steps. Blue door, brass bell, a wren on the fanlight.")}
                      </p>
                    </div>
                  </div>
                  {" "}
                  <div style={st("margin-block-start:16px;background:var(--surface);border:1px solid var(--border);border-radius:15px;overflow:hidden")}>
                    <div style={st("padding:16px 20px;border-block-end:1px solid var(--border)")}>
                      <h2 style={st("margin:0;font-size:15.5px;font-weight:800")}>
                        {tr("The day, roughly")}
                      </h2>
                    </div>
                    {" "}
                    <div style={st(`display:grid;grid-template-columns:${v.triCols}`)}>
                      <div style={st("padding:16px 20px;border-inline-end:1px solid var(--border)")}>
                        <div style={st("font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--fg-subtle)")}>
                          {tr("Arrive")}
                        </div>
                        {" "}
                        <div style={st("font-family:var(--mono);font-size:17px;font-weight:700;margin-block-start:6px")}>
                          {tr("from")}{" "}{v.arriveFrom}
                        </div>
                        {" "}
                        <div style={st("font-size:13px;color:var(--fg-muted);margin-block-start:4px")}>
                          {tr("Earlier is usually fine — leave your bags with us and go and look at the water.")}
                        </div>
                      </div>
                      {" "}
                      <div style={st("padding:16px 20px;border-inline-end:1px solid var(--border)")}>
                        <div style={st("font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--fg-subtle)")}>
                          {tr("Leave")}
                        </div>
                        {" "}
                        <div style={st("font-family:var(--mono);font-size:17px;font-weight:700;margin-block-start:6px")}>
                          {tr("by")}{" "}{v.leaveBy}
                        </div>
                        {" "}
                        <div style={st("font-size:13px;color:var(--fg-muted);margin-block-start:4px")}>
                          {v.lateLine}
                        </div>
                      </div>
                      {" "}
                      <div style={st("padding:16px 20px")}>
                        <div style={st("font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--fg-subtle)")}>
                          {tr("The morning")}
                        </div>
                        {" "}
                        <div style={st("font-family:var(--mono);font-size:17px;font-weight:700;margin-block-start:6px")}>
                          {v.breakfastHours}
                        </div>
                        {" "}
                        <div style={st("font-size:13px;color:var(--fg-muted);margin-block-start:4px")}>
                          {tr("Tea, coffee and the papers are out from seven. Breakfast in the dining room is added per person, per night.")}
                        </div>
                      </div>
                    </div>
                    {" "}
                    <div style={st("padding:16px 20px;border-block-start:1px solid var(--border);background:var(--surface-2);display:flex;flex-wrap:wrap;gap:10px")}>
                      <span style={st("display:flex;align-items:center;gap:7px;padding:6px 12px;border:1px solid var(--border);border-radius:999px;background:var(--surface);font-size:12.5px;font-weight:600;color:var(--fg-muted)")}>
                        <span data-icon="wifi" style={st("display:inline-flex;inline-size:14px;block-size:14px;color:var(--fg-subtle)")}><Icon name={"wifi"} /></span>
                        {tr("WiFi throughout")}
                      </span>
                      {" "}
                      <span style={st("display:flex;align-items:center;gap:7px;padding:6px 12px;border:1px solid var(--border);border-radius:999px;background:var(--surface);font-size:12.5px;font-weight:600;color:var(--fg-muted)")}>
                        <span data-icon="dog" style={st("display:inline-flex;inline-size:14px;block-size:14px;color:var(--fg-subtle)")}><Icon name={"dog"} /></span>
                        {tr("Dogs in the garden doubles and the loft suites")}
                      </span>
                      {" "}
                      <span style={st("display:flex;align-items:center;gap:7px;padding:6px 12px;border:1px solid var(--border);border-radius:999px;background:var(--surface);font-size:12.5px;font-weight:600;color:var(--fg-muted)")}>
                        <span data-icon="moon" style={st("display:inline-flex;inline-size:14px;block-size:14px;color:var(--fg-subtle)")}><Icon name={"moon"} /></span>
                        {tr("Quiet in the house after 22:30")}
                      </span>
                      {" "}
                      <span style={st("display:flex;align-items:center;gap:7px;padding:6px 12px;border:1px solid var(--border);border-radius:999px;background:var(--surface);font-size:12.5px;font-weight:600;color:var(--fg-muted)")}>
                        <span data-icon="phone" style={st("display:inline-flex;inline-size:14px;block-size:14px;color:var(--fg-subtle)")}><Icon name={"phone"} /></span>
                        <a href={v.telHref} style={st("font-family:var(--mono);color:var(--fg-muted)")}>
                          {v.phone}
                        </a>
                      </span>
                    </div>
                  </div>
                  {" "}
                  <div style={st("display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-block-start:16px")}>
                    <button onClick={v.goSearchFocus} style={st("padding:11px 18px;border:0;border-radius:10px;background:var(--accent);color:var(--accent-fg);font-size:13.5px;font-weight:700;cursor:pointer;transition:filter .14s")} className={fx("filter:brightness(1.08)", "transform:scale(.97)")}>
                      {tr("See what is open")}
                    </button>
                    {" "}
                    <button onClick={v.goRooms} style={st("padding:11px 18px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface);font-size:13.5px;font-weight:700;cursor:pointer")} className={fx("filter:brightness(.97)", null)}>
                      {tr("Look at the rooms")}
                    </button>
                  </div>
                </section>
              </>
            ) : null}
            {" "}
            {v.showResults ? (
              <>
                <section style={st("animation:wh-fade .22s ease-out")}>
                  <div style={st("display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-block-end:6px")}>
                    <div>
                      <h1 style={st(`margin:0;font-size:${v.h1Size};font-weight:800;letter-spacing:-.02em`)}>
                        {tr("What is open")}
                      </h1>
                      {" "}
                      <div style={st("margin-block-start:6px;font-size:14px;color:var(--fg-muted)")}>
                        <span style={st("font-family:var(--mono);font-weight:600;color:var(--fg)")}>
                          {v.resRange}
                        </span>
                        {" · "}{v.resNights}{" · "}{v.resGuests}
                      </div>
                    </div>
                    {" "}
                    <button onClick={v.goHome} style={st("display:flex;align-items:center;gap:7px;padding:9px 14px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface);font-size:13px;font-weight:700;cursor:pointer")} className={fx("background:var(--surface-2)", null)}>
                      <span data-icon="calendar-days" style={st("display:inline-flex;inline-size:15px;block-size:15px")}><Icon name={"calendar-days"} /></span>
                      {tr("Change the dates")}
                    </button>
                  </div>
                  {" "}
                  {v.satRuleOn ? (
                    <>
                      <div style={st("display:flex;align-items:flex-start;gap:9px;margin-block-start:14px;padding:12px 14px;border-radius:12px;background:var(--warn-soft);color:var(--warn);font-size:13.5px;font-weight:600;line-height:1.5")}>
                        <span data-icon="info" style={st("display:inline-flex;inline-size:16px;block-size:16px;flex:0 0 auto;margin-block-start:1px")}><Icon name={"info"} /></span>
                        <span style={st("flex:1;min-inline-size:0")}>
                          {tr("A Saturday arrival needs at least two nights — we would rather you had the whole weekend.")}
                        </span>
                        <button onClick={v.satFixGo} style={st("flex:0 0 auto;padding:6px 11px;border:1px solid var(--warn);border-radius:9px;background:transparent;color:var(--warn);font-size:12.5px;font-weight:700;cursor:pointer;white-space:nowrap")} className={fx("background:var(--surface)", null)}>
                          {tr("Try leaving on")}{" "}{v.satFix}
                        </button>
                      </div>
                    </>
                  ) : null}
                  {" "}
                  {v.lenRuleOn ? (
                    <>
                      <div style={st("display:flex;align-items:flex-start;gap:9px;margin-block-start:14px;padding:12px 14px;border-radius:12px;background:var(--warn-soft);color:var(--warn);font-size:13.5px;font-weight:600;line-height:1.5")}>
                        <span data-icon="info" style={st("display:inline-flex;inline-size:16px;block-size:16px;flex:0 0 auto;margin-block-start:1px")}><Icon name={"info"} /></span>
                        {v.lenRuleMsg}
                      </div>
                    </>
                  ) : null}
                  {" "}
                  {v.houseDownOn ? (
                    <>
                      <div role="alert" style={st("display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-block-start:14px;padding:14px 16px;border-radius:12px;background:var(--warn-soft);color:var(--warn);font-size:13.5px;font-weight:700;line-height:1.5")}>
                        <span data-icon="wifi-off" style={st("display:inline-flex;inline-size:17px;block-size:17px;flex:0 0 auto")}><Icon name={"wifi-off"} /></span>
                        {" "}
                        <span style={st("flex:1;min-inline-size:200px")}>
                          {tr("We could not reach the house just now.")}
                        </span>
                        {" "}
                        <button onClick={v.retryHouse} style={st("padding:8px 14px;border:1px solid var(--warn);border-radius:9px;background:transparent;color:var(--warn);font-size:12.5px;font-weight:700;cursor:pointer")} className={fx("background:var(--surface)", null)}>
                          {tr("Try again")}
                        </button>
                      </div>
                    </>
                  ) : null}
                  {" "}
                  {v.rangeSum.on ? (
                    <>
                      <div style={st("display:flex;flex-wrap:wrap;gap:10px;margin-block-start:14px;padding:13px 16px;background:var(--surface);border:1px solid var(--border);border-radius:13px;align-items:center")}>
                        <span style={st("font-family:var(--mono);font-size:13px;font-weight:700;padding:4px 10px;border-radius:8px;background:var(--surface-3)")}>
                          {v.rangeSum.nights}
                        </span>
                        {" "}
                        <span style={st("font-size:12.5px;font-weight:600;color:var(--fg-muted)")}>
                          {v.rangeSum.kinds}
                        </span>
                        {" "}
                        {v.rangeSum.bandOn ? (
                          <>
                            <span style={st("font-size:12.5px;color:var(--fg-subtle)")}>
                              {tr("Nightly rates")}{" "}
                              <span style={st("font-family:var(--mono);font-weight:700;color:var(--fg)")}>
                                {v.rangeSum.band}
                              </span>
                            </span>
                          </>
                        ) : null}
                        {" "}
                        <span style={st("flex-basis:100%;font-size:12px;color:var(--fg-subtle);text-wrap:pretty")}>
                          {v.rangeSum.weekendNote}
                        </span>
                      </div>
                    </>
                  ) : null}
                  {" "}
                  {v.noneFits.on ? (
                    <>
                      <div role="status" style={st("margin-block-start:18px;padding:20px;border-radius:16px;background:var(--surface);border:1px solid var(--border-strong)")}>
                        <div style={st("display:flex;align-items:center;gap:9px;font-size:16px;font-weight:800;letter-spacing:-.01em")}>
                          <span data-icon="calendar-x" style={st("display:inline-flex;inline-size:18px;block-size:18px;color:var(--fg-muted)")}><Icon name={"calendar-x"} /></span>
                          {v.noneFits.title}
                        </div>
                        {v.noneFits.twoOn ? (
                          <p style={st("margin:9px 0 0;font-size:13.5px;line-height:1.6;color:var(--fg-muted);text-wrap:pretty")}>
                            {v.noneFits.twoLine}
                          </p>
                        ) : null}
                        {" "}
                        {v.noneFits.hasEarliest ? (
                          <>
                            <p style={st("margin:9px 0 0;font-size:13.5px;line-height:1.6;color:var(--fg-muted)")}>
                              {tr("The earliest we could take you for")}{" "}{v.noneFits.nights}{" "}{tr("is")}{" "}
                              <span style={st("font-family:var(--mono);font-weight:700;color:var(--fg)")}>
                                {v.noneFits.earliest}
                              </span>
                              {"."}
                            </p>
                          </>
                        ) : null}
                        {" "}
                        {v.noneFits.noEarliest ? (
                          <>
                            <p style={st("margin:9px 0 0;font-size:13.5px;line-height:1.6;color:var(--fg-muted)")}>
                              {tr("Nothing in the next six weeks. Ring us on")}{" "}
                              <a href={v.telHref} style={st("font-family:var(--mono)")}>
                                {v.phone}
                              </a>
                              {" "}{tr("and we will see what we can do.")}
                            </p>
                          </>
                        ) : null}
                        {" "}
                        <div style={st("display:flex;gap:9px;flex-wrap:wrap;margin-block-start:14px")}>
                          {v.noneFits.twoOn ? (
                            <button onClick={v.noneFits.reserveTwo} style={st("display:flex;align-items:center;gap:7px;padding:10px 16px;border:0;border-radius:10px;background:var(--accent);color:var(--accent-fg);font-size:13px;font-weight:700;cursor:pointer")} className={fx("filter:brightness(1.08)", null)}>
                              <span data-icon="bed-double" style={st("display:inline-flex;inline-size:14px;block-size:14px")}><Icon name={"bed-double"} /></span>
                              {tr("Reserve two rooms")}
                            </button>
                          ) : null}
                          {v.noneFits.hasEarliest ? (
                            <>
                              <button onClick={v.noneFits.goEarliest} style={st("display:flex;align-items:center;gap:7px;padding:10px 16px;border:0;border-radius:10px;background:var(--accent);color:var(--accent-fg);font-size:13px;font-weight:700;cursor:pointer")} className={fx("filter:brightness(1.08)", null)}>
                                <span data-icon="arrow-right" style={st("display:inline-flex;inline-size:14px;block-size:14px")}><Icon name={"arrow-right"} /></span>
                                {tr("Move the dates")}
                              </button>
                            </>
                          ) : null}
                          {" "}
                          <a href={v.telHref} style={st("display:flex;align-items:center;gap:7px;padding:10px 16px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface);color:var(--fg);font-size:13px;font-weight:700;text-decoration:none")} className={fx("background:var(--surface-2)", null)}>
                            <span data-icon="phone" style={st("display:inline-flex;inline-size:14px;block-size:14px")}><Icon name={"phone"} /></span>
                            {tr("Ring us on")}{" "}
                            <span style={st("font-family:var(--mono)")}>
                              {v.phone}
                            </span>
                          </a>
                        </div>
                      </div>
                    </>
                  ) : null}
                  {" "}
                  <div style={st("display:flex;flex-direction:column;gap:14px;margin-block-start:18px")}>
                    {(v.offers ?? []).map((o: any, i_o: number) => (
                      <Fragment key={i_o}>
                        <article style={st(`background:var(--surface);border:1px solid ${o.border};border-radius:16px;overflow:hidden;transition:transform .16s,box-shadow .16s`)} className={fx("transform:translateY(-3px);box-shadow:var(--shadow-lift)", null)}>
                          <div style={st(`display:grid;grid-template-columns:${o.cols}`)}>
                            <div style={st(`position:relative;min-block-size:${o.tileH};background:${o.tint};opacity:${o.tileOpacity}`)}>
                              <span data-icon={o.icon} style={st("position:absolute;inset-block-start:50%;inset-inline:0;margin-inline:auto;transform:translateY(-50%);inline-size:88px;block-size:88px;color:rgba(255,255,255,.28);display:inline-flex")}><Icon name={o.icon} /></span>
                              {" "}
                              <span style={st("position:absolute;inset-block-end:10px;inset-inline-start:10px;font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.05em;padding:3px 8px;border-radius:6px;background:rgba(10,10,15,.34);color:rgba(255,255,255,.92)")}>
                                {o.chip}
                              </span>
                              {" "}
                              {o.hasLeft ? (
                                <>
                                  <span style={st(`position:absolute;inset-block-start:10px;inset-inline-end:10px;font-size:10.5px;font-weight:700;padding:4px 9px;border-radius:999px;background:${o.leftBg};color:${o.leftFg};white-space:nowrap`)}>
                                    {o.leftText}
                                  </span>
                                </>
                              ) : null}
                            </div>
                            {" "}
                            <div style={st("padding:18px 20px")}>
                              <div style={st("display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-wrap:wrap")}>
                                <div style={st("min-inline-size:0;flex:1 1 260px")}>
                                  <h2 style={st("margin:0;font-size:17.5px;font-weight:800;letter-spacing:-.015em")}>
                                    {o.name}
                                  </h2>
                                  {" "}
                                  <div style={st("margin-block-start:4px;font-size:12.5px;color:var(--fg-subtle);font-weight:600")}>
                                    {o.sleeps}
                                  </div>
                                  {" "}
                                  <p style={st("margin:9px 0 0;font-size:13.5px;line-height:1.6;color:var(--fg-muted);max-inline-size:52ch;text-wrap:pretty")}>
                                    {o.line}
                                  </p>
                                </div>
                                {" "}
                                {o.open ? (
                                  <>
                                    <div style={st("text-align:end;flex:0 0 auto")}>
                                      <div style={st("font-family:var(--mono);font-size:20px;font-weight:700;letter-spacing:-.02em")}>
                                        {o.rateFrom}
                                      </div>
                                      {" "}
                                      <div style={st("font-size:11.5px;color:var(--fg-subtle);margin-block-start:2px")}>
                                        {tr("a night, before taxes")}
                                      </div>
                                      {" "}
                                      <div style={st("margin-block-start:10px;padding-block-start:9px;border-block-start:1px solid var(--border)")}>
                                        <div style={st("font-family:var(--mono);font-size:15.5px;font-weight:700")}>
                                          {o.total}
                                        </div>
                                        {" "}
                                        <div style={st("font-size:11.5px;color:var(--fg-subtle);margin-block-start:1px")}>
                                          {o.nightsLabel}{tr(", all in")}
                                        </div>
                                      </div>
                                    </div>
                                  </>
                                ) : null}
                              </div>
                              {" "}
                              {o.open ? (
                                <>
                                  <div style={st("margin-block-start:16px")}>
                                    <button onClick={o.toggleRates} style={st("display:flex;align-items:center;gap:7px;padding:7px 11px;border:1px solid var(--border-strong);border-radius:9px;background:var(--surface-2);font-size:12.5px;font-weight:700;color:var(--fg-muted);cursor:pointer")} className={fx("background:var(--surface-3)", null)}>
                                      <span data-icon={o.ratesIcon} style={st("display:inline-flex;inline-size:14px;block-size:14px")}><Icon name={o.ratesIcon} /></span>
                                      {o.ratesLabel}
                                    </button>
                                    {" "}
                                    {o.ratesOpen ? (
                                      <>
                                        <div style={st("margin-block-start:12px;border:1px solid var(--border);border-radius:12px;background:var(--surface-2);padding:6px 14px;animation:wh-fade .16s ease-out")}>
                                          {(o.nights ?? []).map((n: any, i_n: number) => (
                                            <Fragment key={i_n}>
                                              <div style={st("display:flex;align-items:center;gap:10px;padding:8px 0;border-block-end:1px solid var(--border)")}>
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
                                          <div style={st("display:flex;align-items:center;gap:10px;padding:8px 0;border-block-end:1px solid var(--border)")}>
                                            <span style={st("font-size:12.5px;font-weight:700;color:var(--fg-muted)")}>
                                              {o.nightsLabel}
                                            </span>
                                            {" "}
                                            <span style={st("margin-inline-start:auto;font-family:var(--mono);font-size:13px;font-weight:600")}>
                                              {o.subtotal}
                                            </span>
                                          </div>
                                          {" "}
                                          <div style={st("display:flex;align-items:center;gap:10px;padding:8px 0;border-block-end:1px solid var(--border)")}>
                                            <span style={st("font-size:12.5px;color:var(--fg-muted)")}>
                                              {v.taxLabel}
                                            </span>
                                            {" "}
                                            <span style={st("margin-inline-start:auto;font-family:var(--mono);font-size:13px;font-weight:600")}>
                                              {o.tax}
                                            </span>
                                          </div>
                                          {" "}
                                          <div style={st("display:flex;align-items:center;gap:10px;padding:10px 0")}>
                                            <span style={st("font-size:13px;font-weight:800")}>
                                              {tr("What you would pay")}
                                            </span>
                                            {" "}
                                            <span style={st("margin-inline-start:auto;font-family:var(--mono);font-size:15px;font-weight:700")}>
                                              {o.total}
                                            </span>
                                          </div>
                                        </div>
                                      </>
                                    ) : null}
                                  </div>
                                  {" "}
                                  <div style={st("display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-block-start:16px")}>
                                    <button onClick={o.goType} style={st("padding:10px 18px;border:0;border-radius:10px;background:var(--accent);color:var(--accent-fg);font-size:13.5px;font-weight:700;cursor:pointer;transition:filter .14s")} className={fx("filter:brightness(1.08)", "transform:scale(.97)")}>
                                      {tr("Look at this room")}
                                    </button>
                                    {" "}
                                    <span style={st("font-size:12.5px;color:var(--fg-subtle)")}>
                                      {v.cancelLine}
                                    </span>
                                  </div>
                                </>
                              ) : null}
                              {" "}
                              {o.soldOut ? (
                                <>
                                  <div style={st("margin-block-start:14px;padding:14px;border-radius:12px;background:var(--surface-2);border:1px solid var(--border)")}>
                                    <div style={st("display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:700;color:var(--fg-muted)")}>
                                      <span data-icon="calendar-x" style={st("display:inline-flex;inline-size:16px;block-size:16px")}><Icon name={"calendar-x"} /></span>
                                      {tr("Nothing open for these dates")}
                                    </div>
                                    {" "}
                                    {o.hasEarliest ? (
                                      <>
                                        <p style={st("margin:8px 0 12px;font-size:13px;line-height:1.6;color:var(--fg-subtle)")}>
                                          {tr("The earliest we could take you for")}{" "}{o.nightsLabel}{" "}{tr("is")}{" "}
                                          <span style={st("font-family:var(--mono);color:var(--fg-muted);font-weight:600")}>
                                            {o.earliest}
                                          </span>
                                          {"."}
                                        </p>
                                        {" "}
                                        <button onClick={o.goEarliest} style={st("display:flex;align-items:center;gap:7px;padding:9px 15px;border:1px solid var(--accent);border-radius:10px;background:transparent;color:var(--accent);font-size:13px;font-weight:700;cursor:pointer")} className={fx("background:var(--accent-soft)", null)}>
                                          <span data-icon="arrow-right" style={st("display:inline-flex;inline-size:14px;block-size:14px")}><Icon name={"arrow-right"} /></span>
                                          {tr("Move the dates to")}{" "}{o.earliest}
                                        </button>
                                      </>
                                    ) : null}
                                    {" "}
                                    {o.noEarliest ? (
                                      <>
                                        <p style={st("margin:8px 0 0;font-size:13px;line-height:1.6;color:var(--fg-subtle)")}>
                                          {tr("Nothing in the next six weeks. Ring us on")}{" "}
                                          <a href={v.telHref} style={st("font-family:var(--mono)")}>
                                            {v.phone}
                                          </a>
                                          {" "}{tr("and we will see what we can do.")}
                                        </p>
                                      </>
                                    ) : null}
                                  </div>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </article>
                      </Fragment>
                    ))}
                  </div>
                </section>
              </>
            ) : null}
            {" "}
            {v.showType ? (
              <>
                <section style={st("animation:wh-fade .22s ease-out")}>
                  <button onClick={v.rt.back} style={st("display:flex;align-items:center;gap:7px;padding:7px 11px;margin-block-end:16px;border:1px solid var(--border-strong);border-radius:9px;background:var(--surface);font-size:12.5px;font-weight:700;color:var(--fg-muted);cursor:pointer")} className={fx("background:var(--surface-2)", null)}>
                    <span data-icon="arrow-left" style={st("display:inline-flex;inline-size:14px;block-size:14px")}><Icon name={"arrow-left"} /></span>
                    {v.rt.backLabel}
                  </button>
                  {" "}
                  <div style={st(`display:grid;grid-template-columns:${v.rt.cols};gap:22px;align-items:start`)}>
                    <div>
                      <div style={st(`position:relative;border-radius:18px;overflow:hidden;min-block-size:250px;background:${v.rt.tint}`)}>
                        <span data-icon={v.rt.icon} style={st("position:absolute;inset-block-start:50%;inset-inline:0;margin-inline:auto;transform:translateY(-50%);inline-size:140px;block-size:140px;color:rgba(255,255,255,.26);display:inline-flex")}><Icon name={v.rt.icon} /></span>
                        {" "}
                        <span style={st("position:absolute;inset-block-end:12px;inset-inline-start:12px;font-family:var(--mono);font-size:10.5px;font-weight:600;letter-spacing:.05em;padding:4px 9px;border-radius:7px;background:rgba(10,10,15,.34);color:rgba(255,255,255,.92)")}>
                          {v.rt.chip}
                        </span>
                        {" "}
                        {v.rt.hasLeft ? (
                          <>
                            <span style={st(`position:absolute;inset-block-start:12px;inset-inline-end:12px;font-size:11px;font-weight:700;padding:5px 10px;border-radius:999px;background:${v.rt.leftBg};color:${v.rt.leftFg}`)}>
                              {v.rt.leftText}
                            </span>
                          </>
                        ) : null}
                      </div>
                      {" "}
                      <h1 style={st(`margin:20px 0 0;font-size:${v.h1Size};font-weight:800;letter-spacing:-.02em`)}>
                        {v.rt.name}
                      </h1>
                      {" "}
                      <div style={st("margin-block-start:6px;font-size:13px;color:var(--fg-subtle);font-weight:600")}>
                        {v.rt.sleeps}{" "}{tr("· from")}{" "}
                        <span style={st("font-family:var(--mono)")}>
                          {v.rt.from}
                        </span>
                        {" "}{tr("a night")}
                      </div>
                      {" "}
                      <p style={st("margin:14px 0 0;font-size:15px;line-height:1.65;color:var(--fg-muted);max-inline-size:58ch;text-wrap:pretty")}>
                        {v.rt.long}
                      </p>
                      {" "}
                      <h2 style={st("margin:24px 0 10px;font-size:13px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--fg-subtle)")}>
                        {tr("What is in the room")}
                      </h2>
                      {" "}
                      <div style={st("display:flex;flex-wrap:wrap;gap:8px")}>
                        {(v.rt.has ?? []).map((h: any, i_h: number) => (
                          <Fragment key={i_h}>
                            <span style={st("display:flex;align-items:center;gap:7px;font-size:13px;font-weight:600;padding:7px 12px;border-radius:999px;background:var(--surface);border:1px solid var(--border-strong)")}>
                              <span data-icon={h.icon} style={st("display:inline-flex;inline-size:14px;block-size:14px;color:var(--fg-subtle)")}><Icon name={h.icon} /></span>
                              {h.label}
                            </span>
                          </Fragment>
                        ))}
                      </div>
                      {" "}
                      <h2 style={st("margin:24px 0 10px;font-size:13px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--fg-subtle)")}>
                        {tr("Which rooms these are")}
                      </h2>
                      {" "}
                      <div style={st("padding:14px 16px;background:var(--surface);border:1px solid var(--border);border-radius:13px")}>
                        <div style={st("font-family:var(--mono);font-size:14px;font-weight:600;letter-spacing:.03em")}>
                          {v.rt.numbers}
                        </div>
                        {" "}
                        <div style={st("font-size:12.5px;color:var(--fg-subtle);margin-block-start:7px")}>
                          {v.rt.floors}{" · "}{v.rt.howMany}{tr(". We pick the one you get on the day you arrive.")}
                        </div>
                      </div>
                    </div>
                    {" "}
                    <div style={st(`background:var(--surface);border:1px solid var(--border-strong);border-radius:16px;box-shadow:var(--shadow);padding:18px;position:${v.rt.sticky};inset-block-start:84px`)}>
                      {v.rt.askDates ? (
                        <>
                          <div style={st("font-size:12.5px;color:var(--fg-subtle);font-weight:600")}>
                            {tr("Your dates")}
                          </div>
                          {" "}
                          <div style={st("display:flex;flex-direction:column;gap:10px;margin-block-start:10px")}>
                            <label style={st("display:flex;flex-direction:column;gap:6px")}>
                              <span style={st("font-size:12px;font-weight:700;color:var(--fg-muted)")}>
                                {tr("Arriving")}
                              </span>
                              {" "}
                              <input id="rt-arrive" type="date" value={v.sArrive ?? ""} min={v.minDate} onChange={v.onArrive} style={st("padding:10px 12px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-2);font-size:13.5px")} />
                            </label>
                            {" "}
                            <label style={st("display:flex;flex-direction:column;gap:6px")}>
                              <span style={st("font-size:12px;font-weight:700;color:var(--fg-muted)")}>
                                {tr("Leaving")}
                              </span>
                              {" "}
                              <input type="date" value={v.sDepart ?? ""} min={v.minDepart} onChange={v.onDepart} style={st("padding:10px 12px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-2);font-size:13.5px")} />
                            </label>
                            {" "}
                            <label style={st("display:flex;flex-direction:column;gap:6px")}>
                              <span style={st("font-size:12px;font-weight:700;color:var(--fg-muted)")}>
                                {tr("Guests")}
                              </span>
                              {" "}
                              <select value={v.sGuests} onChange={v.onGuests} style={st("padding:10px 12px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-2);font-size:13.5px;cursor:pointer")}>
                                <option value="1">
                                  {tr("1 guest")}
                                </option>
                                {" "}
                                <option value="2">
                                  {tr("2 guests")}
                                </option>
                                {" "}
                                <option value="3">
                                  {tr("3 guests")}
                                </option>
                                {" "}
                                <option value="4">
                                  {tr("4 guests")}
                                </option>
                              </select>
                            </label>
                          </div>
                          {" "}
                          <button onClick={v.rt.seePrice} disabled={v.searchBad} style={st(`inline-size:100%;margin-block-start:15px;padding:13px;border:0;border-radius:11px;background:${v.searchBtnBg};color:${v.searchBtnFg};font-size:14.5px;font-weight:700;cursor:${v.searchCursor};transition:filter .14s`)} className={fx("filter:brightness(1.08)", "transform:scale(.97)")}>
                            {tr("See the price")}
                          </button>
                          {" "}
                          <p style={st("margin:11px 0 0;font-size:12.5px;line-height:1.55;color:var(--fg-subtle);text-wrap:pretty")}>
                            {tr("Arrive from")}{" "}{v.arriveFrom}{" "}{tr("· leave by")}{" "}{v.leaveBy}{tr(". A stay here runs from one night to")}{" "}{v.maxNights}{"."}
                          </p>
                        </>
                      ) : null}
                      {" "}
                      {v.rt.priced ? (
                        <>
                          <div style={st("font-size:12.5px;color:var(--fg-subtle);font-weight:600")}>
                            {tr("Your dates")}
                          </div>
                          {" "}
                          <div style={st("font-family:var(--mono);font-size:14.5px;font-weight:700;margin-block-start:4px")}>
                            {v.resRange}
                          </div>
                          {" "}
                          <div style={st("font-size:12.5px;color:var(--fg-subtle);margin-block-start:3px")}>
                            {v.resNights}{" · "}{v.resGuests}
                          </div>
                        </>
                      ) : null}
                      {" "}
                      {v.rt.open ? (
                        <>
                          <div style={st("margin-block-start:14px;padding-block-start:14px;border-block-start:1px solid var(--border)")}>
                            {(v.rt.nights ?? []).map((n: any, i_n: number) => (
                              <Fragment key={i_n}>
                                <div style={st("display:flex;align-items:center;gap:8px;padding:6px 0")}>
                                  <span style={st("font-family:var(--mono);font-size:12.5px;color:var(--fg-muted)")}>
                                    {n.date}
                                  </span>
                                  {" "}
                                  {n.hasTags ? (
                                    <>
                                      <span style={st("font-size:10px;font-weight:700;padding:2px 6px;border-radius:999px;background:var(--surface-3);color:var(--fg-subtle)")}>
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
                          </div>
                          {" "}
                          <div style={st("margin-block-start:10px;padding-block-start:11px;border-block-start:1px solid var(--border);display:flex;flex-direction:column;gap:7px")}>
                            <div style={st("display:flex;align-items:center;gap:8px")}>
                              <span style={st("font-size:12.5px;font-weight:700;color:var(--fg-muted)")}>
                                {v.rt.nightsLabel}
                              </span>
                              {" "}
                              <span style={st("margin-inline-start:auto;font-family:var(--mono);font-size:13px;font-weight:600")}>
                                {v.rt.subtotal}
                              </span>
                            </div>
                            {" "}
                            <div style={st("display:flex;align-items:center;gap:8px")}>
                              <span style={st("font-size:12.5px;color:var(--fg-muted)")}>
                                {v.taxLabel}
                              </span>
                              {" "}
                              <span style={st("margin-inline-start:auto;font-family:var(--mono);font-size:13px;font-weight:600")}>
                                {v.rt.tax}
                              </span>
                            </div>
                          </div>
                          {" "}
                          <div style={st("margin-block-start:11px;padding-block-start:12px;border-block-start:1px solid var(--border-strong);display:flex;align-items:baseline;gap:8px")}>
                            <span style={st("font-size:14px;font-weight:800")}>
                              {tr("Total")}
                            </span>
                            {" "}
                            <span style={st("margin-inline-start:auto;font-family:var(--mono);font-size:19px;font-weight:700;letter-spacing:-.02em")}>
                              {v.rt.total}
                            </span>
                          </div>
                          {" "}
                          <button onClick={v.rt.reserve} style={st("inline-size:100%;margin-block-start:15px;padding:13px;border:0;border-radius:11px;background:var(--accent);color:var(--accent-fg);font-size:14.5px;font-weight:700;cursor:pointer;transition:filter .14s")} className={fx("filter:brightness(1.08)", "transform:scale(.97)")}>
                            {tr("Reserve")}
                          </button>
                          {" "}
                          <p style={st("margin:11px 0 0;font-size:12.5px;line-height:1.55;color:var(--fg-subtle);text-wrap:pretty")}>
                            {v.cancelLine}
                          </p>
                        </>
                      ) : null}
                      {" "}
                      {v.rt.soldOut ? (
                        <>
                          <div role="status" style={st("margin-block-start:14px;padding:14px;border-radius:12px;background:var(--surface-2);border:1px solid var(--border)")}>
                            <div style={st("display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:700;color:var(--fg-muted)")}>
                              <span data-icon="calendar-x" style={st("display:inline-flex;inline-size:16px;block-size:16px")}><Icon name={"calendar-x"} /></span>
                              {tr("Nothing open for these dates")}
                            </div>
                            {" "}
                            {v.rt.hasEarliest ? (
                              <>
                                <p style={st("margin:8px 0 0;font-size:13px;line-height:1.6;color:var(--fg-subtle)")}>
                                  {tr("The earliest we could take you is")}{" "}
                                  <span style={st("font-family:var(--mono);color:var(--fg-muted);font-weight:700")}>
                                    {v.rt.earliest}
                                  </span>
                                  {"."}
                                </p>
                              </>
                            ) : null}
                            {" "}
                            <button onClick={v.rt.moveDates} style={st("display:flex;align-items:center;gap:7px;margin-block-start:12px;padding:9px 15px;border:1px solid var(--accent);border-radius:10px;background:transparent;color:var(--accent);font-size:13px;font-weight:700;cursor:pointer")} className={fx("background:var(--accent-soft)", null)}>
                              <span data-icon="arrow-right" style={st("display:inline-flex;inline-size:14px;block-size:14px")}><Icon name={"arrow-right"} /></span>
                              {tr("Move the dates")}
                            </button>
                          </div>
                        </>
                      ) : null}
                      {" "}
                      {v.rt.small ? (
                        <>
                          <div style={st("margin-block-start:14px;padding:12px 13px;border-radius:11px;background:var(--surface-2);border:1px solid var(--border);font-size:13px;font-weight:600;color:var(--fg-muted)")}>
                            {v.rt.smallNote}
                          </div>
                        </>
                      ) : null}
                      {" "}
                      {v.rt.problem ? (
                        <>
                          <div style={st("margin-block-start:14px;padding:12px 13px;border-radius:11px;background:var(--warn-soft);color:var(--warn);font-size:13px;font-weight:600;line-height:1.5")}>
                            {v.searchMsg}
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                </section>
              </>
            ) : null}
            {" "}
            {v.showReserve ? (
              <>
                <section style={st("animation:wh-fade .22s ease-out")}>
                  <button onClick={v.backToType} style={st("display:flex;align-items:center;gap:7px;padding:7px 11px;margin-block-end:16px;border:1px solid var(--border-strong);border-radius:9px;background:var(--surface);font-size:12.5px;font-weight:700;color:var(--fg-muted);cursor:pointer")} className={fx("background:var(--surface-2)", null)}>
                    <span data-icon="arrow-left" style={st("display:inline-flex;inline-size:14px;block-size:14px")}><Icon name={"arrow-left"} /></span>
                    {tr("Back to the room")}
                  </button>
                  {" "}
                  <h1 style={st(`margin:0 0 4px;font-size:${v.h1Size};font-weight:800;letter-spacing:-.02em`)}>
                    {tr("Reserve the room")}
                  </h1>
                  {" "}
                  <p style={st("margin:0 0 22px;font-size:14.5px;color:var(--fg-muted)")}>
                    {v.rv.typeName}{" · "}
                    <span style={st("font-family:var(--mono);font-weight:600;color:var(--fg)")}>
                      {v.resRange}
                    </span>
                    {" · "}{v.resNights}{" · "}{v.resGuests}
                  </p>
                  {" "}
                  <div style={st(`display:grid;grid-template-columns:${v.rv.cols};gap:22px;align-items:start`)}>
                    <div style={st("display:flex;flex-direction:column;gap:16px;min-inline-size:0")}>
                      <div style={st("background:var(--surface);border:1px solid var(--border);border-radius:15px;padding:18px")}>
                        <h2 style={st("margin:0 0 14px;font-size:15.5px;font-weight:800")}>
                          {tr("Who is coming")}
                        </h2>
                        {" "}
                        <div style={st(`display:grid;grid-template-columns:${v.rv.twoCols};gap:12px`)}>
                          <div style={st("display:flex;flex-direction:column;gap:6px")}>
                            <label htmlFor="rv-first" style={st("font-size:12px;font-weight:700;color:var(--fg-muted)")}>
                              {tr("First name")}
                            </label>
                            {" "}
                            <input id="rv-first" value={v.rv.first ?? ""} onChange={v.rv.onFirst} placeholder={tr("Elin")} autoComplete="given-name" aria-invalid={v.rv.firstInv} aria-describedby="rv-first-err" style={st(`padding:10px 12px;border:1px solid ${v.rv.firstBorder};border-radius:10px;background:var(--surface-2);font-size:13.5px`)} />
                            {" "}
                            {v.rv.firstErrOn ? (
                              <>
                                <span id="rv-first-err" style={st("font-size:12px;font-weight:700;color:var(--danger)")}>
                                  {v.rv.firstErr}
                                </span>
                              </>
                            ) : null}
                          </div>
                          {" "}
                          <div style={st("display:flex;flex-direction:column;gap:6px")}>
                            <label htmlFor="rv-last" style={st("font-size:12px;font-weight:700;color:var(--fg-muted)")}>
                              {tr("Surname")}
                            </label>
                            {" "}
                            <input id="rv-last" value={v.rv.last ?? ""} onChange={v.rv.onLast} placeholder={tr("Marsh")} autoComplete="family-name" aria-invalid={v.rv.lastInv} aria-describedby="rv-last-err" style={st(`padding:10px 12px;border:1px solid ${v.rv.lastBorder};border-radius:10px;background:var(--surface-2);font-size:13.5px`)} />
                            {" "}
                            {v.rv.lastErrOn ? (
                              <>
                                <span id="rv-last-err" style={st("font-size:12px;font-weight:700;color:var(--danger)")}>
                                  {v.rv.lastErr}
                                </span>
                              </>
                            ) : null}
                          </div>
                          {" "}
                          <div style={st("display:flex;flex-direction:column;gap:6px")}>
                            <label htmlFor="rv-email" style={st("font-size:12px;font-weight:700;color:var(--fg-muted)")}>
                              {tr("Email")}
                            </label>
                            {" "}
                            <input id="rv-email" type="email" inputMode="email" autoComplete="email" value={v.rv.email ?? ""} onChange={v.rv.onEmail} placeholder={tr("you@example.com")} aria-invalid={v.rv.emailInv} aria-describedby="rv-email-err" style={st(`padding:10px 12px;border:1px solid ${v.rv.emailBorder};border-radius:10px;background:var(--surface-2);font-family:var(--mono);font-size:13px`)} />
                            {" "}
                            {v.rv.emailErrOn ? (
                              <>
                                <span id="rv-email-err" style={st("font-size:12px;font-weight:700;color:var(--danger)")}>
                                  {v.rv.emailErr}
                                </span>
                              </>
                            ) : null}
                          </div>
                          {" "}
                          <div style={st("display:flex;flex-direction:column;gap:6px")}>
                            <label htmlFor="rv-mobile" style={st("font-size:12px;font-weight:700;color:var(--fg-muted)")}>
                              {tr("Mobile")}
                            </label>
                            {" "}
                            <input id="rv-mobile" type="tel" inputMode="tel" autoComplete="tel" value={v.rv.mobile ?? ""} onChange={v.rv.onMobile} placeholder="(207) 555-0123" aria-describedby="rv-mobile-hint" style={st("padding:10px 12px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-2);font-family:var(--mono);font-size:13px")} />
                            {" "}
                            <span id="rv-mobile-hint" style={st("font-size:11.5px;color:var(--fg-subtle)")}>
                              {tr("Only so the desk can ring you on the day.")}
                            </span>
                          </div>
                        </div>
                        {" "}
                        <label style={st("display:flex;flex-direction:column;gap:6px;margin-block-start:12px")}>
                          <span style={st("font-size:12px;font-weight:700;color:var(--fg-muted)")}>
                            {tr("What time do you think you will get here?")}
                          </span>
                          {" "}
                          <select value={v.rv.arrivalTime} onChange={v.rv.onTime} style={st("padding:10px 12px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-2);font-size:13.5px;cursor:pointer;max-inline-size:320px")}>
                            {(v.rv.times ?? []).map((t: any, i_t: number) => (
                              <Fragment key={i_t}>
                                <option value={t.value}>
                                  {t.label}
                                </option>
                              </Fragment>
                            ))}
                          </select>
                        </label>
                        {" "}
                        <label style={st("display:flex;flex-direction:column;gap:6px;margin-block-start:12px")}>
                          <span style={st("font-size:12px;font-weight:700;color:var(--fg-muted)")}>
                            {tr("Anything we should know?")}
                          </span>
                          {" "}
                          <textarea value={v.rv.note} onChange={v.rv.onNote} rows={3} placeholder={tr("A late ferry, a quiet room, a birthday — anything at all.")} style={st("padding:10px 12px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-2);font-size:13.5px;resize:vertical;font-family:inherit")}></textarea>
                        </label>
                      </div>
                      {" "}
                      <div style={st("background:var(--surface);border:1px solid var(--border);border-radius:15px;padding:18px")}>
                        <h2 style={st("margin:0 0 4px;font-size:15.5px;font-weight:800")}>
                          {tr("Anything to add?")}
                        </h2>
                        {" "}
                        <p style={st("margin:0 0 14px;font-size:13px;color:var(--fg-subtle)")}>
                          {tr("You can add or drop these later — nothing is settled until you leave.")}
                        </p>
                        {" "}
                        <div style={st("display:flex;flex-direction:column;gap:9px")}>
                          {(v.rv.extras ?? []).map((e: any, i_e: number) => (
                            <Fragment key={i_e}>
                              <button onClick={e.toggle} aria-pressed={e.pressed} style={st(`display:flex;align-items:center;gap:13px;padding:13px 14px;border:1px solid ${e.border};border-radius:12px;background:${e.bg};cursor:pointer;text-align:start;transition:border-color .14s,background .14s`)}>
                                <span style={st("inline-size:34px;block-size:34px;border-radius:9px;background:var(--surface-3);color:var(--fg-muted);display:grid;place-items:center;flex:0 0 auto")}>
                                  <span data-icon={e.icon} style={st("display:inline-flex;inline-size:17px;block-size:17px")}><Icon name={e.icon} /></span>
                                </span>
                                {" "}
                                <span style={st("flex:1;min-inline-size:0")}>
                                  <span style={st("display:block;font-size:13.5px;font-weight:700")}>
                                    {e.label}
                                  </span>
                                  {" "}
                                  <span style={st("display:block;font-size:12px;color:var(--fg-subtle);margin-block-start:2px")}>
                                    {e.how}
                                  </span>
                                </span>
                                {" "}
                                <span style={st(`font-family:var(--mono);font-size:13px;font-weight:700;color:${e.amtFg};white-space:nowrap`)}>
                                  {e.amount}
                                </span>
                                {" "}
                                <span style={st(`inline-size:40px;block-size:23px;border-radius:999px;background:${e.trackBg};position:relative;flex:0 0 auto;transition:background .16s`)}>
                                  <span style={st(`position:absolute;inset-block-start:3px;inset-inline-start:${e.knobStart};inline-size:17px;block-size:17px;border-radius:999px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.28);transition:inset-inline-start .16s`)}></span>
                                </span>
                              </button>
                            </Fragment>
                          ))}
                        </div>
                      </div>
                    </div>
                    {" "}
                    <div style={st(`background:var(--surface);border:1px solid var(--border-strong);border-radius:16px;box-shadow:var(--shadow);padding:18px;position:${v.rv.sticky};inset-block-start:84px`)}>
                      <div style={st("display:flex;align-items:center;gap:11px")}>
                        <span style={st(`inline-size:44px;block-size:44px;border-radius:11px;background:${v.rv.tint};flex:0 0 auto;position:relative;display:grid;place-items:center`)}>
                          <span data-icon={v.rv.icon} style={st("display:inline-flex;inline-size:22px;block-size:22px;color:rgba(255,255,255,.82)")}><Icon name={v.rv.icon} /></span>
                        </span>
                        {" "}
                        <div>
                          <div style={st("font-size:14.5px;font-weight:800")}>
                            {v.rv.typeName}
                          </div>
                          {" "}
                          <div style={st("font-size:12px;color:var(--fg-subtle);margin-block-start:2px")}>
                            {v.rv.sleeps}
                          </div>
                        </div>
                      </div>
                      {" "}
                      <div style={st("margin-block-start:15px;padding-block-start:14px;border-block-start:1px solid var(--border);display:flex;flex-direction:column;gap:7px")}>
                        <div style={st("display:flex;align-items:center;gap:8px")}>
                          <span style={st("font-size:12.5px;font-weight:700;color:var(--fg-muted)")}>
                            {v.rv.nightsLabel}{" "}{tr("of room")}
                          </span>
                          {" "}
                          <span style={st("margin-inline-start:auto;font-family:var(--mono);font-size:13px;font-weight:600")}>
                            {v.rv.roomTotal}
                          </span>
                        </div>
                        {" "}
                        {(v.rv.lines ?? []).map((l: any, i_l: number) => (
                          <Fragment key={i_l}>
                            <div style={st("display:flex;align-items:center;gap:8px")}>
                              <span style={st("font-size:12.5px;color:var(--fg-muted);min-inline-size:0")}>
                                {l.label}
                              </span>
                              {" "}
                              <span style={st("margin-inline-start:auto;font-family:var(--mono);font-size:13px;font-weight:600;white-space:nowrap")}>
                                {l.amount}
                              </span>
                            </div>
                          </Fragment>
                        ))}
                        {" "}
                        <div style={st("display:flex;align-items:center;gap:8px")}>
                          <span style={st("font-size:12.5px;color:var(--fg-muted)")}>
                            {v.taxLabel}
                          </span>
                          {" "}
                          <span style={st("margin-inline-start:auto;font-family:var(--mono);font-size:13px;font-weight:600")}>
                            {v.rv.tax}
                          </span>
                        </div>
                      </div>
                      {" "}
                      <div style={st("margin-block-start:12px;padding-block-start:12px;border-block-start:1px solid var(--border-strong);display:flex;align-items:baseline;gap:8px")}>
                        <span style={st("font-size:14px;font-weight:800")}>
                          {tr("Total")}
                        </span>
                        {" "}
                        <span style={st("margin-inline-start:auto;font-family:var(--mono);font-size:19px;font-weight:700;letter-spacing:-.02em")}>
                          {v.rv.total}
                        </span>
                      </div>
                      {" "}
                      <p style={st("margin:8px 0 0;font-size:12.5px;font-weight:600;line-height:1.5;color:var(--fg-muted)")}>
                        {v.rv.payNote}
                      </p>
                      {" "}
                      {v.rv.goneOn ? (
                        <>
                          <div role="alert" style={st("margin-block-start:14px;padding:13px;border-radius:12px;background:var(--warn-soft);color:var(--warn)")}>
                            <div style={st("display:flex;align-items:flex-start;gap:8px;font-size:13px;font-weight:700;line-height:1.5")}>
                              <span data-icon="triangle-alert" style={st("display:inline-flex;inline-size:15px;block-size:15px;flex:0 0 auto;margin-block-start:2px")}><Icon name={"triangle-alert"} /></span>
                              {tr("That room has just gone for these dates.")}
                            </div>
                            {" "}
                            {v.rv.hasAlts ? (
                              <>
                                <div style={st("font-size:12px;font-weight:600;color:var(--fg-muted);margin-block-start:10px")}>
                                  {tr("Still open for the same dates")}
                                </div>
                                {" "}
                                <div style={st("display:flex;flex-direction:column;gap:6px;margin-block-start:7px")}>
                                  {(v.rv.alts ?? []).map((a: any, i_a: number) => (
                                    <Fragment key={i_a}>
                                      <button onClick={a.pick} style={st("display:flex;align-items:center;gap:7px;padding:8px 11px;border:1px solid var(--border-strong);border-radius:9px;background:var(--surface);color:var(--fg);font-size:12.5px;font-weight:700;cursor:pointer;text-align:start")} className={fx("background:var(--surface-2)", null)}>
                                        <span data-icon="arrow-right" style={st("display:inline-flex;inline-size:13px;block-size:13px;color:var(--fg-subtle)")}><Icon name={"arrow-right"} /></span>
                                        <span style={st("font-family:var(--mono)")}>
                                          {a.label}
                                        </span>
                                      </button>
                                    </Fragment>
                                  ))}
                                </div>
                              </>
                            ) : null}
                            {" "}
                            <button onClick={v.rv.changeDates} style={st("margin-block-start:9px;padding:7px 11px;border:1px solid var(--warn);border-radius:9px;background:transparent;color:var(--warn);font-size:12.5px;font-weight:700;cursor:pointer")} className={fx("background:var(--surface)", null)}>
                              {tr("Change the dates")}
                            </button>
                          </div>
                        </>
                      ) : null}
                      {" "}
                      {v.rv.priceOn ? (
                        <>
                          <div role="alert" style={st("margin-block-start:14px;padding:13px;border-radius:12px;background:var(--warn-soft);color:var(--warn)")}>
                            <div style={st("display:flex;align-items:flex-start;gap:8px;font-size:13px;font-weight:700;line-height:1.5")}>
                              <span data-icon="tag" style={st("display:inline-flex;inline-size:15px;block-size:15px;flex:0 0 auto;margin-block-start:2px")}><Icon name={"tag"} /></span>
                              {v.rv.priceMsg}
                            </div>
                            {" "}
                            <div style={st("margin-block-start:9px;padding:4px 10px;border-radius:9px;background:var(--surface);color:var(--fg)")}>
                              {(v.rv.priceRows ?? []).map((n: any, i_n: number) => (
                                <Fragment key={i_n}>
                                  <div style={st("display:flex;align-items:center;gap:8px;padding:5px 0")}>
                                    <span style={st("font-family:var(--mono);font-size:12px;color:var(--fg-muted)")}>
                                      {n.date}
                                    </span>
                                    {" "}
                                    {n.hasTags ? (
                                      <>
                                        <span style={st("font-size:10px;font-weight:700;padding:2px 6px;border-radius:999px;background:var(--surface-3);color:var(--fg-subtle)")}>
                                          {n.tags}
                                        </span>
                                      </>
                                    ) : null}
                                    {" "}
                                    <span style={st("margin-inline-start:auto;font-family:var(--mono);font-size:12.5px;font-weight:600")}>
                                      {n.rate}
                                    </span>
                                  </div>
                                </Fragment>
                              ))}
                            </div>
                            {" "}
                            <div style={st("display:flex;gap:7px;flex-wrap:wrap;margin-block-start:10px")}>
                              <button onClick={v.rv.accept} style={st("padding:8px 12px;border:0;border-radius:9px;background:var(--accent);color:var(--accent-fg);font-size:12.5px;font-weight:700;cursor:pointer")} className={fx("filter:brightness(1.08)", null)}>
                                {v.rv.acceptLabel}
                              </button>
                              {" "}
                              <button onClick={v.rv.changeDates} style={st("padding:8px 12px;border:1px solid var(--warn);border-radius:9px;background:transparent;color:var(--warn);font-size:12.5px;font-weight:700;cursor:pointer")} className={fx("background:var(--surface)", null)}>
                                {tr("Change the dates")}
                              </button>
                            </div>
                          </div>
                        </>
                      ) : null}
                      {" "}
                      {v.rv.ruleOn ? (
                        <>
                          <div role="alert" style={st("margin-block-start:14px;display:flex;align-items:flex-start;gap:8px;padding:12px 13px;border-radius:12px;background:var(--warn-soft);color:var(--warn);font-size:13px;font-weight:600;line-height:1.5")}>
                            <span data-icon="info" style={st("display:inline-flex;inline-size:15px;block-size:15px;flex:0 0 auto;margin-block-start:2px")}><Icon name={"info"} /></span>
                            {v.rv.ruleMsg}
                          </div>
                        </>
                      ) : null}
                      {" "}
                      {v.rv.downOn ? (
                        <>
                          <div role="alert" style={st("margin-block-start:14px;display:flex;align-items:flex-start;gap:8px;padding:12px 13px;border-radius:12px;background:var(--danger-soft);color:var(--danger);font-size:13px;font-weight:700;line-height:1.5")}>
                            <span data-icon="circle-alert" style={st("display:inline-flex;inline-size:15px;block-size:15px;flex:0 0 auto;margin-block-start:2px")}><Icon name={"circle-alert"} /></span>
                            {tr("We could not reach the house. Try again — you will not be booked twice.")}
                          </div>
                        </>
                      ) : null}
                      {" "}
                      <button onClick={v.rv.confirm} aria-busy={v.rv.btnBusy} disabled={v.rv.busy} style={st(`inline-size:100%;margin-block-start:15px;padding:13px;border:0;border-radius:11px;background:${v.rv.btnBg};color:${v.rv.btnFg};font-size:14.5px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:9px;transition:filter .14s`)} className={fx("filter:brightness(1.08)", "transform:scale(.97)")}>
                        {v.rv.busy ? (
                          <>
                            <span aria-hidden="true" style={st("inline-size:14px;block-size:14px;border-radius:999px;border:2px solid currentColor;border-inline-end-color:transparent;animation:wh-spin .7s linear infinite")}></span>
                          </>
                        ) : null}
                        {v.rv.btnLabel}
                      </button>
                      {" "}
                      <div style={st("margin-block-start:11px;display:flex;align-items:flex-start;gap:8px;padding:8px 11px;border-radius:9px;background:var(--surface-2);border:1px solid var(--border)")}>
                        <span data-icon="clock" style={st("display:inline-flex;inline-size:13px;block-size:13px;color:var(--fg-subtle);flex:0 0 auto;margin-block-start:2px")}><Icon name={"clock"} /></span>
                        {" "}
                        <span style={st("font-size:12px;line-height:1.5;color:var(--fg-muted)")}>
                          {v.cancelLine}
                        </span>
                      </div>
                    </div>
                  </div>
                </section>
              </>
            ) : null}
            {" "}
            {v.showConf ? (
              <>
                <section style={st("animation:wh-fade .22s ease-out;max-inline-size:720px;margin-inline:auto")}>
                  <div style={st("display:flex;flex-direction:column;align-items:center;text-align:center;padding-block:14px 6px")}>
                    <span style={st("inline-size:76px;block-size:76px;border-radius:999px;background:var(--pos-soft);color:var(--pos);display:grid;place-items:center;animation:wh-check .3s ease-out")}>
                      <span data-icon="check" style={st("display:inline-flex;inline-size:40px;block-size:40px")}><Icon name={"check"} /></span>
                    </span>
                    {" "}
                    <h1 style={st(`margin:20px 0 0;font-size:${v.h1Size};font-weight:800;letter-spacing:-.02em`)}>
                      {tr("You have a room,")}{" "}{v.cf.first}
                    </h1>
                    {" "}
                    <p style={st("margin:10px 0 0;font-size:15px;line-height:1.6;color:var(--fg-muted);max-inline-size:48ch;text-wrap:pretty")}>
                      {v.cf.emailLine}
                    </p>
                    {" "}
                    <div style={st("margin-block-start:18px;font-family:var(--mono);font-size:26px;font-weight:700;letter-spacing:.02em;padding:10px 20px;border-radius:12px;background:var(--accent-soft);color:var(--accent)")}>
                      {v.cf.ref}
                    </div>
                  </div>
                  {" "}
                  <div style={st("margin-block-start:26px;background:var(--surface);border:1px solid var(--border-strong);border-radius:16px;overflow:hidden;box-shadow:var(--shadow)")}>
                    <div style={st(`display:grid;grid-template-columns:${v.cf.twoCols}`)}>
                      <div style={st("padding:18px 20px;border-inline-end:1px solid var(--border);border-block-end:1px solid var(--border)")}>
                        <div style={st("font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--fg-subtle)")}>
                          {tr("Arriving")}
                        </div>
                        {" "}
                        <div style={st("font-family:var(--mono);font-size:16px;font-weight:700;margin-block-start:6px")}>
                          {v.cf.arrive}
                        </div>
                        {" "}
                        <div style={st("font-size:13px;color:var(--fg-muted);margin-block-start:4px")}>
                          {tr("Any time from")}{" "}{v.arriveFrom}
                          {v.cf.saidOn ? (
                            <>
                              {"· "}{v.cf.arrivalSaid}
                            </>
                          ) : null}
                        </div>
                      </div>
                      {" "}
                      <div style={st("padding:18px 20px;border-block-end:1px solid var(--border)")}>
                        <div style={st("font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--fg-subtle)")}>
                          {tr("Leaving")}
                        </div>
                        {" "}
                        <div style={st("font-family:var(--mono);font-size:16px;font-weight:700;margin-block-start:6px")}>
                          {v.cf.depart}
                        </div>
                        {" "}
                        <div style={st("font-size:13px;color:var(--fg-muted);margin-block-start:4px")}>
                          {tr("By")}{" "}{v.cf.leaveBy}{" · "}{v.cf.nightsLabel}
                        </div>
                      </div>
                    </div>
                    {" "}
                    <div style={st("padding:18px 20px;border-block-end:1px solid var(--border);display:flex;align-items:center;gap:13px")}>
                      <span style={st(`inline-size:48px;block-size:48px;border-radius:11px;background:${v.cf.tint};flex:0 0 auto;display:grid;place-items:center`)}>
                        <span data-icon={v.cf.icon} style={st("display:inline-flex;inline-size:24px;block-size:24px;color:rgba(255,255,255,.82)")}><Icon name={v.cf.icon} /></span>
                      </span>
                      {" "}
                      <div style={st("min-inline-size:0")}>
                        <div style={st("font-size:15.5px;font-weight:800")}>
                          {v.cf.typeName}{" · "}
                          <span style={st("font-family:var(--mono);font-weight:600")}>
                            {v.cf.guestsLabel}
                          </span>
                        </div>
                        {" "}
                        <div style={st("font-size:13px;color:var(--fg-muted);margin-block-start:3px;text-wrap:pretty")}>
                          {tr("We pick the room itself when you arrive, so you get the best one open that day.")}
                        </div>
                      </div>
                    </div>
                    {" "}
                    <div style={st("padding:6px 20px 4px")}>
                      {(v.cf.nights ?? []).map((n: any, i_n: number) => (
                        <Fragment key={i_n}>
                          <div style={st("display:flex;align-items:center;gap:10px;padding:9px 0;border-block-end:1px solid var(--border)")}>
                            <span style={st("font-family:var(--mono);font-size:12.5px;color:var(--fg-muted);min-inline-size:104px")}>
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
                      {(v.cf.lines ?? []).map((l: any, i_l: number) => (
                        <Fragment key={i_l}>
                          <div style={st("display:flex;align-items:center;gap:10px;padding:9px 0;border-block-end:1px solid var(--border)")}>
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
                      <div style={st("display:flex;align-items:center;gap:10px;padding:9px 0;border-block-end:1px solid var(--border)")}>
                        <span style={st("font-size:12.5px;color:var(--fg-muted)")}>
                          {v.taxLabel}
                        </span>
                        {" "}
                        <span style={st("margin-inline-start:auto;font-family:var(--mono);font-size:13px;font-weight:600")}>
                          {v.cf.tax}
                        </span>
                      </div>
                      {" "}
                      <div style={st("display:flex;align-items:center;gap:10px;padding:13px 0 4px")}>
                        <span style={st("font-size:14px;font-weight:800")}>
                          {tr("Total")}
                        </span>
                        {" "}
                        <span style={st("margin-inline-start:auto;font-family:var(--mono);font-size:20px;font-weight:700;letter-spacing:-.02em")}>
                          {v.cf.total}
                        </span>
                      </div>
                      {" "}
                      <p style={st("margin:0 0 16px;font-size:12.5px;font-weight:600;color:var(--fg-muted)")}>
                        {v.cf.payNote}
                      </p>
                    </div>
                  </div>
                  {" "}
                  <div style={st("margin-block-start:16px;background:var(--surface);border:1px solid var(--border);border-radius:15px;overflow:hidden")}>
                    <div style={st("padding:14px 20px;border-block-end:1px solid var(--border);font-size:11.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--fg-subtle)")}>
                      {tr("Before you come")}
                    </div>
                    {" "}
                    <div style={st("padding:6px 20px 14px")}>
                      <div style={st("display:flex;align-items:flex-start;gap:11px;padding:11px 0;border-block-end:1px solid var(--border)")}>
                        <span data-icon="clock" style={st("display:inline-flex;inline-size:15px;block-size:15px;color:var(--fg-subtle);flex:0 0 auto;margin-block-start:2px")}><Icon name={"clock"} /></span>
                        {" "}
                        {v.cf.outside ? (
                          <>
                            <span style={st("font-size:13.5px;line-height:1.55;color:var(--fg-muted)")}>
                              {tr("Cancel at no charge until")}{" "}
                              <span style={st("font-family:var(--mono);font-weight:700;color:var(--fg)")}>
                                {v.cf.moment}
                              </span>
                              {tr(". After that you can still cancel up to")}{" "}{v.arriveFrom}{" "}{tr("on the day you arrive; it is marked as a late cancellation, and nothing is charged.")}
                            </span>
                          </>
                        ) : null}
                        {" "}
                        {v.cf.inside ? (
                          <>
                            <span style={st("font-size:13.5px;line-height:1.55;color:var(--fg-muted)")}>
                              {v.cf.cancelNote}
                            </span>
                          </>
                        ) : null}
                        {" "}
                        {v.cf.deskOnly ? (
                          <>
                            <span style={st("font-size:13.5px;line-height:1.55;color:var(--fg-muted)")}>
                              {tr("It is your arrival day. Anything to change, ring us on")}{" "}
                              <a href={v.telHref} style={st("font-family:var(--mono)")}>
                                {v.phone}
                              </a>
                              {"."}
                            </span>
                          </>
                        ) : null}
                      </div>
                      {" "}
                      <div style={st("display:flex;align-items:flex-start;gap:11px;padding:11px 0")}>
                        <span data-icon="bell" style={st("display:inline-flex;inline-size:15px;block-size:15px;color:var(--fg-subtle);flex:0 0 auto;margin-block-start:2px")}><Icon name={"bell"} /></span>
                        {" "}
                        <span style={st("font-size:13.5px;line-height:1.55;color:var(--fg-muted)")}>
                          {tr("Coming in late, or wanting the room from earlier in the day? Reply to the email or ring us and we will work round it.")}
                        </span>
                      </div>
                    </div>
                  </div>
                  {" "}
                  <div style={st("display:flex;gap:10px;flex-wrap:wrap;margin-block-start:20px;justify-content:center")}>
                    <button onClick={v.cf.goOne} style={st("padding:11px 18px;border:0;border-radius:10px;background:var(--accent);color:var(--accent-fg);font-size:13.5px;font-weight:700;cursor:pointer")} className={fx("filter:brightness(1.08)", "transform:scale(.97)")}>
                      {tr("See your reservation")}
                    </button>
                    {" "}
                    <button onClick={v.goHome} style={st("padding:11px 18px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface);font-size:13.5px;font-weight:700;cursor:pointer")} className={fx("background:var(--surface-2)", null)}>
                      {tr("Back to the front page")}
                    </button>
                  </div>
                </section>
              </>
            ) : null}
            {" "}
            {v.showSignin ? (
              <>
                <section data-screen-label="Sign in" style={st("animation:wh-fade .22s ease-out;max-inline-size:560px;margin-inline:auto")}>
                  <h1 style={st(`margin:0 0 6px;font-size:${v.h1Size};font-weight:800;letter-spacing:-.02em`)}>
                    {tr("Your reservation")}
                  </h1>
                  {" "}
                  <p style={st("margin:0 0 20px;font-size:14.5px;line-height:1.6;color:var(--fg-muted);text-wrap:pretty")}>
                    {tr("Type the email you reserved with. We will send you a link to your reservations — it works for 20 minutes, once.")}
                  </p>
                  {" "}
                  {v.au.formOn ? (
                    <>
                      <div style={st("background:var(--surface);border:1px solid var(--border-strong);border-radius:15px;padding:18px")}>
                        <div style={st("display:flex;flex-direction:column;gap:6px")}>
                          <label htmlFor="au-email" style={st("font-size:12px;font-weight:700;color:var(--fg-muted)")}>
                            {tr("Email")}
                          </label>
                          {" "}
                          <input id="au-email" type="email" inputMode="email" autoComplete="email" value={v.au.email ?? ""} onChange={v.au.onEmail} onKeyDown={v.au.onEmailKey} placeholder={tr("you@example.com")} aria-invalid={v.au.emailInv} aria-describedby="au-email-err" style={st(`padding:11px 12px;border:1px solid ${v.au.emailBorder};border-radius:10px;background:var(--surface-2);font-family:var(--mono);font-size:13.5px`)} />
                          {" "}
                          {v.au.emailErrOn ? (
                            <>
                              <span id="au-email-err" style={st("font-size:12px;font-weight:700;color:var(--danger)")}>
                                {v.au.emailErr}
                              </span>
                            </>
                          ) : null}
                        </div>
                        {" "}
                        <button onClick={v.au.send} aria-busy={v.au.busy} style={st("inline-size:100%;margin-block-start:14px;padding:12px;border:0;border-radius:10px;background:var(--accent);color:var(--accent-fg);font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:9px")} className={fx("filter:brightness(1.08)", "transform:scale(.97)")}>
                          {v.au.busy ? (
                            <>
                              <span aria-hidden="true" style={st("inline-size:14px;block-size:14px;border-radius:999px;border:2px solid currentColor;border-inline-end-color:transparent;animation:wh-spin .7s linear infinite")}></span>
                            </>
                          ) : null}
                          {v.au.sendLabel}
                        </button>
                      </div>
                    </>
                  ) : null}
                  {" "}
                  {v.au.sentOn ? (
                    <>
                      <div style={st("background:var(--surface);border:1px solid var(--border-strong);border-radius:15px;padding:18px")}>
                        <div style={st("display:flex;align-items:flex-start;gap:12px")}>
                          <span style={st("inline-size:40px;block-size:40px;border-radius:11px;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;flex:0 0 auto")}>
                            <span data-icon="mail" style={st("display:inline-flex;inline-size:19px;block-size:19px")}><Icon name={"mail"} /></span>
                          </span>
                          {" "}
                          <div style={st("min-inline-size:0")}>
                            <h2 style={st("margin:0;font-size:16px;font-weight:800")}>
                              {tr("Check your email")}
                            </h2>
                            {" "}
                            <p role="status" style={st("margin:5px 0 0;font-size:13.5px;line-height:1.6;color:var(--fg-muted);overflow-wrap:anywhere")}>
                              {v.au.sentLine}
                            </p>
                          </div>
                        </div>
                        {" "}
                        <div style={st("margin-block-start:16px;padding-block-start:15px;border-block-start:1px solid var(--border)")}>
                          <div id="au-code-l" style={st("font-size:12px;font-weight:700;color:var(--fg-muted)")}>
                            {tr("Or type the 6-digit code from the same email")}
                          </div>
                          {" "}
                          <div role="group" aria-labelledby="au-code-l" dir="ltr" style={st("display:grid;grid-template-columns:repeat(6,minmax(0,46px));gap:8px;margin-block-start:9px")}>
                            {(v.au.boxes ?? []).map((b: any, i_b: number) => (
                              <Fragment key={i_b}>
                                <input value={b.v ?? ""} onChange={b.onChange} onKeyDown={b.onKey} data-code={b.dc} inputMode="numeric" autoComplete="one-time-code" maxLength={6} aria-label={b.label} aria-invalid={v.au.codeInv} aria-describedby="au-code-err" disabled={b.locked} style={st("block-size:50px;min-inline-size:0;text-align:center;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-2);font-family:var(--mono);font-size:19px;font-weight:700")} />
                              </Fragment>
                            ))}
                          </div>
                          {" "}
                          {v.au.codeErrOn ? (
                            <>
                              <div id="au-code-err" role="alert" style={st("display:flex;align-items:flex-start;gap:8px;margin-block-start:11px;font-size:12.5px;font-weight:700;color:var(--danger)")}>
                                <span data-icon="circle-alert" style={st("display:inline-flex;inline-size:14px;block-size:14px;flex:0 0 auto;margin-block-start:2px")}><Icon name={"circle-alert"} /></span>
                                {v.au.codeErr}
                              </div>
                            </>
                          ) : null}
                        </div>
                        {" "}
                        <div style={st("display:flex;gap:9px;flex-wrap:wrap;margin-block-start:15px")}>
                          <button onClick={v.au.resend} disabled={v.au.cantResend} style={st(`padding:9px 14px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface);color:${v.au.resendFg};font-size:12.5px;font-weight:700;cursor:pointer`)} className={fx("background:var(--surface-2)", null)}>
                            {v.au.resendLabel}
                          </button>
                          {" "}
                          <button onClick={v.au.different} style={st("padding:9px 14px;border:0;border-radius:10px;background:transparent;color:var(--fg-muted);font-size:12.5px;font-weight:700;cursor:pointer")} className={fx("background:var(--surface-2)", null)}>
                            {tr("Use a different email")}
                          </button>
                        </div>
                      </div>
                    </>
                  ) : null}
                  {" "}
                  {v.au.linkOn ? (
                    <>
                      <div style={st("background:var(--surface);border:1px solid var(--border-strong);border-radius:15px;padding:24px 18px;text-align:center")}>
                        <span style={st("inline-size:52px;block-size:52px;border-radius:999px;background:var(--accent-soft);color:var(--accent);display:inline-grid;place-items:center")}>
                          <span data-icon="mail-open" style={st("display:inline-flex;inline-size:24px;block-size:24px")}><Icon name={"mail-open"} /></span>
                        </span>
                        {" "}
                        <h2 style={st("margin:12px 0 0;font-size:17px;font-weight:800")}>
                          {tr("Your link is ready")}
                        </h2>
                        {" "}
                        <p style={st("margin:7px auto 0;max-inline-size:40ch;font-size:13.5px;line-height:1.6;color:var(--fg-muted)")}>
                          {tr("Press Continue to open your reservations on this device.")}
                        </p>
                        {" "}
                        <button onClick={v.au.cont} style={st("margin-block-start:16px;padding:12px 26px;border:0;border-radius:10px;background:var(--accent);color:var(--accent-fg);font-size:14px;font-weight:700;cursor:pointer")} className={fx("filter:brightness(1.08)", "transform:scale(.97)")}>
                          {tr("Continue")}
                        </button>
                      </div>
                    </>
                  ) : null}
                  {" "}
                  {v.au.expiredOn ? (
                    <>
                      <div style={st("background:var(--surface);border:1px solid var(--border-strong);border-radius:15px;padding:18px")}>
                        <div role="alert" style={st("display:flex;align-items:flex-start;gap:9px;padding:12px 13px;border-radius:11px;background:var(--warn-soft);color:var(--warn);font-size:13.5px;font-weight:700;line-height:1.5")}>
                          <span data-icon="unplug" style={st("display:inline-flex;inline-size:16px;block-size:16px;flex:0 0 auto;margin-block-start:2px")}><Icon name={"unplug"} /></span>
                          {tr("That link has expired or was already used.")}
                        </div>
                        {" "}
                        <button onClick={v.au.again} style={st("margin-block-start:14px;padding:11px 18px;border:0;border-radius:10px;background:var(--accent);color:var(--accent-fg);font-size:13.5px;font-weight:700;cursor:pointer")} className={fx("filter:brightness(1.08)", null)}>
                          {tr("Send me a new link")}
                        </button>
                      </div>
                    </>
                  ) : null}
                </section>
              </>
            ) : null}
            {" "}
            {v.showList ? (
              <>
                <section data-screen-label="Your reservations" style={st("animation:wh-fade .22s ease-out;max-inline-size:760px;margin-inline:auto")}>
                  <div style={st("display:flex;align-items:flex-end;justify-content:space-between;gap:14px;flex-wrap:wrap")}>
                    <div style={st("min-inline-size:0")}>
                      <h1 style={st(`margin:0;font-size:${v.h1Size};font-weight:800;letter-spacing:-.02em`)}>
                        {tr("Your reservations")}
                      </h1>
                      {" "}
                      <div style={st("font-family:var(--mono);font-size:12.5px;color:var(--fg-muted);margin-block-start:6px;overflow-wrap:anywhere")}>
                        {v.ls.email}
                      </div>
                    </div>
                    {" "}
                    <div style={st("position:relative;display:flex;gap:7px")}>
                      <button onClick={v.ls.signOut} style={st("display:flex;align-items:center;gap:7px;padding:9px 14px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface);font-size:12.5px;font-weight:700;cursor:pointer")} className={fx("background:var(--surface-2)", null)}>
                        <span data-icon="log-out" style={st("display:inline-flex;inline-size:14px;block-size:14px")}><Icon name={"log-out"} /></span>
                        {tr("Sign out")}
                      </button>
                      {" "}
                      <button onClick={v.ls.toggleMenu} aria-haspopup="menu" aria-expanded={v.ls.menuExpanded} aria-label={tr("More")} title={tr("More")} style={st("inline-size:37px;block-size:37px;display:grid;place-items:center;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface);cursor:pointer;color:var(--fg-muted)")} className={fx("background:var(--surface-2)", null)}>
                        <span data-icon="ellipsis" style={st("display:inline-flex;inline-size:16px;block-size:16px")}><Icon name={"ellipsis"} /></span>
                      </button>
                      {" "}
                      {v.ls.menuOpen ? (
                        <>
                          <div role="menu" style={st("position:absolute;inset-block-start:calc(100% + 6px);inset-inline-end:0;inline-size:230px;padding:5px;border-radius:12px;background:var(--surface);border:1px solid var(--border-strong);box-shadow:var(--shadow-lift);z-index:20;display:flex;flex-direction:column;gap:2px;animation:wh-pop .14s ease-out")}>
                            <button role="menuitem" onClick={v.ls.signOutAll} style={st("display:flex;align-items:center;gap:8px;padding:9px 10px;border:0;border-radius:8px;background:transparent;font-size:13px;font-weight:600;cursor:pointer;text-align:start")} className={fx("background:var(--surface-3)", null)}>
                              <span data-icon="monitor-smartphone" style={st("display:inline-flex;inline-size:14px;block-size:14px;color:var(--fg-subtle)")}><Icon name={"monitor-smartphone"} /></span>
                              {tr("Sign out on every device")}
                            </button>
                            {" "}
                            <button role="menuitem" onClick={v.ls.askDelete} style={st("display:flex;align-items:center;gap:8px;padding:9px 10px;border:0;border-radius:8px;background:transparent;color:var(--danger);font-size:13px;font-weight:600;cursor:pointer;text-align:start")} className={fx("background:var(--danger-soft)", null)}>
                              <span data-icon="trash-2" style={st("display:inline-flex;inline-size:14px;block-size:14px")}><Icon name={"trash-2"} /></span>
                              {tr("Delete my details")}
                            </button>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                  {" "}
                  <div style={st("display:flex;flex-direction:column;gap:18px;margin-block-start:20px")}>
                    {(v.ls.groups ?? []).map((g: any, i_g: number) => (
                      <Fragment key={i_g}>
                        <div>
                          <h2 style={st("margin:0 0 9px;font-size:11.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--fg-subtle)")}>
                            {g.title}
                          </h2>
                          {" "}
                          <div style={st("background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden")}>
                            {(g.rows ?? []).map((r: any, i_r: number) => (
                              <Fragment key={i_r}>
                                <button onClick={r.go} style={st("inline-size:100%;display:flex;align-items:center;gap:13px;padding:14px 16px;border:0;border-block-end:1px solid var(--border);background:transparent;cursor:pointer;text-align:start")} className={fx("background:var(--surface-2)", null)}>
                                  <span style={st(`inline-size:10px;block-size:40px;border-radius:5px;background:${r.flat};flex:0 0 auto`)}></span>
                                  {" "}
                                  <span style={st("flex:1;min-inline-size:0")}>
                                    <span style={st("display:flex;align-items:center;gap:8px;flex-wrap:wrap")}>
                                      <span style={st("font-family:var(--mono);font-size:13.5px;font-weight:700")}>
                                        {r.ref}
                                      </span>
                                      {" "}
                                      <span style={st(`font-size:10.5px;font-weight:700;padding:3px 9px;border-radius:999px;background:${r.pillBg};color:${r.pillFg}`)}>
                                        {r.pill}
                                      </span>
                                    </span>
                                    {" "}
                                    <span style={st("display:block;font-size:13.5px;font-weight:700;margin-block-start:4px")}>
                                      {r.typeName}
                                    </span>
                                    {" "}
                                    <span style={st("display:flex;gap:6px;flex-wrap:wrap;font-family:var(--mono);font-size:11.5px;color:var(--fg-subtle);margin-block-start:2px")}>
                                      <span>
                                        {r.range}
                                      </span>
                                      <span>
                                        {"·"}
                                      </span>
                                      <span>
                                        {r.nights}
                                      </span>
                                      <span>
                                        {"·"}
                                      </span>
                                      <span>
                                        {r.guests}
                                      </span>
                                    </span>
                                  </span>
                                  {" "}
                                  <span style={st("font-size:12.5px;font-weight:700;color:var(--accent);flex:0 0 auto")}>
                                    {tr("Open")}
                                  </span>
                                </button>
                              </Fragment>
                            ))}
                          </div>
                        </div>
                      </Fragment>
                    ))}
                    {" "}
                    {v.ls.empty ? (
                      <>
                        <div style={st("padding:22px;border:1px dashed var(--border-strong);border-radius:14px;text-align:center;font-size:13.5px;color:var(--fg-muted)")}>
                          {tr("Nothing is booked under this email.")}
                        </div>
                      </>
                    ) : null}
                  </div>
                </section>
              </>
            ) : null}
            {" "}
            {v.showOne ? (
              <>
                <section data-screen-label="One reservation" style={st("animation:wh-fade .22s ease-out;max-inline-size:760px;margin-inline:auto")}>
                  <button onClick={v.on.leave} style={st("display:flex;align-items:center;gap:7px;padding:7px 11px;margin-block-end:16px;border:1px solid var(--border-strong);border-radius:9px;background:var(--surface);font-size:12.5px;font-weight:700;color:var(--fg-muted);cursor:pointer")} className={fx("background:var(--surface-2)", null)}>
                    <span data-icon="arrow-left" style={st("display:inline-flex;inline-size:14px;block-size:14px")}><Icon name={"arrow-left"} /></span>
                    {v.on.leaveLabel}
                  </button>
                  {" "}
                  <div style={st("background:var(--surface);border:1px solid var(--border-strong);border-radius:16px;overflow:hidden;box-shadow:var(--shadow)")}>
                    <div style={st("padding:18px 20px;display:flex;align-items:flex-start;gap:13px;border-block-end:1px solid var(--border);background:var(--surface-2)")}>
                      <span style={st(`inline-size:48px;block-size:48px;border-radius:11px;background:${v.on.tint};flex:0 0 auto;display:grid;place-items:center`)}>
                        <span data-icon={v.on.icon} style={st("display:inline-flex;inline-size:24px;block-size:24px;color:rgba(255,255,255,.82)")}><Icon name={v.on.icon} /></span>
                      </span>
                      {" "}
                      <div style={st("min-inline-size:0;flex:1")}>
                        <div style={st("display:flex;align-items:center;gap:9px;flex-wrap:wrap")}>
                          <span style={st("font-family:var(--mono);font-size:14.5px;font-weight:700")}>
                            {v.on.ref}
                          </span>
                          {" "}
                          <span style={st(`font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;background:${v.on.stateBg};color:${v.on.stateFg}`)}>
                            {v.on.state}
                          </span>
                          {" "}
                          <span style={st("margin-inline-start:auto;font-family:var(--mono);font-size:12px;color:var(--fg-subtle)")}>
                            {v.on.daysAhead}
                          </span>
                        </div>
                        {" "}
                        <div style={st("font-size:15.5px;font-weight:800;margin-block-start:4px")}>
                          {v.on.name}
                        </div>
                        {" "}
                        <div style={st("font-size:13px;color:var(--fg-muted);margin-block-start:3px")}>
                          {v.on.typeName}{" · "}
                          <span style={st("font-family:var(--mono)")}>
                            {v.on.range}
                          </span>
                          {" · "}{v.on.nightsLabel}{" · "}{v.on.guestsLabel}
                        </div>
                      </div>
                    </div>
                    {" "}
                    {v.on.live ? (
                      <>
                        <div style={st("padding:18px 20px;border-block-end:1px solid var(--border)")}>
                          <h2 style={st("margin:0 0 12px;font-size:13px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--fg-subtle)")}>
                            {tr("Add something")}
                          </h2>
                          {" "}
                          <div style={st("display:flex;flex-direction:column;gap:9px")}>
                            {(v.on.extras ?? []).map((e: any, i_e: number) => (
                              <Fragment key={i_e}>
                                <button onClick={e.toggle} aria-pressed={e.pressed} aria-busy={e.ariaBusy} disabled={e.busy} style={st(`display:flex;align-items:center;gap:13px;padding:12px 13px;border:1px solid ${e.border};border-radius:12px;background:${e.bg};opacity:${e.opacity};cursor:pointer;text-align:start`)}>
                                  <span style={st("inline-size:32px;block-size:32px;border-radius:9px;background:var(--surface-3);color:var(--fg-muted);display:grid;place-items:center;flex:0 0 auto")}>
                                    <span data-icon={e.icon} style={st("display:inline-flex;inline-size:16px;block-size:16px")}><Icon name={e.icon} /></span>
                                  </span>
                                  {" "}
                                  <span style={st("flex:1;min-inline-size:0")}>
                                    <span style={st("display:block;font-size:13.5px;font-weight:700")}>
                                      {e.label}
                                    </span>
                                    {" "}
                                    {e.busy ? (
                                      <>
                                        <span style={st("display:block;font-size:12px;font-weight:700;color:var(--accent);margin-block-start:2px")}>
                                          {e.busyLabel}
                                        </span>
                                      </>
                                    ) : null}
                                    {" "}
                                    {e.idle ? (
                                      <>
                                        <span style={st("display:block;font-size:12px;color:var(--fg-subtle);margin-block-start:2px")}>
                                          {e.how}
                                        </span>
                                      </>
                                    ) : null}
                                  </span>
                                  {" "}
                                  <span style={st(`font-family:var(--mono);font-size:13px;font-weight:700;color:${e.amtFg};white-space:nowrap`)}>
                                    {e.amount}
                                  </span>
                                  {" "}
                                  <span style={st(`inline-size:40px;block-size:23px;border-radius:999px;background:${e.trackBg};position:relative;flex:0 0 auto;transition:background .16s`)}>
                                    <span style={st(`position:absolute;inset-block-start:3px;inset-inline-start:${e.knobStart};inline-size:17px;block-size:17px;border-radius:999px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.28);transition:inset-inline-start .16s`)}></span>
                                  </span>
                                </button>
                              </Fragment>
                            ))}
                          </div>
                          {" "}
                          {v.on.refusedOn ? (
                            <>
                              <div role="alert" style={st("display:flex;align-items:center;gap:8px;margin-block-start:10px;font-size:12.5px;font-weight:700;color:var(--danger)")}>
                                <span data-icon="circle-alert" style={st("display:inline-flex;inline-size:14px;block-size:14px")}><Icon name={"circle-alert"} /></span>
                                {v.on.refused}
                              </div>
                            </>
                          ) : null}
                          {" "}
                          <label style={st("display:flex;flex-direction:column;gap:6px;margin-block-start:16px;max-inline-size:320px")}>
                            <span style={st("font-size:12px;font-weight:700;color:var(--fg-muted)")}>
                              {tr("What time do you think you will get here?")}
                            </span>
                            {" "}
                            <select value={v.on.arrivalTime} onChange={v.on.onTime} style={st("padding:10px 12px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-2);font-size:13.5px;cursor:pointer")}>
                              {(v.on.times ?? []).map((t: any, i_t: number) => (
                                <Fragment key={i_t}>
                                  <option value={t.value}>
                                    {t.label}
                                  </option>
                                </Fragment>
                              ))}
                            </select>
                          </label>
                        </div>
                      </>
                    ) : null}
                    {" "}
                    <div style={st("padding:6px 20px 4px")}>
                      {(v.on.rows ?? []).map((r: any, i_r: number) => (
                        <Fragment key={i_r}>
                          <div style={st("display:flex;align-items:center;gap:10px;padding:9px 0;border-block-end:1px solid var(--border)")}>
                            <span style={st("font-size:12.5px;color:var(--fg-muted);min-inline-size:0")}>
                              {r.label}
                            </span>
                            {" "}
                            <span style={st("margin-inline-start:auto;font-family:var(--mono);font-size:13px;font-weight:600;white-space:nowrap")}>
                              {r.amount}
                            </span>
                          </div>
                        </Fragment>
                      ))}
                      {" "}
                      <div style={st("display:flex;align-items:center;gap:10px;padding:12px 0 16px")}>
                        <span style={st("font-size:14px;font-weight:800")}>
                          {v.on.dueLabel}
                        </span>
                        {" "}
                        <span style={st("margin-inline-start:auto;font-family:var(--mono);font-size:19px;font-weight:700;letter-spacing:-.02em")}>
                          {v.on.due}
                        </span>
                      </div>
                    </div>
                    {" "}
                    {v.on.live ? (
                      <>
                        <div style={st("padding:18px 20px;border-block-start:1px solid var(--border);background:var(--surface-2)")}>
                          {v.on.inside ? (
                            <>
                              <div style={st("display:flex;align-items:flex-start;gap:9px;padding:13px 14px;border-radius:12px;background:var(--warn-soft);color:var(--warn);font-size:13px;font-weight:600;line-height:1.55;margin-block-end:13px")}>
                                <span data-icon="triangle-alert" style={st("display:inline-flex;inline-size:16px;block-size:16px;flex:0 0 auto;margin-block-start:1px")}><Icon name={"triangle-alert"} /></span>
                                <span>
                                  {v.on.insideMsg}
                                </span>
                              </div>
                            </>
                          ) : null}
                          {" "}
                          {v.on.outside ? (
                            <>
                              <div style={st("display:flex;align-items:flex-start;gap:9px;padding:13px 14px;border-radius:12px;background:var(--pos-soft);color:var(--pos);font-size:13px;font-weight:600;line-height:1.55;margin-block-end:13px")}>
                                <span data-icon="shield-check" style={st("display:inline-flex;inline-size:16px;block-size:16px;flex:0 0 auto;margin-block-start:1px")}><Icon name={"shield-check"} /></span>
                                <span>
                                  {v.on.outsideMsg}
                                </span>
                              </div>
                            </>
                          ) : null}
                          {" "}
                          <div style={st("display:flex;gap:10px;flex-wrap:wrap")}>
                            <button onClick={v.on.askCancel} style={st("padding:10px 16px;border:1px solid var(--border-strong);border-radius:10px;background:transparent;color:var(--danger);font-size:13px;font-weight:700;cursor:pointer")} className={fx("background:var(--danger-soft)", null)}>
                              {tr("Cancel this reservation")}
                            </button>
                            {" "}
                            {v.on.canChange ? (
                              <>
                                <button onClick={v.on.openChg} style={st("display:flex;align-items:center;gap:7px;padding:10px 16px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface);font-size:13px;font-weight:700;cursor:pointer")} className={fx("background:var(--surface-3)", null)}>
                                  <span data-icon="calendar-range" style={st("display:inline-flex;inline-size:14px;block-size:14px")}><Icon name={"calendar-range"} /></span>
                                  {tr("Change the dates")}
                                </button>
                              </>
                            ) : null}
                            {" "}
                            <button onClick={v.on.leave} style={st("padding:10px 16px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface);font-size:13px;font-weight:700;cursor:pointer")} className={fx("background:var(--surface-3)", null)}>
                              {tr("Leave it as it is")}
                            </button>
                          </div>
                          {" "}
                          {v.on.ringChange ? (
                            <>
                              <p style={st("margin:12px 0 0;font-size:13px;line-height:1.55;color:var(--fg-muted)")}>
                                {tr("To change the dates now, ring us on")}{" "}
                                <a href={v.telHref} style={st("font-family:var(--mono)")}>
                                  {v.phone}
                                </a>
                                {"."}
                              </p>
                            </>
                          ) : null}
                        </div>
                      </>
                    ) : null}
                    {" "}
                    {v.on.dead ? (
                      <>
                        <div style={st("padding:18px 20px;border-block-start:1px solid var(--border);background:var(--surface-2);font-size:13.5px;color:var(--fg-muted);line-height:1.6")}>
                          {v.on.deadNote}
                          {v.on.deadPhone ? (
                            <>
                              <a href={v.telHref} style={st("font-family:var(--mono)")}>
                                {v.phone}
                              </a>
                              {v.on.deadAfter}
                            </>
                          ) : null}
                        </div>
                      </>
                    ) : null}
                  </div>
                  {" "}
                  {v.on.canRelink ? (
                    <>
                      <div style={st("display:flex;align-items:center;gap:10px 12px;flex-wrap:wrap;margin-block-start:14px;padding:12px 16px;background:var(--surface-2);border:1px solid var(--border);border-radius:13px")}>
                        <span style={st("flex:1;min-inline-size:200px;font-size:12.5px;line-height:1.5;color:var(--fg-muted)")}>
                          {tr("Your confirmation link stops working and we email you a new one.")}
                        </span>
                        {" "}
                        <button onClick={v.on.relink} style={st("display:flex;align-items:center;gap:7px;padding:8px 13px;border:1px solid var(--border-strong);border-radius:9px;background:var(--surface);font-size:12.5px;font-weight:700;color:var(--fg-muted);cursor:pointer")} className={fx("background:var(--surface-3)", null)}>
                          <span data-icon="link" style={st("display:inline-flex;inline-size:14px;block-size:14px")}><Icon name={"link"} /></span>
                          {tr("Make a new link")}
                        </button>
                      </div>
                    </>
                  ) : null}
                </section>
              </>
            ) : null}
            {" "}
            {v.show404 ? (
              <>
                <section style={st("animation:wh-fade .22s ease-out;max-inline-size:560px;margin-inline:auto;text-align:center;padding-block:40px 20px")}>
                  <div style={st("font-family:var(--mono);font-size:64px;font-weight:700;letter-spacing:-.03em;color:var(--fg-subtle)")}>
                    {"404"}
                  </div>
                  {" "}
                  <h1 style={st("margin:14px 0 0;font-size:24px;font-weight:800;letter-spacing:-.02em")}>
                    {tr("That page is not here")}
                  </h1>
                  {" "}
                  <p style={st("margin:12px 0 0;font-size:14.5px;line-height:1.6;color:var(--fg-muted);text-wrap:pretty")}>
                    {tr("The rooms, the rates and what is included are all on the front page.")}
                  </p>
                  {" "}
                  <div style={st("display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-block-start:22px")}>
                    <button onClick={v.goHome} style={st("padding:11px 18px;border:0;border-radius:10px;background:var(--accent);color:var(--accent-fg);font-size:13.5px;font-weight:700;cursor:pointer")} className={fx("filter:brightness(1.08)", "transform:scale(.97)")}>
                      {tr("The front page")}
                    </button>
                    {" "}
                    <button onClick={v.goRooms} style={st("padding:11px 18px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface);font-size:13.5px;font-weight:700;cursor:pointer")} className={fx("background:var(--surface-2)", null)}>
                      {tr("See the rooms")}
                    </button>
                  </div>
                </section>
              </>
            ) : null}
          </div>
        </main>
        {" "}
        <footer style={st("border-block-start:1px solid var(--border);background:var(--surface)")}>
          <div style={st("max-inline-size:1120px;margin-inline:auto;padding:18px 22px;display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between")}>
            <span style={st("font-size:12.5px;color:var(--fg-subtle)")}>
              {v.footLine}
            </span>
            {" "}
            <div style={st("display:flex;align-items:center;gap:12px")}>
              <label style={st("display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--fg-subtle)")}>
                <span data-icon="languages" style={st("display:inline-flex;inline-size:14px;block-size:14px")}><Icon name={"languages"} /></span>
                <span className="wh-sr">{v.langLabel}</span>
                <select value={v.lang} onChange={v.onLang} style={st("padding:6px 10px;border:1px solid var(--border-strong);border-radius:9px;background:var(--surface-2);font-size:12.5px;font-weight:600")}>
                  {(v.languages ?? []).map((o: any, i_o: number) => (
                    <Fragment key={i_o}>
                      <option value={o.value} lang={o.value}>
                        {o.label}
                      </option>
                    </Fragment>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </footer>
      </>
    ) : null}
    </>
  );
}
