-- Assignment is authoritative: a demande follows the person assigned to
-- it and no one else, even if a property later changes agent. The
-- property-based rule (every property is the agent's) is only the
-- fallback for a demande that is still unassigned.
--
-- Adds the "assignedAgentId IS NULL" guard to the property branch, so a
-- reassigned property can never leak an already-assigned demande to the
-- new agent.
CREATE OR REPLACE FUNCTION internal.agent_sees_demande(d_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  SELECT
    EXISTS (
      SELECT 1 FROM demandes d
      WHERE d.id = d_id AND d."assignedAgentId" = auth.uid()
    )
    OR (
      -- Only while unassigned, and every property is theirs.
      EXISTS (
        SELECT 1 FROM demandes d
        WHERE d.id = d_id AND d."assignedAgentId" IS NULL
      )
      AND EXISTS (SELECT 1 FROM demande_properties dp WHERE dp."demandeId" = d_id)
      AND NOT EXISTS (
        SELECT 1
        FROM demande_properties dp
        JOIN properties p ON p.id = dp."propertyId"
        WHERE dp."demandeId" = d_id
          AND p."agentId" IS DISTINCT FROM auth.uid()
      )
    );
$function$;
