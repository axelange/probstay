-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('OWNER', 'PARTNER', 'PROVIDER');

-- AlterEnum
BEGIN;
CREATE TYPE "Permission_new" AS ENUM ('MANAGE_USERS', 'MANAGE_CONTACTS', 'MANAGE_PROPERTIES', 'MANAGE_RENTALS', 'MANAGE_INVOICES', 'MANAGE_REGISTERS', 'VIEW_FINANCIALS');
ALTER TABLE "user_permissions" ALTER COLUMN "permission" TYPE "Permission_new" USING ("permission"::text::"Permission_new");
ALTER TYPE "Permission" RENAME TO "Permission_old";
ALTER TYPE "Permission_new" RENAME TO "Permission";
DROP TYPE "public"."Permission_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "properties" DROP CONSTRAINT "properties_ownerId_fkey";

-- DropTable
DROP TABLE "owners";

-- CreateTable
CREATE TABLE "contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "ContactType" NOT NULL,
    "apimoId" INTEGER,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "iban" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contacts_apimoId_key" ON "contacts"("apimoId");

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Enforce that a Property can only be linked to a Contact of type
-- OWNER. Postgres can't express "FK to a row with a specific column
-- value" declaratively, so this is done with a trigger instead.
CREATE OR REPLACE FUNCTION check_property_owner_is_contact_type_owner()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."ownerId" IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM "contacts"
      WHERE "id" = NEW."ownerId" AND "type" = 'OWNER'
    ) THEN
      RAISE EXCEPTION 'properties.ownerId must reference a contact with type = OWNER (contact %)', NEW."ownerId";
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_property_owner_contact_type
  BEFORE INSERT OR UPDATE OF "ownerId" ON "properties"
  FOR EACH ROW
  EXECUTE FUNCTION check_property_owner_is_contact_type_owner();
