"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  draftInvoiceSchema,
  updateDraftSchema,
} from "@/features/invoices/schemas/invoice-schema";
import {
  createDraft,
  deleteDraft,
  updateDraft,
  type DraftInput,
} from "@/features/invoices/services/invoice-service";
import { getCurrentUser } from "@/lib/auth";

export type DraftInvoiceResult =
  | { status: "success"; id: string }
  | { status: "error"; message: string };

/** The parsed form, in the shape the service takes. */
function toServiceInput(
  data: z.infer<typeof draftInvoiceSchema>
): DraftInput {
  return {
    family: data.family,
    title: data.title,
    clientId: data.clientId,
    rentalId: data.rentalId,
    description: data.description,
    dueOn: data.dueOn ? new Date(data.dueOn) : undefined,
    vatRate: data.vatRate,
    notes: data.notes,
    lines: data.lines,
  };
}

/** Opens a draft. It carries no number until it is issued. */
export async function createDraftAction(
  input: unknown
): Promise<DraftInvoiceResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée." };

  const parsed = draftInvoiceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }

  const result = await createDraft(toServiceInput(parsed.data), user);
  if (result.status === "success") revalidatePath("/invoices");
  return result;
}

/** Rewrites a draft. Refused on anything already issued. */
export async function updateDraftAction(
  input: unknown
): Promise<DraftInvoiceResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée." };

  const parsed = updateDraftSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }

  const { id, ...data } = parsed.data;
  const result = await updateDraft(id, toServiceInput(data), user);
  if (result.status === "success") revalidatePath("/invoices");
  return result;
}

const idSchema = z.object({ id: z.uuid() });

/** Discards a draft. Nothing leaves the numbering series with it. */
export async function deleteDraftAction(
  input: unknown
): Promise<DraftInvoiceResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée." };

  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Données invalides." };

  const result = await deleteDraft(parsed.data.id, user);
  if (result.status === "success") revalidatePath("/invoices");
  return result;
}
