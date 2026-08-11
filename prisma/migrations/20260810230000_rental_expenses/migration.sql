-- Les dépenses du séjour, et à qui elles reviennent.
--
-- Something breaks, a cleaner comes back, a taxi is paid for. Who bears it is
-- the whole question, and it decides where the money is taken from:
--
--   CLIENT  → deducted from the caution being returned;
--   OWNER   → deducted from their net;
--   AGENCY  → deducted from the commission.
--
-- Immutable, like the receipts and for the same reason: these are financial
-- movements, and the register they will feed cannot be built on rows that are
-- edited and erased. A mistake is corrected by an entry that offsets it, which
-- is why the amount may be negative and never zero.
DO $$ BEGIN
  CREATE TYPE "ExpenseBearer" AS ENUM ('CLIENT', 'OWNER', 'AGENCY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "rental_expenses" (
  "id"       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "rentalId" uuid NOT NULL REFERENCES "rentals"("id") ON DELETE CASCADE,

  "label"  text NOT NULL,
  "amount" numeric(12, 2) NOT NULL CHECK ("amount" <> 0),
  "bearer" "ExpenseBearer" NOT NULL,
  "spentAt" date,

  -- The receipt. Optional: an expense is worth recording the day it happens,
  -- and the paperwork often turns up afterwards.
  "storagePath" text,
  "fileName"    text,

  "recordedById" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "createdAt"    timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "rental_expenses_rental_bearer_idx"
  ON "rental_expenses" ("rentalId", "bearer");

ALTER TABLE "rental_expenses" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rental_expenses_manage_rentals" ON "rental_expenses"
  FOR ALL
  USING (internal.has_permission('MANAGE_RENTALS'))
  WITH CHECK (internal.has_permission('MANAGE_RENTALS'));

CREATE POLICY "rental_expenses_agent" ON "rental_expenses"
  FOR ALL
  USING (internal.is_rental_agent("rentalId"))
  WITH CHECK (internal.is_rental_agent("rentalId"));

-- Storage ------------------------------------------------------------------
-- A receipt is a photograph of a till roll as often as a PDF invoice, so the
-- bucket takes both. Uploaded by an agent with a session, unlike the client's
-- identity copies, so the policies key on the rental as everywhere else.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'expense-receipts',
  'expense-receipts',
  false,
  10485760, -- 10 MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "expense_receipts_read" ON storage.objects;
CREATE POLICY "expense_receipts_read" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'expense-receipts'
    AND (
      internal.has_permission('MANAGE_RENTALS')
      OR internal.is_rental_agent(((storage.foldername(name))[1])::uuid)
    )
  );

DROP POLICY IF EXISTS "expense_receipts_insert" ON storage.objects;
CREATE POLICY "expense_receipts_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'expense-receipts'
    AND (
      internal.has_permission('MANAGE_RENTALS')
      OR internal.is_rental_agent(((storage.foldername(name))[1])::uuid)
    )
  );

-- No UPDATE or DELETE: the expense that points at a receipt cannot be removed
-- either, so neither can the proof behind it.
