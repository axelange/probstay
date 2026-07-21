-- Extra services an agent prices on a rental, on top of the stay amount
-- and the property's included services. RLS mirrors rentals: MANAGE_RENTALS
-- or the property's agent.
CREATE TABLE "rental_services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rentalId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rental_services_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "rental_services_rentalId_idx" ON "rental_services"("rentalId");

ALTER TABLE "rental_services" ADD CONSTRAINT "rental_services_rentalId_fkey"
  FOREIGN KEY ("rentalId") REFERENCES "rentals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "rental_services" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rental_services_manage_rentals" ON "rental_services"
  FOR ALL
  USING (internal.has_permission('MANAGE_RENTALS'))
  WITH CHECK (internal.has_permission('MANAGE_RENTALS'));

CREATE POLICY "rental_services_agent_own_property" ON "rental_services"
  FOR ALL
  USING (internal.is_rental_property_agent("rentalId"))
  WITH CHECK (internal.is_rental_property_agent("rentalId"));
