-- Qui peut modifier un événement : son auteur, ou qui détient MANAGE_EVENTS.
--
-- Two ways in, deliberately. Whoever wrote the entry owns it — they know what
-- they meant by "passage Jean-Marc" and are the one who will correct it — and
-- above that, MANAGE_EVENTS lets the office tidy up after someone who has left
-- or is away.
--
-- Creation is open to anyone with a profile. Making it a privilege would leave
-- "its author may edit it" meaning nothing, since only managers would ever be
-- one.
DROP POLICY IF EXISTS "calendar_events_write" ON "calendar_events";

CREATE POLICY "calendar_events_insert" ON "calendar_events"
  FOR INSERT
  WITH CHECK (internal.current_user_role() IS NOT NULL);

CREATE POLICY "calendar_events_update_own_or_manager" ON "calendar_events"
  FOR UPDATE
  USING (
    "createdById" = auth.uid() OR internal.has_permission('MANAGE_EVENTS')
  )
  WITH CHECK (
    "createdById" = auth.uid() OR internal.has_permission('MANAGE_EVENTS')
  );

CREATE POLICY "calendar_events_delete_own_or_manager" ON "calendar_events"
  FOR DELETE
  USING (
    "createdById" = auth.uid() OR internal.has_permission('MANAGE_EVENTS')
  );

-- Keep the SQL mirror of hasPermission() in step: a Moderator is refused
-- MANAGE_EVENTS by default, like the other three, and an Admin may grant it
-- per-Moderator through user_permissions.
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
  -- document templates, changing the agency's own record and tidying other
  -- people's calendar entries are not theirs by default. An Admin may grant
  -- any of them per-Moderator, which lands in user_permissions and is caught
  -- by the override above.
  if user_role = 'MODERATOR' then
    return perm not in (
      'MANAGE_REGISTERS', 'MANAGE_USERS', 'MANAGE_DOCUMENT_TEMPLATES',
      'MANAGE_AGENCY', 'MANAGE_EVENTS'
    );
  end if;

  return false;
end;
$function$;
