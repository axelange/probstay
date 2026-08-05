import "server-only";

import * as React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { CurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import { registerDocumentFonts } from "@/features/documents/fonts.node";
import {
  documentFileName,
  TEMPLATE_TYPE,
} from "@/features/documents/reference";
import { buildConfirmationData } from "@/features/documents/services/build-confirmation-data";
import { buildContratData } from "@/features/documents/services/build-contrat-data";
import { currentTemplateClauses } from "@/features/documents/services/template-service";
import type { DocumentType } from "@/features/documents/services/document-readiness";
import { ContratLocationSaisonniere } from "@/features/documents/templates/contrat-location-saisonniere";
import { RentalConfirmation } from "@/features/documents/templates/rental-confirmation";

export const BUCKET = "generated-documents";

export type GenerateResult =
  | { status: "success"; id: string; fileName: string }
  | { status: "error"; message: string };

/**
 * Produces a document for a rental: renders the PDF on the server, stores the
 * file, and records what was produced.
 *
 * The render happens here rather than in the browser because this file is the
 * one that gets sent and relied on — it has to be reproducible and attributable,
 * not whatever a particular machine's fonts and viewer made of it. It goes
 * through the same components as the preview, so what an agent approved on
 * screen is what is written.
 *
 * Permission is inherited from the data builders, which return null unless the
 * user may see the rental (MANAGE_RENTALS, or an agent on either side of it) —
 * one rule, already used by the preview, rather than a second copy that could
 * drift from it.
 */
export async function generateDocument(
  rentalId: string,
  type: DocumentType,
  user: CurrentUser
): Promise<GenerateResult> {
  const templateType = TEMPLATE_TYPE[type];

  // Build the data and resolve which wording produced it. The builders read
  // the clauses themselves; this reads the version alongside, so the record
  // can pin the wording even after the template moves on.
  const [data, template] = await Promise.all([
    type === "CONFIRMATION"
      ? buildConfirmationData(rentalId, user)
      : buildContratData(rentalId, user),
    currentTemplateClauses(templateType),
  ]);

  if (!data) {
    return {
      status: "error",
      message: "Location introuvable ou inaccessible.",
    };
  }

  registerDocumentFonts();

  const element =
    type === "CONFIRMATION"
      ? React.createElement(RentalConfirmation, {
          data: data as Parameters<typeof RentalConfirmation>[0]["data"],
        })
      : React.createElement(ContratLocationSaisonniere, {
          data: data as Parameters<typeof ContratLocationSaisonniere>[0]["data"],
        });

  let pdf: Buffer;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pdf = await renderToBuffer(element as any);
  } catch (error) {
    console.error("generateDocument render failed", error);
    return { status: "error", message: "Le document n'a pas pu être rendu." };
  }

  const fileName = documentFileName(type, data.reference, data.tenant.name);
  // Opaque, ASCII, collision-free. The readable name is applied at download
  // time by the signed URL, so a tenant's name never becomes a storage key.
  const storagePath = `${rentalId}/${crypto.randomUUID()}.pdf`;

  // The session client, not a service key: the bucket's policies mirror rental
  // visibility, so letting them run is a second check rather than a bypassed one.
  const supabase = await createClient();
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, pdf, {
      contentType: "application/pdf",
      upsert: false, // nothing is ever replaced
    });

  if (uploadError) {
    console.error("generateDocument upload failed", uploadError);
    return { status: "error", message: "L'enregistrement du fichier a échoué." };
  }

  try {
    const record = await prisma.generatedDocument.create({
      data: {
        rentalId,
        type: templateType,
        reference: data.reference ?? "",
        fileName,
        storagePath,
        templateVersion: template.version,
        generatedById: user.id,
      },
      select: { id: true },
    });
    return { status: "success", id: record.id, fileName };
  } catch (error) {
    // The row is what makes the file findable; an orphaned object would be
    // invisible and unreachable, so remove it rather than leave it behind.
    console.error("generateDocument record failed", error);
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return { status: "error", message: "L'enregistrement du document a échoué." };
  }
}
