-- DropForeignKey
ALTER TABLE "contact_type_assignments" DROP CONSTRAINT "contact_type_assignments_contactId_fkey";

-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "types" "ContactType"[];

-- DropTable
DROP TABLE "contact_type_assignments";

-- Replace the owner-type trigger: check the types array directly
-- instead of the now-removed contact_type_assignments table.
CREATE OR REPLACE FUNCTION check_property_owner_is_contact_type_owner()
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
      RAISE EXCEPTION 'properties.ownerId must reference a contact whose types include OWNER (contact %)', NEW."ownerId";
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- GIN index for the Agent-visibility RLS check ('CLIENT' = ANY(types))
CREATE INDEX "contacts_types_gin_idx" ON "contacts" USING GIN ("types");
