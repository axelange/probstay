-- Les factures de l'agence.
--
-- A legal accounting document, and the rules that come with one shape this
-- table more than any preference would: a number is never reused, a row is
-- never deleted, and an issued invoice is never edited. A mistake is corrected
-- by cancelling and issuing another, which is why there is no DELETE policy
-- below and why the lines take no UPDATE.
--
-- An invoice may concern a seasonal rental, a sale, or concierge services, so
-- the rental link is optional — the last two have none.

DO $$ BEGIN
  CREATE TYPE "InvoiceKind" AS ENUM ('RENTAL', 'SALE', 'CONCIERGE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- No draft state, deliberately. A number is assigned the moment a row exists,
-- and a draft that could be deleted would take its number with it — the gap in
-- the series is exactly what the numbering rules forbid. Creating an invoice
-- here is issuing it.
DO $$ BEGIN
  CREATE TYPE "InvoiceStatus" AS ENUM ('ISSUED', 'PAID', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- The counter behind the printed number. Continuous and never reset: the
-- printed form ("FA-2026-000123") is assembled in the application from this
-- number and the issue date, the same way a rental's reference is.
--
-- Unlike the rentals series this one opens at 1. There the offset hides the
-- agency's volume from a client; here an accountant reads the sequence, and a
-- first invoice numbered 1240 would raise a question about the 1239 before it.
CREATE SEQUENCE IF NOT EXISTS invoices_number_seq START 1;

CREATE TABLE IF NOT EXISTS "invoices" (
  "id"     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "number" integer NOT NULL UNIQUE DEFAULT nextval('invoices_number_seq'),

  "kind"   "InvoiceKind"   NOT NULL DEFAULT 'RENTAL',
  "status" "InvoiceStatus" NOT NULL DEFAULT 'ISSUED',

  -- Who is billed. The link keeps the invoice attached to the contact file;
  -- the two text columns are what gets printed, snapshotted at issue. A client
  -- who moves house afterwards must not silently rewrite an invoice already
  -- sent — the paper and the record have to keep saying the same thing.
  "clientId"      uuid NOT NULL REFERENCES "contacts"("id") ON DELETE RESTRICT,
  "clientName"    text NOT NULL,
  "clientAddress" text,

  -- Optional: a sale or a concierge service has no booking behind it.
  "rentalId" uuid REFERENCES "rentals"("id") ON DELETE SET NULL,

  "issuedOn" date NOT NULL DEFAULT CURRENT_DATE,
  "dueOn"    date,
  "paidOn"   date,

  -- The rate the invoice was issued under, not a constant in the code: a rate
  -- is a legal parameter that changes by decree, and an invoice must keep
  -- printing the one it was issued with.
  "vatRate" decimal(5, 2) NOT NULL DEFAULT 20,

  -- Snapshots, for the same reason the client identity is one. Recomputing
  -- from the lines would be exact today and a rounding argument tomorrow; the
  -- figures on the paper are the figures of record. TTC is deliberately absent
  -- — it is HT + TVA, an exact addition that cannot drift.
  "totalHt"   decimal(12, 2) NOT NULL,
  "vatAmount" decimal(12, 2) NOT NULL,

  "notes" text,

  -- The rendered PDF, once produced. Null while it has not been: the record is
  -- what makes the invoice exist, and a render that fails must not take the
  -- number down with it.
  "storagePath" text UNIQUE,
  "fileName"    text,

  "createdById" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "createdAt"   timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- The list reads newest first; the other two are the lookups from a contact
-- file and from a booking.
CREATE INDEX IF NOT EXISTS "invoices_issued_idx" ON "invoices" ("issuedOn" DESC);
CREATE INDEX IF NOT EXISTS "invoices_client_idx" ON "invoices" ("clientId");
CREATE INDEX IF NOT EXISTS "invoices_rental_idx" ON "invoices" ("rentalId");

CREATE TABLE IF NOT EXISTS "invoice_lines" (
  "id"        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "invoiceId" uuid NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,

  -- The order the agent wrote them in. A total is a sum and does not care,
  -- but the reader compares the paper to the screen line by line.
  "position" integer NOT NULL,

  "label"     text NOT NULL,
  "quantity"  decimal(10, 2) NOT NULL DEFAULT 1,
  "unitPrice" decimal(12, 2) NOT NULL,

  CONSTRAINT "invoice_lines_quantity_positive" CHECK ("quantity" > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "invoice_lines_order_idx"
  ON "invoice_lines" ("invoiceId", "position");

ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoice_lines" ENABLE ROW LEVEL SECURITY;

-- Reading is either permission: MANAGE_INVOICES issues them, VIEW_FINANCIALS
-- reads the agency's figures. An Agent holds neither, so an invoice is out of
-- their reach entirely — unlike a rental, which they may well be handling.
CREATE POLICY "invoices_select" ON "invoices"
  FOR SELECT
  USING (
    internal.has_permission('MANAGE_INVOICES')
    OR internal.has_permission('VIEW_FINANCIALS')
  );

CREATE POLICY "invoices_insert" ON "invoices"
  FOR INSERT
  WITH CHECK (internal.has_permission('MANAGE_INVOICES'));

-- Updating covers the status and the stored PDF, nothing that appears on the
-- paper. There is no DELETE policy: an issued invoice is cancelled, never
-- removed.
CREATE POLICY "invoices_update" ON "invoices"
  FOR UPDATE
  USING (internal.has_permission('MANAGE_INVOICES'))
  WITH CHECK (internal.has_permission('MANAGE_INVOICES'));

CREATE POLICY "invoice_lines_select" ON "invoice_lines"
  FOR SELECT
  USING (
    internal.has_permission('MANAGE_INVOICES')
    OR internal.has_permission('VIEW_FINANCIALS')
  );

-- Written once, with the invoice. No UPDATE and no DELETE: editing a line
-- after issue would change a document already in a client's hands.
CREATE POLICY "invoice_lines_insert" ON "invoice_lines"
  FOR INSERT
  WITH CHECK (internal.has_permission('MANAGE_INVOICES'));

-- Storage ------------------------------------------------------------------
-- Its own private bucket. `generated-documents` is keyed by rental id in the
-- first path segment and its policies read that; an invoice may have no rental
-- at all, so it cannot live there.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoices',
  'invoices',
  false,
  10485760, -- 10 MB; an invoice is a page or two
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "invoices_objects_read" ON storage.objects;
CREATE POLICY "invoices_objects_read" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'invoices'
    AND (
      internal.has_permission('MANAGE_INVOICES')
      OR internal.has_permission('VIEW_FINANCIALS')
    )
  );

DROP POLICY IF EXISTS "invoices_objects_insert" ON storage.objects;
CREATE POLICY "invoices_objects_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'invoices'
    AND internal.has_permission('MANAGE_INVOICES')
  );
