-- Arrival and departure hours, per rental.
--
-- The property carries the hours it normally turns over on; a single booking
-- may not. A late check-out agreed for one stay is a fact about that stay, and
-- writing it onto the property would quietly change every other contract
-- generated from it.
--
-- Nullable on purpose, and with no default: NULL means "whatever the property
-- says", which is what every rental means today. So this needs no backfill,
-- changes no existing document, and lets a correction on the property still
-- reach the bookings nobody has overridden.
ALTER TABLE "rentals"
  ADD COLUMN IF NOT EXISTS "checkInTime"  text,
  ADD COLUMN IF NOT EXISTS "checkOutTime" text;
