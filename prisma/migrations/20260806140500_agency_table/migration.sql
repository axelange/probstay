-- The agency's own record.
--
-- Everything the documents print about BSTAY itself lived as constants in
-- src/features/documents/agency.ts, so correcting the footer needed a deploy —
-- and it had already drifted: the documents printed "18 Avenue Général
-- Leclerc, 83990 Saint-Tropez / RCS Fréjus" while all three Figma masters say
-- "9 Rond-point Duboys d'Angers, 06400 Cannes / RCS Cannes".
--
-- Seeded with the values from code, not from the masters. A migration should
-- move the data it finds, not decide which of two contradicting addresses is
-- the real one — that is now a two-minute edit in Paramètres, which is the
-- point of the table.
--
-- One row, enforced: `id` is fixed at 1 by a CHECK. There is one agency, and a
-- second row would mean documents disagreeing about who issued them.
CREATE TABLE IF NOT EXISTS "agency" (
  "id" integer PRIMARY KEY DEFAULT 1 CHECK ("id" = 1),

  "name"      text NOT NULL,
  "tagline"   text NOT NULL,
  "legalName" text NOT NULL,
  "legalForm" text NOT NULL,
  "capital"   text NOT NULL,
  "address"   text NOT NULL,
  "rcs"       text NOT NULL,
  "cartePro"  text NOT NULL,
  "garantieFinanciere" text NOT NULL,
  "rcp"       text NOT NULL,
  "web"       text NOT NULL,
  "phone"     text NOT NULL,

  "representedBy" text NOT NULL,
  "capacity"      text NOT NULL,

  "bankName"        text NOT NULL,
  "bankAccountName" text NOT NULL,
  "bankIban"        text NOT NULL,
  "bankBic"         text NOT NULL,

  "updatedAt"   timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedById" uuid REFERENCES "users"("id") ON DELETE SET NULL
);

INSERT INTO "agency" (
  "id", "name", "tagline", "legalName", "legalForm", "capital", "address",
  "rcs", "cartePro", "garantieFinanciere", "rcp", "web", "phone",
  "representedBy", "capacity",
  "bankName", "bankAccountName", "bankIban", "bankBic"
) VALUES (
  1,
  'B·STAY',
  'Locations d''exception',
  'SAS BSTAY',
  'SAS',
  '',
  '18 Avenue Général Leclerc, 83990 Saint-Tropez',
  'RCS Fréjus 920 635 356',
  'Carte professionnelle n° 83042026000000007',
  'Garantie financière CEGC n°31961GES261',
  'RCP Generali n° AL591311/31961',
  'www.b-stay.com',
  '+33 6 85 87 78 68',
  'Valentine Claitte',
  'Présidente',
  'CIC',
  'BSTAY',
  'FR76 1009 6180 8000 0464 4770 580',
  'CMCIFRPP'
)
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "agency" ENABLE ROW LEVEL SECURITY;

-- Readable by anyone with a profile: every document prints it, and an agent
-- previewing a contract has to be able to.
CREATE POLICY "agency_select_any_profile" ON "agency"
  FOR SELECT
  USING (internal.current_user_role() IS NOT NULL);

-- Written only with MANAGE_AGENCY. No INSERT or DELETE policy at all — the row
-- exists and stays; there is nothing to create and nothing to remove.
CREATE POLICY "agency_update_manage_agency" ON "agency"
  FOR UPDATE
  USING (internal.has_permission('MANAGE_AGENCY'))
  WITH CHECK (internal.has_permission('MANAGE_AGENCY'));

-- Keep the SQL mirror of hasPermission() in step: a Moderator is refused
-- MANAGE_AGENCY by default, exactly as for users and templates, and an Admin
-- may still grant it per-Moderator through user_permissions.
CREATE OR REPLACE FUNCTION internal.has_permission(perm "Permission")
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
declare
  user_role "Role";
  override boolean;
begin
  select role into user_role from users where id = auth.uid();

  if user_role is null then
    return false;
  end if;

  select granted into override
  from user_permissions
  where "userId" = auth.uid() and permission = perm;

  if override is not null then
    return override;
  end if;

  if user_role = 'SUPER_ADMIN' then
    return true;
  end if;

  -- Registers are immutable by law, so even an Admin is refused here.
  if user_role = 'ADMIN' then
    return perm != 'MANAGE_REGISTERS';
  end if;

  -- A Moderator mirrors an Admin except that managing people, editing the
  -- document templates and changing the agency's own record are not theirs by
  -- default. An Admin may still grant any of them per-Moderator, which lands
  -- in user_permissions and is caught by the override above.
  if user_role = 'MODERATOR' then
    return perm not in (
      'MANAGE_REGISTERS', 'MANAGE_USERS', 'MANAGE_DOCUMENT_TEMPLATES', 'MANAGE_AGENCY'
    );
  end if;

  return false;
end;
$function$;
