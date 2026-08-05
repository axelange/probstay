/**
 * Document reference numbers, and the file names built from them.
 *
 * A rental carries one number for its whole life (`Rental.reference`, assigned
 * by the database at creation). Each document it produces prints that number
 * behind a prefix naming the document type, so "RC-0001240" and "SRA-0001240"
 * are visibly the same booking seen through two different papers — the owner's
 * confirmation and the tenant's contract.
 *
 * The prefix is the only thing that varies, which is why it lives here rather
 * than being spelled out in each builder. The saved file is named from the
 * same pair, so a document is identifiable from the file name alone, without
 * opening it — which is how these actually get handled once they leave the
 * app, sitting in a mailbox or a folder among other people's paperwork.
 *
 * Client-safe: `DocumentType` is imported as a type only, so nothing from the
 * server-only readiness module survives compilation.
 */

import type { DocumentType } from "@/features/documents/services/document-readiness";
import type { DocumentTemplateTypeKey } from "@/features/documents/template-clauses";

/**
 * The stored template type behind each document. Two vocabularies exist —
 * the UI's short one and the enum's explicit one — so the crossing is made
 * once, here, rather than re-spelled at each call site.
 */
export const TEMPLATE_TYPE: Record<DocumentType, DocumentTemplateTypeKey> = {
  CONFIRMATION: "RENTAL_CONFIRMATION",
  CONTRAT: "SEASONAL_RENTAL_CONTRACT",
};

/** The same crossing the other way, for rows read back from the database. */
export const DOCUMENT_TYPE_OF_TEMPLATE: Record<
  DocumentTemplateTypeKey,
  DocumentType
> = {
  RENTAL_CONFIRMATION: "CONFIRMATION",
  SEASONAL_RENTAL_CONTRACT: "CONTRAT",
};

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
  // Seasonal Rental Agreement — contrat de location saisonnière. The master
  // prints "SRA-", after the document's own title.
  CONTRAT: "SRA",
};

/**
 * What each document is called in the file name. French, like the documents
 * themselves and the rest of the UI — these files go to owners and tenants.
 */
export const DOCUMENT_NAME: Record<DocumentType, string> = {
  CONFIRMATION: "Confirmation de location",
  CONTRAT: "Contrat de location saisonnière",
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

/**
 * Makes one segment safe to sit in a file name.
 *
 * A tenant's name is free text an agent typed, so it can carry a slash
 * ("Dupont / Martin") — which a browser download and a storage key both read
 * as a path separator, silently truncating the name or failing the write.
 * Reserved characters become spaces rather than being dropped, so words never
 * run together.
 */
function fileNameSegment(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const cleaned = value
    .replace(/[/\\:*?"<>|]|\p{Cc}/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  // fullName() prints an em dash when a rental has no contact at all. That is
  // a placeholder, not a name, and has no business in a file name.
  return cleaned && cleaned !== "—" ? cleaned : undefined;
}

/**
 * The name the document is saved under — reference, tenant, then kind:
 * `"RC-0001240 - John Berntal - Confirmation de location.pdf"`.
 *
 * Reference first so a folder of these sorts by booking rather than by kind,
 * putting a rental's two documents side by side; the tenant next because that
 * is what someone scans for when the reference means nothing to them yet.
 *
 * `reference` is the printed reference the document already carries, not the
 * raw number — the builders resolve it once, and the file name repeats what is
 * on the page rather than deriving it a second way and risking disagreement.
 * Any part that is missing is left out rather than leaving an empty gap, so a
 * document still gets a meaningful name when a rental has no tenant yet.
 */
export function documentFileName(
  type: DocumentType,
  reference: string | undefined,
  tenant: string | undefined
): string {
  const parts = [reference, fileNameSegment(tenant), DOCUMENT_NAME[type]];
  return `${parts.filter((p) => p).join(" - ")}.pdf`;
}
