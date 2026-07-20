-- Partners and Providers are visible to everyone.
--
-- Owners and Clients stay restricted: they are the agency's commercial
-- relationships and carry personal data. A plumber, a cleaner or an
-- introducing agent is a working contact — an Agent running a booking
-- needs to call the plumber without asking an Admin for the number.
--
-- Requires a profile rather than merely a session: current_user_role()
-- is null for an authenticated user with no `users` row, and such an
-- account must see nothing at all.
--
-- Note this widens *row* visibility only. A contact can hold several
-- types at once, so an Owner also tagged PROVIDER becomes visible here
-- to everyone. That is intended for their name and trade, but their
-- IBAN is not — banking detail is narrowed separately in the
-- application (getContactDetail), which is the only place it is read.
DROP POLICY IF EXISTS "contacts_select_partner_provider" ON public.contacts;

CREATE POLICY "contacts_select_partner_provider" ON public.contacts
  FOR SELECT USING (
    internal.current_user_role() IS NOT NULL
    AND (
      'PROVIDER' = ANY(types)
      OR 'PARTNER' = ANY(types)
    )
  );
