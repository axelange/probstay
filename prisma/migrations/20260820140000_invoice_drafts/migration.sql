-- Le brouillon devient l'étape d'entrée, et le numéro s'attribue à l'émission.
--
-- The first shape assigned a number the moment a row existed, so that nothing
-- could ever leave a gap in the series. It made the invoice unusable as a
-- working document: an agent had to have every line right before touching the
-- software at all, and an invoice drafted elsewhere had no way in.
--
-- So a draft comes first, carrying no number and no issue date. Issuing takes
-- the next number from the series and freezes the document. The guarantee the
-- first design bought with rigidity is kept by the constraint and the trigger
-- below instead: a numbered invoice is complete, and its content cannot move
-- afterwards.

-- Where the PDF comes from. Some invoices are drawn up outside — an
-- accountant's software, a one-off written by hand — and they still belong in
-- the register and still take a number from the same series. The application
-- then records the document rather than producing it.
DO $$ BEGIN
  CREATE TYPE "InvoiceSource" AS ENUM ('GENERATED', 'UPLOADED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- DRAFT joins the status enum. Replaced rather than extended: a new label
-- cannot be used in the same transaction that adds it, and the default has to
-- move to it here.
CREATE TYPE "InvoiceStatus_new" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'CANCELLED');

ALTER TABLE "invoices" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "invoices"
  ALTER COLUMN "status" TYPE "InvoiceStatus_new"
  USING "status"::text::"InvoiceStatus_new";

DROP TYPE "InvoiceStatus";
ALTER TYPE "InvoiceStatus_new" RENAME TO "InvoiceStatus";

ALTER TABLE "invoices" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

ALTER TABLE "invoices"
  ADD COLUMN IF NOT EXISTS "source" "InvoiceSource" NOT NULL DEFAULT 'GENERATED',
  -- What the invoice is for, in one line, printed under the title. The lines
  -- below it say what is billed; this says what the whole document is about.
  ADD COLUMN IF NOT EXISTS "description" text;

-- Both are now filled at issue rather than at insert. The sequence is only
-- drawn from then, so a draft that is abandoned costs the series nothing.
ALTER TABLE "invoices"
  ALTER COLUMN "number" DROP NOT NULL,
  ALTER COLUMN "number" DROP DEFAULT,
  ALTER COLUMN "issuedOn" DROP NOT NULL,
  ALTER COLUMN "issuedOn" DROP DEFAULT;

-- A draft has neither; anything else has both. This is what keeps "no gaps"
-- true now that the number is no longer tied to the row's existence: a
-- numbered invoice is necessarily a complete one.
ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_numbered_when_issued" CHECK (
    ("status" = 'DRAFT' AND "number" IS NULL AND "issuedOn" IS NULL)
    OR ("status" <> 'DRAFT' AND "number" IS NOT NULL AND "issuedOn" IS NOT NULL)
  );

-- An optional second line under a billed item's title: what the cleaning
-- covered, which nights the chef came. Free text, printed smaller.
ALTER TABLE "invoice_lines"
  ADD COLUMN IF NOT EXISTS "description" text;

-- Immutability, at the level that actually applies -------------------------
-- The policies below cannot carry this on their own: Prisma connects as the
-- table owner and RLS never runs for it, so a mistake in the application would
-- go straight through. A trigger runs for everyone.
--
-- What may still change once issued: the status (paid, cancelled), the date it
-- was paid, and the pointer to the stored file — the render lands after the
-- number is assigned, and a failed one is retried. Everything that appears on
-- the paper is frozen.
CREATE OR REPLACE FUNCTION check_invoice_frozen_once_issued()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD."status" <> 'DRAFT' THEN
    IF NEW."number"        IS DISTINCT FROM OLD."number"
      OR NEW."issuedOn"    IS DISTINCT FROM OLD."issuedOn"
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

DROP TRIGGER IF EXISTS enforce_invoice_frozen_once_issued ON "invoices";
CREATE TRIGGER enforce_invoice_frozen_once_issued
  BEFORE UPDATE ON "invoices"
  FOR EACH ROW
  EXECUTE FUNCTION check_invoice_frozen_once_issued();

-- An issued invoice is never deleted — cancelling is what replaces it, and the
-- row stays so the series can be read end to end.
CREATE OR REPLACE FUNCTION check_invoice_delete_draft_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD."status" <> 'DRAFT' THEN
    RAISE EXCEPTION 'invoice % is issued and cannot be deleted — cancel it instead', OLD."id";
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS enforce_invoice_delete_draft_only ON "invoices";
CREATE TRIGGER enforce_invoice_delete_draft_only
  BEFORE DELETE ON "invoices"
  FOR EACH ROW
  EXECUTE FUNCTION check_invoice_delete_draft_only();

-- The lines follow their invoice: rewritten freely while it is a draft, sealed
-- with it afterwards.
CREATE OR REPLACE FUNCTION check_invoice_line_draft_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  parent uuid;
  parent_status "InvoiceStatus";
BEGIN
  parent := COALESCE(NEW."invoiceId", OLD."invoiceId");
  SELECT "status" INTO parent_status FROM "invoices" WHERE "id" = parent;

  -- Null when the invoice itself is going: a cascade from a draft being
  -- deleted, which is allowed by the trigger above.
  IF parent_status IS NOT NULL AND parent_status <> 'DRAFT' THEN
    RAISE EXCEPTION 'invoice % is issued and its lines can no longer change', parent;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS enforce_invoice_line_draft_only ON "invoice_lines";
CREATE TRIGGER enforce_invoice_line_draft_only
  BEFORE INSERT OR UPDATE OR DELETE ON "invoice_lines"
  FOR EACH ROW
  EXECUTE FUNCTION check_invoice_line_draft_only();

-- Policies ------------------------------------------------------------------
-- The second line, as everywhere: the triggers above are the real guard, and
-- these keep a direct PostgREST caller inside the same rules.
DROP POLICY IF EXISTS "invoices_delete_draft" ON "invoices";
CREATE POLICY "invoices_delete_draft" ON "invoices"
  FOR DELETE
  USING (internal.has_permission('MANAGE_INVOICES') AND "status" = 'DRAFT');

DROP POLICY IF EXISTS "invoice_lines_insert" ON "invoice_lines";
DROP POLICY IF EXISTS "invoice_lines_write_draft" ON "invoice_lines";
CREATE POLICY "invoice_lines_write_draft" ON "invoice_lines"
  FOR ALL
  USING (
    internal.has_permission('MANAGE_INVOICES')
    AND EXISTS (
      SELECT 1 FROM "invoices" i
      WHERE i."id" = "invoiceId" AND i."status" = 'DRAFT'
    )
  )
  WITH CHECK (
    internal.has_permission('MANAGE_INVOICES')
    AND EXISTS (
      SELECT 1 FROM "invoices" i
      WHERE i."id" = "invoiceId" AND i."status" = 'DRAFT'
    )
  );
