-- L'heure d'un événement, facultative.
--
-- Most entries are all-day: a villa blocked for a fortnight, an owner staying
-- a week. Some are not — a viewing at 11h, a caretaker between 9h and 10h —
-- and those want placing on a day read hour by hour.
--
-- Text in the same "16h00" shape the check-in and check-out hours use, and for
-- the same reasons: it is a printed and displayed value, never compared across
-- zones, and the normaliser that produces it already exists. Two-digit hours
-- mean it also sorts correctly as text.
ALTER TABLE "calendar_events"
  ADD COLUMN IF NOT EXISTS "startTime" text,
  ADD COLUMN IF NOT EXISTS "endTime"   text;
