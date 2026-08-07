-- A rental has at least one adult.
--
-- `children` counts within `guests`, so equal counts mean a booking of minors
-- with nobody to sign for them. It also made the taxe de séjour zero, which is
-- arithmetically right and commercially wrong: there was no adult to charge
-- because there was no adult at all.
--
-- NOT VALID on purpose. Rental 1244 already holds guests=4, children=4, and a
-- migration should not quietly decide whether that meant "4 adults" or "2 and
-- 2" — only the agent who took the booking knows. The constraint binds every
-- insert and every update from now on, so that row is fixed the moment anyone
-- touches it, and the wrong figure is not overwritten behind their back.
--
-- To enforce it over the existing rows once they are clean:
--   ALTER TABLE "rentals" VALIDATE CONSTRAINT "rentals_at_least_one_adult";
ALTER TABLE "rentals"
  DROP CONSTRAINT IF EXISTS "rentals_at_least_one_adult";

ALTER TABLE "rentals"
  ADD CONSTRAINT "rentals_at_least_one_adult"
  CHECK (
    "children" IS NULL
    OR "guests" IS NULL
    OR "children" < "guests"
  )
  NOT VALID;
