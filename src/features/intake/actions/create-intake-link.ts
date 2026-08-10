"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  INTAKE_LINK_DAYS,
  newIntakeToken,
} from "@/features/intake/services/intake-service";

const schema = z.object({
  contactId: z.uuid(),
  /** Present when opened from a booking; absent from a contact page. */
  rentalId: z.uuid().optional(),
  /** OCCUPANTS only makes sense against a booking, and is refused without one. */
  scope: z.enum(["FULL", "OCCUPANTS"]).default("FULL"),
});

export type CreateIntakeLinkResult =
  | { status: "success"; token: string; expiresAt: string }
  | { status: "error"; message: string };

/**
 * Issues a link for a client to complete their own identification.
 *
 * Any signed-in member of staff may issue one: it collects data, grants no
 * access to anything, and asking a client for their details is ordinary work.
 * Revoking and reading submissions is where the permissions matter.
 *
 * A fresh token every time, and the previous one for this contact and booking
 * is revoked in the same breath — two live links to the same form is two
 * places for a client to file an answer, and only one of them would be the
 * one the agent is watching.
 */
export async function createIntakeLink(
  input: unknown
): Promise<CreateIntakeLinkResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Données invalides." };
  const { contactId, rentalId, scope } = parsed.data;

  if (scope === "OCCUPANTS" && !rentalId) {
    // The other adults belong to one stay; there is nothing to ask about
    // without one.
    return { status: "error", message: "Données invalides." };
  }

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, archivedAt: null },
    select: { id: true },
  });
  if (!contact) return { status: "error", message: "Ce contact n'existe plus." };

  if (rentalId) {
    const rental = await prisma.rental.findFirst({
      where: { id: rentalId, archivedAt: null },
      select: {
        id: true,
        tenantAgentId: true,
        property: { select: { agentId: true } },
      },
    });
    if (!rental) return { status: "error", message: "Cette location n'existe plus." };

    const isManager = hasPermission(user, "MANAGE_RENTALS");
    const isAgent =
      rental.property.agentId === user.id || rental.tenantAgentId === user.id;
    if (!isManager && !isAgent) {
      return { status: "error", message: "Vous ne gérez pas cette location." };
    }
  }

  const token = newIntakeToken();
  const expiresAt = new Date(Date.now() + INTAKE_LINK_DAYS * 86_400_000);

  await prisma.$transaction([
    prisma.clientIntakeLink.updateMany({
      // Only links of the same kind: revoking the tenant's identification
      // because someone asked for the occupant list would be a surprise.
      where: {
        contactId,
        rentalId: rentalId ?? null,
        scope,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { revokedAt: new Date() },
    }),
    prisma.clientIntakeLink.create({
      data: {
        token,
        contactId,
        rentalId: rentalId ?? null,
        scope,
        createdById: user.id,
        expiresAt,
      },
    }),
  ]);

  if (rentalId) revalidatePath(`/rentals/${rentalId}`);
  revalidatePath(`/contacts/${contactId}`);
  return { status: "success", token, expiresAt: expiresAt.toISOString() };
}
