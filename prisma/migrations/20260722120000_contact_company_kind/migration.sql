-- Individual vs company on a contact, plus a 1:1 side table for company
-- details (registration + legal representative). BSTAY's own data: the
-- APIMO sync never writes these columns, so they survive every re-sync.

-- CreateEnum
CREATE TYPE "ContactKind" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- AlterTable: every existing contact is an individual until marked otherwise.
ALTER TABLE "contacts" ADD COLUMN "kind" "ContactKind" NOT NULL DEFAULT 'INDIVIDUAL';

-- CreateTable
CREATE TABLE "contact_companies" (
    "contactId" UUID NOT NULL,
    "siren" TEXT,
    "siret" TEXT,
    "legalForm" TEXT,
    "repFirstName" TEXT,
    "repLastName" TEXT,
    "repRole" TEXT,
    "repEmail" TEXT,
    "repPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_companies_pkey" PRIMARY KEY ("contactId")
);

-- AddForeignKey: company details vanish with their contact.
ALTER TABLE "contact_companies"
  ADD CONSTRAINT "contact_companies_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "contacts"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS backstop, mirroring `contacts`: full CRUD for MANAGE_CONTACTS, and
-- otherwise readable exactly when the parent contact is readable (same
-- agent / owner-of-own-property / provider-or-partner rules). Prisma
-- connects as table owner and bypasses this; it is the defence in depth.
ALTER TABLE "contact_companies" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_companies_all_manage_contacts" ON "contact_companies"
  FOR ALL
  USING (internal.has_permission('MANAGE_CONTACTS'::"Permission"))
  WITH CHECK (internal.has_permission('MANAGE_CONTACTS'::"Permission"));

CREATE POLICY "contact_companies_select_via_contact" ON "contact_companies"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = "contact_companies"."contactId"
      AND (
        (internal.current_user_role() = 'AGENT'::"Role" AND 'CLIENT'::"ContactType" = ANY (c.types))
        OR (
          internal.current_user_role() = 'AGENT'::"Role"
          AND EXISTS (
            SELECT 1 FROM public.properties p
            WHERE p."ownerId" = c.id AND p."agentId" = auth.uid()
          )
        )
        OR (
          internal.current_user_role() IS NOT NULL
          AND ('PROVIDER'::"ContactType" = ANY (c.types) OR 'PARTNER'::"ContactType" = ANY (c.types))
        )
      )
    )
  );
