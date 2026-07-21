"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createDemandeSchema } from "@/features/demandes/schemas/demande-schema";

export type CreateDemandeResult =
  | { status: "success"; id: string }
  | { status: "error"; message: string };

export async function createDemande(
  input: unknown
): Promise<CreateDemandeResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée." };

  if (!hasPermission(user, "MANAGE_RENTALS")) {
    return {
      status: "error",
      message: "Vous n'avez pas la permission de créer une demande.",
    };
  }

  const parsed = createDemandeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }
  const data = parsed.data;

  // The demande's contact must hold PROSPECT. Re-checked here rather than
  // trusted from a list rendered minutes ago.
  const prospect = await prisma.contact.findFirst({
    where: { id: data.contactId, archivedAt: null, types: { has: "PROSPECT" } },
    select: { id: true },
  });
  if (!prospect) {
    return { status: "error", message: "Ce contact n'est pas un prospect." };
  }

  try {
    const demande = await prisma.demande.create({
      data: {
        mode: data.mode,
        // Created in-app, so the origin is a direct contact. The website
        // channel (WEBSITE) will set its own on the V2 endpoint.
        source: "DIRECT",
        contactId: prospect.id,
        checkIn: data.checkIn ? new Date(data.checkIn) : null,
        checkOut: data.checkOut ? new Date(data.checkOut) : null,
        guests: data.guests ?? null,
        budget: data.budget ?? null,
        notes: data.notes || null,
        createdById: user.id,
        properties: {
          create: data.propertyIds.map((propertyId) => ({ propertyId })),
        },
      },
      select: { id: true },
    });

    revalidatePath("/demandes");
    return { status: "success", id: demande.id };
  } catch (error) {
    console.error("createDemande failed", error);
    return { status: "error", message: "Enregistrement impossible." };
  }
}
