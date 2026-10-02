"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { generateInvoicePdf } from "@/features/invoices/services/generate-invoice";
import { canManageInvoices } from "@/features/invoices/services/invoice-service";
import { getCurrentUser } from "@/lib/auth";

const schema = z.object({ id: z.uuid() });

export type GenerateInvoicePdfResult =
  | { status: "success"; fileName: string }
  | { status: "error"; message: string };

/**
 * Renders the PDF of an invoice that has none.
 *
 * The retry behind the warning `createInvoiceAction` returns. It cannot
 * overwrite: the service refuses an invoice that already has a file, so this
 * only ever fills a gap left by a failed render.
 */
export async function generateInvoicePdfAction(
  input: unknown
): Promise<GenerateInvoicePdfResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée." };
  if (!canManageInvoices(user)) {
    return { status: "error", message: "Vous n'avez pas la permission." };
  }

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Données invalides." };

  const result = await generateInvoicePdf(parsed.data.id, user);
  if (result.status === "success") revalidatePath("/invoices");
  return result;
}
