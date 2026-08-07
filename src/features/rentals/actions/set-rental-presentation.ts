"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PropertyPresentation } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageRental } from "@/features/rentals/services/rental-service";

const schema = z.object({
  rentalId: z.uuid(),
  presentation: z.enum(PropertyPresentation),
});

export type SetPresentationResult =
  | { status: "success" }
  | { status: "error"; message: string };

/**
 * Records how the property was presented, on its own.
 *
 * Deliberately not folded into the funnel's Save. The choice sits above the
 * completion form, which has its own "Enregistrer" button and never carried
 * this field — so an agent picking a box and saving the obvious way lost it
 * silently. A radio that writes when clicked has no wrong button to press.
 *
 * Safe to write at any stage: it describes what happened before signature and
 * is not part of the frozen snapshot.
 */
export async function setRentalPresentation(
  input: unknown
): Promise<SetPresentationResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Données invalides." };
  const { rentalId, presentation } = parsed.data;

  const rental = await prisma.rental.findFirst({
    where: { id: rentalId, archivedAt: null },
    select: {
      id: true,
      tenantAgentId: true,
      property: { select: { agentId: true } },
    },
  });
  if (!rental) return { status: "error", message: "Cette location n'existe plus." };

  if (!canManageRental(user, rental)) {
    return { status: "error", message: "Vous ne gérez pas ce bien." };
  }

  await prisma.rental.update({
    where: { id: rentalId },
    data: { presentation },
  });

  revalidatePath(`/rentals/${rentalId}`);
  return { status: "success" };
}
