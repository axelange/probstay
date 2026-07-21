-- Number of guests a booking is for, and the tourist-tax reference table.

ALTER TABLE "rentals" ADD COLUMN "guests" INTEGER;

CREATE TABLE "tourist_taxes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "city" TEXT NOT NULL,
    "amount" DECIMAL(6,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" UUID,
    CONSTRAINT "tourist_taxes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tourist_taxes_city_key" ON "tourist_taxes"("city");

ALTER TABLE "tourist_taxes" ADD CONSTRAINT "tourist_taxes_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed the rates the user provided (euros per person per night). Idempotent
-- on the city so a re-run against an environment that already has them is a
-- no-op rather than a duplicate-key error. Rates change ~yearly, edited by
-- an Admin from Settings thereafter — the seed is only the starting point.
INSERT INTO "tourist_taxes" ("city", "amount") VALUES
  ('Cannes', 6.16),
  ('Gassin', 5.00),
  ('Saint-Tropez', 6.91),
  ('Le Cannet', 4.77),
  ('Antibes', 6.43),
  ('Mandelieu', 6.16)
ON CONFLICT ("city") DO NOTHING;

-- RLS: reference data, readable by any signed-in profile (a rental screen
-- needs the rate to show the tax), writable only with MANAGE_USERS — the
-- admin level, matching "revised by the Admin". Backstop only; the app
-- reaches it through Prisma as table owner.
ALTER TABLE "tourist_taxes" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tourist_taxes_read_all" ON "tourist_taxes"
  FOR SELECT USING (internal.current_user_role() IS NOT NULL);

CREATE POLICY "tourist_taxes_write_admin" ON "tourist_taxes"
  FOR ALL
  USING (internal.has_permission('MANAGE_USERS'))
  WITH CHECK (internal.has_permission('MANAGE_USERS'));
