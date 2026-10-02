"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  issueInvoiceSchema,
} from "@/features/invoices/schemas/invoice-schema";
import { generateInvoicePdf } from "@/features/invoices/services/generate-invoice";
import {
  cancelInvoice,
  issueInvoice,
  markInvoicePaid,
} from "@/features/invoices/services/invoice-service";
import { getCurrentUser } from "@/lib/auth";

export type IssueInvoiceResult =
  | { status: "success"; reference: string; warning?: string }
  | { status: "error"; message: string };

/**
 * Validates the number: the draft takes the next one in the series, is dated,
 * and becomes unmodifiable.
 *
 * The PDF is rendered afterwards, and only for an invoice the app produces —
 * an imported one already has its file. A render that fails is reported as a
 * warning rather than an error: the invoice exists and holds its number, so
 * saying "it failed" would be untrue and would invite a second attempt at
 * issuing, which is exactly what must not happen.
 */
export async function issueInvoiceAction(
  input: unknown
): Promise<IssueInvoiceResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée." };

  const parsed = issueInvoiceSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Données invalides." };

  const issued = await issueInvoice(
    parsed.data.id,
    new Date(parsed.data.issuedOn),
    user
  );
  if (issued.status === "error") return issued;

  const pdf = await generateInvoicePdf(issued.id, user);
  revalidatePath("/invoices");

  // "Already has one" is the imported case: its file came with it, and there
  // is nothing to render.
  return pdf.status === "success" || pdf.message === "Cette facture a déjà son PDF."
    ? { status: "success", reference: issued.reference }
    : {
        status: "success",
        reference: issued.reference,
        warning: `Facture ${issued.reference} émise, mais le PDF n'a pas pu être produit : ${pdf.message}`,
      };
}

const idSchema = z.object({ id: z.uuid() });

export type InvoiceStatusResult =
  | { status: "success" }
  | { status: "error"; message: string };

/** Cancels an issued invoice. The row and its number stay. */
export async function cancelInvoiceAction(
  input: unknown
): Promise<InvoiceStatusResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée." };

  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Données invalides." };

  const result = await cancelInvoice(parsed.data.id, user);
  if (result.status === "error") return result;
  revalidatePath("/invoices");
  return { status: "success" };
}

/** Records that an issued invoice has been settled, today. */
export async function markInvoicePaidAction(
  input: unknown
): Promise<InvoiceStatusResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée." };

  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Données invalides." };

  const result = await markInvoicePaid(parsed.data.id, new Date(), user);
  if (result.status === "error") return result;
  revalidatePath("/invoices");
  return { status: "success" };
}
