# Hotel Reservations

A small hotel's guest site and front desk, installed into
[Adminium](https://adminium.dev). Guests search dates, reserve a room type and
look after their stay online; the desk checks them in and out, gives each a
room, keeps the folio and records what they pay. Adminium decides every price,
total, reference, room and status — the pages only ask.

**One hotel, one building, nothing taken online.** Nobody pays on the site and
nothing is sent by text message: the folio is settled at the desk. Stays run
one night to fourteen, and housekeeping is a room's status (ready, being
cleaned, out of service), never a list of jobs.

The demo is dressed as **Wren House**, a fictional 34-room hotel above a
harbour, at 09:05 on a Tuesday in July: twenty-one rooms in use, five arrivals
(one already late), four departures — and one of those four cannot leave yet,
because $1,099.03 is still on the folio.

**Live demo → [adminium.dev/demo/hotel-reservations](https://adminium.dev/demo/hotel-reservations)**

## What it needs

- Adminium **0.3.20** or later, on SQLite, Postgres or MySQL.
- Nothing else. Three add-ons are offered at install, and the house is whole
  with none of them:

| Add-on | Offered | What it adds | Without it |
|---|---|---|---|
| **Invoices & Receipts** (1.0.6 or later) | ticked | The desk prints a guest's folio and emails it at check-out; each payment has a receipt. | No print and no email button; everything else is the same. |
| **Inventory** (1.0.9 or later) | unticked | *Linen and supplies.* At check-out the room type's linen goes to the laundry and its amenities are used, as the kit you link to each room type says. Today counts what is in the store and at the laundry; the room rack has "Back from the laundry". | No linen line, no button; a check-out is the save it always was. |
| **Offers & gift cards** (1.0.9 or later) | unticked | *Codes and vouchers:* "Have a code?" on the guest's Reserve page and on the desk's Take a booking — the reduction comes off the room and the extras before the tax, priced by Adminium, and is named on the confirmation, the folio and its email. *Gift cards:* a fourth way to pay at the desk (checked first, then taken for exactly what the check answered), money given back to the card it came from, and a balance page on the guest site. | No code field, no "Gift card" in the payment dialog, no balance page; prices are what they always were. |

What each role holds of an add-on's own tables is written when the add-on is
connected and taken back when it is disconnected: housekeeping moves linen
and reads its counts, and nothing else of Inventory; the front desk does the
same, reads what was taken off a stay, and may look a typed code up — it is
never read a code back. A person given a second role with a plain read of one
of those tables reads all of it.

## What it does

**For guests** (the app's customer side):
- Search dates and a party size and see only the room types open on every
  night of the stay, each priced night by night — a weekend or a summer week
  costs what the house's rates say — with the nights adding up to the total
  beside them. A type that is full says when it is next open.
- Reserve a room type, with extras (breakfast, parking, a late leaving) and an
  arrival time. The price is Adminium's, asked again as the reservation is
  made: a price that moved in between is shown, never taken unseen.
- A confirmation email in the guest's language, with the stay's own link.
- Their stay, by that link or by signing in with a link emailed to them:
  change the arrival time, add or drop an extra, move the dates (re-priced by
  Adminium) or cancel — no charge for cancelling; after the house's notice it
  is marked as late. A new link, signing out on every device, and deleting
  their details.

**For the desk** (the app's staff side):
- Today: who is arriving, who is in the house and who is leaving, each with
  what they owe. Checking in gives a room only from those ready and of the
  type booked; checking out is refused while money is owed, and names the
  amount.
- The folio: the nights, the extras, charges (from the house's list or
  "something else"), the nights not stayed when a guest leaves early, and
  payments — part payments too, never more than is owed. Voids are a manager's.
- Taking a booking and changing one, priced by Adminium before it is saved.
- The room rack and a fortnight's calendar; moving a guest to another room;
  closing a room for repair; a no-show and "they came after all".
- Changes made at another desk appear without a reload.

**Roles.** Front desk runs the day; housekeeping sees the rooms and marks them
ready or being cleaned, and reads no names or money; the manager does
everything, including voids and the dashboard.

**In the dashboard** (the Hotel section): the Overview (occupancy and room
income tonight, arrivals, who is leaving with money owing, rooms out of
service), the reservations, guests, charges, nights not stayed, payments and
the emails sent; and the room types, rooms, closures, rate rules, extras,
charge items, house notes and settings — the hotel's name and words, its tax,
its arrival and leaving times, its cancellation notice and the longest stay.

## Installing it

Install Hotel Reservations from Adminium's app catalog and pick the database it
should use. Adminium creates the app's tables, the dashboard pages, the
`front-desk`, `housekeeping` and `manager` roles, the guests' browser keys and
the emails. Tick sample data at the install step to start with Wren House's
Tuesday, or add it later from the app's settings.

Once installed, the desk is served at `/apps/hotel/staff/` and the guest site
at `/apps/hotel/customer/`. A hotel can also give the guest site a domain of
its own.

**Moving from 0.2.x.** 0.3.0 updates a 0.2.x install in place — update
Adminium to 0.3.20 first, then the app. The update adds one table (a code
typed on a reservation), new empty columns on reservations, their extras and
payments, and one more way to pay ("Gift card") in the payments' list. Nothing
is dropped, renamed or rewritten: every reservation, payment and total is the
row it was, to the cent, and a reservation that has checked out or been
cancelled is never priced again. Nothing new shows until an add-on is
connected. The update asks you to allow one new thing on the guest site: a
code sent with a reservation.

Three things to know once an add-on is connected:

- *Inventory.* Link each room type to a kit (Inventory → Kits and links); a
  kit line that moves linen names where it goes, and the link or the line
  names where it is kept. Inventory's own sample has a "Room turnover" kit,
  and this app's sample links the four room types to it. A check-out is never
  stopped because something is short — the stock manager finds it under "to
  check". While Inventory is connected and switched off for the house (or
  updating), a check-out still goes through for items that may run short and
  is caught up afterwards; with nothing linked at all it is refused until
  Inventory is on again, or its rule is switched off (Studio → the
  reservations table → Stock rules).
- *Offers & gift cards.* A code is typed when the reservation is made, and at
  no other time; moving a booked stay's dates prices it again under the same
  offer. Cancelling gives a limited code's use back; a no-show keeps it. While
  Offers & gift cards is connected and cannot answer (switched off for the
  house, or updating), **no reservation can be saved** — with no code either —
  because its price could not be decided; switch the price rule off (Studio →
  the reservations table → Offer rules) or disconnect the add-on to take
  reservations at the plain price meanwhile.
- *Before disconnecting Offers & gift cards*, give back any gift card money
  that is to go back: afterwards the desk has no "Give back to the card", and
  what a card paid stays on the folio as a payment.

**Coming from 0.1.x?** 0.2.0 is a different app on new tables, and it cannot
update a 0.1.x install in place. Uninstall 0.1.x first (its tables stay unless
you choose to drop them), then install 0.2.0. Nothing is carried over from the
old tables.

## Local development

```bash
npm install
npm run dev
```

Then open the URL Vite prints (default http://localhost:5173): the demo, with
the house's guest site and desk on a browser-only Adminium of their own.

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server (the demo). |
| `npm run build` | Type-check and build to `dist/`. |
| `npm run build:demo` | Build the website's demo, at base `/demo/hotel-reservations/app/`. |
| `npm run build:surface` | Build the two sides Adminium serves (`dist-surface/`). |
| `npm run manifest` | Write `manifest.json` from `src/manifest/`. |
| `npm run sample` | Write the sample (`seeds/hotel.sample.json`) from `src/sample/wren-house.ts`. |
| `npm run strings` | Collect the screens' sentences and sort each language's words by side. |
| `npm test` | Run the suite. |
| `npm run e2e` | Walk the demo in a browser: every screen in light, dark, Arabic and on a phone, swept by axe. |

`manifest.json` and the sample are written from the typed modules in
`src/manifest/` and `src/sample/`; edit those and run the script. A test fails
when the two disagree.

### The three-engine contract

With a built Adminium checkout beside this one, the suite also installs the app
on SQLite, Postgres and MySQL and drives every write through the app's own
doors — the guest's and the desk's — including the races (one room to one of
two desks, one check-in of two, the last room sold once). With a built add-ons
checkout too (`ADD_ONS_REPO`) it runs the codes, vouchers, gift cards and
linen, and the house with the add-ons away or unable to answer; and with the
released package of the version in service (`CONTRACT_FROM_TARBALL`) and a
build of the Adminium it was released for (`CONTRACT_FROM_ADMINIUM`), the
update of a live install, row for row:

```bash
ADMINIUM_CONTRACT=1 ADMINIUM_REPO=../adminium npx vitest run src/contract
```

## Project structure

```
manifest.json  what Adminium installs (written from src/manifest/)
seeds/         the sample, written from src/sample/
src/
  manifest/    the tables and their rules, the pages, the roles, the guests'
               doors, the emails, the folio and receipt, the Overview
  sample/      Wren House's Tuesday, as one checked source
  app/         the controller, the values each screen draws, the desk's actions
  view/        the guest site, the desk, and the sheets over them
  data/        the doors into Adminium: the guest's (public API) and the desk's
  demo/        the browser-only Adminium the demo runs on, and its moments
  i18n/        the 8-language words, sorted by the side that draws them
  contract/    the three-engine contract
  testing/     the product's manifest validator, vendored for the tests
e2e/           the browser walk (Playwright + axe)
public/fonts/  self-hosted fonts (woff2)
```

## License

[AGPL-3.0](LICENSE) © 2026 Hotel Reservations. A demo shipped with Adminium.

## Building on this app with a coding agent

The Adminium skills teach Claude Code, Codex and other agents to build and change an app:
`npx skills add Adminiumjs/skills` — https://github.com/Adminiumjs/skills
