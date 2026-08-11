"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase-admin";
import { IDENTITY_BUCKET } from "@/features/contacts/services/contact-documents";
import { IdentityDocumentType } from "@/generated/prisma/enums";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

const schema = z.object({
  contactId: z.uuid(),
  type: z.enum(IdentityDocumentType),
  number: z.string().trim().max(60).optional(),
  issuedAt: z
    .union([z.literal(""), z.iso.date()])
    .transform((v) => (v === "" ? undefined : v))
    .optional(),
});

export type UploadContactDocumentResult =
  | { status: "success" }
  | { status: "error"; message: string };

/**
 * An agent filing a document against a contact.
 *
 * The other way in is the client's own link. Both land in the same place, so a
 * passport sent by a client and one scanned at the desk are the same record —
 * and whichever arrives first spares the other party from being asked.
 *
 * Service role, like every path into this bucket: it has no storage policies,
 * because the client's upload has no session for one to read. MANAGE_CONTACTS
 * is checked here instead.
 */
export async function uploadContactDocument(
  formData: FormData
): Promise<UploadContactDocumentResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée." };
  if (!hasPermission(user, "MANAGE_CONTACTS")) {
    return { status: "error", message: "Vous n'avez pas la permission." };
  }

  const parsed = schema.safeParse({
    contactId: formData.get("contactId"),
    type: formData.get("type"),
    number: formData.get("number") ?? undefined,
    issuedAt: formData.get("issuedAt") ?? undefined,
  });
  if (!parsed.success) return { status: "error", message: "Données invalides." };
  const { contactId, type, number, issuedAt } = parsed.data;

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, archivedAt: null },
    select: { id: true },
  });
  if (!contact) return { status: "error", message: "Ce contact n'existe plus." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Aucun fichier reçu." };
  }
  if (file.size > MAX_BYTES) {
    return { status: "error", message: "Fichier trop volumineux (10 Mo maximum)." };
  }
  if (!ACCEPTED.includes(file.type as (typeof ACCEPTED)[number])) {
    return { status: "error", message: "Format non accepté — JPEG, PNG, WEBP ou PDF." };
  }

  const storagePath = `contact/${contactId}/${crypto.randomUUID()}`;
  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from(IDENTITY_BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (error) {
    console.error("uploadContactDocument failed", error);
    return { status: "error", message: "Envoi impossible." };
  }

  try {
    await prisma.identityDocument.create({
      data: {
        contactId,
        type,
        number: number || null,
        issuedAt: issuedAt ? new Date(issuedAt) : null,
        storagePath,
        uploadedById: user.id,
      },
    });
  } catch (err) {
    // The row is what makes the file findable; without it the object is an
    // orphan nobody can reach.
    console.error("uploadContactDocument record failed", err);
    await supabase.storage.from(IDENTITY_BUCKET).remove([storagePath]);
    return { status: "error", message: "Enregistrement impossible." };
  }

  revalidatePath(`/contacts/${contactId}`);
  return { status: "success" };
}
