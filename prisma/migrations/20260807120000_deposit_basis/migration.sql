-- How the acompte was decided: a figure, or a share of the client total.
--
-- Until now only the resolved amount was kept, so "half up front" and "8 000 €
-- up front" were indistinguishable once saved — and an agent who meant half
-- had to recompute by hand every time a service moved the total.
--
-- `depositAmount` stays the single figure the documents read. These two record
-- the intent behind it, and the funnel resolves a percentage into that amount
-- when it saves, so nothing downstream has to know which was chosen.
DO $$ BEGIN
  CREATE TYPE "DepositBasis" AS ENUM ('AMOUNT', 'PERCENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "rentals"
  ADD COLUMN IF NOT EXISTS "depositBasis" "DepositBasis" NOT NULL DEFAULT 'PERCENT',
  ADD COLUMN IF NOT EXISTS "depositPercent" numeric(5, 2) NOT NULL DEFAULT 50;

-- A rental that already carries an acompte had it entered as a figure — there
-- was no other way to enter one. Marking those AMOUNT keeps the default from
-- retroactively claiming someone chose a percentage, which would let a later
-- save quietly rewrite an amount that a signed contract quotes.
UPDATE "rentals" SET "depositBasis" = 'AMOUNT' WHERE "depositAmount" IS NOT NULL;
