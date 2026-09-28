/**
 * The moments the demo card's shortcuts play, on the demo's own house: a guest
 * who rings, another desk that records a payment first, a room that goes while
 * someone types, the clock moving on. Each one acts through the demo Adminium
 * — as the desk, as a guest, or as time passing — and the screens show what
 * Adminium then answers, exactly as they would for the real thing.
 *
 * DEMO BUILD ONLY — nothing in a real build imports it.
 */
import { blankAuth, type HouseApp, type View } from "../app/house.ts";
import { fT, plus, strip } from "../app/fmt.ts";
import type { Id } from "../data/wire.ts";
import { tr } from "../i18n/tr.ts";
import { instantOf } from "../lib/venueTime.ts";
import type { DemoAdminium } from "./adminium.ts";
import { PEOPLE } from "./desk.ts";
import { DEMO_SIGN_IN } from "./guest.ts";
import { DEMO_ZONE } from "./world.ts";
import { blankNb, openCheckin, openFolio, openRoom, openSettle, saveNb, walkIn } from "../app/desk.ts";

const PRIYA = "priya.raman@example.com";
const SAMPLE_GUEST = { first: "Elin", last: "Marsh", email: "elin.marsh@example.com", mobile: "(207) 555-0150" };

export class Scenes {
  private readonly app: HouseApp;
  private readonly demo: DemoAdminium;
  constructor(app: HouseApp, demo: DemoAdminium) {
    this.app = app;
    this.demo = demo;
  }

  private stayId(ref: string): Id {
    const row = this.demo.world.all("stays").find((s) => s["ref"] === ref);
    if (row === undefined) throw new Error(`no stay ${ref}`);
    return row.id;
  }
  private roomId(n: string): Id {
    return this.demo.world.all("rooms").find((r) => String(r["number"]) === n)!.id;
  }
  private typeId(code: string): string {
    return String(this.demo.world.all("room_types").find((t) => t["code"] === code)!.id);
  }
  private extraId(code: string): string {
    return String(this.demo.world.all("extras").find((e) => e["code"] === code)!.id);
  }
  /** The clock to a wall time of today (never back). */
  private clockTo(hhmm: string, day = this.app.day): void {
    this.demo.advanceTo(instantOf(day, hhmm, DEMO_ZONE));
  }
  private async signInAs(email: string): Promise<void> {
    await this.demo.guest.requestSignIn(email);
    await this.demo.guest.verifyCode(email, DEMO_SIGN_IN.code);
    this.app.setState({ signedIn: email, signedAt: Date.now(), auth: blankAuth(), linkStay: null });
    this.app.forget("guest:");
  }
  private fillGuest(): void {
    const f = this.app.state.form;
    if (f.first.trim()) return;
    this.app.setState({ form: { ...f, ...SAMPLE_GUEST }, formErr: false });
  }
  /** A stay as the screens read it, once Adminium has answered for it. */
  private async loaded(id: Id): Promise<ReturnType<HouseApp["stay"]>> {
    for (let i = 0; i < 40; i += 1) {
      const st = this.app.stay(id);
      if (st !== null) return st;
      await new Promise((r) => setTimeout(r, 50));
    }
    return null;
  }
  private whenReady(run: () => void): void {
    setTimeout(run, 60);
  }

  /** A reservation made on the guest site, so the confirmation has one to show. */
  async sampleBooking(): Promise<void> {
    const garden = this.typeId("GDN");
    this.app.setState({
      search: { arrive: "2026-08-03", depart: "2026-08-05", guests: 2 },
      pickedType: garden,
      form: { ...SAMPLE_GUEST, arrivalTime: "16:00", note: "", extras: { [this.extraId("BRK")]: true } },
      rvShown: null,
      rvAnswer: null,
      pair: null,
    });
    await this.app.reserve(false);
  }

  /** The card's "go": the screen, as the card names it, with what it needs to show. */
  async go(view: View): Promise<void> {
    const app = this.app;
    const s = app.state;
    switch (view) {
      case "type":
        return app.go("type", { pickedType: s.pickedType ?? this.typeId("GDN") });
      case "reserve":
        return app.go("reserve", { pickedType: s.pickedType ?? this.typeId("GDN"), rvAnswer: null, rvBusy: false });
      case "results":
        return app.go("results", { searched: true });
      case "conf":
        if (s.booking !== null) return app.go("conf");
        return this.sampleBooking();
      case "list":
        if (s.signedIn === null) await this.signInAs(PRIYA);
        return app.go("list");
      case "one": {
        if (s.signedIn === null) await this.signInAs(PRIYA);
        const own = s.oneId !== null && app.stay(s.oneId) !== null;
        return app.openOne(own ? s.oneId! : this.stayId("WH-S3303"));
      }
      case "folio":
        return openFolio(app, s.folioId ?? this.stayId("WH-S3283"), s.view !== null && s.view !== "folio" ? s.view : "today");
      case "newbooking":
        return app.go("newbooking", { editId: null, nb: blankNb(app), nbErr: "", nbTouched: false });
      default:
        return app.go(view);
    }
  }

  /** Each shortcut, by the id `demo-card.ts` gives it. */
  readonly shortcuts: Record<string, () => void | Promise<void>> = {
    // ── the guest site
    saturday: () => this.app.go("home", { search: { arrive: "2026-08-01", depart: "2026-08-02", guests: 2 }, searched: false, openRates: {} }),
    "four-guests": () => this.app.go("results", { search: { arrive: "2026-08-03", depart: "2026-08-05", guests: 4 }, searched: true, openRates: {} }),
    "results-offline": () => {
      this.demo.guest.readsDown = true;
      this.app.forget("avail:");
    },
    "fill-guest": () => this.app.setState({ form: { ...this.app.state.form, ...SAMPLE_GUEST }, formErr: false }),
    "room-goes": () => {
      this.demo.guest.fault = "room-gone";
      this.fillGuest();
      this.whenReady(() => this.app.tryReserve());
    },
    "reserve-offline": () => {
      this.demo.guest.fault = "offline";
      this.fillGuest();
      this.app.toast(tr("The house is not answering — try Reserve the room."), "info");
    },
    "price-moves": () => {
      this.demo.guest.fault = "price-moved";
      this.fillGuest();
      this.whenReady(() => this.app.tryReserve());
    },
    "no-emails": async () => {
      const settings = this.demo.world.all("settings")[0]!;
      this.demo.engine.write(() => this.demo.world.update("settings", settings.id, { guest_emails_on: false }));
      this.app.forget("guest:house");
      if (this.app.state.booking === null) await this.sampleBooking();
      else this.app.go("conf");
    },
    priya: () => {
      this.app.setState({ auth: { ...blankAuth(), email: PRIYA } });
      this.app.go("signin");
    },
    "unknown-address": () => {
      this.app.setState({ auth: { ...blankAuth(), email: "someone.new@example.com" } });
      this.app.go("signin");
      this.whenReady(() => void this.app.sendLink(false));
    },
    "open-link": async () => {
      const email = this.app.state.auth.email.trim() || PRIYA;
      await this.demo.guest.requestSignIn(email);
      await this.demo.guest.verifyLink(DEMO_SIGN_IN.token);
      this.app.setState({ auth: { ...blankAuth(), stage: "link", email } });
      this.app.go("signin");
    },
    "link-expires": () => {
      this.app.setState({ auth: { ...blankAuth(), stage: "expired", email: this.app.state.auth.email || PRIYA } });
      this.app.go("signin");
    },
    "priya-link": async () => {
      await this.app.ports.guest!.signOut();
      const id = this.stayId("WH-S3303");
      const token = String(this.demo.world.get("stays", id)!["link_token"]);
      await this.demo.guest.openLink(token);
      this.app.setState({ signedIn: null, linkStay: id });
      this.app.forget("guest:");
      this.app.openOne(id);
    },
    rafe: async () => {
      await this.signInAs("rafe.collier@example.com");
      this.app.go("list");
    },
    "signed-20": () => this.app.setState({ signedAt: Date.now() - 20 * 60_000 }),
    "inside-48": async () => {
      await this.signInAs("saoirse.doyle@example.com");
      this.app.openOne(this.stayId("WH-S3322"));
    },
    "outside-48": async () => {
      await this.signInAs("nadia.brightwell@example.com");
      this.app.openOne(this.stayId("WH-S3305"));
    },
    "move-nadia": async () => {
      await this.shortcuts["outside-48"]!();
      const st = await this.loaded(this.stayId("WH-S3305"));
      if (st !== null) this.app.setState({ chg: { id: st.id, arrive: "2026-07-30", depart: "2026-08-02", busy: false, moved: false, shown: null, err: "" } });
    },
    "close-309": async () => {
      const desk = this.demo.desk;
      const was = desk.person;
      desk.person = PEOPLE.manager;
      try {
        await desk.closeRoom({ room_id: this.roomId("309"), from_date: "2026-07-30", to_date: "2026-07-30", reason: "Radiator being replaced" });
      } catch {
        // Closed already.
      } finally {
        desk.person = was;
      }
      await this.shortcuts["move-nadia"]!();
    },

    // ── the desk: today
    "checkin-ren": () => openCheckin(this.app, this.stayId("WH-S3304")),
    "checkout-teodor": () => this.app.setState({ checkoutId: this.stayId("WH-S3283"), coMode: "booked" }),
    "walk-in": () => walkIn(this.app),
    afternoon: () => this.afternoon(),
    "no-garden": async () => {
      for (const n of ["208", "211"]) await this.demo.desk.setRoom(this.roomId(n), { status: "cleaning" }).catch(() => undefined);
      this.app.forget("desk:");
      this.whenReady(() => openCheckin(this.app, this.stayId("WH-S3303")));
    },
    "ottoline-rings": () => {
      const id = this.stayId("WH-S3301");
      this.app.setState({ expectId: id, expectPick: plus(this.app.day, 1) });
    },
    "after-22": async () => {
      await this.demo.desk.edit(this.stayId("WH-S3301"), { arrival_time: "22:30" });
      this.app.forget("desk:");
      this.app.go("today");
    },
    sorley: () => {
      this.clockTo("11:20", "2026-07-29");
      this.app.go("today");
    },

    // ── the desk: take a booking
    "known-guest": () => {
      const nb = this.app.state.nb ?? blankNb(this.app);
      this.app.go("newbooking", { editId: null, nb: { ...nb, email: PRIYA, link: null } });
    },
    "snug-three": () => {
      const nb = this.app.state.nb ?? blankNb(this.app);
      this.app.go("newbooking", { editId: null, nb: { ...nb, type: this.typeId("SNG"), guests: 3, arrive: "2026-08-03", depart: "2026-08-05" } });
    },
    "type-goes": () => {
      const nb = { ...(this.app.state.nb ?? blankNb(this.app)) };
      if (nb.type === null) nb.type = this.typeId("GDN");
      if (!nb.first.trim()) Object.assign(nb, { first: "Walter", last: "Penrose" });
      this.demo.desk.fault = "type-gone";
      this.app.go("newbooking", { editId: null, nb });
      setTimeout(() => void saveNb(this.app, false, null, undefined), 300);
    },

    // ── the desk: rack
    "close-304": () => {
      this.app.go("rack");
      openRoom(this.app, "304");
      this.app.setState({ oos: { from: "2026-08-01", to: "2026-08-01", reason: "" } });
    },
    housekeeping: () => {
      const desk = this.demo.desk;
      desk.person = desk.person.roles.includes("housekeeping") ? PEOPLE.desk : PEOPLE.housekeeping;
      this.app.forget("desk:");
      this.app.go("rack");
    },

    // ── the desk: folio
    "folio-afternoon": () => this.afternoon(),
    "record-balance": () => openSettle(this.app, this.app.state.folioId ?? this.stayId("WH-S3283")),
    "leaving-early": () => {
      const id = this.stayId("WH-S3292");
      openFolio(this.app, id, "today");
      this.app.setState({ checkoutId: id, coMode: "booked" });
    },
    "as-manager": () => {
      const desk = this.demo.desk;
      const boss = !desk.person.roles.includes("manager");
      desk.person = boss ? PEOPLE.manager : PEOPLE.desk;
      this.app.forget("desk:me");
      this.app.setState({ rowMenu: null, tipKey: null });
      this.app.toast(tr("Signed in as {name}.", { name: desk.person.name }), "info");
    },
    "late-cancel": () => openFolio(this.app, this.stayId("WH-S3278"), "reservations"),
    "noshow-paid": async () => {
      const id = this.stayId("WH-S3279");
      const row = this.demo.world.get("stays", id)!;
      if (row["status"] === "booked") {
        await this.demo.desk.recordPayment(id, { kind: "taken", amount: "100.00", method: "card" });
        // The morning after the night kept for them: the house marks the stay a no-show.
        this.clockTo("11:05");
      }
      this.app.forget("desk:");
      openFolio(this.app, id, "reservations");
    },
    "another-desk": async () => {
      const id = this.app.state.folioId ?? this.stayId("WH-S3283");
      if (this.app.state.folioId === null) openFolio(this.app, id, "today");
      const st = this.app.stay(id);
      const owing = st === null ? 0 : st.m.balance;
      if (owing <= 0.004) return;
      // The sheet opens on what the account said; another desk records all of it a moment later.
      openSettle(this.app, id, owing.toFixed(2), owing);
      const desk = this.demo.desk;
      const was = desk.person;
      desk.person = PEOPLE.manager;
      try {
        await desk.recordPayment(id, { kind: "taken", amount: owing.toFixed(2), method: "cash" });
      } finally {
        desk.person = was;
      }
    },
  };

  private afternoon(): void {
    this.clockTo("15:10");
    this.app.toast(tr("The clock is at {time}.", { time: strip(fT("15:10")) }), "info");
  }

  /** The clock row: check-out time today, or the next morning after a day in the house. */
  async advance(step: string): Promise<void> {
    const app = this.app;
    const H = app.world()?.H;
    if (step === "checkout") {
      const at = H?.leaveBy ?? "11:00";
      this.clockTo(at);
      app.toast(tr("The clock is at {time}. Departures are due.", { time: strip(fT(at)) }), "info");
      return;
    }
    if (step !== "day") return;
    const today = app.day;
    const desk = this.demo.desk;
    const was = desk.person;
    desk.person = PEOPLE.desk;
    try {
      // Today's leavers settle and go.
      for (const s of this.demo.world.where("stays", (x) => x["status"] === "in_house" && String(x["depart"]) <= today)) {
        const balance = Number(s["balance"]);
        if (balance > 0.004) await desk.recordPayment(s.id, { kind: "taken", amount: balance.toFixed(2), method: "card" });
        await desk.checkOut(s.id).catch(() => undefined);
      }
      // Today's arrivals come in, to the room given them or the first one ready.
      this.clockTo("22:00");
      for (const s of this.demo.world.where("stays", (x) => x["status"] === "booked" && String(x["arrive"]) === today)) {
        const rooms = this.demo.world.where("rooms", (r) => r["room_type_id"] === s["room_type_id"] && r["status"] === "ready");
        const given = s["room_id"] ?? null;
        for (const room of given === null ? rooms : [{ id: given as Id }, ...rooms]) {
          const ok = await desk.checkIn(s.id, room.id).then(
            () => true,
            () => false,
          );
          if (ok) break;
        }
      }
      // Overnight, every empty room is made ready.
      for (const r of this.demo.world.where("rooms", (x) => x["status"] === "cleaning")) await desk.setRoom(r.id, { status: "ready" }).catch(() => undefined);
    } finally {
      desk.person = was;
    }
    this.clockTo("09:05", plus(today, 1));
    app.forget("");
    app.toast(tr("Good morning — the clock is at {time}.", { time: strip(fT("09:05")) }), "info");
  }
}
