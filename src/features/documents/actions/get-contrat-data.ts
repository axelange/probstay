"use server";

import { getCurrentUser } from "@/lib/auth";
import { buildContratData } from "@/features/documents/services/build-contrat-data";
import type { ContratData } from "@/features/documents/templates/contrat-location-saisonniere";

/** Pre-filled contract data for a rental, or null if unavailable to this user. */
export async function getContratData(
  rentalId: string
): Promise<ContratData | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return buildContratData(rentalId, user);
}
