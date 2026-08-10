import type { IdentityDocumentType } from "@/generated/prisma/enums";
import { ID_DOC_TYPES } from "@/features/contacts/components/contact-type-labels";
import type { Bilingual } from "@/features/documents/templates/rental-confirmation";

/**
 * Bilingual caption for a tenant's identity document — "ID card / CNI" rather
 * than the generic "ID document / Pièce d'identité".
 *
 * This used to normalise accents, case and punctuation to recognise whatever
 * free text a form had written into `Contact.idDocType`, and printed anything
 * it could not place verbatim. The column is now the `IdentityDocumentType`
 * enum, so there is nothing left to guess.
 *
 * Both languages come from ID_DOC_TYPES, the same table the forms offer, so a
 * document cannot caption a document type differently from the field that
 * collected it.
 */
export function idDocLabel(type: IdentityDocumentType): Bilingual {
  const entry = ID_DOC_TYPES.find((t) => t.value === type);
  return { en: entry?.labelEn ?? type, fr: entry?.label ?? type };
}
