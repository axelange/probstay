"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { roundToCents } from "@/features/invoices/reference";
import { INVOICE_BUCKET } from "@/features/invoices/services/generate-invoice";
import {
  attachInvoiceFile,
  createDraft,
  deleteDraft,
} from "@/features/invoices/services/invoice-service";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";
import { normalizeFileName } from "@/lib/uploads";

/** Mirrors the bucket's own limit, so a refusal is explained here first. */
const MAX_BYTES = 10 * 1024 * 1024;

const schema = z.object({
  family: z.enum(["FEE", "FUND_CALL"]),
  clientId: z.uuid(),
  rentalId: z
    .union([z.literal(""), z.uuid()])
    .optional()
    .transform((value) =>
      value === "" || value === undefined ? undefined : value
    ),
  description: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  dueOn: z
    .union([z.literal(""), z.iso.date()])
    .optional()
    .transform((value) =>
      value === "" || value === undefined ? undefined : value
    ),
  vatRate: z.coerce.number().min(0).max(100),
  // Read off the document being imported rather than computed: the app is
  // recording what someone else drew up, not producing it.
  totalHt: z.coerce.number().min(0).max(10_000_000),
  notes: z
    .string()
    .trim()
    .max(2_000)
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
});

export type ImportInvoiceResult =
  | { status: "success"; id: string }
  | { status: "error"; message: string };

/**
 * Records an invoice drawn up elsewhere.
 *
 * It lands as a draft like any other, so it takes its number the same way, at
 * the same moment, from the same series — the register has to read as one
 * sequence whatever produced each document. What differs is that the file
 * comes from outside and nothing will be rendered for it.
 *
 * The row is written before the upload because the object key is built from
 * its id. If the file then fails to land, the draft is removed rather than
 * left pointing at nothing — it has no number yet, so nothing is lost.
 */
export async function importInvoiceAction(
  formData: FormData
): Promise<ImportInvoiceResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée." };

  const parsed = schema.safeParse({
    family: formData.get("family"),
    clientId: formData.get("clientId"),
    rentalId: formData.get("rentalId") ?? undefined,
    description: formData.get("description") ?? undefined,
    dueOn: formData.get("dueOn") ?? undefined,
    vatRate: formData.get("vatRate"),
    totalHt: formData.get("totalHt"),
    notes: formData.get("notes") ?? undefined,
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }
  const data = parsed.data;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Aucun fichier reçu." };
  }
  if (file.size > MAX_BYTES) {
    return { status: "error", message: "Fichier trop volumineux (10 Mo maximum)." };
  }
  if (file.type !== "application/pdf") {
    return { status: "error", message: "La facture doit être un PDF." };
  }

  const vatAmount = roundToCents((data.totalHt * data.vatRate) / 100);

  const draft = await createDraft(
    {
      family: data.family,
      clientId: data.clientId,
      rentalId: data.rentalId,
      description: data.description,
      dueOn: data.dueOn ? new Date(data.dueOn) : undefined,
      vatRate: data.vatRate,
      notes: data.notes,
      lines: [],
      totals: { totalHt: data.totalHt, vatAmount },
    },
    user,
    "UPLOADED"
  );
  if (draft.status === "error") return draft;

  const fileName = normalizeFileName(file.name);
  const storagePath = `${draft.id}/${crypto.randomUUID()}.pdf`;

  const supabase = await createClient();
  const { error } = await supabase.storage
    .from(INVOICE_BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (error) {
    console.error("importInvoiceAction upload failed", error);
    // The draft would point at nothing. It holds no number, so removing it
    // costs the series nothing.
    await deleteDraft(draft.id, user);
    return { status: "error", message: "Envoi impossible." };
  }

  await attachInvoiceFile(draft.id, storagePath, fileName, user);

  revalidatePath("/invoices");
  return { status: "success", id: draft.id };
}
