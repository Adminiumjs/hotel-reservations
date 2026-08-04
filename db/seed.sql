-- Hotel Reservations — seed data.
--
-- Mirrors src/data/demo.ts one for one: the same thirty-four rooms over three
-- floors, the same two out of service and three being cleaned, the same
-- twenty-one occupied, and the same twenty-seven reservations WH-3280…WH-3306.
-- Run the app and the generated dashboard side by side and they show the same
-- Tuesday, down to the departure who cannot check out because $1,291.60 is
-- still on the folio.
--
-- GENERATED from the TypeScript seed rather than hand-written, so the two can
-- never drift. Regenerate with the recipe in README.md if the fiction changes.

BEGIN;

INSERT INTO room_types (id, name, blurb, description, sleeps, tint_from, tint_to, icon, code, base_rate) VALUES
  ('snug', 'Snug single', 'A small room at the back, quiet as anything.', 'One bed, one window over the yard, and the quietest corner of the house. We give it to people who are here to walk and come back tired.', 1, '#c9a882', '#a07f57', 'bed-single', 'SNG', 110),
  ('garden', 'Garden double', 'Doors onto the walled garden.', 'A double bed and a pair of doors that open onto the walled garden. Most of the house is these, and most people who come back ask for one.', 2, '#88a58e', '#5b7a63', 'trees', 'GDN', 150),
  ('harbour', 'Harbour double', 'The water, and the boats going out.', 'Front of the house, up a floor, looking straight out at the water. The boats go out early and you will hear them, which people either love or move room over.', 2, '#6d93b8', '#3f6389', 'waves', 'HBR', 180),
  ('loft', 'Loft suite', 'The whole top floor, with a sitting room.', 'Under the roof, with a sitting room, a sofa bed and windows on both sides. Four of them, and they go first in August.', 4, '#9d86b5', '#6f5a89', 'sofa', 'LFT', 215);

INSERT INTO room_type_features (type_id, feature) VALUES
  ('snug', 'single'),
  ('snug', 'shower'),
  ('snug', 'wifi'),
  ('snug', 'tea'),
  ('snug', 'desk'),
  ('garden', 'double'),
  ('garden', 'garden'),
  ('garden', 'bath'),
  ('garden', 'wifi'),
  ('garden', 'tea'),
  ('garden', 'robes'),
  ('harbour', 'double'),
  ('harbour', 'water'),
  ('harbour', 'bath'),
  ('harbour', 'wifi'),
  ('harbour', 'tea'),
  ('harbour', 'robes'),
  ('loft', 'double'),
  ('loft', 'sofa'),
  ('loft', 'sitting'),
  ('loft', 'bath'),
  ('loft', 'wifi'),
  ('loft', 'tea'),
  ('loft', 'robes');

INSERT INTO extras (id, label, amount, charged, icon) VALUES
  ('breakfast', 'Breakfast in the morning', 14, 'person-night', 'croissant'),
  ('parking', 'A space in the yard', 12, 'night', 'car'),
  ('late', 'A late leaving', 30, 'stay', 'clock');

INSERT INTO rooms (number, floor, type_id, status, note) VALUES
  (101, 1, 'snug', 'occupied', NULL),
  (102, 1, 'snug', 'occupied', NULL),
  (103, 1, 'snug', 'cleaning', NULL),
  (104, 1, 'snug', 'occupied', NULL),
  (105, 1, 'garden', 'occupied', NULL),
  (106, 1, 'garden', 'occupied', NULL),
  (107, 1, 'garden', 'occupied', NULL),
  (108, 1, 'garden', 'oos', 'The shower is being replaced'),
  (109, 1, 'garden', 'occupied', NULL),
  (110, 1, 'garden', 'occupied', NULL),
  (111, 1, 'garden', 'occupied', NULL),
  (112, 1, 'garden', 'occupied', NULL),
  (201, 2, 'snug', 'occupied', NULL),
  (202, 2, 'snug', 'occupied', NULL),
  (203, 2, 'snug', 'ready', NULL),
  (204, 2, 'snug', 'ready', NULL),
  (205, 2, 'garden', 'cleaning', NULL),
  (206, 2, 'garden', 'occupied', NULL),
  (207, 2, 'garden', 'occupied', NULL),
  (208, 2, 'garden', 'ready', NULL),
  (209, 2, 'harbour', 'occupied', NULL),
  (210, 2, 'harbour', 'oos', 'Waiting on the window repair'),
  (211, 2, 'garden', 'ready', NULL),
  (212, 2, 'garden', 'ready', NULL),
  (301, 3, 'loft', 'occupied', NULL),
  (302, 3, 'loft', 'occupied', NULL),
  (303, 3, 'loft', 'occupied', NULL),
  (304, 3, 'loft', 'ready', NULL),
  (305, 3, 'harbour', 'occupied', NULL),
  (306, 3, 'harbour', 'cleaning', NULL),
  (307, 3, 'harbour', 'occupied', NULL),
  (308, 3, 'harbour', 'occupied', NULL),
  (309, 3, 'harbour', 'ready', NULL),
  (310, 3, 'harbour', 'ready', NULL);

INSERT INTO stays (ref, first_name, last_name, email, mobile, type_id, room_number, arrive, depart, guests, arrival_time, note, status, checked_in_at, no_deposit) VALUES
  ('WH-3280', 'Iris', 'Waverley', 'iris.waverley@example.com', '07700 900118', 'garden', 105, '2026-07-24', '2026-07-28', 2, '16:00', NULL, 'in_house', '16:20', false),
  ('WH-3281', 'Callum', 'Reece', 'c.reece@example.com', '07700 900204', 'snug', 101, '2026-07-26', '2026-07-28', 1, '19:00', NULL, 'in_house', '19:10', false),
  ('WH-3282', 'Marguerite', 'Okafor', 'm.okafor@example.com', '07700 900377', 'harbour', 209, '2026-07-25', '2026-07-28', 2, '15:00', NULL, 'in_house', '15:05', false),
  ('WH-3283', 'Teodor', 'Blank', 't.blank@example.com', '07700 900461', 'loft', 301, '2026-07-23', '2026-07-28', 3, '17:00', NULL, 'in_house', '17:35', false),
  ('WH-3284', 'Noor', 'Hadid', 'noor.hadid@example.com', '07700 900512', 'garden', 106, '2026-07-28', '2026-07-31', 2, '09:00', NULL, 'in_house', '08:40', false),
  ('WH-3285', 'Bram', 'Ellery', 'bram.ellery@example.com', '07700 900623', 'snug', 102, '2026-07-27', '2026-07-30', 1, '18:00', NULL, 'in_house', '18:15', false),
  ('WH-3286', 'Lucia', 'Fenwick', 'l.fenwick@example.com', '07700 900734', 'garden', 107, '2026-07-26', '2026-07-29', 2, '16:00', NULL, 'in_house', '16:40', false),
  ('WH-3287', 'Osian', 'Trelawney', 'o.trelawney@example.com', '07700 900845', 'garden', 109, '2026-07-25', '2026-07-31', 2, '15:00', NULL, 'in_house', '15:20', false),
  ('WH-3288', 'Petra', 'Nadeau', 'p.nadeau@example.com', '07700 900956', 'harbour', 305, '2026-07-27', '2026-08-01', 2, '17:00', NULL, 'in_house', '17:05', false),
  ('WH-3289', 'Halvor', 'Sund', 'h.sund@example.com', '07700 901067', 'loft', 302, '2026-07-26', '2026-08-02', 4, '20:00', NULL, 'in_house', '20:25', false),
  ('WH-3290', 'Amara', 'Sinclair', 'a.sinclair@example.com', '07700 901178', 'snug', 104, '2026-07-27', '2026-07-29', 1, '21:00', NULL, 'in_house', '21:30', false),
  ('WH-3291', 'Devon', 'Marchetti', 'd.marchetti@example.com', '07700 901289', 'garden', 110, '2026-07-24', '2026-07-30', 2, '15:00', NULL, 'in_house', '15:45', false),
  ('WH-3292', 'Rosalind', 'Oyelaran', 'r.oyelaran@example.com', '07700 901390', 'harbour', 307, '2026-07-26', '2026-07-30', 2, '16:00', NULL, 'in_house', '16:05', false),
  ('WH-3293', 'Fionn', 'Castellane', 'f.castellane@example.com', '07700 901401', 'garden', 111, '2026-07-27', '2026-08-01', 3, '18:00', NULL, 'in_house', '18:50', false),
  ('WH-3294', 'Sable', 'Whitcombe', 's.whitcombe@example.com', '07700 901512', 'loft', 303, '2026-07-25', '2026-08-03', 4, '15:00', NULL, 'in_house', '15:10', false),
  ('WH-3295', 'Emrys', 'Toll', 'e.toll@example.com', '07700 901623', 'snug', 201, '2026-07-27', '2026-07-31', 1, '22:00', NULL, 'in_house', '22:10', false),
  ('WH-3296', 'Junie', 'Alvarez', 'j.alvarez@example.com', '07700 901734', 'garden', 112, '2026-07-26', '2026-07-29', 2, '17:00', NULL, 'in_house', '17:20', false),
  ('WH-3297', 'Kester', 'Vane', 'k.vane@example.com', '07700 901845', 'harbour', 308, '2026-07-27', '2026-07-31', 2, '16:00', NULL, 'in_house', '16:15', false),
  ('WH-3298', 'Wilda', 'Nkemelu', 'w.nkemelu@example.com', '07700 901956', 'garden', 206, '2026-07-25', '2026-07-30', 2, '19:00', NULL, 'in_house', '19:35', false),
  ('WH-3299', 'Corin', 'Ashdown', 'c.ashdown@example.com', '07700 902067', 'snug', 202, '2026-07-27', '2026-07-29', 1, '15:00', NULL, 'in_house', '15:40', false),
  ('WH-3300', 'Marisol', 'Fairbairn', 'm.fairbairn@example.com', '07700 902178', 'garden', 207, '2026-07-26', '2026-08-02', 2, '18:00', NULL, 'in_house', '18:05', false),
  ('WH-3301', 'Ottoline', 'Grey', 'o.grey@example.com', '07700 902289', 'harbour', NULL, '2026-07-28', '2026-07-31', 2, '16:00', 'We are driving down and may be later than we said — please hold the room.', 'confirmed', NULL, false),
  ('WH-3302', 'Sorley', 'Mackintosh', 's.mackintosh@example.com', '07700 902390', 'snug', NULL, '2026-07-28', '2026-07-30', 1, '18:00', NULL, 'confirmed', NULL, false),
  ('WH-3303', 'Zeynep', 'Aydın', 'z.aydin@example.com', '07700 902401', 'garden', NULL, '2026-07-28', '2026-08-02', 2, '15:00', NULL, 'confirmed', NULL, false),
  ('WH-3304', 'Ren', 'Kobayashi', 'r.kobayashi@example.com', '07700 902512', 'loft', NULL, '2026-07-28', '2026-08-02', 4, '20:00', NULL, 'confirmed', NULL, false),
  ('WH-3305', 'Nadia', 'Brightwell', 'n.brightwell@example.com', '07700 902623', 'harbour', NULL, '2026-07-31', '2026-08-03', 2, '17:00', NULL, 'confirmed', NULL, false),
  ('WH-3306', 'Aurelio', 'Pastore', 'a.pastore@example.com', '07700 902734', 'loft', NULL, '2026-08-01', '2026-08-03', 3, '16:00', NULL, 'confirmed', NULL, false);

INSERT INTO stay_extras (stay_ref, extra_id) VALUES
  ('WH-3280', 'breakfast'),
  ('WH-3282', 'parking'),
  ('WH-3283', 'breakfast'),
  ('WH-3283', 'parking'),
  ('WH-3284', 'breakfast'),
  ('WH-3286', 'breakfast'),
  ('WH-3288', 'breakfast'),
  ('WH-3289', 'breakfast'),
  ('WH-3289', 'parking'),
  ('WH-3291', 'parking'),
  ('WH-3293', 'breakfast'),
  ('WH-3294', 'breakfast'),
  ('WH-3297', 'parking'),
  ('WH-3300', 'breakfast'),
  ('WH-3300', 'parking'),
  ('WH-3301', 'breakfast'),
  ('WH-3303', 'breakfast'),
  ('WH-3303', 'parking'),
  ('WH-3304', 'breakfast'),
  ('WH-3305', 'breakfast'),
  ('WH-3306', 'parking');

-- No mid-stay charges in the seed: the desk adds the first one live.

INSERT INTO payments (stay_ref, paid_on, method, label, amount) VALUES
  ('WH-3280', '2026-07-28', 'card', 'Settled at the desk', 647.96),
  ('WH-3281', '2026-07-28', 'card', 'Settled at the desk', 127.6),
  ('WH-3282', '2026-07-28', 'card', 'Settled at the desk', 444.08);

COMMIT;
