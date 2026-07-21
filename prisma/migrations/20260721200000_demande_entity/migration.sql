-- The Demande entity: a client's request, distinct from a rental.
--
-- Drops the source/convertedAt columns added to rentals a day earlier —
-- that responsibility moves here, now that a demande is its own thing
-- rather than a rental at the enquiry stage. The rental's opening stage
-- stays INQUIRY internally, relabelled "Informations" in the UI.

DROP INDEX "rentals_convertedAt_idx";
ALTER TABLE "rentals" DROP COLUMN "convertedAt", DROP COLUMN "source";
DROP TYPE "RentalSource";

CREATE TYPE "DemandeMode" AS ENUM ('PRECISE', 'WIDE');
CREATE TYPE "DemandeSource" AS ENUM ('DIRECT', 'WEBSITE');

CREATE TABLE "demandes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "mode" "DemandeMode" NOT NULL,
    "source" "DemandeSource" NOT NULL DEFAULT 'DIRECT',
    "contactId" UUID NOT NULL,
    "checkIn" TIMESTAMP(3),
    "checkOut" TIMESTAMP(3),
    "guests" INTEGER,
    "budget" DECIMAL(12,2),
    "notes" TEXT,
    "convertedRentalId" UUID,
    "convertedAt" TIMESTAMP(3),
    "lostAt" TIMESTAMP(3),
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),
    CONSTRAINT "demandes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "demandes_convertedRentalId_key" ON "demandes"("convertedRentalId");
CREATE INDEX "demandes_contactId_idx" ON "demandes"("contactId");
CREATE INDEX "demandes_convertedAt_idx" ON "demandes"("convertedAt");
CREATE INDEX "demandes_lostAt_idx" ON "demandes"("lostAt");

CREATE TABLE "demande_properties" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "demandeId" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    CONSTRAINT "demande_properties_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "demande_properties_propertyId_idx" ON "demande_properties"("propertyId");
CREATE UNIQUE INDEX "demande_properties_demandeId_propertyId_key" ON "demande_properties"("demandeId", "propertyId");

ALTER TABLE "demandes" ADD CONSTRAINT "demandes_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "demandes" ADD CONSTRAINT "demandes_convertedRentalId_fkey"
  FOREIGN KEY ("convertedRentalId") REFERENCES "rentals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "demandes" ADD CONSTRAINT "demandes_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "demande_properties" ADD CONSTRAINT "demande_properties_demandeId_fkey"
  FOREIGN KEY ("demandeId") REFERENCES "demandes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "demande_properties" ADD CONSTRAINT "demande_properties_propertyId_fkey"
  FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS mirrors rentals: read-all for any signed-in profile, write for
-- MANAGE_RENTALS. Agents don't have a per-property scope on demandes —
-- a wide demande spans several — so read-all + MANAGE_RENTALS write is
-- the whole rule here. Backstop only; the app uses Prisma as table owner.
ALTER TABLE "demandes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demandes_read_all" ON "demandes"
  FOR SELECT USING (internal.current_user_role() IS NOT NULL);
CREATE POLICY "demandes_write_manage_rentals" ON "demandes"
  FOR ALL
  USING (internal.has_permission('MANAGE_RENTALS'))
  WITH CHECK (internal.has_permission('MANAGE_RENTALS'));

ALTER TABLE "demande_properties" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demande_properties_read_all" ON "demande_properties"
  FOR SELECT USING (internal.current_user_role() IS NOT NULL);
CREATE POLICY "demande_properties_write_manage_rentals" ON "demande_properties"
  FOR ALL
  USING (internal.has_permission('MANAGE_RENTALS'))
  WITH CHECK (internal.has_permission('MANAGE_RENTALS'));
