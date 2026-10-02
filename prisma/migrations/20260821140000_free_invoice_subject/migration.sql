-- L'objet d'une facture d'honoraires est libre.
--
-- The first shape made an agent classify every fee invoice as concierge work,
-- on subscription or one-off, or co-agency. It was a taxonomy imposed on a
-- line the agent was writing anyway: what the invoice is for is the sentence
-- they type, not a box among three that never quite fits.
--
-- So the kind goes for that family, and the free description carries the
-- subject. A fund call keeps its own: acompte, solde and dépôt de garantie are
-- not a subject but three different things being asked for, and the amount is
-- read from the booking accordingly.

-- The column has to accept null before anything can be set to it.
ALTER TABLE "invoices" ALTER COLUMN "kind" DROP DEFAULT;
ALTER TABLE "invoices" ALTER COLUMN "kind" DROP NOT NULL;

-- The drafts written under the old shape lose a classification that no longer
-- exists. They keep everything else, and their subject is theirs to write.
UPDATE "invoices" SET "kind" = NULL WHERE "family" = 'FEE';

-- The old pairing rule names labels that are about to disappear, and Postgres
-- revalidates a CHECK when the column under it changes type. It goes first and
-- comes back at the end, in its new form.
ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "invoices_kind_matches_family";

-- Only the fund call kinds remain in the type. Dropped first because Prisma
-- does not wrap a migration file in a transaction: an earlier run that failed
-- halfway can leave this type behind, and the retry has to be able to start
-- from there.
DROP TYPE IF EXISTS "InvoiceKind_new";
CREATE TYPE "InvoiceKind_new" AS ENUM ('DEPOSIT', 'BALANCE', 'SECURITY_DEPOSIT');

ALTER TABLE "invoices"
  ALTER COLUMN "kind" TYPE "InvoiceKind_new"
  USING CASE
    WHEN "kind"::text IN ('DEPOSIT', 'BALANCE', 'SECURITY_DEPOSIT')
      THEN "kind"::text::"InvoiceKind_new"
    ELSE NULL
  END;

DROP TYPE "InvoiceKind";
ALTER TYPE "InvoiceKind_new" RENAME TO "InvoiceKind";

-- The pairing rule, restated: a fund call is one of three, a fee is none of
-- them. Null is now the correct and only value for a fee, rather than a
-- category picked to satisfy the column.
ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_kind_matches_family" CHECK (
    ("family" = 'FEE' AND "kind" IS NULL)
    OR ("family" = 'FUND_CALL' AND "kind" IS NOT NULL)
  );
