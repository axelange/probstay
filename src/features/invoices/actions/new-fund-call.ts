"use server";

import { revalidatePath } from "next/cache";
import { newFundCallSchema } from "@/features/invoices/schemas/invoice-schema";
import { composeRequests } from "@/features/invoices/services/compose-requests";
import { fundCallSubject } from "@/features/invoices/services/fund-call-subject";
import {
  canManageInvoices,
  createDraft,
} from "@/features/invoices/services/invoice-service";
import { getCurrentUser } from "@/lib/auth";

export type NewFundCallResult =
  | { status: "success"; id: string }
  | { status: "error"; message: string };

/**
 * Opens a payment request against a booking, composed.
 *
 * The same composition the signature writes — `composeRequests` — so a
 * document opened by hand and one opened automatically say the same thing:
 * the booking, the property and the stay as its subject, and the sum broken
 * down into the lines the client needs to read.
 *
 * No VAT: a payment request asks for money the agency holds on behalf of an
 * owner or returns to a tenant, and that is not its revenue.
 */
export async function createFundCallAction(
  input: unknown
): Promise<NewFundCallResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée." };
  if (!canManageInvoices(user)) {
    return { status: "error", message: "Vous n'avez pas la permission." };
  }

  const parsed = newFundCallSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Données invalides." };

  const [requests, subject] = await Promise.all([
    composeRequests(parsed.data.rentalId),
    fundCallSubject(parsed.data.rentalId),
  ]);
  if (!subject) return { status: "error", message: "Location introuvable." };
  if (!subject.clientId) {
    return {
      status: "error",
      message:
        "Cette location n'a pas encore de locataire à qui adresser la demande.",
    };
  }

  const request = requests.find((r) => r.head === parsed.data.head);
  if (!request) {
    return {
      status: "error",
      message: "Ce montant n'est pas renseigné dans le dossier de réservation.",
    };
  }

  const draft = await createDraft(
    {
      family: "FUND_CALL",
      clientId: subject.clientId,
      rentalId: parsed.data.rentalId,
      title: request.title ?? undefined,
      description: subject.description,
      notes: request.notes ?? undefined,
      vatRate: 0,
      lines: request.lines.map((line) => ({
        label: line.label,
        description: line.description ?? undefined,
        productId: line.productId ?? undefined,
        quantity: 1,
        unitPrice: line.unitPrice,
      })),
    },
    user
  );
  if (draft.status === "error") return draft;

  revalidatePath("/payment-requests");
  return { status: "success", id: draft.id };
}
