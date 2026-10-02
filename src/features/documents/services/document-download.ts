import "server-only";

import { z } from "zod";
import type { DocumentOrigin } from "@/features/documents/download";
import { BUCKET } from "@/features/documents/services/generate-document";
import { SIGNED_BUCKET } from "@/features/documents/services/signed-document-service";
import { INVOICE_BUCKET } from "@/features/invoices/services/generate-invoice";
import { invoiceVisibilityFilter } from "@/features/invoices/services/invoice-service";
import { rentalVisibilityFilter } from "@/features/rentals/services/rental-service";
import type { CurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type DownloadableDocument = {
  bucket: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
};

/** Generated documents are always PDFs — the renderer produces nothing else. */
const PDF = "application/pdf";

const schema = z.object({
  origin: z.enum(["generated", "signed", "invoice"]),
  // Straight from the URL, so it is checked before Prisma sees it: a uuid
  // column asked for "nonsense" raises rather than returning nothing.
  id: z.uuid(),
});

/**
 * The stored file behind a download, if this user may have it.
 *
 * Both buckets are resolved here so the route handler holds no knowledge of
 * which one a document lives in. Visibility is the rentals' own, as in every
 * other read: a document is exactly as reachable as the booking it belongs to.
 *
 * Absent and forbidden both answer null — a document someone may not see
 * should not be confirmed to exist.
 */
export async function findDownloadableDocument(
  origin: string,
  id: string,
  user: CurrentUser
): Promise<DownloadableDocument | null> {
  const parsed = schema.safeParse({ origin, id });
  if (!parsed.success) return null;

  // Invoices answer to their own permissions rather than to a booking's
  // visibility — they exist without one — so they are resolved before the
  // rental filter is even built.
  if (parsed.data.origin === "invoice") {
    const visible = invoiceVisibilityFilter(user);
    if (visible === null) return null;
    const invoice = await prisma.invoice.findFirst({
      where: { id: parsed.data.id, storagePath: { not: null }, ...visible },
      select: { storagePath: true, fileName: true },
    });
    return invoice?.storagePath
      ? {
          bucket: INVOICE_BUCKET,
          storagePath: invoice.storagePath,
          fileName: invoice.fileName ?? "facture.pdf",
          mimeType: PDF,
        }
      : null;
  }

  const visible = rentalVisibilityFilter(user);
  if (visible === null) return null;
  const rental = { ...visible, archivedAt: null };

  const which: DocumentOrigin = parsed.data.origin;

  if (which === "generated") {
    const doc = await prisma.generatedDocument.findFirst({
      where: { id: parsed.data.id, rental },
      select: { storagePath: true, fileName: true },
    });
    return doc ? { bucket: BUCKET, ...doc, mimeType: PDF } : null;
  }

  const doc = await prisma.signedDocument.findFirst({
    where: { id: parsed.data.id, rental },
    select: { storagePath: true, fileName: true, mimeType: true },
  });
  return doc ? { bucket: SIGNED_BUCKET, ...doc } : null;
}
