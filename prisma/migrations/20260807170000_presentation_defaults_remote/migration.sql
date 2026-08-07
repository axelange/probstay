-- How the property was presented always has an answer.
--
-- It was nullable, so every rental began with no choice and the documents
-- could not be called complete until someone made one. In practice the great
-- majority of these bookings are agreed at a distance, from the marketing
-- material and the photographs — so that is the honest default, and an agent
-- who showed the villa in person changes it.
--
-- Made NOT NULL rather than left nullable with a default: a null would mean
-- "nobody has said", and there is no longer such a state. Every rental now
-- carries a statement the tenant accepts by signing, which is the point.
UPDATE "rentals" SET "presentation" = 'REMOTE' WHERE "presentation" IS NULL;

ALTER TABLE "rentals"
  ALTER COLUMN "presentation" SET DEFAULT 'REMOTE',
  ALTER COLUMN "presentation" SET NOT NULL;
