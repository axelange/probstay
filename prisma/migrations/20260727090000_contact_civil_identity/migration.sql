-- Civil identity for an individual contact, needed on rental contracts:
-- date and place of birth, nationality, and the identity document (type +
-- number). BSTAY's own data — the APIMO sync never writes these columns,
-- so they survive every re-sync. Empty for companies (whose identity lives
-- in contact_companies).

ALTER TABLE "contacts" ADD COLUMN "birthDate" DATE;
ALTER TABLE "contacts" ADD COLUMN "birthPlace" TEXT;
ALTER TABLE "contacts" ADD COLUMN "nationality" TEXT;
ALTER TABLE "contacts" ADD COLUMN "idDocType" TEXT;
ALTER TABLE "contacts" ADD COLUMN "idDocNumber" TEXT;
