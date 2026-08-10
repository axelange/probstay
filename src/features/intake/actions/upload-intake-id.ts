"use server";

import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase-admin";

/** Mirrors the bucket's own limits, so a refusal is explained here first. */
const BUCKET = "identity-documents";
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export type UploadIntakeIdResult =
  | { status: "success"; storagePath: string; fileName: string }
  | { status: "error"; message: string };

/**
 * A client uploading a copy of an identity document, with no session.
 *
 * The file goes up as soon as it is chosen rather than with the rest of the
 * form: a submission carrying the tenant's copy plus one per occupant would be
 * tens of megabytes in a single request, and a failure would lose the lot.
 * What comes back is a storage path the form holds until it submits, which is
 * when the rows are written and the copies attached to the right people.
 *
 * The token is validated on every call. Until the form is submitted the object
 * is referenced by nothing, so a client who abandons leaves a file behind —
 * unreachable, and cheaper to leave than to invite anyone to delete.
 */
export async function uploadIntakeId(
  formData: FormData
): Promise<UploadIntakeIdResult> {
  const token = formData.get("token");
  if (typeof token !== "string" || token.length < 20) {
    return { status: "error", message: "Lien invalide." };
  }

  const link = await prisma.clientIntakeLink.findUnique({
    where: { token },
    select: { id: true, expiresAt: true, revokedAt: true },
  });
  if (
    !link ||
    link.revokedAt !== null ||
    link.expiresAt.getTime() <= Date.now()
  ) {
    return {
      status: "error",
      message: "Ce lien n'est plus valable. Merci de demander un nouveau lien.",
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Aucun fichier reçu." };
  }
  if (file.size > MAX_BYTES) {
    return {
      status: "error",
      message: "Fichier trop volumineux (10 Mo maximum).",
    };
  }
  if (!ACCEPTED.includes(file.type as (typeof ACCEPTED)[number])) {
    return {
      status: "error",
      message: "Format non accepté — JPEG, PNG, WEBP ou PDF.",
    };
  }

  // Keyed on the link, so everything one client sent sits together and the
  // uploader's own name never becomes a storage key.
  const storagePath = `intake/${link.id}/${crypto.randomUUID()}`;

  // The service role: this request has no session for a policy to check, and
  // the bucket has none. The token check above is the authorisation.
  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (error) {
    console.error("uploadIntakeId failed", error);
    return { status: "error", message: "Envoi impossible." };
  }

  return { status: "success", storagePath, fileName: file.name };
}
