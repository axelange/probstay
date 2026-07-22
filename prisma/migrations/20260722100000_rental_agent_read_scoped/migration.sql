-- Agents see only their rentals now — those they are an agent or co-agent
-- of — not every rental. Replaces the earlier read-all-for-agents policy,
-- matching the demandes scoping. MANAGE_RENTALS still sees all.

DROP POLICY IF EXISTS "rentals_select_agent_all" ON public.rentals;
CREATE POLICY "rentals_select_agent" ON public.rentals
  FOR SELECT USING (
    internal.current_user_role() = 'AGENT'
    AND internal.is_rental_agent(id)
  );

-- A rental's tenants follow the rental: an agent who cannot see the
-- rental cannot see its tenant links either.
DROP POLICY IF EXISTS "rental_tenants_select_agent_all" ON public.rental_tenants;
CREATE POLICY "rental_tenants_select_agent" ON public.rental_tenants
  FOR SELECT USING (
    internal.current_user_role() = 'AGENT'
    AND internal.is_rental_agent("rentalId")
  );
