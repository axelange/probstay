"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  demandeId: z.uuid(),
  // The single property and dates the demande resolves to — a rental
  // needs both. For a precise demande these are the demande's own; for a
  // wide one the agent picks which villa and confirms the dates.
  propertyId: z.uuid("Choisissez un bien."),
  checkIn: z.iso.date("Date d'arrivée requise."),
  checkOut: z.iso.date("Date de départ requise."),
});

export type ConvertDemandeResult =
  | { status: "success"; rentalId: string }
  | { status: "error"; message: string };

/**
 * Turns a demande into a rental.
 *
 * The rental opens at INQUIRY ("Informations"), carrying the prospect as
 * its tenant and the chosen property and dates. Owner and agent stay
 * null — they are frozen only at contract signature. The demande is
 * marked converted and linked to the rental it produced.
 */
export async function convertDemande(
  input: unknown
): Promise<ConvertDemandeResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée." };

  if (!hasPermission(user, "MANAGE_RENTALS")) {
    return { status: "error", message: "Vous n'avez pas la permission." };
  }

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }
  const data = parsed.data;

  if (new Date(data.checkOut) <= new Date(data.checkIn)) {
    return {
      status: "error",
      message: "Le départ doit être postérieur à l'arrivée.",
    };
  }

  const demande = await prisma.demande.findFirst({
    where: { id: data.demandeId, archivedAt: null },
    select: {
      id: true,
      contactId: true,
      convertedAt: true,
      lostAt: true,
      properties: { select: { propertyId: true } },
    },
  });
  if (!demande) {
    return { status: "error", message: "Cette demande n'existe plus." };
  }
  if (demande.convertedAt) {
    return { status: "error", message: "Cette demande est déjà convertie." };
  }
  if (demande.lostAt) {
    return { status: "error", message: "Cette demande est marquée perdue." };
  }

  // The chosen property must be one of the demande's own — you convert to
  // a villa the prospect actually asked about.
  if (!demande.properties.some((p) => p.propertyId === data.propertyId)) {
    return {
      status: "error",
      message: "Ce bien ne fait pas partie de la demande.",
    };
  }

  try {
    const rental = await prisma.$transaction(async (tx) => {
      // The prospect becomes a client on conversion: a rental tenant must
      // hold CLIENT (a DB trigger enforces it), and PROSPECT is exclusive
      // so it is replaced, not added to. This is the prospect → client
      // promotion that the whole "prospect" status exists to lead up to.
      await tx.contact.update({
        where: { id: demande.contactId },
        data: { types: ["CLIENT"] },
      });

      const created = await tx.rental.create({
        data: {
          propertyId: data.propertyId,
          bookingStatus: "INQUIRY",
          checkIn: new Date(data.checkIn),
          checkOut: new Date(data.checkOut),
          tenants: {
            create: [{ contactId: demande.contactId, isPrimary: true }],
          },
        },
        select: { id: true },
      });

      await tx.demande.update({
        where: { id: demande.id },
        data: { convertedAt: new Date(), convertedRentalId: created.id },
      });

      return created;
    });

    revalidatePath("/demandes");
    revalidatePath("/rentals");
    return { status: "success", rentalId: rental.id };
  } catch (error) {
    console.error("convertDemande failed", error);
    return { status: "error", message: "Conversion impossible." };
  }
}
