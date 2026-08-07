-- The agency's own record, plus the fields the documents were inventing.
--
-- Four gaps, all of the same kind: values the documents print that had no
-- column behind them, so they lived as constants in code, as a single number
-- standing for two, or nowhere at all.

-- 1. MANAGE_AGENCY -----------------------------------------------------
-- Its own permission rather than MANAGE_USERS. Managing colleagues and
-- changing the IBAN printed on every contract are different powers.
ALTER TYPE "Permission" ADD VALUE IF NOT EXISTS 'MANAGE_AGENCY';

-- 2. How the property was presented ------------------------------------
DO $$ BEGIN
  CREATE TYPE "PropertyPresentation" AS ENUM ('IN_PERSON', 'THIRD_PARTY', 'REMOTE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Property arrival times --------------------------------------------
-- Per-property: a villa with a caretaker and a flat with a keybox do not turn
-- over at the same hour. Defaults match what the documents printed as agency
-- constants, so nothing changes until someone sets one.
ALTER TABLE "properties"
  ADD COLUMN IF NOT EXISTS "checkInTime"  text NOT NULL DEFAULT '16h00',
  ADD COLUMN IF NOT EXISTS "checkOutTime" text NOT NULL DEFAULT '10h00';

-- 4. Rental: children, and how the property was shown -------------------
-- `guests` alone billed tourist tax for children who are generally exempt.
ALTER TABLE "rentals"
  ADD COLUMN IF NOT EXISTS "children" integer,
  ADD COLUMN IF NOT EXISTS "presentation" "PropertyPresentation";
