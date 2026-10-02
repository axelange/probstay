"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createProduct,
  setProductArchived,
  updateProduct,
} from "@/features/invoices/services/product-service";
import { getCurrentUser } from "@/lib/auth";

const productSchema = z.object({
  label: z.string().trim().min(1, "Intitulé manquant.").max(200),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  unitPrice: z.coerce.number().min(0).max(10_000_000),
  // Long: the mentions an entry carries run to a paragraph in each language.
  notes: z
    .string()
    .trim()
    .max(5_000)
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
});

const editSchema = z.object({ id: z.uuid() }).and(productSchema);
const archiveSchema = z.object({ id: z.uuid(), archived: z.boolean() });

export type ProductActionResult =
  | { status: "success"; id: string }
  | { status: "error"; message: string };

export async function createProductAction(
  input: unknown
): Promise<ProductActionResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée." };

  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }

  const result = await createProduct(parsed.data, user);
  if (result.status === "success") revalidatePath("/catalog");
  return result;
}

export async function updateProductAction(
  input: unknown
): Promise<ProductActionResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée." };

  const parsed = editSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }

  const { id, ...data } = parsed.data;
  const result = await updateProduct(id, data, user);
  if (result.status === "success") revalidatePath("/catalog");
  return result;
}

/**
 * Withdraws a product, or brings it back.
 *
 * Never a deletion: a product that has been billed is part of what past
 * documents were built from, and the pickers stop offering it without erasing
 * where those lines came from.
 */
export async function setProductArchivedAction(
  input: unknown
): Promise<ProductActionResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée." };

  const parsed = archiveSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Données invalides." };

  const result = await setProductArchived(
    parsed.data.id,
    parsed.data.archived,
    user
  );
  if (result.status === "success") revalidatePath("/catalog");
  return result;
}
