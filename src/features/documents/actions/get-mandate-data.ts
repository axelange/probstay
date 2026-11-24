"use server";

import {
  mandateSchema,
  type MandateInput,
} from "@/features/documents/schemas/mandate-schema";
import { buildMandateData } from "@/features/documents/services/build-mandate-data";
import type { MandateData } from "@/features/documents/templates/mandat-gestion-locative";
import { getCurrentUser } from "@/lib/auth";

/** A rental management mandate assembled from the preview's choices, or null. */
export async function getMandateData(
  input: MandateInput,
): Promise<MandateData | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const parsed = mandateSchema.safeParse(input);
  if (!parsed.success) return null;
  return buildMandateData(parsed.data, user);
}
