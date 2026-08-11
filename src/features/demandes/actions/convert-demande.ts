"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { defaultDepositPercent } from "@/features/rentals/utils/deposit-rule";
import {
  canBookProperty,
  isLettableProperty,
} from "@/features/rentals/services/rental-service";

const schema = z.object({
  demandeId: z.uuid(),
  // The single property and dates the demande resolves to — a rental
  // needs both. The property need not be one the demande listed: the
  // agent may steer it onto any villa they manage (an admin onto any),
  // e.g. proposing a different one than the prospect first asked about.
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
      assignedAgentId: true,
      guests: true,
      contact: { select: { types: true } },
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

  // The chosen villa: any this user may book — their own for an agent,
  // any for an admin. Not limited to the demande's properties of interest.
  const property = await prisma.property.findFirst({
    where: { id: data.propertyId, archivedAt: null },
    select: {
      id: true,
      agentId: true,
      category: true,
      defaultSecurityDeposit: true,
    },
  });
  if (!property) {
    return { status: "error", message: "Ce bien n'existe plus." };
  }
  if (!canBookProperty(user, property)) {
    return { status: "error", message: "Vous ne gérez pas ce bien." };
  }
  if (!isLettableProperty(property)) {
    return {
      status: "error",
      message: "Ce bien est en vente et ne peut pas être loué.",
    };
  }

  // Co-agents: the demande's agent handled the tenant side; the property's
  // agent is the owner side. Carried onto the rental as its tenant-side
  // agent — when the two differ, both may manage the rental.
  const tenantAgentId = demande.assignedAgentId;

  // The contact becomes a client on conversion — a rental tenant must
  // hold CLIENT (a DB trigger enforces it). PROSPECT is dropped, since it
  // cannot coexist, but any other type (e.g. an owner who is also renting)
  // is kept: add CLIENT, remove PROSPECT.
  const newTypes = Array.from(
    new Set([
      ...demande.contact.types.filter((t) => t !== "PROSPECT"),
      "CLIENT" as const,
    ])
  );

  try {
    const rental = await prisma.$transaction(async (tx) => {
      await tx.contact.update({
        where: { id: demande.contactId },
        data: { types: newTypes },
      });

      const created = await tx.rental.create({
        data: {
          propertyId: property.id,
          bookingStatus: "INQUIRY",
          tenantAgentId,
          // Carry the party size the prospect gave on the demande, so it
          // isn't lost when the rental opens. Editable afterwards in the funnel.
          guests: demande.guests,
          // No acompte on a booking made inside the balance's notice period:
          // its due date has passed, so the whole amount is payable and there
          // is nothing to split. Changed freely afterwards.
          depositPercent: defaultDepositPercent(new Date(data.checkIn)),
          // Seed the caution from the property. Copied once, here, and never
          // read again: revising the property's default must not rewrite a
          // rental whose contract may already quote the old figure. Editable
          // on the rental afterwards, like the party size.
          securityDepositAmount: property.defaultSecurityDeposit,
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
