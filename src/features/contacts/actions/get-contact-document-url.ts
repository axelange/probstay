"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase-admin";
import { IDENTITY_BUCKET } from "@/features/contacts/services/contact-documents";

const schema = z.object({ id: z.uuid() });

/** Seconds a link stays valid — long enough to open, not to pass on. */
const TTL = 60;

export type ContactDocumentUrlResult =
  | { status: "success"; url: string }
  | { status: "error"; message: string };

/**
 * A short-lived link to open a document held against a contact.
 *
 * The service role, unlike the other buckets: `identity-documents` carries no
 * storage policies at all, because the client's own upload arrives without a
 * session for one to check. Authorisation is therefore this function's job —
 * a signed-in user who can see the contact can open its documents, which is
 * the same rule the contact page itself applies.
 */
export async function getContactDocumentUrl(
  input: unknown
): Promise<ContactDocumentUrlResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Données invalides." };

  const doc = await prisma.identityDocument.findUnique({
    where: { id: parsed.data.id },
    select: { storagePath: true, contact: { select: { archivedAt: true } } },
  });
  // Absent and out of reach answer alike.
  if (!doc || doc.contact?.archivedAt) {
    return { status: "error", message: "Document introuvable." };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(IDENTITY_BUCKET)
    .createSignedUrl(doc.storagePath, TTL);

  if (error || !data) {
    console.error("getContactDocumentUrl failed", error);
    return { status: "error", message: "Lien indisponible." };
  }
  return { status: "success", url: data.signedUrl };
}
