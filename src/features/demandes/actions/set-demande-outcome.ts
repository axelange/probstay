"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export type SetDemandeOutcomeResult =
  | { status: "success" }
  | { status: "error"; message: string };

/**
 * Marks a demande lost, or reopens a lost one. A converted demande is
 * settled and can't be touched here — its outcome is the rental.
 */
export async function setDemandeLost(
  demandeId: string,
  lost: boolean
): Promise<SetDemandeOutcomeResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée." };

  if (!hasPermission(user, "MANAGE_RENTALS")) {
    return { status: "error", message: "Vous n'avez pas la permission." };
  }

  const demande = await prisma.demande.findFirst({
    where: { id: demandeId, archivedAt: null },
    select: { id: true, convertedAt: true },
  });
  if (!demande) {
    return { status: "error", message: "Cette demande n'existe plus." };
  }
  if (demande.convertedAt) {
    return {
      status: "error",
      message: "Cette demande est convertie — voir la location.",
    };
  }

  await prisma.demande.update({
    where: { id: demande.id },
    data: { lostAt: lost ? new Date() : null },
  });

  revalidatePath("/demandes");
  revalidatePath(`/demandes/${demandeId}`);
  return { status: "success" };
}
