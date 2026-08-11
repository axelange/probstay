"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageRental } from "@/features/rentals/services/rental-service";

const schema = z.object({
  rentalId: z.uuid(),
  notes: z.string().trim().max(4000),
});

export type UpdateRentalNotesResult =
  | { status: "success" }
  | { status: "error"; message: string };

/**
 * The booking's internal notes, saved on their own.
 *
 * They belong to the whole rental rather than to one step of it — an agent
 * writes something at the enquiry and reads it back at check-out — so they sit
 * beside the fixed information rather than inside a stage panel, and they save
 * without the funnel's Save button, which lives in the other column.
 *
 * Editable at every stage, signed contract or not: a note is what the agency
 * says to itself, never a term of the agreement.
 */
export async function updateRentalNotes(
  input: unknown
): Promise<UpdateRentalNotesResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Données invalides." };

  const rental = await prisma.rental.findFirst({
    where: { id: parsed.data.rentalId, archivedAt: null },
    select: {
      id: true,
      tenantAgentId: true,
      property: { select: { agentId: true } },
    },
  });
  if (!rental) return { status: "error", message: "Cette location n'existe plus." };
  if (!canManageRental(user, rental)) {
    return { status: "error", message: "Vous ne gérez pas cette location." };
  }

  await prisma.rental.update({
    where: { id: rental.id },
    data: { notes: parsed.data.notes || null },
  });

  revalidatePath(`/rentals/${rental.id}`);
  return { status: "success" };
}
