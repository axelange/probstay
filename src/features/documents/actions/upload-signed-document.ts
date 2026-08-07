"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import {
  canReachRental,
  SIGNED_BUCKET,
} from "@/features/documents/services/signed-document-service";

/** Mirrors the bucket's own limits, so a refusal is explained here first. */
const MAX_BYTES = 25 * 1024 * 1024;
const ACCEPTED = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
] as const;

const schema = z.object({
  rentalId: z.uuid(),
  type: z.enum(["RENTAL_CONFIRMATION", "SEASONAL_RENTAL_CONTRACT"]),
  kind: z.enum(["SIGNED", "AMENDMENT"]).default("SIGNED"),
});

export type UploadSignedResult =
  | { status: "success"; fileName: string }
  | { status: "error"; message: string };

/**
 * Records the copy that came back signed.
 *
 * Append-only: a second signed copy of a document supersedes the first and
 * both rows stay. A signed document is evidence, so replacing one has to leave
 * a trace rather than overwrite silently.
 *
 * Amendments are not superseded at all — an avenant does not replace the copy
 * it amends, and a booking may collect several, so every one of them stands.
 *
 * The file is stored under an opaque key and the uploaded name is kept in the
 * row, so a tenant's name never becomes a storage key and the download can
 * still be called what the agent recognises.
 */
export async function uploadSignedDocument(
  formData: FormData
): Promise<UploadSignedResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée." };

  const parsed = schema.safeParse({
    rentalId: formData.get("rentalId"),
    type: formData.get("type"),
    kind: formData.get("kind") ?? undefined,
  });
  if (!parsed.success) return { status: "error", message: "Données invalides." };
  const { rentalId, type, kind } = parsed.data;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Aucun fichier reçu." };
  }
  if (file.size > MAX_BYTES) {
    return {
      status: "error",
      message: "Fichier trop volumineux (25 Mo maximum).",
    };
  }
  if (!ACCEPTED.includes(file.type as (typeof ACCEPTED)[number])) {
    return {
      status: "error",
      message: "Format non accepté — PDF, JPEG, PNG ou HEIC.",
    };
  }

  // Checked before the upload, not only by the storage policy: a file written
  // to a rental the user may not reach would be a leak even if the row that
  // points at it is refused afterwards.
  if (!(await canReachRental(rentalId, user))) {
    return { status: "error", message: "Location introuvable." };
  }

  const storagePath = `${rentalId}/${crypto.randomUUID()}`;

  // The session client, not a service key: the bucket's policies mirror rental
  // visibility, so an agent uploading to someone else's rental is refused by
  // the database rather than by this code alone.
  const supabase = await createClient();
  const { error: uploadError } = await supabase.storage
    .from(SIGNED_BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error("uploadSignedDocument upload failed", uploadError);
    return { status: "error", message: "Envoi impossible." };
  }

  try {
    await prisma.signedDocument.create({
      data: {
        rentalId,
        type,
        kind,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        storagePath,
        uploadedById: user.id,
      },
    });
  } catch (error) {
    // The row is what makes the file findable. Without it the object is an
    // orphan nobody can reach, so it goes back out.
    console.error("uploadSignedDocument record failed", error);
    await supabase.storage.from(SIGNED_BUCKET).remove([storagePath]);
    return { status: "error", message: "Enregistrement impossible." };
  }

  revalidatePath(`/rentals/${rentalId}`);
  return { status: "success", fileName: file.name };
}
