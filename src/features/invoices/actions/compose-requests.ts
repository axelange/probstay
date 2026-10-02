"use server";

import { z } from "zod";
import {
  composeRequests,
  type ComposedRequest,
} from "@/features/invoices/services/compose-requests";
import { canManageInvoices } from "@/features/invoices/services/invoice-service";
import { getCurrentUser } from "@/lib/auth";

const schema = z.object({ rentalId: z.uuid() });

/**
 * The payment requests a booking can be asked for, composed, for the editor to
 * offer.
 *
 * Fetched when a rental is picked rather than shipped with the list of
 * rentals: these figures are only ever wanted for the one on the document, and
 * composing them for every booking in the agency to fill a dropdown nobody
 * opened would be work for nothing.
 */
export async function composeRequestsAction(
  input: unknown
): Promise<ComposedRequest[]> {
  const user = await getCurrentUser();
  if (!user || !canManageInvoices(user)) return [];

  const parsed = schema.safeParse(input);
  if (!parsed.success) return [];

  return composeRequests(parsed.data.rentalId);
}
