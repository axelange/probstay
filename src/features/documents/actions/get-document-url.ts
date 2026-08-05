"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import { BUCKET } from "@/features/documents/services/generate-document";

const schema = z.object({ id: z.uuid() });

/** Seconds a download link stays valid — long enough to click, not to share. */
const TTL = 60;

export type DocumentUrlResult =
  | { status: "success"; url: string }
  | { status: "error"; message: string };

/**
 * A short-lived download link for a generated document.
 *
 * The bucket is private, so a URL is minted per click rather than stored: a
 * link that lived in the page would outlive the session that was allowed to
 * see it. The readable file name is applied here, which is why storage keys
 * can stay opaque.
 */
export async function getDocumentUrl(
  input: unknown
): Promise<DocumentUrlResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Données invalides." };

  const isManager = hasPermission(user, "MANAGE_RENTALS");
  const doc = await prisma.generatedDocument.findFirst({
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
    .from(BUCKET)
    .createSignedUrl(doc.storagePath, TTL, { download: doc.fileName });

  if (error || !data) {
    console.error("getDocumentUrl failed", error);
    return { status: "error", message: "Lien indisponible." };
  }
  return { status: "success", url: data.signedUrl };
}
