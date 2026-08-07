"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { agencySchema } from "@/features/settings/schemas/agency-schema";

export type UpdateAgencyResult =
  | { status: "success" }
  | { status: "error"; message: string };

/**
 * Updates the single agency row.
 *
 * MANAGE_AGENCY, which SUPER_ADMIN and ADMIN hold by default and a Moderator
 * does not: this is where the IBAN printed on every contract lives, so it is
 * separate from managing colleagues. Re-checked here because Prisma runs as
 * the service role and never sees the RLS policy that enforces the same rule.
 */
export async function updateAgency(
  input: unknown
): Promise<UpdateAgencyResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée." };

  if (!hasPermission(user, "MANAGE_AGENCY")) {
    return {
      status: "error",
      message:
        "Seul un administrateur peut modifier les informations de l'agence.",
    };
  }

  const parsed = agencySchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }

  // update, never upsert: the row is created by its migration and the id is
  // pinned to 1 by a CHECK. If it is missing, that is a fault to see, not one
  // to paper over by writing a second version of the agency's identity.
  await prisma.agency.update({
    where: { id: 1 },
    data: { ...parsed.data, updatedById: user.id },
  });

  revalidatePath("/settings");
  return { status: "success" };
}
