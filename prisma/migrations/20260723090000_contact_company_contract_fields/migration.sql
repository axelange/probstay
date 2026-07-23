-- Rework the company block around what contracts actually need, and around
-- the real (international) records rather than French SIREN/SIRET. The table
-- is newly created and empty, so no data moves.
--
-- Dropped: siren, siret, repRole, repEmail, repPhone.
-- Added:   registrationNumber, registeredOffice, repCapacity, repBirthDate,
--          repBirthPlace, repNationality.
-- The representative's email/phone live on the contact itself.

ALTER TABLE "contact_companies" DROP COLUMN IF EXISTS "siren";
ALTER TABLE "contact_companies" DROP COLUMN IF EXISTS "siret";
ALTER TABLE "contact_companies" DROP COLUMN IF EXISTS "repRole";
ALTER TABLE "contact_companies" DROP COLUMN IF EXISTS "repEmail";
ALTER TABLE "contact_companies" DROP COLUMN IF EXISTS "repPhone";

ALTER TABLE "contact_companies" ADD COLUMN "registrationNumber" TEXT;
ALTER TABLE "contact_companies" ADD COLUMN "registeredOffice" TEXT;
ALTER TABLE "contact_companies" ADD COLUMN "repCapacity" TEXT;
ALTER TABLE "contact_companies" ADD COLUMN "repBirthDate" DATE;
ALTER TABLE "contact_companies" ADD COLUMN "repBirthPlace" TEXT;
ALTER TABLE "contact_companies" ADD COLUMN "repNationality" TEXT;
