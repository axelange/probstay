-- La pièce d'identité du représentant légal.
--
-- A company cannot present an identity document; the natural person who signs
-- for it can, and is the one an identification obligation actually reaches.
-- The block collected everything about that person — name, position,
-- occupation, nationality, contact details — except the one thing that
-- verifies they are who they say.
--
-- The copy itself lands in identity_documents against the company contact:
-- that contact is the party the agency deals with, and the representative is
-- identified through it rather than as a record of their own.
ALTER TABLE "contact_companies"
  ADD COLUMN IF NOT EXISTS "repIdDocType" "IdentityDocumentType",
  ADD COLUMN IF NOT EXISTS "repIdDocNumber" text;
