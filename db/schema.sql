-- Hotel Reservations — PostgreSQL schema (manifest §requiredSchema contract).
--
-- This is the real database behind the full self-host stack: the reservations
-- desk reads it (through Adminium's records API) and the auto-generated
-- Adminium dashboard is the back office. Applied automatically on first boot of
-- the `house-db` container via /docker-entrypoint-initdb.d/01-schema.sql, then
-- seeded by 02-seed.sql. The seed mirrors src/data/demo.ts one for one — the
-- same thirty-four rooms, the same twenty-seven reservations, the same Tuesday
-- morning — so the desk and the dashboard run the same hotel.
--
-- THE SCOPE BOUNDARY IS IN THIS FILE (21 D13), and this is the easiest place to
-- break it quietly. Wren House is ONE hotel in ONE building. There is no table
-- below for an owner, an owner statement, a unit share, a lease, a tenancy, a
-- long stay, a maintenance work order, a job dispatch, a syndicated listing or a
-- second property — and none should be added.
--
-- Two guards keep the line visible in the data rather than only in this comment:
--
--   • `stays_length_ck` caps a stay at fourteen nights, in the database, so a
--     row that would make this a letting cannot be inserted at all;
--   • housekeeping is `rooms.status` and nothing else — ready / occupied /
--     cleaning / out of service. There is no work-order table, because a
--     work-order queue is the field-service product this app is deliberately
--     not.
--
-- Nothing derived is stored: a stay's nights, its room total, its tax, its
-- balance, tonight's occupancy and the average nightly rate are all computed —
-- in src/lib/stay.ts in the app, and in a query on the dashboard side.
--
-- Money is numeric(12, 2) — never a float. Calendar days are `date`: a guest
-- arrives ON the 24th, not at an instant on it. Times of day (check-in, the
-- arrival a guest promised) are "HH:MM" text, because they are points on a
-- daily grid rather than moments on a timeline, and storing them as timestamps
-- would invite somebody to subtract two of them and be wrong twice a year.

DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS charges CASCADE;
DROP TABLE IF EXISTS stay_extras CASCADE;
DROP TABLE IF EXISTS stays CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS extras CASCADE;
DROP TABLE IF EXISTS room_type_features CASCADE;
DROP TABLE IF EXISTS room_types CASCADE;

-- The house ------------------------------------------------------------------

-- One tint per room type, reused everywhere that type appears — the results
-- card, the room-type page, the rack tile, the calendar row. `base_rate` is the
-- rate BEFORE the weekend and high-season deltas; the nightly rate is derived.
CREATE TABLE room_types (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  blurb       text NOT NULL,
  description text NOT NULL,
  sleeps      integer NOT NULL CHECK (sleeps > 0),
  tint_from   text NOT NULL,
  tint_to     text NOT NULL,
  icon        text NOT NULL,
  code        text NOT NULL,
  base_rate   numeric(12, 2) NOT NULL CHECK (base_rate > 0)
);

-- What is in the room, drawn as icon chips. A table rather than an array so the
-- generated dashboard can edit one without rewriting the row.
CREATE TABLE room_type_features (
  id      serial PRIMARY KEY,
  type_id text NOT NULL REFERENCES room_types (id) ON DELETE CASCADE,
  feature text NOT NULL,
  UNIQUE (type_id, feature)
);

-- `status` IS housekeeping, in its entirety. `note` carries the reason a room
-- is out of service — "the shower is being replaced" — which is as close to a
-- work order as this product gets, on purpose.
CREATE TABLE rooms (
  number  integer PRIMARY KEY,
  floor   integer NOT NULL CHECK (floor > 0),
  type_id text NOT NULL REFERENCES room_types (id),
  status  text NOT NULL CHECK (status IN ('ready', 'occupied', 'cleaning', 'oos')),
  note    text
);

CREATE INDEX rooms_status_idx ON rooms (status);
CREATE INDEX rooms_type_idx ON rooms (type_id);

-- What a guest can add to a stay, priced the way it is actually charged.
CREATE TABLE extras (
  id      text PRIMARY KEY,
  label   text NOT NULL,
  amount  numeric(12, 2) NOT NULL CHECK (amount > 0),
  charged text NOT NULL CHECK (charged IN ('person-night', 'night', 'stay')),
  icon    text NOT NULL
);

-- The book -------------------------------------------------------------------

-- A stay occupies the nights [arrive, depart) — the room is given up on the
-- departure date and is sellable that same night. `depart > arrive` is the
-- database saying so.
CREATE TABLE stays (
  ref           text PRIMARY KEY,
  first_name    text NOT NULL,
  last_name     text NOT NULL,
  email         text NOT NULL DEFAULT '',
  mobile        text NOT NULL DEFAULT '',
  type_id       text NOT NULL REFERENCES room_types (id),
  -- Assigned at ARRIVAL, never before. The confirmation says so in as many
  -- words, and this column is null until somebody walks through the door.
  room_number   integer REFERENCES rooms (number),
  arrive        date NOT NULL,
  depart        date NOT NULL,
  guests        integer NOT NULL CHECK (guests > 0),
  arrival_time  text NOT NULL,
  note          text,
  status        text NOT NULL CHECK (status IN
                  ('held', 'confirmed', 'in_house', 'departed', 'cancelled')),
  checked_in_at text,
  -- A booking taken at the desk with nothing held. The deposit row is then
  -- absent rather than zero, and the whole stay settles on departure.
  no_deposit    boolean NOT NULL DEFAULT false,

  CONSTRAINT stays_order_ck CHECK (depart > arrive),
  -- 21 D13, enforced in the database and not only in the engine. One night to
  -- fourteen; anything longer is a letting, and this app does not do lettings.
  CONSTRAINT stays_length_ck CHECK (depart - arrive BETWEEN 1 AND 14),
  -- A guest in the building has a room; one who has not arrived does not.
  CONSTRAINT stays_room_ck CHECK (
    (status = 'in_house' AND room_number IS NOT NULL) OR status <> 'in_house'
  )
);

CREATE INDEX stays_dates_idx ON stays (arrive, depart);
CREATE INDEX stays_status_idx ON stays (status);
CREATE INDEX stays_surname_idx ON stays (lower(last_name));

CREATE TABLE stay_extras (
  id       serial PRIMARY KEY,
  stay_ref text NOT NULL REFERENCES stays (ref) ON DELETE CASCADE,
  extra_id text NOT NULL REFERENCES extras (id),
  UNIQUE (stay_ref, extra_id)
);

-- Something added to the folio at the desk during the stay. Separate from
-- `stay_extras` because an extra was chosen when the room was booked and is
-- priced per night or per person; a charge happened once, on a date.
CREATE TABLE charges (
  id         serial PRIMARY KEY,
  stay_ref   text NOT NULL REFERENCES stays (ref) ON DELETE CASCADE,
  charged_on date NOT NULL,
  kind       text NOT NULL,
  label      text NOT NULL,
  amount     numeric(12, 2) NOT NULL CHECK (amount > 0)
);

CREATE INDEX charges_stay_idx ON charges (stay_ref);

-- The folio's payment side. The one-night deposit is DERIVED (it is the first
-- night's rate) and is therefore not a row here unless somebody actually took a
-- second payment. Partials are welcome; overpayment is refused in the app
-- rather than here, because the constraint would have to join to know the
-- total, and a CHECK that has to join is a CHECK that gets dropped.
CREATE TABLE payments (
  id       serial PRIMARY KEY,
  stay_ref text NOT NULL REFERENCES stays (ref) ON DELETE CASCADE,
  paid_on  date NOT NULL,
  method   text NOT NULL CHECK (method IN ('card', 'cash', 'transfer')),
  label    text NOT NULL,
  amount   numeric(12, 2) NOT NULL CHECK (amount > 0)
);

CREATE INDEX payments_stay_idx ON payments (stay_ref);
