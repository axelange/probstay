import "server-only";

import * as React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { getAgency } from "@/features/documents/agency";
import { registerDocumentFonts } from "@/features/documents/fonts.node";
import { buildInvoiceDocument } from "@/features/invoices/build-invoice-document";
import { invoiceFileName } from "@/features/invoices/reference";
import { getInvoice } from "@/features/invoices/services/invoice-service";
import { Facture } from "@/features/invoices/templates/facture";
import type { CurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";

export const INVOICE_BUCKET = "invoices";

export type GenerateInvoiceResult =
  | { status: "success"; fileName: string }
  | { status: "error"; message: string };

/**
 * Renders an issued invoice's PDF, stores it, and points the row at it.
 *
 * Separate from creating the record on purpose. The number is drawn from the
 * series when the invoice is issued, and a render that fails afterwards must
 * not take that number out of it — so the invoice is complete first and the
 * file catches up, which is also what lets a failed render be retried.
 *
 * An invoice that already has a file keeps it. Re-rendering would produce a
 * second object for a document a client may already hold, and the two could
 * differ the day the template moves; the same reasoning that makes generated
 * documents append-only makes this one refuse outright.
 */
export async function generateInvoicePdf(
  invoiceId: string,
  user: CurrentUser
): Promise<GenerateInvoiceResult> {
  const [invoice, agency] = await Promise.all([
    getInvoice(invoiceId, user),
    getAgency(),
  ]);

  if (!invoice) {
    return { status: "error", message: "Facture introuvable." };
  }
  if (invoice.hasPdf) {
    return { status: "error", message: "Cette facture a déjà son PDF." };
  }
  if (invoice.source === "UPLOADED") {
    return { status: "error", message: "Cette facture a été importée." };
  }
  // The number and the date are printed on it, so there is nothing to render
  // before they exist. A draft is issued first, never the other way round.
  if (invoice.reference === null || invoice.issuedOn === null) {
    return {
      status: "error",
      message: "Une facture doit être émise avant d'être imprimée.",
    };
  }

  registerDocumentFonts();

  const reference = invoice.reference;
  // The same builder the editor's preview uses, so the file is what the agent
  // approved on screen rather than a second rendering of the same figures.
  const data = buildInvoiceDocument({
    family: invoice.family,
    title: invoice.title,
    reference,
    description: invoice.description,
    issuedOn: invoice.issuedOn,
    dueOn: invoice.dueOn,
    agency,
    client: { name: invoice.clientName, address: invoice.clientAddress },
    lines: invoice.lines,
    vatRate: invoice.vatRate,
    totalHt: invoice.totalHt,
    vatAmount: invoice.vatAmount,
    notes: invoice.notes,
  });

  let pdf: Buffer;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pdf = await renderToBuffer(React.createElement(Facture, { data }) as any);
  } catch (error) {
    console.error("generateInvoicePdf render failed", error);
    return { status: "error", message: "Le document n'a pas pu être rendu." };
  }

  const fileName = invoiceFileName(reference, invoice.clientName);
  // Opaque and collision-free, like every other bucket here. The readable name
  // is applied by the download route, so a client's name is never a storage key.
  const storagePath = `${invoice.id}/${crypto.randomUUID()}.pdf`;

  const supabase = await createClient();
  const { error: uploadError } = await supabase.storage
    .from(INVOICE_BUCKET)
    .upload(storagePath, pdf, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    console.error("generateInvoicePdf upload failed", uploadError);
    return { status: "error", message: "L'enregistrement du fichier a échoué." };
  }

  try {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { storagePath, fileName },
    });
  } catch (error) {
    // The pointer is what makes the file reachable; without it the object is
    // an orphan nobody can open, so it goes back out.
    console.error("generateInvoicePdf record failed", error);
    await supabase.storage.from(INVOICE_BUCKET).remove([storagePath]);
    return { status: "error", message: "L'enregistrement du PDF a échoué." };
  }

  return { status: "success", fileName };
}
