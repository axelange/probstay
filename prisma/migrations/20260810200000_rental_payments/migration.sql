-- Le détail des versements, sous les statuts de paiement.
--
-- A booking carried three statuses — acompte, solde, dépôt de garantie — each
-- of them one of unpaid / partially paid / paid. "Partially" said that
-- something had come in without saying how much, and a client who pays in
-- three instalments had nowhere for the second and third.
--
-- The statuses stay: they are what an agent reads at a glance and what the
-- pipeline shows. These rows are the detail underneath, so a partial payment
-- can be a figure and a date rather than an adjective.
DO $$ BEGIN
  CREATE TYPE "RentalPaymentKind" AS ENUM ('DEPOSIT', 'BALANCE', 'SECURITY_DEPOSIT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "rental_payments" (
  "id"       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "rentalId" uuid NOT NULL REFERENCES "rentals"("id") ON DELETE CASCADE,
  "kind"     "RentalPaymentKind" NOT NULL,

  -- What actually came in. Positive: this records receipts, not the refund of
  -- a deposit, which is the securityDepositReturnedAt milestone instead.
  "amount"   numeric(12, 2) NOT NULL CHECK ("amount" > 0),
  -- When, as the agent knows it. Null while they only know that it landed.
  "paidAt"   date,
  -- "virement", "chèque n°…", whatever makes it findable on a statement.
  "note"     text,

  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "rental_payments_rental_kind_idx"
  ON "rental_payments" ("rentalId", "kind");

ALTER TABLE "rental_payments" ENABLE ROW LEVEL SECURITY;

-- Visibility mirrors the rental, as every rental-scoped table does.
CREATE POLICY "rental_payments_manage_rentals" ON "rental_payments"
  FOR ALL
  USING (internal.has_permission('MANAGE_RENTALS'))
  WITH CHECK (internal.has_permission('MANAGE_RENTALS'));

CREATE POLICY "rental_payments_agent" ON "rental_payments"
  FOR ALL
  USING (internal.is_rental_agent("rentalId"))
  WITH CHECK (internal.is_rental_agent("rentalId"));
