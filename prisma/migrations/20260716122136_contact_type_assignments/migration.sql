-- AlterEnum
ALTER TYPE "ContactType" ADD VALUE 'CLIENT';

-- AlterTable
ALTER TABLE "contacts" DROP COLUMN "type";

-- CreateTable
CREATE TABLE "contact_type_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contactId" UUID NOT NULL,
    "type" "ContactType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_type_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contact_type_assignments_contactId_type_key" ON "contact_type_assignments"("contactId", "type");

-- AddForeignKey
ALTER TABLE "contact_type_assignments" ADD CONSTRAINT "contact_type_assignments_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Replace the owner-type trigger: check contact_type_assignments
-- (type = OWNER) instead of the now-removed contacts.type column.
CREATE OR REPLACE FUNCTION check_property_owner_is_contact_type_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW."ownerId" IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM "contact_type_assignments"
      WHERE "contactId" = NEW."ownerId" AND "type" = 'OWNER'
    ) THEN
      RAISE EXCEPTION 'properties.ownerId must reference a contact with an OWNER type assignment (contact %)', NEW."ownerId";
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- RLS: lock this table down completely by default. Nothing needs
-- direct API access to it — the app (Prisma, table owner) bypasses RLS
-- entirely, and the has-type check used by policies elsewhere runs
-- through a SECURITY DEFINER function, not a direct table read.
ALTER TABLE public.contact_type_assignments ENABLE ROW LEVEL SECURITY;
