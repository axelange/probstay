-- Contact specialties — what a contact actually does.
--
-- `types` says how a contact relates to BSTAY (owner, client, partner,
-- provider); it cannot say whether a Prestataire is a cleaner or a
-- bailiff, and those are not interchangeable when you need one.
--
-- Multi-valued because one contact routinely does more than one thing:
-- the first record created by hand was "Graphiste / Développeur web".
-- An array rather than a join table, for the same reason `types` is one
-- — reading a contact must never require a second query.
--
-- Not restricted to PROVIDER: BUSINESS_INTRODUCER describes a Partner
-- rather than a supplier.
--
-- OTHER pairs with `otherSpecialty` free text, so an unlisted trade is
-- recorded rather than lost in a notes field, and adding one costs no
-- migration.
CREATE TYPE "ContactSpecialty" AS ENUM (
  'CLEANING',
  'BAILIFF',
  'DESIGN',
  'ARCHITECT',
  'PLUMBING',
  'ELECTRICAL',
  'HVAC',
  'CONSTRUCTION',
  'BUSINESS_INTRODUCER',
  'ACCOUNTING',
  'EVENTS',
  'CATERING',
  'TRANSPORT',
  'OTHER'
);

ALTER TABLE "contacts"
  ADD COLUMN "specialties" "ContactSpecialty"[],
  ADD COLUMN "otherSpecialty" TEXT;

-- Same shape of lookup as contacts_types_gin_idx: "every plumber" is an
-- = ANY(specialties) scan.
CREATE INDEX "contacts_specialties_gin_idx" ON "contacts" USING GIN ("specialties");
