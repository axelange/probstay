-- Le justificatif d'existence d'une société, et la date qui le date.
--
-- A company tenant has to produce a KBIS — or its equivalent abroad — issued
-- less than three months before the stay. That is a document about a party's
-- identity, held against a contact and stored in the same private bucket as
-- the rest, so it joins `identity_documents` rather than starting a table of
-- its own.
--
-- `issuedAt` is what makes the three-month rule checkable. It matters for the
-- company paper and not for a passport, so it is nullable: an identity
-- document is valid or expired on its own terms, a registration extract is
-- only ever "recent enough at the time of the booking".
ALTER TYPE "IdentityDocumentType" ADD VALUE IF NOT EXISTS 'COMPANY_REGISTRATION';

ALTER TABLE "identity_documents"
  ADD COLUMN IF NOT EXISTS "issuedAt" date;
