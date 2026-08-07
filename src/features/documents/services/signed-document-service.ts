import "server-only";

import type { CurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const SIGNED_BUCKET = "signed-documents";

export type SignedDocumentRow = {
  id: string;
  type: "RENTAL_CONFIRMATION" | "SEASONAL_RENTAL_CONTRACT";
  kind: "SIGNED" | "AMENDMENT";
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: Date;
  uploaderName: string | null;
};

/**
 * Whether a user may see, and therefore upload against, this rental.
 *
 * The same rule the generated documents use: MANAGE_RENTALS sees all, an agent
 * only the rentals they handle on either side. Prisma bypasses RLS, so this is
 * the real check and the storage policies behind it are the second line.
 */
export async function canReachRental(
  rentalId: string,
  user: CurrentUser
): Promise<boolean> {
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
  return rental !== null;
}

/** Every signed copy held for a rental, newest first. */
export async function listSignedDocuments(
  rentalId: string,
  user: CurrentUser
): Promise<SignedDocumentRow[]> {
  if (!(await canReachRental(rentalId, user))) return [];

  const rows = await prisma.signedDocument.findMany({
    where: { rentalId },
    orderBy: { uploadedAt: "desc" },
    select: {
      id: true,
      type: true,
      kind: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      uploadedAt: true,
      uploadedBy: { select: { fullName: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    kind: r.kind,
    fileName: r.fileName,
    mimeType: r.mimeType,
    sizeBytes: r.sizeBytes,
    uploadedAt: r.uploadedAt,
    uploaderName: r.uploadedBy?.fullName ?? null,
  }));
}
