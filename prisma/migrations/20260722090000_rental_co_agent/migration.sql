-- Co-agents on a rental.
--
-- A rental converted from a demande carries a tenant-side agent (the one
-- who handled the demande) as well as the property's agent (the owner
-- side). When they differ, the two are co-agents — one represents the
-- tenant, the other the owner — and both may manage the rental.

ALTER TABLE "rentals" ADD COLUMN "tenantAgentId" UUID;
CREATE INDEX "rentals_tenantAgentId_idx" ON "rentals"("tenantAgentId");
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_tenantAgentId_fkey"
  FOREIGN KEY ("tenantAgentId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Whether the current agent is an agent of the rental — the property's
-- agent (owner side, current) or the tenant-side co-agent. SECURITY
-- DEFINER like the others: reads rentals/properties, which would recurse
-- through the policies being evaluated.
CREATE OR REPLACE FUNCTION internal.is_rental_agent(rental_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM rentals r
    LEFT JOIN properties p ON p.id = r."propertyId"
    WHERE r.id = rental_id
      AND (p."agentId" = auth.uid() OR r."tenantAgentId" = auth.uid())
  );
$function$;

-- Rental writes now follow either co-agent, not just the property's.
DROP POLICY IF EXISTS "rentals_update_agent_own_property" ON public.rentals;
CREATE POLICY "rentals_update_agent" ON public.rentals
  FOR UPDATE
  USING (
    internal.current_user_role() = 'AGENT'
    AND (internal.is_property_agent("propertyId") OR "tenantAgentId" = auth.uid())
  )
  WITH CHECK (
    internal.current_user_role() = 'AGENT'
    AND (internal.is_property_agent("propertyId") OR "tenantAgentId" = auth.uid())
  );

-- Identity documents and services follow the same co-agents: a co-agent
-- managing the rental manages its documents and services too.
DROP POLICY IF EXISTS "identity_documents_agent_own_property" ON public.identity_documents;
CREATE POLICY "identity_documents_agent" ON public.identity_documents
  FOR ALL
  USING (internal.is_rental_agent("rentalId"))
  WITH CHECK (internal.is_rental_agent("rentalId"));

DROP POLICY IF EXISTS "rental_services_agent_own_property" ON public.rental_services;
CREATE POLICY "rental_services_agent" ON public.rental_services
  FOR ALL
  USING (internal.is_rental_agent("rentalId"))
  WITH CHECK (internal.is_rental_agent("rentalId"));
