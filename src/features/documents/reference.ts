/**
 * Document reference numbers.
 *
 * A rental carries one number for its whole life (`Rental.reference`, assigned
 * by the database at creation). Each document it produces prints that number
 * behind a prefix naming the document type, so "RC-0001240" and "SRC-0001240"
 * are visibly the same booking seen through two different papers — the owner's
 * confirmation and the tenant's contract.
 *
 * The prefix is the only thing that varies, which is why it lives here rather
 * than being spelled out in each builder.
 */

import type { DocumentType } from "@/features/documents/services/document-readiness";

/**
 * Width the rental number is padded to: 0001240, not 1240.
 *
 * Seven digits, and the series opens at 1240 (see `Rental.reference`) —
 * together they keep the reference from reading as a count. A client holding
 * "RC-0001240" cannot tell whether it is BSTAY's 1,240th booking or its first,
 * which is the point: the paperwork should not disclose the agency's volume.
 */
const REFERENCE_DIGITS = 7;

/** Prefix per document type. Extend alongside DocumentTemplateType. */
const PREFIX: Record<DocumentType, string> = {
  // Rental Confirmation — the owner-facing house charte.
  CONFIRMATION: "RC",
  // Seasonal Rental Contract — contrat de location saisonnière.
  CONTRAT: "SRC",
};

/**
 * The rental's own number, zero-padded: `1240` → `"0001240"`. Past seven digits
 * it simply grows rather than truncating — a wrong number is worse than a wide
 * one.
 */
export function formatRentalReference(reference: number): string {
  return String(reference).padStart(REFERENCE_DIGITS, "0");
}

/** The reference a document prints: `("CONFIRMATION", 1240)` → `"RC-0001240"`. */
export function documentReference(
  type: DocumentType,
  reference: number
): string {
  return `${PREFIX[type]}-${formatRentalReference(reference)}`;
}
