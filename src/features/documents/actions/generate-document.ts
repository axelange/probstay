"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  generateDocument as generate,
  type GenerateResult,
} from "@/features/documents/services/generate-document";

const schema = z.object({
  rentalId: z.uuid(),
  type: z.enum(["CONTRAT", "CONFIRMATION"]),
});

/**
 * Produces a document for a rental and records it.
 *
 * Deliberately not gated on the booking stage: the agency's rule is two hard
 * gates and guidance thereafter, so an agent may issue paperwork when they
 * judge it useful. Whether the rental is *ready* is shown alongside, not
 * enforced here.
 */
export async function generateDocumentAction(
  input: unknown
): Promise<GenerateResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Données invalides." };

  const result = await generate(parsed.data.rentalId, parsed.data.type, user);
  if (result.status === "success") {
    revalidatePath(`/rentals/${parsed.data.rentalId}`);
  }
  return result;
}
