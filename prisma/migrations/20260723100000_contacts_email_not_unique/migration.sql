-- Drop the unique constraint on contacts.email. A person and the
-- company/companies they represent share one email (Aslan Khabliev and his
-- SCP "Alanian Star" both use aslan@loewe.de), which uniqueness refused.
-- This is the "revisit once addresses are shared" case the owners-only
-- phase deferred. apimoId stays the sync's real dedup key.
ALTER TABLE "contacts" DROP CONSTRAINT IF EXISTS "contacts_email_key";
