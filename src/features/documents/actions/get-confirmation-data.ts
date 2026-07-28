"use server";

import { getCurrentUser } from "@/lib/auth";
import { buildConfirmationData } from "@/features/documents/services/build-confirmation-data";
import type { ConfirmationData } from "@/features/documents/templates/rental-confirmation";

/** Pre-filled rental-confirmation data for a rental, or null if unavailable. */
export async function getConfirmationData(
  rentalId: string
): Promise<ConfirmationData | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return buildConfirmationData(rentalId, user);
}
