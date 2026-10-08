"use server";

import {
  buildConciergeData,
  type ConciergeInput,
} from "@/features/documents/services/build-concierge-data";
import type { ConciergeData } from "@/features/documents/templates/contrat-conciergerie";
import { getCurrentUser } from "@/lib/auth";

/** A concierge agreement assembled from the preview's choices, or null. */
export async function getConciergeData(
  input: ConciergeInput
): Promise<ConciergeData | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return buildConciergeData(input, user);
}
