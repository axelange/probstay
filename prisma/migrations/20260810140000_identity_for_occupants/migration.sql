-- Une pièce d'identité peut appartenir à un occupant, pas seulement à un contact.
--
-- The table was built when the only person to identify was the tenant, who is
-- a Contact. The client's own form now also collects the other adults on the
-- stay, and those are rows on the rental rather than contacts — recorded, not
-- taken on as clients. So the owner of a document is one of two things, and
-- both columns are nullable with exactly one of them set.
ALTER TABLE "identity_documents"
  ADD COLUMN IF NOT EXISTS "occupantId" uuid
    REFERENCES "rental_occupants"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "identity_documents_occupant_idx"
  ON "identity_documents" ("occupantId");

-- A scan is worth keeping even when nobody typed the number off it: the copy
-- is the evidence, the number is a convenience. Empty table, so nothing to
-- backfill.
ALTER TABLE "identity_documents"
  ALTER COLUMN "number" DROP NOT NULL;
