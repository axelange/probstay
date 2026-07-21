-- Rental pipeline, revised to the real process.
--
-- Stages: INQUIRY → CONTRACT → FINALISATION → CHECK_IN → CHECK_OUT
-- (+ CANCELLED from any). The old BOOKING_CONFIRMATION stage becomes the
-- "agreement reached" gate checkbox, and the old KYC stage becomes the
-- identity capture inside FINALISATION.
--
-- Two hard gates, each an explicit checkbox:
--   • agreement reached  → lets INQUIRY become CONTRACT, and locks the
--     dates (this is ownerConfirmedAt, already present)
--   • contract signed    → lets CONTRACT become FINALISATION, and is now
--     what freezes the owner/agent snapshot (contractSignedAt, new)
-- Everything past that is guided, not walled.

-- The enum swap needs the two bookingStatus constraints gone first.
-- Prisma's diff cannot see them — they were added by hand, so its
-- generated migration omitted this and would have failed.
ALTER TABLE "rentals" DROP CONSTRAINT IF EXISTS "rentals_gross_amount_required_after_inquiry";
ALTER TABLE "rentals" DROP CONSTRAINT IF EXISTS "rentals_no_overlapping_confirmed";

CREATE TYPE "IdentityDocumentType" AS ENUM ('PASSPORT', 'ID_CARD', 'DRIVING_LICENSE');

-- Swap the enum. Safe with no data reprieve: the only live rows are on
-- INQUIRY and CONTRACT, both kept.
CREATE TYPE "RentalBookingStatus_new" AS ENUM ('INQUIRY', 'CONTRACT', 'FINALISATION', 'CHECK_IN', 'CHECK_OUT', 'CANCELLED');
ALTER TABLE "rentals" ALTER COLUMN "bookingStatus" DROP DEFAULT;
ALTER TABLE "rentals" ALTER COLUMN "bookingStatus" TYPE "RentalBookingStatus_new" USING ("bookingStatus"::text::"RentalBookingStatus_new");
ALTER TYPE "RentalBookingStatus" RENAME TO "RentalBookingStatus_old";
ALTER TYPE "RentalBookingStatus_new" RENAME TO "RentalBookingStatus";
DROP TYPE "RentalBookingStatus_old";
ALTER TABLE "rentals" ALTER COLUMN "bookingStatus" SET DEFAULT 'INQUIRY';

-- New rental fields.
ALTER TABLE "rentals"
  ADD COLUMN "contractSignedAt" TIMESTAMP(3),
  ADD COLUMN "contractSignedById" UUID,
  ADD COLUMN "securityDepositReturnedAt" TIMESTAMP(3);

-- Recreate the two constraints against the new enum, logic unchanged.
-- grossAmount stays required from CONTRACT onward (INQUIRY/CANCELLED
-- exempt), and FINALISATION/CHECK_IN/CHECK_OUT all require it too.
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_gross_amount_required_after_inquiry"
  CHECK (
    "bookingStatus" IN ('INQUIRY', 'CANCELLED')
    OR "grossAmount" IS NOT NULL
  );

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

ALTER TABLE "rentals" ADD CONSTRAINT "rentals_contractSignedById_fkey"
  FOREIGN KEY ("contractSignedById") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Identity documents captured during finalisation. One or more per
-- rental; the file lives in a private Storage bucket, only its path here.
CREATE TABLE "identity_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rentalId" UUID NOT NULL,
    "contactId" UUID,
    "type" "IdentityDocumentType" NOT NULL,
    "number" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedById" UUID,
    CONSTRAINT "identity_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "identity_documents_rentalId_idx" ON "identity_documents"("rentalId");
CREATE INDEX "identity_documents_contactId_idx" ON "identity_documents"("contactId");

ALTER TABLE "identity_documents" ADD CONSTRAINT "identity_documents_rentalId_fkey"
  FOREIGN KEY ("rentalId") REFERENCES "rentals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "identity_documents" ADD CONSTRAINT "identity_documents_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "identity_documents" ADD CONSTRAINT "identity_documents_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS: identity documents hold passport/ID data. On like every table;
-- the app reaches them through Prisma as table owner (bypassing RLS),
-- so this is the backstop for anything hitting PostgREST with a JWT.
-- MANAGE_RENTALS may read/write; an Agent may read/write those of a
-- rental whose property they manage — the same rule as rentals.
ALTER TABLE "identity_documents" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "identity_documents_manage_rentals" ON "identity_documents"
  FOR ALL
  USING (internal.has_permission('MANAGE_RENTALS'))
  WITH CHECK (internal.has_permission('MANAGE_RENTALS'));

CREATE POLICY "identity_documents_agent_own_property" ON "identity_documents"
  FOR ALL
  USING (internal.is_rental_property_agent("rentalId"))
  WITH CHECK (internal.is_rental_property_agent("rentalId"));
