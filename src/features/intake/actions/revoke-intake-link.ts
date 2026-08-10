"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ id: z.uuid() });

export type RevokeIntakeLinkResult =
  | { status: "success" }
  | { status: "error"; message: string };

/**
 * Closes a link before it expires — sent to the wrong address, or simply no
 * longer wanted.
 *
 * One-way, and the submissions it already produced are untouched: revoking
 * withdraws the invitation, it does not retract what was declared.
 */
export async function revokeIntakeLink(
  input: unknown
): Promise<RevokeIntakeLinkResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Données invalides." };

  const link = await prisma.clientIntakeLink.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, contactId: true, rentalId: true, revokedAt: true },
  });
  if (!link) return { status: "error", message: "Ce lien n'existe plus." };

  if (link.revokedAt === null) {
    await prisma.clientIntakeLink.update({
      where: { id: link.id },
      data: { revokedAt: new Date() },
    });
  }

  if (link.rentalId) revalidatePath(`/rentals/${link.rentalId}`);
  revalidatePath(`/contacts/${link.contactId}`);
  return { status: "success" };
}
