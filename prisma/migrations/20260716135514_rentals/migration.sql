
-- CreateEnum
CREATE TYPE "RentalBookingStatus" AS ENUM ('INQUIRY', 'BOOKING_CONFIRMATION', 'CONTRACT', 'KYC', 'CHECK_IN', 'CHECK_OUT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RentalPaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED');

-- CreateTable
CREATE TABLE "rentals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "propertyId" UUID NOT NULL,
    "ownerId" UUID,
    "bookingStatus" "RentalBookingStatus" NOT NULL DEFAULT 'INQUIRY',
    "depositStatus" "RentalPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "securityDepositStatus" "RentalPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "balanceStatus" "RentalPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3) NOT NULL,
    "grossAmount" DECIMAL(12,2) NOT NULL,
    "depositAmount" DECIMAL(12,2),
    "securityDepositAmount" DECIMAL(12,2),
    "commissionAmount" DECIMAL(12,2),
    "commissionRate" DECIMAL(5,2),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "rentals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_tenants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rentalId" UUID NOT NULL,
    "contactId" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rental_tenants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rentals_propertyId_idx" ON "rentals"("propertyId");

-- CreateIndex
CREATE INDEX "rentals_ownerId_idx" ON "rentals"("ownerId");

-- CreateIndex
CREATE INDEX "rentals_checkIn_checkOut_idx" ON "rentals"("checkIn", "checkOut");

-- CreateIndex
CREATE INDEX "rentals_bookingStatus_idx" ON "rentals"("bookingStatus");

-- CreateIndex
CREATE INDEX "rental_tenants_contactId_idx" ON "rental_tenants"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "rental_tenants_rentalId_contactId_key" ON "rental_tenants"("rentalId", "contactId");

-- AddForeignKey
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_tenants" ADD CONSTRAINT "rental_tenants_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "rentals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_tenants" ADD CONSTRAINT "rental_tenants_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- A rental's checkOut must come after its checkIn.
ALTER TABLE "rentals"
  ADD CONSTRAINT "rentals_checkout_after_checkin"
  CHECK ("checkOut" > "checkIn");

-- Enforce that a rental's owner-of-record is a Contact holding the
-- OWNER type. Mirrors the equivalent check on properties.ownerId.
CREATE OR REPLACE FUNCTION check_rental_owner_is_contact_type_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW."ownerId" IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM "contacts"
      WHERE "id" = NEW."ownerId" AND 'OWNER' = ANY("types")
    ) THEN
      RAISE EXCEPTION 'rentals.ownerId must reference a contact whose types include OWNER (contact %)', NEW."ownerId";
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_rental_owner_contact_type
  BEFORE INSERT OR UPDATE OF "ownerId" ON "rentals"
  FOR EACH ROW
  EXECUTE FUNCTION check_rental_owner_is_contact_type_owner();

-- Enforce that every tenant on a rental is a Contact holding the
-- CLIENT type (the business "Tenant" concept).
CREATE OR REPLACE FUNCTION check_rental_tenant_is_contact_type_client()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "contacts"
    WHERE "id" = NEW."contactId" AND 'CLIENT' = ANY("types")
  ) THEN
    RAISE EXCEPTION 'rental_tenants.contactId must reference a contact whose types include CLIENT (contact %)', NEW."contactId";
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_rental_tenant_contact_type
  BEFORE INSERT OR UPDATE OF "contactId" ON "rental_tenants"
  FOR EACH ROW
  EXECUTE FUNCTION check_rental_tenant_is_contact_type_client();

-- RLS
ALTER TABLE "rentals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rental_tenants" ENABLE ROW LEVEL SECURITY;
