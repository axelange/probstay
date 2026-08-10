-- Client identification (TRACFIN), and the link the client fills in themselves.
--
-- The agency is assujettie to the LCB-FT regime, so it has to identify who it
-- rents to and keep the evidence. Asking these questions across a desk is
-- awkward for both sides, so the client answers them through a tokenised link
-- instead — pre-filled with what is already on file, corrected and confirmed
-- by them.
--
-- Two destinations for one submission, deliberately:
--   • the contact is updated, so the next booking starts from known data;
--   • a snapshot is kept, because the contact holds what is true *now* and an
--     inspection asks what was declared *then*. Overwriting the contact would
--     leave the confirmation attached to data the client never confirmed.

-- 1. Identity of an individual ----------------------------------------------
DO $$ BEGIN
  CREATE TYPE "MaritalStatus" AS ENUM
    ('SINGLE', 'MARRIED', 'PACS', 'DIVORCED', 'WIDOWED', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- `address` stays the street line so every document that prints "demeurant …"
-- keeps working; the rest of the postal address joins it as its own columns
-- rather than being buried in that free text.
ALTER TABLE "contacts"
  ADD COLUMN IF NOT EXISTS "occupation"    text,
  ADD COLUMN IF NOT EXISTS "maritalStatus" "MaritalStatus",
  ADD COLUMN IF NOT EXISTS "postalCode"    text,
  ADD COLUMN IF NOT EXISTS "city"          text,
  ADD COLUMN IF NOT EXISTS "country"       text;

-- 2. Identity of a company ---------------------------------------------------
-- Same treatment for the registered office, plus what the entity does and how
-- to reach the person who signs for it. No bénéficiaire effectif: the agency's
-- position is that the legal representative is sufficient here.
ALTER TABLE "contact_companies"
  ADD COLUMN IF NOT EXISTS "mainActivity"      text,
  ADD COLUMN IF NOT EXISTS "officePostalCode"  text,
  ADD COLUMN IF NOT EXISTS "officeCity"        text,
  ADD COLUMN IF NOT EXISTS "officeCountry"     text,
  ADD COLUMN IF NOT EXISTS "repOccupation"     text,
  ADD COLUMN IF NOT EXISTS "repPhone"          text,
  ADD COLUMN IF NOT EXISTS "repEmail"          text;

-- 3. Why the stay is happening ----------------------------------------------
-- Asked only when the link is opened for a rental. A seasonal rental contract
-- is a holiday instrument, so anything other than HOLIDAY is worth an agent
-- seeing rather than a box quietly ticked.
DO $$ BEGIN
  CREATE TYPE "StayPurpose" AS ENUM ('HOLIDAY', 'BUSINESS', 'EVENT', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "rentals"
  ADD COLUMN IF NOT EXISTS "stayPurpose"      "StayPurpose",
  ADD COLUMN IF NOT EXISTS "stayPurposeOther" text;

-- 4. The other adults staying ------------------------------------------------
-- Rows on the rental, not contacts: they are recorded, not taken on as
-- clients, they change every stay, and the address book already holds 5000
-- APIMO records without them. Children are excluded by the same rule that
-- exempts them from the taxe de séjour.
CREATE TABLE IF NOT EXISTS "rental_occupants" (
  "id"        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "rentalId"  uuid NOT NULL REFERENCES "rentals"("id") ON DELETE CASCADE,
  "firstName" text NOT NULL,
  "lastName"  text NOT NULL,
  "idDocType"   text,
  "idDocNumber" text,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "rental_occupants_rental_idx"
  ON "rental_occupants" ("rentalId");

ALTER TABLE "rental_occupants" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rental_occupants_manage_rentals" ON "rental_occupants"
  FOR ALL
  USING (internal.has_permission('MANAGE_RENTALS'))
  WITH CHECK (internal.has_permission('MANAGE_RENTALS'));
CREATE POLICY "rental_occupants_agent" ON "rental_occupants"
  FOR ALL
  USING (internal.is_rental_agent("rentalId"))
  WITH CHECK (internal.is_rental_agent("rentalId"));

-- 5. The link ----------------------------------------------------------------
-- Targets a contact; a rental only as context. Opened from a contact page it
-- is an identity request — an owner, say — and from Finalisation it also asks
-- the motif and the occupants.
--
-- The token is the only credential, so it is long, random and unique, and the
-- link is bounded three ways: it expires, it can be revoked, and it reaches
-- exactly one contact. It carries no session and grants nothing else.
CREATE TABLE IF NOT EXISTS "client_intake_links" (
  "id"        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "token"     text NOT NULL UNIQUE,
  "contactId" uuid NOT NULL REFERENCES "contacts"("id") ON DELETE CASCADE,
  "rentalId"  uuid REFERENCES "rentals"("id") ON DELETE CASCADE,

  "createdById" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "createdAt"   timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt"   timestamp(3) NOT NULL,
  "revokedAt"   timestamp(3),
  -- When it was last answered. The link stays usable until it expires so a
  -- client can correct a mistake; every answer is kept (see below).
  "submittedAt" timestamp(3)
);
CREATE INDEX IF NOT EXISTS "client_intake_links_contact_idx"
  ON "client_intake_links" ("contactId");
CREATE INDEX IF NOT EXISTS "client_intake_links_rental_idx"
  ON "client_intake_links" ("rentalId");

ALTER TABLE "client_intake_links" ENABLE ROW LEVEL SECURITY;
-- Staff-only through RLS. The client's own access does not come through this
-- table at all: the public route resolves the token server-side and never
-- carries the visitor's identity into the database.
CREATE POLICY "client_intake_links_staff" ON "client_intake_links"
  FOR ALL
  USING (internal.current_user_role() IS NOT NULL)
  WITH CHECK (internal.current_user_role() IS NOT NULL);

-- 6. What was declared, and when ---------------------------------------------
-- The evidence. Append-only and never edited: each submission is a statement
-- the client made and confirmed at a point in time, which is exactly what the
-- contact record cannot preserve once it is updated.
CREATE TABLE IF NOT EXISTS "client_intake_submissions" (
  "id"        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "linkId"    uuid NOT NULL REFERENCES "client_intake_links"("id") ON DELETE CASCADE,
  "contactId" uuid NOT NULL REFERENCES "contacts"("id") ON DELETE CASCADE,
  "rentalId"  uuid REFERENCES "rentals"("id") ON DELETE SET NULL,

  -- Exactly what was submitted, as submitted. Stored whole rather than as
  -- columns mirroring the contact: the point is to keep the declaration
  -- intact even after the schema around it moves on.
  "payload" jsonb NOT NULL,

  -- The confirmation, with what it was attached to.
  "confirmedAt" timestamp(3) NOT NULL,
  "userAgent"   text,

  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "client_intake_submissions_contact_idx"
  ON "client_intake_submissions" ("contactId", "createdAt");
CREATE INDEX IF NOT EXISTS "client_intake_submissions_rental_idx"
  ON "client_intake_submissions" ("rentalId");

ALTER TABLE "client_intake_submissions" ENABLE ROW LEVEL SECURITY;
-- Readable by staff, written by nobody through RLS: the only writer is the
-- public intake action, which runs with the service role after validating the
-- token. No UPDATE or DELETE policy — this is the record that must not move.
CREATE POLICY "client_intake_submissions_read" ON "client_intake_submissions"
  FOR SELECT
  USING (internal.current_user_role() IS NOT NULL);

-- 7. An identity copy without a booking --------------------------------------
-- The table was built for a rental's tenants. An owner asked for their ID from
-- their contact page has no rental, so the link becomes optional. Empty today,
-- so nothing has to be backfilled.
ALTER TABLE "identity_documents"
  ALTER COLUMN "rentalId" DROP NOT NULL;
