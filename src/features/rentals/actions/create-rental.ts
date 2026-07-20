"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createRentalSchema } from "@/features/rentals/schemas/rental-schema";
import { canBookProperty } from "@/features/rentals/services/rental-service";

export type CreateRentalResult =
  | { status: "success"; id: string }
  | { status: "error"; message: string };

export async function createRental(
  input: unknown
): Promise<CreateRentalResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { status: "error", message: "Session expirée." };
  }

  const parsed = createRentalSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }

  const data = parsed.data;

  const property = await prisma.property.findFirst({
    where: { id: data.propertyId, archivedAt: null },
    select: { id: true, agentId: true, ownerId: true },
  });
  if (!property) {
    return { status: "error", message: "Ce bien n'existe plus." };
  }

  if (!canBookProperty(user, property)) {
    return {
      status: "error",
      message: "Vous ne gérez pas ce bien.",
    };
  }

  // The tenants must still hold CLIENT. A trigger enforces it, but the
  // error it raises is not a sentence anyone should be shown, and the
  // list they picked from may be minutes old.
  const tenants = await prisma.contact.findMany({
    where: { id: { in: data.tenantIds }, archivedAt: null, types: { has: "CLIENT" } },
    select: { id: true },
  });
  if (tenants.length !== data.tenantIds.length) {
    return {
      status: "error",
      message: "Un des locataires n'est plus un contact client valide.",
    };
  }

  try {
    const rental = await prisma.rental.create({
      data: {
        propertyId: property.id,
        // Snapshotted at creation, never read through the property
        // afterwards: reassigning a property or changing its owner must
        // not rewrite who this booking belonged to. Nothing else
        // populates these — there is no trigger.
        ownerId: property.ownerId,
        agentId: property.agentId,
        checkIn: new Date(data.checkIn),
        checkOut: new Date(data.checkOut),
        bookingStatus: data.bookingStatus,
        grossAmount: data.grossAmount ?? null,
        depositAmount: data.depositAmount ?? null,
        securityDepositAmount: data.securityDepositAmount ?? null,
        notes: data.notes || null,
        tenants: {
          create: data.tenantIds.map((contactId, index) => ({
            contactId,
            // First picked is the lead guest, which is who the contract
            // and the correspondence are addressed to.
            isPrimary: index === 0,
          })),
        },
      },
      select: { id: true },
    });

    revalidatePath("/rentals");

    return { status: "success", id: rental.id };
  } catch (error) {
    // A new rental carries no owner confirmation, so the exclusion
    // constraint cannot fire here yet. Translated anyway: confirming is
    // a later action on this same record, and the message belongs with
    // the rule rather than being invented twice.
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2010" || error.code === "P2002") {
        return {
          status: "error",
          message:
            "Une réservation confirmée existe déjà sur ce bien pour ces dates.",
        };
      }
    }

    console.error("createRental failed", error);
    return { status: "error", message: "Enregistrement impossible." };
  }
}
