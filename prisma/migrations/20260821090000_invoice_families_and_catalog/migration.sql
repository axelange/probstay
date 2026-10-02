-- Deux documents, pas deux variantes d'un même.
--
-- The agency issues fee invoices — concierge services, on subscription or
-- one-off, and co-agency fees — and it calls funds for a booking: the deposit,
-- the balance, the security deposit. The second family is not an invoice and
-- must not say so on the paper: it asks for money the agency holds on behalf
-- of an owner or a tenant, which is not its own revenue. French practice
-- separates them, and so does the law on numbering: each family runs its own
-- continuous series and its own register.
--
-- One table all the same. Everything around the document is identical — the
-- client, the draft-then-issue cycle, the immutability once numbered, the
-- stored PDF — and splitting the table would mean two copies of every rule
-- with two chances of them drifting. What differs is the series, the wording,
-- and whether VAT appears; that is a discriminator, not a second entity.

DO $$ BEGIN
  CREATE TYPE "InvoiceFamily" AS ENUM ('FEE', 'FUND_CALL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- The kinds are family-specific and replace the first set outright (RENTAL,
-- SALE, CONCIERGE), which read the two families as one. No row carries them —
-- nothing has been issued yet — so the type is swapped rather than migrated.
CREATE TYPE "InvoiceKind_new" AS ENUM (
  -- Fees.
  'CONCIERGE_SUBSCRIPTION',
  'CONCIERGE_ONE_OFF',
  'CO_AGENCY',
  -- Fund calls.
  'DEPOSIT',
  'BALANCE',
  'SECURITY_DEPOSIT'
);

ALTER TABLE "invoices" ALTER COLUMN "kind" DROP DEFAULT;
ALTER TABLE "invoices"
  ALTER COLUMN "kind" TYPE "InvoiceKind_new"
  USING 'CONCIERGE_ONE_OFF'::"InvoiceKind_new";

DROP TYPE "InvoiceKind";
ALTER TYPE "InvoiceKind_new" RENAME TO "InvoiceKind";

ALTER TABLE "invoices"
  ADD COLUMN IF NOT EXISTS "family" "InvoiceFamily" NOT NULL DEFAULT 'FEE';

ALTER TABLE "invoices" ALTER COLUMN "kind" SET DEFAULT 'CONCIERGE_ONE_OFF';

-- A kind belongs to exactly one family. Without this a fund call could be
-- filed as a co-agency fee and land in the wrong register.
ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_kind_matches_family" CHECK (
    ("family" = 'FEE' AND "kind" IN (
      'CONCIERGE_SUBSCRIPTION', 'CONCIERGE_ONE_OFF', 'CO_AGENCY'))
    OR ("family" = 'FUND_CALL' AND "kind" IN (
      'DEPOSIT', 'BALANCE', 'SECURITY_DEPOSIT'))
  );

-- A fund call is always about a booking; a fee invoice may be about nothing
-- but a subscription.
ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_fund_call_has_rental" CHECK (
    "family" <> 'FUND_CALL' OR "rentalId" IS NOT NULL
  );

-- Two series, each continuous. The counter is no longer unique on its own —
-- FA-2026-000001 and AF-2026-000001 are different documents.
CREATE SEQUENCE IF NOT EXISTS fund_calls_number_seq START 1;

ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "invoices_number_key";
DROP INDEX IF EXISTS "invoices_number_key";
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_family_number_key"
  ON "invoices" ("family", "number");

-- Le catalogue ---------------------------------------------------------------
-- What the agency bills, written down once instead of retyped on every
-- invoice: a title, an optional description and a unit price. A line may still
-- be written freely — most are one-offs — so this is a starting point, never a
-- constraint on what can be billed.
CREATE TABLE IF NOT EXISTS "products" (
  "id"    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "label" text NOT NULL,
  "description" text,
  "unitPrice"   decimal(12, 2) NOT NULL,

  -- Withdrawn rather than deleted: a product that has been billed is part of
  -- what past invoices were built from, and the list should stop offering it
  -- without erasing where those lines came from.
  "archivedAt" timestamp(3),

  "createdById" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "createdAt"   timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "products_label_idx" ON "products" ("label");

ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_select" ON "products"
  FOR SELECT
  USING (
    internal.has_permission('MANAGE_INVOICES')
    OR internal.has_permission('VIEW_FINANCIALS')
  );

CREATE POLICY "products_write" ON "products"
  FOR ALL
  USING (internal.has_permission('MANAGE_INVOICES'))
  WITH CHECK (internal.has_permission('MANAGE_INVOICES'));

-- Where a line came from, when it came from the catalogue. The label and the
-- price are still copied onto the line: an invoice must keep saying what was
-- billed even after the catalogue moves on, so this records the origin and
-- never the current value.
ALTER TABLE "invoice_lines"
  ADD COLUMN IF NOT EXISTS "productId" uuid
    REFERENCES "products"("id") ON DELETE SET NULL;

-- The freeze trigger has two more columns to watch.
CREATE OR REPLACE FUNCTION check_invoice_frozen_once_issued()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD."status" <> 'DRAFT' THEN
    IF NEW."number"        IS DISTINCT FROM OLD."number"
      OR NEW."issuedOn"    IS DISTINCT FROM OLD."issuedOn"
      OR NEW."family"      IS DISTINCT FROM OLD."family"
      OR NEW."kind"        IS DISTINCT FROM OLD."kind"
      OR NEW."source"      IS DISTINCT FROM OLD."source"
      OR NEW."clientId"    IS DISTINCT FROM OLD."clientId"
      OR NEW."clientName"  IS DISTINCT FROM OLD."clientName"
      OR NEW."clientAddress" IS DISTINCT FROM OLD."clientAddress"
      OR NEW."rentalId"    IS DISTINCT FROM OLD."rentalId"
      OR NEW."description" IS DISTINCT FROM OLD."description"
      OR NEW."dueOn"       IS DISTINCT FROM OLD."dueOn"
      OR NEW."vatRate"     IS DISTINCT FROM OLD."vatRate"
      OR NEW."totalHt"     IS DISTINCT FROM OLD."totalHt"
      OR NEW."vatAmount"   IS DISTINCT FROM OLD."vatAmount"
      OR NEW."notes"       IS DISTINCT FROM OLD."notes"
    THEN
      RAISE EXCEPTION 'invoice % is issued and can no longer be modified', OLD."id";
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
