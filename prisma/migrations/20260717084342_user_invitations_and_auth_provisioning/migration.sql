-- CreateTable
CREATE TABLE "user_invitations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isExternal" BOOLEAN NOT NULL DEFAULT false,
    "invitedBy" UUID,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_invitations_email_key" ON "user_invitations"("email");

-- AddForeignKey
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Email is the join key between an invitation and a Google identity, so
-- it must compare reliably. Store it lowercased; the hook and trigger
-- lowercase the incoming address before matching.
ALTER TABLE "user_invitations"
  ADD CONSTRAINT "user_invitations_email_lowercase"
  CHECK ("email" = lower("email"));

-- Staff must be on the company Workspace. isExternal exempts an address
-- from that rule (the developer, who has no b-stay.com account); RLS
-- restricts creating those to SUPER_ADMIN.
-- Changing the company domain is deliberately a migration, not config —
-- BSTAY is a single-domain Workspace.
ALTER TABLE "user_invitations"
  ADD CONSTRAINT "user_invitations_staff_must_be_company_domain"
  CHECK ("isExternal" OR "email" LIKE '%@b-stay.com');

-- Auth gate ---------------------------------------------------------
-- Wired to Supabase Auth's before-user-created hook. Runs *before* the
-- auth.users insert: return {} to allow, or an error object to reject
-- the sign-in outright. This is the real domain/allowlist enforcement —
-- Google's `hd` parameter only filters the account chooser UI and is
-- not a security control.
--
-- SECURITY DEFINER because the hook is invoked as supabase_auth_admin,
-- which is not the owner of user_invitations and would otherwise be
-- blocked by that table's RLS.
CREATE OR REPLACE FUNCTION public.hook_restrict_signup_to_invited(event jsonb)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
declare
  v_email text;
  v_invited boolean;
begin
  v_email := lower(event->'user'->>'email');

  select exists (
    select 1 from user_invitations ui where ui.email = v_email
  ) into v_invited;

  if v_invited then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error', jsonb_build_object(
      'message', 'This account has not been invited to BSTAY PRO. Contact an administrator.',
      'http_code', 403
    )
  );
end;
$function$;

-- Only Auth may call it; it must never be reachable as a PostgREST RPC.
GRANT EXECUTE ON FUNCTION public.hook_restrict_signup_to_invited TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.hook_restrict_signup_to_invited FROM authenticated, anon, public;

-- Provisioning ------------------------------------------------------
-- Authentication does not grant authorization: Google creates the
-- auth.users row, but every RLS policy resolves through public.users,
-- and has_permission() returns false when that row is missing. So the
-- profile is created here, on first sign-in, carrying the role named on
-- the invitation.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
declare
  v_email text;
  v_invitation user_invitations%rowtype;
  v_full_name text;
begin
  v_email := lower(new.email);

  select * into v_invitation
  from user_invitations ui
  where ui.email = v_email;

  -- The hook should already have rejected this sign-in. If we get here
  -- the two have disagreed, so fail loudly rather than create an
  -- account with no role.
  if v_invitation.id is null then
    raise exception 'no invitation found for % — refusing to provision', v_email;
  end if;

  v_full_name := coalesce(
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'name', ''),
    split_part(v_email, '@', 1)
  );

  insert into users (id, email, "fullName", role, "updatedAt")
  values (new.id, v_email, v_full_name, v_invitation.role, now());

  update user_invitations
  set "acceptedAt" = now(), "updatedAt" = now()
  where id = v_invitation.id;

  return new;
end;
$function$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- RLS ---------------------------------------------------------------
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Managing staff invitations requires MANAGE_USERS, but never lets the
-- holder mint an external one.
DROP POLICY IF EXISTS "user_invitations_select_manage_users" ON public.user_invitations;
CREATE POLICY "user_invitations_select_manage_users" ON public.user_invitations
  FOR SELECT USING (internal.has_permission('MANAGE_USERS'));

DROP POLICY IF EXISTS "user_invitations_insert_staff" ON public.user_invitations;
CREATE POLICY "user_invitations_insert_staff" ON public.user_invitations
  FOR INSERT WITH CHECK (
    internal.has_permission('MANAGE_USERS')
    AND "isExternal" = false
  );

DROP POLICY IF EXISTS "user_invitations_update_staff" ON public.user_invitations;
CREATE POLICY "user_invitations_update_staff" ON public.user_invitations
  FOR UPDATE
  USING (internal.has_permission('MANAGE_USERS') AND "isExternal" = false)
  WITH CHECK (internal.has_permission('MANAGE_USERS') AND "isExternal" = false);

DROP POLICY IF EXISTS "user_invitations_delete_staff" ON public.user_invitations;
CREATE POLICY "user_invitations_delete_staff" ON public.user_invitations
  FOR DELETE USING (
    internal.has_permission('MANAGE_USERS')
    AND "isExternal" = false
  );

-- Granting access to someone outside the company is SUPER_ADMIN only.
DROP POLICY IF EXISTS "user_invitations_all_super_admin" ON public.user_invitations;
CREATE POLICY "user_invitations_all_super_admin" ON public.user_invitations
  FOR ALL
  USING (internal.current_user_role() = 'SUPER_ADMIN')
  WITH CHECK (internal.current_user_role() = 'SUPER_ADMIN');
