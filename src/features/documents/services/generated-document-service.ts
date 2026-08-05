import "server-only";

import type { CurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export type GeneratedDocumentRow = {
  id: string;
  type: "RENTAL_CONFIRMATION" | "SEASONAL_RENTAL_CONTRACT";
  reference: string;
  fileName: string;
  templateVersion: number | null;
  createdAt: Date;
  authorName: string | null;
};

/**
 * Every document produced for a rental, newest first.
 *
 * Visibility mirrors the rental, as everywhere else: MANAGE_RENTALS sees all,
 * an agent only the rentals they handle on either side. Prisma bypasses RLS,
 * so this check is the real one — the policies behind it are the second line.
 */
export async function listGeneratedDocuments(
  rentalId: string,
  user: CurrentUser
): Promise<GeneratedDocumentRow[]> {
  const isManager = hasPermission(user, "MANAGE_RENTALS");
  const rental = await prisma.rental.findFirst({
    where: {
      id: rentalId,
      archivedAt: null,
      ...(isManager
        ? {}
        : {
            OR: [
              { property: { agentId: user.id } },
              { tenantAgentId: user.id },
            ],
          }),
    },
    select: { id: true },
  });
  if (!rental) return [];

  const rows = await prisma.generatedDocument.findMany({
    where: { rentalId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      type: true,
      reference: true,
      fileName: true,
      templateVersion: true,
      createdAt: true,
      generatedBy: { select: { fullName: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    reference: r.reference,
    fileName: r.fileName,
    templateVersion: r.templateVersion,
    createdAt: r.createdAt,
    authorName: r.generatedBy?.fullName ?? null,
  }));
}
