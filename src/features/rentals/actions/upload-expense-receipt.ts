"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import { canManageRental } from "@/features/rentals/services/rental-service";

const BUCKET = "expense-receipts";
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
] as const;

const schema = z.object({ rentalId: z.uuid() });

export type UploadExpenseReceiptResult =
  | { status: "success"; storagePath: string; fileName: string }
  | { status: "error"; message: string };

/**
 * A receipt for an expense, uploaded before the expense itself is recorded.
 *
 * Sent as soon as it is chosen so the form carries only a path, and so a bad
 * file is refused while the agent is still looking at it rather than when they
 * save the whole panel.
 *
 * The session client, not the service role: an agent is signed in here, and
 * the bucket's policies key on the rental exactly as every other one does.
 */
export async function uploadExpenseReceipt(
  formData: FormData
): Promise<UploadExpenseReceiptResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée." };

  const parsed = schema.safeParse({ rentalId: formData.get("rentalId") });
  if (!parsed.success) return { status: "error", message: "Données invalides." };

  const rental = await prisma.rental.findFirst({
    where: { id: parsed.data.rentalId, archivedAt: null },
    select: {
      id: true,
      tenantAgentId: true,
      property: { select: { agentId: true } },
    },
  });
  if (!rental) return { status: "error", message: "Cette location n'existe plus." };
  if (!canManageRental(user, rental)) {
    return { status: "error", message: "Vous ne gérez pas cette location." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Aucun fichier reçu." };
  }
  if (file.size > MAX_BYTES) {
    return { status: "error", message: "Fichier trop volumineux (10 Mo maximum)." };
  }
  if (!ACCEPTED.includes(file.type as (typeof ACCEPTED)[number])) {
    return { status: "error", message: "Format non accepté — PDF ou image." };
  }

  // The rental id leads, so the storage policies can read it off the path.
  const storagePath = `${rental.id}/${crypto.randomUUID()}`;

  const supabase = await createClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (error) {
    console.error("uploadExpenseReceipt failed", error);
    return { status: "error", message: "Envoi impossible." };
  }
  return { status: "success", storagePath, fileName: file.name };
}
