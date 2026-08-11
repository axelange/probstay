-- Les versements deviennent définitifs, et une erreur se régularise.
--
-- A receipt, once recorded, is not edited and not deleted: a mistake is
-- corrected by a further entry that offsets it, so the trail shows both what
-- was recorded and what put it right. That is what the financial register this
-- will feed requires — MANAGE_REGISTERS is already refused to an Admin on the
-- grounds that registers are immutable by law, and a register cannot be fed by
-- rows that are erased and rewritten on every save.
--
-- So the amount may now be negative. It could not be before, when the table
-- held receipts only and corrections were made by editing the line.
ALTER TABLE "rental_payments"
  DROP CONSTRAINT IF EXISTS "rental_payments_amount_check";

ALTER TABLE "rental_payments"
  ADD CONSTRAINT "rental_payments_amount_not_zero" CHECK ("amount" <> 0);

-- Who recorded it. A register entry that nobody is attached to is one nobody
-- can be asked about.
ALTER TABLE "rental_payments"
  ADD COLUMN IF NOT EXISTS "recordedById" uuid
    REFERENCES "users"("id") ON DELETE SET NULL;
