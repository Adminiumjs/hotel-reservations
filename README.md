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

- Adminium **0.3.6** or later, on SQLite, Postgres or MySQL.
- Nothing else. **Invoices & Receipts** is offered at install: with it, the
  desk prints a guest's folio and emails it at check-out, and each payment has
  a receipt.

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
two desks, one check-in of two, the last room sold once):

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
