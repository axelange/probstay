"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import { SIGNED_BUCKET } from "@/features/documents/services/signed-document-service";

const schema = z.object({ id: z.uuid() });

/** Seconds a download link stays valid — long enough to click, not to share. */
const TTL = 60;

export type SignedDocumentUrlResult =
  | { status: "success"; url: string }
  | { status: "error"; message: string };

/**
 * A short-lived download link for a signed document.
 *
 * Same rule as the generated side: the bucket is private and a URL is minted
 * per click rather than stored, so a link cannot outlive the session that was
 * allowed to see it.
 */
export async function getSignedDocumentUrl(
  input: unknown
): Promise<SignedDocumentUrlResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Données invalides." };

  const isManager = hasPermission(user, "MANAGE_RENTALS");
  const doc = await prisma.signedDocument.findFirst({
    where: {
      id: parsed.data.id,
      rental: {
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
    },
    select: { storagePath: true, fileName: true },
  });
  // Absent and forbidden answer the same way: a document someone may not see
  // should not be confirmed to exist.
  if (!doc) return { status: "error", message: "Document introuvable." };

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(SIGNED_BUCKET)
    .createSignedUrl(doc.storagePath, TTL, { download: doc.fileName });

  if (error || !data) {
    console.error("getSignedDocumentUrl failed", error);
    return { status: "error", message: "Lien indisponible." };
  }
  return { status: "success", url: data.signedUrl };
}
