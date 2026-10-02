-- Le catalogue porte les trois sommes d'une location, et leurs mentions.
--
-- The three figures a booking can be called for — acompte, solde, dépôt de
-- garantie — were labelled by the code. They are catalogue entries like any
-- other: the agency should be able to reword them, and above all to edit the
-- legal wording that has to travel with them.
--
-- `rentalAmount` is what ties an entry to the figure the software reads from
-- the dossier. A stable key rather than a name match: renaming "Dépôt de
-- garantie" in the catalogue must not quietly unhook it.
DO $$ BEGIN
  CREATE TYPE "RentalAmountKind" AS ENUM ('DEPOSIT', 'BALANCE', 'SECURITY_DEPOSIT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "rentalAmount" "RentalAmountKind",
  -- Wording carried onto the document's observations when the product is put
  -- on a line. The mentions a security deposit has to be accompanied by are
  -- the reason this exists.
  ADD COLUMN IF NOT EXISTS "notes" text;

-- One entry per figure. Two products claiming to be the acompte would make
-- "the catalogue entry for the acompte" meaningless.
CREATE UNIQUE INDEX IF NOT EXISTS "products_rental_amount_key"
  ON "products" ("rentalAmount")
  WHERE "rentalAmount" IS NOT NULL;

-- The three entries, bilingual as the documents are. Prices are zero: the
-- amount comes from the booking, never from here.
INSERT INTO "products" ("label", "unitPrice", "rentalAmount", "notes")
SELECT 'Deposit / Acompte', 0, 'DEPOSIT', NULL
WHERE NOT EXISTS (SELECT 1 FROM "products" WHERE "rentalAmount" = 'DEPOSIT');

INSERT INTO "products" ("label", "unitPrice", "rentalAmount", "notes")
SELECT 'Balance / Solde', 0, 'BALANCE', NULL
WHERE NOT EXISTS (SELECT 1 FROM "products" WHERE "rentalAmount" = 'BALANCE');

INSERT INTO "products" ("label", "unitPrice", "rentalAmount", "notes")
SELECT 'Security Deposit / Dépôt de garantie', 0, 'SECURITY_DEPOSIT',
  'The security deposit is requested in accordance with the booking terms and conditions and shall be payable exclusively by bank transfer. The security deposit shall be returned within one (1) month following the Tenant’s departure if no deductions are required. In the event of deductions, the security deposit shall be returned within a period not exceeding two (2) months following the Tenant’s departure. Where necessary, this period may be extended strictly for the time required to obtain supporting documents, provided that the Tenant is duly informed. VAT not applicable on rental amount – Article 261 D of the French Tax Code. BSTAY acts as managing agent of the rented property.' || E'\n\n' || 'Le dépôt de garantie est demandé conformément aux conditions générales de réservation et devra être réglé exclusivement par virement bancaire. Le dépôt de garantie sera restitué dans un délai d’un (1) mois suivant le départ du Locataire si aucune retenue n’est nécessaire. En cas de retenues, le dépôt de garantie sera restitué dans un délai n’excédant pas deux (2) mois suivant le départ du Locataire. Lorsque cela s’avère nécessaire, ce délai pourra être prolongé strictement pour la durée nécessaire à l’obtention des justificatifs, sous réserve que le Locataire en soit dûment informé. TVA non applicable sur le montant de la location – Article 261 D du Code général des impôts. BSTAY agit en qualité de mandataire chargé de la gestion du bien loué.'
WHERE NOT EXISTS (SELECT 1 FROM "products" WHERE "rentalAmount" = 'SECURITY_DEPOSIT');
