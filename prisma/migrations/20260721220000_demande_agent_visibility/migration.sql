-- Agent visibility for demandes, plus manual assignment.
--
-- An agent sees a demande when every one of its properties is theirs, or
-- when it has been assigned to them (the wide-demande-across-several-agents
-- case). MANAGE_RENTALS holders see all. This tightens the earlier
-- read-all-for-any-profile policy, which was too broad.

ALTER TABLE "demandes" ADD COLUMN "assignedAgentId" UUID;
CREATE INDEX "demandes_assignedAgentId_idx" ON "demandes"("assignedAgentId");
ALTER TABLE "demandes" ADD CONSTRAINT "demandes_assignedAgentId_fkey"
  FOREIGN KEY ("assignedAgentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- SECURITY DEFINER like the other internal helpers: the policies calling
-- it read demandes/demande_properties/properties, which would otherwise
-- recurse through the very policies being evaluated.
CREATE OR REPLACE FUNCTION internal.agent_sees_demande(d_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  SELECT
    -- Assigned to this agent.
    EXISTS (
      SELECT 1 FROM demandes d
      WHERE d.id = d_id AND d."assignedAgentId" = auth.uid()
    )
    OR
    -- Every property is theirs (and there is at least one): no property
    -- exists on the demande that this agent does not manage.
    (
      EXISTS (SELECT 1 FROM demande_properties dp WHERE dp."demandeId" = d_id)
      AND NOT EXISTS (
        SELECT 1
        FROM demande_properties dp
        JOIN properties p ON p.id = dp."propertyId"
        WHERE dp."demandeId" = d_id
          AND p."agentId" IS DISTINCT FROM auth.uid()
      )
    );
$function$;

DROP POLICY IF EXISTS "demandes_read_all" ON "demandes";
CREATE POLICY "demandes_select" ON "demandes"
  FOR SELECT USING (
    internal.has_permission('MANAGE_RENTALS')
    OR (
      internal.current_user_role() = 'AGENT'
      AND internal.agent_sees_demande(id)
    )
  );

DROP POLICY IF EXISTS "demande_properties_read_all" ON "demande_properties";
CREATE POLICY "demande_properties_select" ON "demande_properties"
  FOR SELECT USING (
    internal.has_permission('MANAGE_RENTALS')
    OR (
      internal.current_user_role() = 'AGENT'
      AND internal.agent_sees_demande("demandeId")
    )
  );
