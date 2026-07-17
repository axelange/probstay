-- Move the provisioning trigger function out of `public`.
--
-- Anything in `public` is exposed by PostgREST as a callable RPC
-- endpoint, so `public.handle_new_auth_user()` was reachable at
-- /rest/v1/rpc/handle_new_auth_user by anon. Calling it directly fails
-- (Postgres refuses to invoke a trigger function outside a trigger), so
-- it was not exploitable — but it has no business being API surface.
--
-- `internal` is not exposed, which is why the RLS helpers already live
-- there. Triggers are unaffected by the schema not being exposed.
--
-- The hook function stays in `public`: Supabase Auth calls it by name
-- from that schema, and its EXECUTE grant is already restricted to
-- supabase_auth_admin only.

CREATE OR REPLACE FUNCTION internal.handle_new_auth_user()
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION internal.handle_new_auth_user();

DROP FUNCTION IF EXISTS public.handle_new_auth_user();
