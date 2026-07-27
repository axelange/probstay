-- With the FINANCIAL stage in place, the stay amount becomes mandatory
-- from CONTRACT onward: the money is settled during FINANCIAL and gates
-- the move into the contract stage. INQUIRY/FINANCIAL/CANCELLED are exempt.

-- Safety: any contract-stage rental still lacking an amount belongs to the
-- money stage under the new meaning of CONTRACT.
UPDATE "rentals" SET "bookingStatus" = 'FINANCIAL'
  WHERE "bookingStatus" = 'CONTRACT' AND "grossAmount" IS NULL;

ALTER TABLE "rentals" DROP CONSTRAINT IF EXISTS "rentals_gross_amount_required_after_inquiry";
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_gross_amount_required_after_inquiry"
  CHECK (
    "bookingStatus" IN ('INQUIRY', 'FINANCIAL', 'CANCELLED')
    OR "grossAmount" IS NOT NULL
  );
