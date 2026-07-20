-- Hierarchical user management.
--
-- Closes a privilege escalation: MANAGE_USERS was previously an
-- unqualified key to user_permissions, and since an explicit override
-- outranks the role baseline in has_permission(), any Admin could insert
-- a row granting *themselves* MANAGE_REGISTERS and walk through the one
-- restriction that exists for legal rather than organisational reasons.
-- Verified reproducible against the live database before this migration.
--
-- Three rules now govern every write to users / user_permissions:
--
--   1. Hierarchy — you may only act on someone strictly beneath your own
--      role. Equal ranks are refused, so peers cannot edit each other.
--   2. Never yourself — nobody edits their own access, whatever they
--      hold. This is what actually kills the escalation above.
--   3. Never more than you hold — an actor cannot confer a permission
--      they lack, so an Admin cannot hand MANAGE_REGISTERS to a
--      Moderator and then act through them.
--
-- MANAGE_USERS also drops out of the MODERATOR baseline: it is now an
-- ADMIN-and-above capability. A Moderator can still be dialled back up
-- individually by an Admin, which is the documented Moderator design.

-- Baseline ----------------------------------------------------------
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

  -- A Moderator mirrors an Admin except that managing people is not
  -- theirs by default. An Admin may still grant it per-Moderator, which
  -- lands in user_permissions and is caught by the override above.
  if user_role = 'MODERATOR' then
    return perm not in ('MANAGE_REGISTERS', 'MANAGE_USERS');
  end if;

  return false;
end;
$function$;

-- Hierarchy ---------------------------------------------------------
-- SECURITY DEFINER like the rest: the policies that call this must read
-- `users` to decide access, which would otherwise recurse through the
-- very policies being evaluated.
CREATE OR REPLACE FUNCTION internal.can_manage_user(target_id uuid)
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
declare
  actor_role  "Role";
  target_role "Role";
begin
  -- Nobody edits their own access. Checked first and unconditionally:
  -- this is the rule the escalation turned on, so it must not depend on
  -- anything else resolving correctly.
  if target_id is null or target_id = auth.uid() then
    return false;
  end if;

  select role into actor_role  from users where id = auth.uid();
  select role into target_role from users where id = target_id;

  if actor_role is null or target_role is null then
    return false;
  end if;

  -- The Role enum is declared in descending authority (SUPER_ADMIN,
  -- ADMIN, MODERATOR, AGENT) and Postgres orders enums by declaration,
  -- so a *greater* value is a *lower* rank. Strictly greater therefore
  -- means strictly beneath the actor, and equal ranks fall through as
  -- false.
  return target_role > actor_role;
end;
$function$;

-- users -------------------------------------------------------------
DROP POLICY IF EXISTS "users_all_manage_users" ON public.users;

-- Reading the directory is not the same as changing it: someone who may
-- manage people needs to see everyone, including those above them, or a
-- user list renders with holes in it.
DROP POLICY IF EXISTS "users_select_manage_users" ON public.users;
CREATE POLICY "users_select_manage_users" ON public.users
  FOR SELECT USING (internal.has_permission('MANAGE_USERS'));

-- Role lives on this table, so the rank test is written against the row
-- directly rather than through can_manage_user(): USING sees the row as
-- it stands and WITH CHECK sees it as it would become. Both halves are
-- needed — without WITH CHECK an Admin could promote a subordinate to
-- SUPER_ADMIN and inherit the registers through them.
DROP POLICY IF EXISTS "users_insert_subordinates" ON public.users;
CREATE POLICY "users_insert_subordinates" ON public.users
  FOR INSERT
  WITH CHECK (
    internal.has_permission('MANAGE_USERS')
    AND id != auth.uid()
    AND role > internal.current_user_role()
  );

DROP POLICY IF EXISTS "users_update_subordinates" ON public.users;
CREATE POLICY "users_update_subordinates" ON public.users
  FOR UPDATE
  USING (
    internal.has_permission('MANAGE_USERS')
    AND id != auth.uid()
    AND role > internal.current_user_role()
  )
  WITH CHECK (
    internal.has_permission('MANAGE_USERS')
    AND id != auth.uid()
    AND role > internal.current_user_role()
  );

DROP POLICY IF EXISTS "users_delete_subordinates" ON public.users;
CREATE POLICY "users_delete_subordinates" ON public.users
  FOR DELETE
  USING (
    internal.has_permission('MANAGE_USERS')
    AND id != auth.uid()
    AND role > internal.current_user_role()
  );

-- user_permissions --------------------------------------------------
DROP POLICY IF EXISTS "user_permissions_all_manage_users" ON public.user_permissions;

-- Visibility is hierarchy-only, deliberately without the "must hold it
-- yourself" test that guards writes below. An Admin who could not see a
-- MANAGE_REGISTERS override would be shown an incomplete permission
-- sheet for someone they otherwise administer, which is worse than
-- showing a row they cannot touch.
DROP POLICY IF EXISTS "user_permissions_select_subordinates" ON public.user_permissions;
CREATE POLICY "user_permissions_select_subordinates" ON public.user_permissions
  FOR SELECT USING (
    internal.has_permission('MANAGE_USERS')
    AND internal.can_manage_user("userId")
  );

-- has_permission(permission) reads the row's own column: the actor must
-- personally hold whatever they are handing out. This is the rule that
-- stops MANAGE_REGISTERS being laundered through a subordinate.
--
-- It gates DELETE as well as INSERT/UPDATE, so tearing down a
-- MANAGE_REGISTERS override stays with SUPER_ADMIN too — the permission
-- is theirs alone in both directions.
DROP POLICY IF EXISTS "user_permissions_insert_subordinates" ON public.user_permissions;
CREATE POLICY "user_permissions_insert_subordinates" ON public.user_permissions
  FOR INSERT
  WITH CHECK (
    internal.has_permission('MANAGE_USERS')
    AND internal.can_manage_user("userId")
    AND internal.has_permission(permission)
  );

DROP POLICY IF EXISTS "user_permissions_update_subordinates" ON public.user_permissions;
CREATE POLICY "user_permissions_update_subordinates" ON public.user_permissions
  FOR UPDATE
  USING (
    internal.has_permission('MANAGE_USERS')
    AND internal.can_manage_user("userId")
    AND internal.has_permission(permission)
  )
  WITH CHECK (
    internal.has_permission('MANAGE_USERS')
    AND internal.can_manage_user("userId")
    AND internal.has_permission(permission)
  );

DROP POLICY IF EXISTS "user_permissions_delete_subordinates" ON public.user_permissions;
CREATE POLICY "user_permissions_delete_subordinates" ON public.user_permissions
  FOR DELETE
  USING (
    internal.has_permission('MANAGE_USERS')
    AND internal.can_manage_user("userId")
    AND internal.has_permission(permission)
  );

-- user_invitations --------------------------------------------------
-- An invitation names the role its holder will be provisioned with, so
-- it is a grant of authority before the fact and needs the same ceiling:
-- inviting someone as SUPER_ADMIN would otherwise be the escalation
-- again, one sign-in later. isExternal stays SUPER_ADMIN-only via the
-- existing user_invitations_all_super_admin policy.
DROP POLICY IF EXISTS "user_invitations_insert_staff" ON public.user_invitations;
CREATE POLICY "user_invitations_insert_staff" ON public.user_invitations
  FOR INSERT WITH CHECK (
    internal.has_permission('MANAGE_USERS')
    AND "isExternal" = false
    AND role > internal.current_user_role()
  );

DROP POLICY IF EXISTS "user_invitations_update_staff" ON public.user_invitations;
CREATE POLICY "user_invitations_update_staff" ON public.user_invitations
  FOR UPDATE
  USING (
    internal.has_permission('MANAGE_USERS')
    AND "isExternal" = false
    AND role > internal.current_user_role()
  )
  WITH CHECK (
    internal.has_permission('MANAGE_USERS')
    AND "isExternal" = false
    AND role > internal.current_user_role()
  );

DROP POLICY IF EXISTS "user_invitations_delete_staff" ON public.user_invitations;
CREATE POLICY "user_invitations_delete_staff" ON public.user_invitations
  FOR DELETE USING (
    internal.has_permission('MANAGE_USERS')
    AND "isExternal" = false
    AND role > internal.current_user_role()
  );
