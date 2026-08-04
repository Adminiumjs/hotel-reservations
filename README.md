# Hotel Reservations

A complete, production-shaped reservations site and front desk — built with
Vite + React + TypeScript, no CSS framework, no backend required. It's an
example app that ships with [Adminium](https://adminium.dev): search dates and
reserve a room as a guest, then switch to the desk and work the day — check
people in, give them a room, add to the folio, take a payment, send them on
their way.

The demo is dressed as **Wren House**, a fictional 34-room independent hotel in
a coastal town, so the morning reads like a real Tuesday rather than lorem
ipsum: twenty-one rooms in the building, five arrivals of whom one is already
in and one has left a note, four departures — and one of those four cannot check
out, because there is still $1,291.60 on the folio.

**Live demo → [adminium.dev/demo/hotel-reservations](https://adminium.dev/demo/hotel-reservations)**

## What it is, and what it deliberately is not

Wren House is **one hotel in one building**, and this app covers the guest's
stay and the desk that runs it: search, rates, availability, reserve, arrive,
assign a room, the folio, depart.

It contains **nothing** that resembles managing property as an asset. No owners
or owner statements, no unit ownership or revenue shares, no leases or
tenancies, no long-stay or monthly rentals, no building maintenance work orders
or job dispatch, no listings syndicated to other sites, and no portfolio or
multi-property view.

Two rules make that line visible in the product rather than only in this
paragraph:

- **Stays cap at fourteen nights**, enforced with a plain message a guest
  actually reads — and again by a `CHECK` constraint in
  [`db/schema.sql`](db/schema.sql), so a row that would make this a letting
  cannot be inserted at all.
- **Housekeeping is a room-status flag** — Ready, Being cleaned, Out of service
  — never a work queue, a job list or an assignment screen. The rack says so on
  the screen itself.

## What it does

- **Two personas in one build.** The demo dock switches between the public site
  and the desk. The loop closes across it: reserve a room as a guest, switch to
  **Front desk**, and the new reservation is in the Arriving column waiting to
  be checked in.

- **A real availability engine.** [`src/lib/stay.ts`](src/lib/stay.ts) is a
  pure module with no hooks and no store in it. A stay occupies the nights `[arrive, departure)`, so
  a room given up on the 26th is sellable to somebody arriving on the 26th and
  the calendar shows it as available — getting that wrong loses a hotel a night
  per turnover. Availability across a range is the **minimum** over its nights,
  not the average. **75 assertions** in [`stay.test.ts`](src/lib/stay.test.ts)
  run against the shipped seed, and four of them come at the half-open interval
  from four different directions.

- **Rates that add up.** Friday and Saturday carry a weekend delta and August
  carries a high-season one, and both apply together. The "see the nightly
  rates" disclosure on a results card expands to a per-night list that
  **visibly sums to the total** beside it, because a flat rate times nights
  would simply be wrong.

- **Rules the guest can see.** A Saturday arrival needs two nights and a stay
  runs one to fourteen; both surface as friendly inline messages naming the
  rule, not as a disabled button that says nothing. A room type with nothing
  open shows the earliest date that would work, as a button.

- **A room type, never a room number.** The confirmation names the type and says
  in as many words that the room itself is picked when you arrive. The check-in
  sheet then offers **only rooms that are Ready and of the booked type** — and
  when none is, it says so, names how many are being cleaned, and offers the
  rack.

- **A folio that refuses to lie.** One line per night, then extras with their
  dates, then payments starting with the one-night deposit, each carrying a
  running balance down the right. The settle popover takes partial amounts and
  **refuses** an overpayment, naming the excess. **Checking out with a balance
  outstanding is blocked**, with a plain reason and the amount named — not a
  silently disabled button, because the guest is standing there.

- **A clock with exactly two positions.** Nothing user-visible reads
  `Date.now()`. "Now" is Tuesday 28 July 2026, 09:05 — mid-departure — and the
  dock's **Advance to check-out time** chip is the only thing that moves it.

- **Eight languages, including a right-to-left one.** English, German, French,
  Czech, Danish, Simplified and Traditional Chinese, and Egyptian Arabic.
  Plurals go through `Intl.PluralRules` in each locale's own CLDR order — Czech
  gets its three forms, Arabic its six. Room types, features and the note a
  guest left are stored as translation keys, so they move with the chrome.

- **RTL by construction.** Every positional rule is a CSS logical property, so
  stamping `dir="rtl"` on `<html>` mirrors both shells, the board, the rack and
  the demo dock with no second stylesheet. Dates, rates and references are
  isolated so the bidi algorithm cannot reorder them.

- **Light / dark themes** via CSS custom properties, following your OS on first
  load. One deliberate constraint: in dark the navy accent lands near `--info`,
  so `--info` is used on status pills only and **never on a button** — a guest
  should never have to work out which blue is the one to press.

- **No bitmaps, no external requests.** Room types are layered gradients with an
  oversized icon and a mono code chip, one tint per type reused everywhere.
  Fonts are self-hosted woff2. The app works offline and behind a firewall.

## Local development

```bash
npm install
```

```bash
npm run dev
```

Then open the URL Vite prints (default http://localhost:5173).

### Driving the demo

The dock in the corner is the demo. Everything else is the product.

| Control | What it does |
| --- | --- |
| **Guest / Front desk** | Switches persona. The loop closes across it — this is the thing to show. |
| **Advance to check-out time** | Moves the pinned clock past 11:00. Departures become due and the board re-sorts. |
| **Language** | Eight locales, including Arabic, which flips the whole layout to RTL. |
| **Theme** | Latches light or dark over the OS preference. |
| **Reset** | Puts the seeded Tuesday back the way it started, clock included. |

A ninety-second tour: pick dates on the home page → **See what is open** → expand
*see the nightly rates* and watch the per-night list add up to the total →
**Reserve** → the confirmation gives you a room *type* and a reference →
**Your reservation**, tap the hint chip and look it up → switch to **Front
desk** → **Today**: Ottoline Grey has left a note, so check her in and pick a
room → the folio opens → back to **Today**, try to check Teodor Blank out and
read why you cannot → take the payment, then check him out and watch room 301
turn amber on the **Room rack** → **Calendar**: Saturday 1 August is fully
committed on the loft suites.

## Deploy

- **Vercel** — import the repo. Build command `npm run build`, output `dist`.
- **DigitalOcean App Platform** — import the repo; same command.
- **Host anywhere** — `npm run build` produces a fully static `dist/`. Or build
  the container:

  ```bash
  docker build -t hotel-reservations .
  ```

### Build scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server. |
| `npm run build` | Type-check + build to `dist/` at base `/` (root deploys). |
| `npm run build:demo` | Build to `dist/` at base `/demo/hotel-reservations/`. |
| `npm run preview` | Preview a production build locally. |
| `npm test` | Run the stay-engine suite. |

## Full implementation (self-host)

There are two ways to run this hotel.

**One click — the frontend on its own.** The deploy routes above put the site
and the desk up by themselves, running on the bundled demo Tuesday. No
database, no dashboard — a fully static preview.

**One command — the whole stack.**
[`docker-compose.yml`](docker-compose.yml) stands up Postgres (seeded with the
*same* rooms, reservations, extras and payments), an auto-generated Adminium
dashboard that runs that real database, and the desk:

```bash
cp .env.example .env      # then set ADMINIUM_SECRET — e.g. openssl rand -hex 32
```

```bash
docker compose up
```

- **Reservations desk** → http://localhost:8080
- **Adminium dashboard** → http://localhost:4600

On first boot, `house-db` applies [`db/schema.sql`](db/schema.sql) then
[`db/seed.sql`](db/seed.sql), and Adminium imports the hotel database
(`wrenhouse`) as its first source connection, introspects the schema, and
generates the back office. The install spec Adminium reads is
[`manifest.json`](manifest.json).

The seed is the app's own Tuesday, not a second fiction: the same 34 rooms, the
same two out of service and three being cleaned, the same 21 occupied, the same
27 references `WH-3280…WH-3306`. Open the dashboard and Teodor Blank is the row
you were just refusing to check out.

`db/seed.sql` is **generated** from `src/data/demo.ts` so the two cannot drift.
To regenerate after changing the fiction:

```bash
npx esbuild src/data/demo.ts --bundle --format=esm --outfile=/tmp/demo.mjs
```

…then run the small emitter documented at the top of `db/seed.sql`.

## The split: the desk and the back office

The app you deploy is **the stay and the desk**. The dashboard Adminium
generates from your schema is **the back office**:

| In this app | In the generated dashboard |
| --- | --- |
| Searching, reserving, arriving, departing | Every table as records, with full CRUD |
| Tonight's board and this fortnight's calendar | The whole book, across years |
| A folio while the guest is in the building | Rate administration and reporting |
| A room's status | Imports, exports and bulk edits |

The manifest scaffolds 8 tables into your connected database. The scope
boundary holds on both sides of the split: there is no owner, lease, long-stay
or work-order table anywhere in `db/schema.sql`, and nothing in the manifest
that would show one.

## Connecting to Adminium

All data access goes through a thin `DataSource` interface
([`src/data/source.ts`](src/data/source.ts)) with a single `demoSource`
implementation backed by the bundled seed. **Today the deployed demo is demo
data only — nothing is persisted, no card is charged and no message is sent.**
Once Adminium's browser-safe publishable key (`adm_pub_…`) ships, the frontend
will read and write live data through the Adminium records API via a second
`DataSource` implementation, without touching any of the screens or the store.

### What is deliberately out of scope

- **Anything that treats the building as an asset.** Owners, leases, long stays,
  maintenance queues, syndication, a second property. See the boundary above.
- **Rate administration.** Rates and their weekend and season deltas are
  reference data the hotel maintains in the generated dashboard.
- **Group bookings** and **guest history across stays**.
- **Taking a real payment.** The card sheet says so in as many words before you
  type a digit.

## Project structure

```
src/
  app/         App shell + the exhaustive 14-view switch
  state/       Zustand store (persona, the two-position clock, rooms, stays,
               the search draft, the reservation form, drafts, toasts)
  data/        demo.ts (the seeded house), types.ts, source.ts (DataSource seam)
  i18n/        8-locale runtime, locale registry, ambient bridge,
               strings/ (chrome, screens, seeded nouns)
  lib/         stay.ts (the engine) + tests, format.ts (locale-aware output)
  screens/     Guest.tsx (home, results, room type, reserve, confirm,
                          your reservation, rooms, find us)
               Desk.tsx  (today, rack, calendar, reservations, folio)
               NotFound.tsx
  components/  two shells, demo dock, overlays, primitives
  styles/      tokens.css (canonical design tokens), base.css, components.css,
               screens.css
db/            schema.sql + generated seed.sql for the full self-host stack
public/fonts/  self-hosted Manrope + JetBrains Mono (woff2)
manifest.json  the Adminium install spec (8 tables)
```

## License

[AGPL-3.0](LICENSE) © 2026 Hotel Reservations. A demo shipped with Adminium.
