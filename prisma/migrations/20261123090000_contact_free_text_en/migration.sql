-- Free-text contact lines, in English as well.
--
-- Occupation (a person's and a representative's), legal form, main activity
-- and the representative's capacity are
-- words the agency types, and the documents print them in two languages:
-- "Gérant" has to read "Manager" in the English half. Nothing can translate
-- one into the other, so each gets a second column for the English.
--
-- The existing columns stay the French reference. They are what the APIMO
-- sync, the client intake form and a French-only document read, and none of
-- those change. A null English column means the French prints alone.
--
-- Additive and nullable: no row is rewritten, and code that does not know the
-- columns keeps working.

ALTER TABLE "contacts" ADD COLUMN "occupationEn" TEXT;

ALTER TABLE "contact_companies" ADD COLUMN "legalFormEn" TEXT;
ALTER TABLE "contact_companies" ADD COLUMN "mainActivityEn" TEXT;
ALTER TABLE "contact_companies" ADD COLUMN "repCapacityEn" TEXT;
ALTER TABLE "contact_companies" ADD COLUMN "repOccupationEn" TEXT;
