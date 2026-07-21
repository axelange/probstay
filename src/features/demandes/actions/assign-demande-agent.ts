"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  demandeId: z.uuid(),
  agentId: z.uuid().nullable(),
});

export type AssignDemandeAgentResult =
  | { status: "success"; agent: { id: string; fullName: string } | null }
  | { status: "error"; message: string };

/**
 * Assigns a demande to an agent — or clears it. This is how a wide
 * demande spanning several agents' properties reaches one: an admin
 * hands it to a chosen agent, who can then see it. MANAGE_RENTALS only,
 * matching the demandes write policy.
 */
export async function assignDemandeAgent(
  input: unknown
): Promise<AssignDemandeAgentResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée." };

  if (!hasPermission(user, "MANAGE_RENTALS")) {
    return { status: "error", message: "Vous n'avez pas la permission." };
  }

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Données invalides." };
  }
  const { demandeId, agentId } = parsed.data;

  if (agentId !== null) {
    // Re-checked against the DB: the chosen user must still be an active
    // agent, not someone since archived or given another role.
    const agent = await prisma.user.findFirst({
      where: { id: agentId, role: "AGENT", archivedAt: null },
      select: { id: true },
    });
    if (!agent) {
      return { status: "error", message: "Cet utilisateur n'est pas un agent actif." };
    }
  }

  try {
    const demande = await prisma.demande.update({
      where: { id: demandeId },
      data: { assignedAgentId: agentId },
      select: { assignedAgent: { select: { id: true, fullName: true } } },
    });

    revalidatePath("/demandes");
    revalidatePath(`/demandes/${demandeId}`);
    return { status: "success", agent: demande.assignedAgent };
  } catch (error) {
    console.error("assignDemandeAgent failed", error);
    return { status: "error", message: "Enregistrement impossible." };
  }
}
