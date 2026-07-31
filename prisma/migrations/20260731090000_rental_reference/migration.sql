-- Rental reference number.
--
-- Gives every rental a human-readable booking number, printed on the
-- documents it produces: "RC-0001240" on the confirmation, "SRC-0001240" on
-- the seasonal rental contract. Until now both builders sliced the rental's
-- UUID ("RC-21A6303D"), which is neither sequential nor meaningful to anyone.
--
-- A single monotonic sequence, never reset and never recycled, opening at 1240
-- rather than 1: padded to seven digits, the reference then reads as an opaque
-- file number instead of a running count, so a client cannot infer how many
-- rentals the agency has done from the paper in their hand.

-- 1. The sequence. Created first so the backfill can be sealed against it.
CREATE SEQUENCE IF NOT EXISTS rentals_reference_seq AS integer START WITH 1240 INCREMENT BY 1;

-- 2. The column, nullable for now so existing rows can be backfilled.
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS reference integer;

-- 3. Backfill existing rentals in creation order, so the numbering reflects
--    the order the agency actually took the bookings. The series opens at
--    1240, so the first existing rental takes 1240 (1239 + 1). `id` breaks
--    ties deterministically, which keeps a re-run (or a replay on another
--    environment) assigning the same number to the same rental.
--
--    This schema maps model names to snake_case tables but leaves columns in
--    camelCase, so "createdAt" has to be quoted.
WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY "createdAt", id) AS rn
  FROM rentals
)
UPDATE rentals r
SET reference = 1239 + o.rn
FROM ordered o
WHERE r.id = o.id
  AND r.reference IS NULL;

-- 4. Move the sequence past the backfill so the next insert continues the
--    series rather than colliding with it. With no rows to backfill this
--    leaves the sequence handing out 1240 first, as declared above.
SELECT setval(
  'rentals_reference_seq',
  COALESCE((SELECT max(reference) FROM rentals), 1239) + 1,
  false
);

-- 5. Seal it: every rental has one, they are unique, and the database
--    assigns the next one on insert. Ownership ties the sequence to the
--    column so it is dropped with it.
ALTER TABLE rentals ALTER COLUMN reference SET DEFAULT nextval('rentals_reference_seq');
ALTER TABLE rentals ALTER COLUMN reference SET NOT NULL;
ALTER SEQUENCE rentals_reference_seq OWNED BY rentals.reference;

CREATE UNIQUE INDEX IF NOT EXISTS rentals_reference_key ON rentals (reference);
