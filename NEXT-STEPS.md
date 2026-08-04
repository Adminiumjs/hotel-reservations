# Wren House — where this got to, and what is left

Working note, not documentation. Delete it when the app ships.

## What is done and verified

| Layer | File(s) | State |
| --- | --- | --- |
| Types + scope boundary | `src/data/types.ts` | Done. 21 D13 is stated in the types: no owner, lease, long-stay, work-order or second-property shape exists, and housekeeping is `RoomStatus` only. |
| Seeded house | `src/data/demo.ts` | Done. 34 rooms / 3 floors / 4 types (8·14·8·4), 2 out of service, 3 being cleaned, 21 occupied. 27 stays `WH-3280…WH-3306`, next ref 3307. |
| DataSource seam | `src/data/source.ts` | Done. |
| Stay engine | `src/lib/stay.ts` | Done. Interval availability, 1–14 nights + Saturday rule, nightly rates with weekend/August deltas, the folio, overpayment refusal, check-out block, assignment restricted to Ready rooms of the booked type, occupancy + average rate, the calendar grid, the 48-hour cancellation window. |
| Engine tests | `src/lib/stay.test.ts` | **75 assertions, all passing.** Includes the seeded-house section: 21 of 32 sold tonight, one blocked check-out at exactly $1,291.60, three departures balancing to zero, every loft suite committed on Saturday 1 August, and two tests that assert the D13 boundary rather than just documenting it. |
| Design tokens | `src/styles/tokens.css` | Done. Canonical set + the navy accent pair (`#1e3a8a` / `#9db4f5`), with the `--info` warning recorded. |
| Base / components / screens CSS | `src/styles/*.css` | Ported from `factory-ops` with the `wh-` prefix. Guest-site chrome (centred column, wordmark header, public footer) still needs adding — everything else is shared. |
| i18n runtime | `src/i18n/{index.tsx,ambient.ts,locales.ts,messages/index.ts}` | Done, currency switched to USD. |
| Formatters | `src/lib/format.ts` | Done. |
| Repo scaffold | `package.json`, `vite.config.ts`, `index.html`, `Dockerfile`, `Caddyfile`, `.do/`, tsconfigs, fonts, favicon | Done. |

`npm test` passes. `npm run build` does **not** yet — there is no entry point.

## What is left

1. **`src/i18n/strings/{chrome,screens,data}.ts`** — three bundles × 8 locales.
   Mirror `factory-ops/src/i18n/strings/*` exactly in shape. This is the single
   biggest remaining piece.

   **The vocabulary bans bite hardest here** (21 D10a): never *upgrade* (say
   "move to a bigger room"), never *free* in any form ("breakfast is included",
   "WiFi throughout", "cancel at no charge"), never *plan* (rate, what's
   included, the layout), never *tier* (room types), never *pricing* (rates),
   never *billing* (the folio, the account, payments). Watch the other languages
   too — German `Zeitplan`/`Tier`, French `plan`, Danish `plan`. The German word
   `aussortiert` was caught in `factory-ops` for containing `tier`; assume more
   like it.

2. **`src/state/store.ts`** — one zustand store. Copy the shape from
   `factory-ops`. The one thing this app has that the works desk does not is the
   **clock phase**: `morning` → `after`, flipped by the dock's "Advance to
   check-out time" chip, which also flips any checked-out room to `cleaning` and
   re-sorts the Today board.

3. **`src/components/`** — `Primitives.tsx` (copy and adapt), `Shell.tsx`
   (**two** shells this time: a warm public site for the Guest with a centred
   column and no sidebar, and internal desk chrome with a sidebar and a search
   over names and references), `DemoDock.tsx` (persona segment, mono clock
   readout, the advance chip, theme, language, reset), `Overlays.tsx` (check-in
   sheet, add-a-charge popover, settle popover, cancel confirm, toasts).

4. **`src/screens/`** — 14 views:
   *Guest* `home · results · roomtype · reserve · confirm · myreservation ·
   rooms · findus`; *Desk* `today · rack · calendar · reservations · folio`;
   plus `notfound`.

5. **`src/app/App.tsx` + `src/main.tsx`** — copy `factory-ops` and swap the
   screen map.

6. **Deploy stack** — `db/schema.sql`, generated `db/seed.sql`, `manifest.json`,
   `docker-compose.yml`, `README.md`. Follow `factory-ops` exactly; the seed
   generator recipe is in that repo's README.

## Things worth not re-deriving

- **The comp's own data module was never exported.** `Wren House.dc.html`
  dynamically imports `./wren-house-data.js`, which does not exist on disk and
  is not reachable through DesignSync (the Design project is not a
  design-system project, so `list_projects` cannot see it). The seed in
  `src/data/demo.ts` was therefore authored from prompt **H** plus the record
  shapes the comp's logic reveals. Same was true of Kilnworks.
- **The comp adds views the prompt did not list**: `rooms` (browse the four
  types without dates in mind), `findus`, `reservations` (a desk list with a
  filter), and `newbooking` (a walk-in taken at the desk, which is where the
  `noDeposit` flag on a stay comes from). `newbooking` is the one candidate to
  cut if time runs short — the guest flow already covers making a reservation.
- **The comp prices in USD**, not GBP — confirmed from its `money()` helper. The
  `$110–$260` range in the prompt is asserted in the test suite.
