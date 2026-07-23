-- The stay amount is now captured *during* the Contrat step, not as a
-- precondition to enter it. INQUIRY became pure information (villa, dates,
-- party size, notes), so moving INQUIRY -> CONTRACT no longer carries the
-- amount. grossAmount therefore becomes mandatory only from FINALISATION
-- onward — CONTRACT joins INQUIRY/CANCELLED as exempt. This mirrors the
-- funnel gates (missingToReach: the amount is required to reach
-- FINALISATION, alongside the owner agreement and the signed contract).

ALTER TABLE "rentals" DROP CONSTRAINT IF EXISTS "rentals_gross_amount_required_after_inquiry";
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_gross_amount_required_after_inquiry"
  CHECK (
    "bookingStatus" IN ('INQUIRY', 'CANCELLED', 'CONTRACT')
    OR "grossAmount" IS NOT NULL
  );
