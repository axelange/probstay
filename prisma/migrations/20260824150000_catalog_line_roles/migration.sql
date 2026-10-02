-- Le catalogue passe des trois sommes aux rôles de ligne.
--
-- A payment request for the balance used to be one line carrying one figure.
-- It now breaks the sum down — the rent, each service billed on top, the taxe
-- de séjour, and the acompte deducted when it has actually been received — so
-- a client reads what they are being asked for rather than a total to take on
-- trust.
--
-- That turns the catalogue keys inside out. They no longer name three sums;
-- they name the *lines* a request is composed of. The document is then
-- recognised by the line that heads it: a request carrying the rent is the
-- balance, one carrying the caution is the caution. Nothing is stored on the
-- invoice saying which it is — the composition says it, and the invoice keeps
-- no category, as decided.
DO $$ BEGIN
  CREATE TYPE "ProductRole" AS ENUM (
    -- Head a request of their own, and carry its title.
    'DEPOSIT',
    'SECURITY_DEPOSIT',
    'RENT',
    -- Only ever appear beside a rent line.
    'TOURIST_TAX',
    'DEPOSIT_PAID'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "products" RENAME COLUMN "rentalAmount" TO "role";
ALTER INDEX IF EXISTS "products_rental_amount_key" RENAME TO "products_role_key";

ALTER TABLE "products"
  ALTER COLUMN "role" TYPE "ProductRole"
  USING CASE "role"::text
    -- The old BALANCE entry becomes the rent line: it is what now heads a
    -- balance request, and it keeps the entry's history and its id.
    WHEN 'BALANCE' THEN 'RENT'
    ELSE "role"::text
  END::"ProductRole";

DROP TYPE IF EXISTS "RentalAmountKind";

-- The wording a document takes at its head, on the three entries that open
-- one. Bilingual in the same "EN / FR" form the labels use, and split on the
-- slash when printed.
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "documentTitle" text;

UPDATE "products" SET
  "label" = 'Rental Amount / Montant de la location',
  "documentTitle" = 'Balance Payment Request / Demande de paiement du solde'
WHERE "role" = 'RENT';

UPDATE "products" SET
  "documentTitle" = 'Deposit Payment Request / Demande de paiement d''acompte'
WHERE "role" = 'DEPOSIT';

UPDATE "products" SET
  "documentTitle" = 'Security Deposit Request / Demande de dépôt de garantie'
WHERE "role" = 'SECURITY_DEPOSIT';

INSERT INTO "products" ("label", "unitPrice", "role")
SELECT 'Tourist Tax / Taxe de séjour', 0, 'TOURIST_TAX'
WHERE NOT EXISTS (SELECT 1 FROM "products" WHERE "role" = 'TOURIST_TAX');

INSERT INTO "products" ("label", "unitPrice", "role")
SELECT 'Deposit paid / Acompte versé', 0, 'DEPOSIT_PAID'
WHERE NOT EXISTS (SELECT 1 FROM "products" WHERE "role" = 'DEPOSIT_PAID');

-- The document's own heading, frozen with it like everything else on the
-- paper. Free text, filled from the catalogue when the draft is opened — not
-- a category the agent picks from a list.
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "title" text;

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
      OR NEW."title"       IS DISTINCT FROM OLD."title"
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

-- A deduction is a negative line. The quantity stays positive: it is the price
-- that is owed the other way.
ALTER TABLE "invoice_lines" DROP CONSTRAINT IF EXISTS "invoice_lines_quantity_positive";
ALTER TABLE "invoice_lines"
  ADD CONSTRAINT "invoice_lines_quantity_positive" CHECK ("quantity" > 0);
