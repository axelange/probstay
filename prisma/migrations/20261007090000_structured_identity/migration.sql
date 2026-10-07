-- Identity fields, structured.
--
-- Three free-text boxes were asking the client to do the parsing: a
-- nationality, a birthplace, and a country, each one line of whatever they
-- felt like typing. The only two real values in the database said it plainly —
-- "SUISSE / RUSSE" for one nationality field, "Vladikavkaz (Russie)" for one
-- birthplace. A dual nationality and a city-with-country, each flattened into
-- a box that cannot be read back.
--
-- Nationalities become an array of ISO 3166-1 alpha-2 codes. Codes rather than
-- labels because the documents are bilingual and one code renders both halves,
-- because labels drift, and because a code can be searched. No length cap in
-- the column: the interface allows three, and raising that should not be a
-- migration.
--
-- Birthplace becomes a country code and a city. The city stays free text on
-- purpose — no dataset lists every village on earth, and a client who cannot
-- enter where they were born is stuck on a page with nobody to call.
--
-- `country` and `officeCountry` keep their names and change meaning: they now
-- hold alpha-2 codes. Every row is null, so this costs nothing today. It would
-- not be free once real clients are entered, which is why it is done now.

-- ---- Individuals ----------------------------------------------------------
ALTER TABLE "contacts" ADD COLUMN "birthCountry" TEXT;
ALTER TABLE "contacts" ADD COLUMN "birthCity" TEXT;
ALTER TABLE "contacts" ADD COLUMN "nationalities" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "contacts" ADD COLUMN "addressLine2" TEXT;

-- No contact holds either value — verified before writing this, all 55 rows
-- are null on every identity column — so there is nothing to carry over.
ALTER TABLE "contacts" DROP COLUMN "birthPlace";
ALTER TABLE "contacts" DROP COLUMN "nationality";

-- ---- Companies: the representative's identity -----------------------------
ALTER TABLE "contact_companies" ADD COLUMN "repBirthCountry" TEXT;
ALTER TABLE "contact_companies" ADD COLUMN "repBirthCity" TEXT;
ALTER TABLE "contact_companies" ADD COLUMN "repNationalities" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "contact_companies" ADD COLUMN "officeLine2" TEXT;

-- The one row that does hold values, carried over by hand rather than lost.
-- Matched on the values themselves: there is exactly one of each, and matching
-- on an id would hard-code a uuid that means nothing to a later reader.
UPDATE "contact_companies"
   SET "repNationalities" = ARRAY['CH', 'RU']
 WHERE "repNationality" = 'SUISSE / RUSSE';

UPDATE "contact_companies"
   SET "repBirthCountry" = 'RU',
       "repBirthCity"    = 'Vladikavkaz'
 WHERE "repBirthPlace" = 'Vladikavkaz (Russie)';

ALTER TABLE "contact_companies" DROP COLUMN "repBirthPlace";
ALTER TABLE "contact_companies" DROP COLUMN "repNationality";
