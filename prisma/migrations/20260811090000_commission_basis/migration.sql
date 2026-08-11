-- La commission peut s'exprimer en pourcentage du net propriétaire.
--
-- `commissionRate` has been on the table since the beginning, carrying the
-- output of a commission engine that was never built — nothing in the code
-- reads or writes it. It is put to work here instead: an agency that agrees
-- "twenty percent" with an owner should be able to say so, and have the figure
-- follow when the net moves.
--
-- `commissionAmount` stays the resolved figure everything downstream reads —
-- the loyer is net + commission, and the documents quote it — exactly as
-- depositAmount stays the resolved acompte. These two record the intent.
DO $$ BEGIN
  CREATE TYPE "CommissionBasis" AS ENUM ('AMOUNT', 'PERCENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AMOUNT is what every existing booking meant: there was no other way to enter
-- one, and defaulting them to PERCENT would let a later save recompute a
-- figure the parties have signed.
ALTER TABLE "rentals"
  ADD COLUMN IF NOT EXISTS "commissionBasis" "CommissionBasis" NOT NULL DEFAULT 'AMOUNT';
