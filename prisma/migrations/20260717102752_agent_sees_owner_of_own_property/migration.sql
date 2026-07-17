-- Let Agents see the owner of a property they manage.
--
-- Corrects the model rather than the code: the earlier rule blocked
-- Agents from every OWNER contact absolutely, but an Agent running a
-- booking on a property needs to know whose property it is. The
-- confirmed rule is that an Agent sees the confidential side — exact
-- address, notes, commission, and the owner — of the properties
-- assigned to them, and of no others.
--
-- The application enforces this itself (Prisma connects as the table
-- owner and bypasses RLS entirely), so this policy is the backstop for
-- anything reaching the data over PostgREST with a user's JWT. It is
-- kept in step with the app's rule deliberately: if RLS stayed stricter
-- than the app, any future move to the Supabase client would silently
-- start returning nothing here.
--
-- Scoped through properties.agentId, so an Agent gains nothing for an
-- owner whose properties they don't manage, and unassigned properties
-- expose no owner to anyone.
DROP POLICY IF EXISTS "contacts_select_agent_owner_of_own_property" ON public.contacts;

CREATE POLICY "contacts_select_agent_owner_of_own_property" ON public.contacts
  FOR SELECT USING (
    internal.current_user_role() = 'AGENT'
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p."ownerId" = contacts.id
        AND p."agentId" = auth.uid()
    )
  );
