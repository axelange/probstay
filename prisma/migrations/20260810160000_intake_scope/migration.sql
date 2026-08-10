-- Un lien peut ne demander que les autres occupants.
--
-- The two are asked at different moments and of different people. The primary
-- tenant is identified before the contract — that is the LCB-FT obligation,
-- and they have a contact record of their own. The other adults are attached
-- to one stay and nothing else, are rarely known that early, and are chased at
-- finalisation instead.
--
-- So a link says which of the two it is for, and the form shows only that.
-- Sending a client the whole questionnaire again to collect three names would
-- be asking them to re-declare what they already confirmed.
DO $$ BEGIN
  CREATE TYPE "IntakeScope" AS ENUM ('FULL', 'OCCUPANTS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "client_intake_links"
  ADD COLUMN IF NOT EXISTS "scope" "IntakeScope" NOT NULL DEFAULT 'FULL';
