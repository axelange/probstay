"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { assignAgentSchema } from "@/features/properties/schemas/assign-agent-schema";

export type AssignAgentResult =
  | { status: "success"; agent: { id: string; fullName: string } | null }
  | { status: "error"; message: string };

/**
 * Real agent assignment lives only here, never in the APIMO sync: the
 * agency shares one APIMO login, so APIMO's `user` field always names the
 * account holder, not the property's actual agent. This is the one place
 * `properties.agentId` is ever written.
 */
export async function assignAgent(input: unknown): Promise<AssignAgentResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { status: "error", message: "Session expirée." };
  }

  if (!hasPermission(user, "MANAGE_PROPERTIES")) {
    return {
      status: "error",
      message: "Vous n'avez pas la permission de modifier ce bien.",
    };
  }

  const parsed = assignAgentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }

  const { propertyId, agentId } = parsed.data;

  if (agentId !== null) {
    // Re-checked against the DB rather than trusted from the dropdown: a
    // stale list or a role change since page load could otherwise assign
    // to someone no longer eligible.
    const agent = await prisma.user.findFirst({
      where: { id: agentId, role: "AGENT", archivedAt: null },
      select: { id: true },
    });
    if (!agent) {
      return {
        status: "error",
        message: "Cet utilisateur n'est pas un agent actif.",
      };
    }
  }

  try {
    const property = await prisma.property.update({
      where: { id: propertyId },
      data: { agentId },
      select: { agent: { select: { id: true, fullName: true } } },
    });

    revalidatePath(`/properties/${propertyId}`);
    revalidatePath("/properties");

    return { status: "success", agent: property.agent };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { status: "error", message: "Ce bien n'existe plus." };
    }

    console.error("assignAgent failed", error);
    return { status: "error", message: "Enregistrement impossible." };
  }
}
