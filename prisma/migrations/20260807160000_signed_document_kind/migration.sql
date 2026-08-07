-- Amendments (avenants), alongside the signed copies.
--
-- An avenant changes a signed document without replacing it: both remain in
-- force, and reading one without the other gives the wrong terms. So it cannot
-- be modelled as another upload of the same kind, which would supersede the
-- copy it amends and hide it under "Historique".
--
-- Hence a second axis. `type` stays which document (confirmation, contract);
-- `kind` says whether this is the signed copy of it or an amendment to it.
DO $$ BEGIN
  CREATE TYPE "SignedDocumentKind" AS ENUM ('SIGNED', 'AMENDMENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Everything uploaded so far was a signed copy; there was nothing else to
-- upload. The default keeps that true for anything already stored.
ALTER TABLE "signed_documents"
  ADD COLUMN IF NOT EXISTS "kind" "SignedDocumentKind" NOT NULL DEFAULT 'SIGNED';

-- Listed newest-first per document and per kind.
DROP INDEX IF EXISTS "signed_documents_rental_type_uploaded_idx";
CREATE INDEX IF NOT EXISTS "signed_documents_rental_type_kind_uploaded_idx"
  ON "signed_documents" ("rentalId", "type", "kind", "uploadedAt");
