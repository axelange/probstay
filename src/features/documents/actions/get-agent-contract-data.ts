"use server";

import {
  agentContractSchema,
  type AgentContractInput,
} from "@/features/documents/schemas/agent-contract-schema";
import { buildAgentContractData } from "@/features/documents/services/build-agent-contract-data";
import type { AgentContractData } from "@/features/documents/templates/contrat-agent-commercial";
import { getCurrentUser } from "@/lib/auth";

/** A commercial agent agreement assembled from the preview's choices, or null. */
export async function getAgentContractData(
  input: AgentContractInput,
): Promise<AgentContractData | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const parsed = agentContractSchema.safeParse(input);
  if (!parsed.success) return null;
  return buildAgentContractData(parsed.data, user);
}
