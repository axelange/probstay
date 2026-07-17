-- Extensions, the `internal` helper schema, and every RLS policy.
--
-- These objects were originally applied straight to the database and so
-- lived only in Supabase's own migration history, invisible to Prisma.
-- That meant `prisma migrate deploy` against a fresh database produced
-- every table with no RLS at all. Folding them in here makes Prisma the
-- single source of truth: one `migrate deploy` yields schema + policies
-- together, in that order.
--
-- Written to be idempotent (create-or-replace, drop-if-exists) and to
-- describe the final state rather than replay how it was reached, so it
-- is a no-op against a database that already has it.

-- Extensions --------------------------------------------------------
-- pg_net: outbound HTTP from Postgres. pg_cron: scheduling. Together
-- they let the database invoke the apimo-sync Edge Function on a
-- schedule, with no application server involved.
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Helper schema -----------------------------------------------------
-- Deliberately not `public`: anything in public is exposed over
-- PostgREST as a callable RPC endpoint. These are internal predicates
-- for policies, not API surface. Policies evaluate as plain SQL and are
-- unaffected by the schema not being exposed.
CREATE SCHEMA IF NOT EXISTS internal;

-- All SECURITY DEFINER: policies on `users`/`user_permissions` must be
-- able to read those tables to decide access, which would otherwise
-- recurse through the very policies being evaluated.
-- All SET search_path: pins name resolution, so the function can't be
-- redirected by a caller's search_path.

CREATE OR REPLACE FUNCTION internal.current_user_role()
  RETURNS "Role"
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  select role from users where id = auth.uid();
$function$;

-- Resolution order: an explicit per-user override always wins over the
-- role's baseline. This is what lets an Admin widen or narrow a
-- Moderator's access with no code change and no migration.
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
  if user_role in ('ADMIN', 'MODERATOR') then
    return perm != 'MANAGE_REGISTERS';
  end if;

  return false;
end;
$function$;

CREATE OR REPLACE FUNCTION internal.is_property_agent(property_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from properties
    where id = property_id and "agentId" = auth.uid()
  );
$function$;

CREATE OR REPLACE FUNCTION internal.is_rental_property_agent(rental_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from rentals r
    join properties p on p.id = r."propertyId"
    where r.id = rental_id and p."agentId" = auth.uid()
  );
$function$;

-- Enable RLS --------------------------------------------------------
-- Note this does not affect the application itself: Prisma connects as
-- the table owner, which bypasses RLS. It is the backstop for anything
-- reaching the data over Supabase's REST API with a user's JWT.
ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_pictures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_tenants ENABLE ROW LEVEL SECURITY;

-- _prisma_migrations intentionally gets no policies: RLS on with zero
-- policies denies everything, which is what we want for the migration
-- ledger. Prisma still reaches it as table owner.

-- users -------------------------------------------------------------
DROP POLICY IF EXISTS "users_select_self" ON public.users;
CREATE POLICY "users_select_self" ON public.users
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "users_all_manage_users" ON public.users;
CREATE POLICY "users_all_manage_users" ON public.users
  FOR ALL
  USING (internal.has_permission('MANAGE_USERS'))
  WITH CHECK (internal.has_permission('MANAGE_USERS'));

-- user_permissions --------------------------------------------------
DROP POLICY IF EXISTS "user_permissions_select_self" ON public.user_permissions;
CREATE POLICY "user_permissions_select_self" ON public.user_permissions
  FOR SELECT USING ("userId" = auth.uid());

DROP POLICY IF EXISTS "user_permissions_all_manage_users" ON public.user_permissions;
CREATE POLICY "user_permissions_all_manage_users" ON public.user_permissions
  FOR ALL
  USING (internal.has_permission('MANAGE_USERS'))
  WITH CHECK (internal.has_permission('MANAGE_USERS'));

-- contacts ----------------------------------------------------------
-- Agents get no access to Owner/Partner/Provider contacts at all —
-- owner records carry banking details, and RLS is row- not
-- column-level, so partial visibility isn't expressible here.
DROP POLICY IF EXISTS "contacts_all_manage_contacts" ON public.contacts;
CREATE POLICY "contacts_all_manage_contacts" ON public.contacts
  FOR ALL
  USING (internal.has_permission('MANAGE_CONTACTS'))
  WITH CHECK (internal.has_permission('MANAGE_CONTACTS'));

-- ...but they do need the tenants they book for. A contact can hold
-- several types at once, so this matches on CLIENT membership.
DROP POLICY IF EXISTS "contacts_select_agent_client" ON public.contacts;
CREATE POLICY "contacts_select_agent_client" ON public.contacts
  FOR SELECT USING (
    internal.current_user_role() = 'AGENT'
    AND 'CLIENT' = ANY(types)
  );

-- properties --------------------------------------------------------
DROP POLICY IF EXISTS "properties_all_manage_properties" ON public.properties;
CREATE POLICY "properties_all_manage_properties" ON public.properties
  FOR ALL
  USING (internal.has_permission('MANAGE_PROPERTIES'))
  WITH CHECK (internal.has_permission('MANAGE_PROPERTIES'));

-- Agents read every property. Hiding confidential *fields* on
-- properties they don't manage is a column-level concern and is
-- enforced in application code, not here.
DROP POLICY IF EXISTS "properties_select_agent_all" ON public.properties;
CREATE POLICY "properties_select_agent_all" ON public.properties
  FOR SELECT USING (internal.current_user_role() = 'AGENT');

-- property_pictures -------------------------------------------------
DROP POLICY IF EXISTS "property_pictures_select_via_property" ON public.property_pictures;
CREATE POLICY "property_pictures_select_via_property" ON public.property_pictures
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_pictures."propertyId"
    )
  );

DROP POLICY IF EXISTS "property_pictures_write_manage_properties" ON public.property_pictures;
CREATE POLICY "property_pictures_write_manage_properties" ON public.property_pictures
  FOR INSERT WITH CHECK (internal.has_permission('MANAGE_PROPERTIES'));

DROP POLICY IF EXISTS "property_pictures_update_manage_properties" ON public.property_pictures;
CREATE POLICY "property_pictures_update_manage_properties" ON public.property_pictures
  FOR UPDATE
  USING (internal.has_permission('MANAGE_PROPERTIES'))
  WITH CHECK (internal.has_permission('MANAGE_PROPERTIES'));

DROP POLICY IF EXISTS "property_pictures_delete_manage_properties" ON public.property_pictures;
CREATE POLICY "property_pictures_delete_manage_properties" ON public.property_pictures
  FOR DELETE USING (internal.has_permission('MANAGE_PROPERTIES'));

-- rentals -----------------------------------------------------------
DROP POLICY IF EXISTS "rentals_all_manage_rentals" ON public.rentals;
CREATE POLICY "rentals_all_manage_rentals" ON public.rentals
  FOR ALL
  USING (internal.has_permission('MANAGE_RENTALS'))
  WITH CHECK (internal.has_permission('MANAGE_RENTALS'));

-- Agents are read-all, write-own. Read and write are separate policies
-- on purpose: Postgres ORs permissive policies together, so a single
-- FOR ALL scoped to own-properties would also have hidden other
-- agents' bookings entirely.
DROP POLICY IF EXISTS "rentals_select_agent_all" ON public.rentals;
CREATE POLICY "rentals_select_agent_all" ON public.rentals
  FOR SELECT USING (internal.current_user_role() = 'AGENT');

DROP POLICY IF EXISTS "rentals_insert_agent_own_property" ON public.rentals;
CREATE POLICY "rentals_insert_agent_own_property" ON public.rentals
  FOR INSERT WITH CHECK (
    internal.current_user_role() = 'AGENT'
    AND internal.is_property_agent("propertyId")
  );

-- USING guards the existing row (can't touch another agent's booking);
-- WITH CHECK guards the new row (can't move your own booking onto
-- someone else's property). Both halves are load-bearing.
DROP POLICY IF EXISTS "rentals_update_agent_own_property" ON public.rentals;
CREATE POLICY "rentals_update_agent_own_property" ON public.rentals
  FOR UPDATE
  USING (
    internal.current_user_role() = 'AGENT'
    AND internal.is_property_agent("propertyId")
  )
  WITH CHECK (
    internal.current_user_role() = 'AGENT'
    AND internal.is_property_agent("propertyId")
  );

-- No DELETE policy for Agents anywhere: business objects are archived,
-- never removed.

-- rental_tenants ----------------------------------------------------
DROP POLICY IF EXISTS "rental_tenants_all_manage_rentals" ON public.rental_tenants;
CREATE POLICY "rental_tenants_all_manage_rentals" ON public.rental_tenants
  FOR ALL
  USING (internal.has_permission('MANAGE_RENTALS'))
  WITH CHECK (internal.has_permission('MANAGE_RENTALS'));

DROP POLICY IF EXISTS "rental_tenants_select_agent_all" ON public.rental_tenants;
CREATE POLICY "rental_tenants_select_agent_all" ON public.rental_tenants
  FOR SELECT USING (internal.current_user_role() = 'AGENT');

DROP POLICY IF EXISTS "rental_tenants_insert_agent_own" ON public.rental_tenants;
CREATE POLICY "rental_tenants_insert_agent_own" ON public.rental_tenants
  FOR INSERT WITH CHECK (
    internal.current_user_role() = 'AGENT'
    AND internal.is_rental_property_agent("rentalId")
  );

DROP POLICY IF EXISTS "rental_tenants_update_agent_own" ON public.rental_tenants;
CREATE POLICY "rental_tenants_update_agent_own" ON public.rental_tenants
  FOR UPDATE
  USING (
    internal.current_user_role() = 'AGENT'
    AND internal.is_rental_property_agent("rentalId")
  )
  WITH CHECK (
    internal.current_user_role() = 'AGENT'
    AND internal.is_rental_property_agent("rentalId")
  );
