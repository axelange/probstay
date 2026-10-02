-- Plus de pré-catégorisation du tout.
--
-- A fund call was filed as an acompte, a solde or a dépôt de garantie, and the
-- amount was read from the booking accordingly. That was the software deciding
-- what the agency was asking for. What it asks for is a line, and a line comes
-- from the catalogue — where "Acompte" is a product like any other, priced when
-- it is put on the document.
--
-- So the column goes, and with it the rule that paired it to a family. What a
-- fund call is about is now said by its subject: the booking it concerns and
-- the dates of the stay.
ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "invoices_kind_matches_family";

-- The freeze trigger watches every column that appears on the paper. It has
-- one fewer to watch.
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

ALTER TABLE "invoices" DROP COLUMN IF EXISTS "kind";
DROP TYPE IF EXISTS "InvoiceKind";
