-- Les événements que l'agence ajoute au calendrier.
--
-- Arrivals and departures are already known: they are the rentals, and putting
-- a row in here for each would be a second copy that drifts the moment a date
-- moves. This table is only for what nothing else records — a caretaker's
-- visit, a pool service, an owner staying in their own villa, a viewing.
--
-- A property is optional: "réunion d'agence" belongs on the calendar and to no
-- villa. A rental is optional too, and links the event to the booking it
-- concerns without pretending to be one.
DO $$ BEGIN
  CREATE TYPE "CalendarEventKind" AS ENUM (
    'MAINTENANCE',
    'CLEANING',
    'VIEWING',
    'OWNER_STAY',
    'BLOCKED',
    'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "calendar_events" (
  "id"    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "kind"  "CalendarEventKind" NOT NULL DEFAULT 'OTHER',

  -- Dates, not timestamps: the calendar is read by the day, and an hour would
  -- drag a time zone into a value that has none. `endsOn` is inclusive — a
  -- one-day event has the same date on both sides.
  "startsOn" date NOT NULL,
  "endsOn"   date NOT NULL,
  CONSTRAINT "calendar_events_range" CHECK ("endsOn" >= "startsOn"),

  "propertyId" uuid REFERENCES "properties"("id") ON DELETE CASCADE,
  "rentalId"   uuid REFERENCES "rentals"("id") ON DELETE CASCADE,
  "notes"      text,

  "createdById" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "createdAt"   timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- The calendar reads a month at a time: everything overlapping a range.
CREATE INDEX IF NOT EXISTS "calendar_events_range_idx"
  ON "calendar_events" ("startsOn", "endsOn");
CREATE INDEX IF NOT EXISTS "calendar_events_property_idx"
  ON "calendar_events" ("propertyId");

ALTER TABLE "calendar_events" ENABLE ROW LEVEL SECURITY;

-- Readable by anyone with a profile: a calendar everyone half-sees is worse
-- than no calendar, and an event carries no confidential figures. Writing is
-- MANAGE_RENTALS, the same permission that shapes the bookings around them.
CREATE POLICY "calendar_events_read" ON "calendar_events"
  FOR SELECT
  USING (internal.current_user_role() IS NOT NULL);

CREATE POLICY "calendar_events_write" ON "calendar_events"
  FOR ALL
  USING (internal.has_permission('MANAGE_RENTALS'))
  WITH CHECK (internal.has_permission('MANAGE_RENTALS'));
