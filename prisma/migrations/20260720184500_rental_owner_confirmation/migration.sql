-- Owner confirmation, and what it locks.
--
-- BSTAY's mandates are not exclusive: other agencies market the same
-- villas, so BSTAY can never assert that a week is free. The owner is
-- the only authority. The process is therefore: a client asks (INQUIRY),
-- the agent asks the owner (BOOKING_CONFIRMATION), and on a yes the
-- booking proceeds to CONTRACT — on a no, other dates or another villa
-- are offered.
--
-- bookingStatus alone cannot express this, because BOOKING_CONFIRMATION
-- covers both "asked the owner" and "the owner said yes". Several agents
-- may legitimately be waiting on the same owner for the same week; what
-- may not happen twice is the answer. So the confirmation is recorded
-- explicitly, with its date and the user who obtained it — which is also
-- the agency's evidence should an owner later dispute having agreed.

-- 1. grossAmount is optional only while the booking is an enquiry ------
--
-- A client asking about dates has no agreed price yet. CANCELLED is
-- exempt too, otherwise an enquiry that goes nowhere could never be
-- closed: it has no amount and never will.
ALTER TABLE "rentals" ADD COLUMN "ownerConfirmedAt" TIMESTAMP(3);
ALTER TABLE "rentals" ADD COLUMN "ownerConfirmedById" UUID;
ALTER TABLE "rentals" ALTER COLUMN "grossAmount" DROP NOT NULL;

ALTER TABLE "rentals" ADD CONSTRAINT "rentals_gross_amount_required_after_inquiry"
  CHECK (
    "bookingStatus" IN ('INQUIRY', 'CANCELLED')
    OR "grossAmount" IS NOT NULL
  );

CREATE INDEX "rentals_ownerConfirmedAt_idx" ON "rentals"("ownerConfirmedAt");

ALTER TABLE "rentals" ADD CONSTRAINT "rentals_ownerConfirmedById_fkey"
  FOREIGN KEY ("ownerConfirmedById") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2. One confirmed booking per property and period ---------------------
--
-- In the database rather than the application, because an application
-- check cannot win a race: two agents recording a confirmation at the
-- same instant would both read "no conflict" and both write. Only the
-- database serialises that, and booking is exactly a concurrent
-- workload — several people work the same villas for the same August
-- weeks.
--
-- The range is '[)': the check-out day is excluded, so a departure on
-- the 8th and an arrival on the 8th do not overlap. Closed bounds would
-- reject every back-to-back booking, which in high season is most of
-- them.
--
-- Partial, so it constrains only what is actually exclusive: confirmed,
-- not cancelled, not archived. Enquiries and pending requests overlap
-- freely, which is the normal state of affairs.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "rentals" ADD CONSTRAINT "rentals_no_overlapping_confirmed"
  EXCLUDE USING gist (
    "propertyId" WITH =,
    daterange("checkIn"::date, "checkOut"::date, '[)') WITH &&
  )
  WHERE (
    "ownerConfirmedAt" IS NOT NULL
    AND "bookingStatus" <> 'CANCELLED'
    AND "archivedAt" IS NULL
  );
