import type { Bilingual } from "@/features/documents/templates/rental-confirmation";

/**
 * Bilingual caption for a tenant's identity document — "ID card / CNI" rather
 * than the generic "ID document / Pièce d'identité".
 *
 * `Contact.idDocType` is free text, not the `IdentityDocumentType` enum: both
 * contact forms write the French labels from `ID_DOC_TYPES` ("CNI",
 * "Passeport", "Permis de conduire"), and the column's comment allows others
 * still ("Titre de séjour…"). Matching on the enum's spellings therefore never
 * hit, and every tenant fell through to the generic caption. Accents, case and
 * punctuation are normalised away so "CNI", "Carte d'identité" and a legacy
 * "ID_CARD" all land on the same row, and an unrecognised value prints as
 * stored instead of being flattened — the type is never lost.
 */
export function idDocLabel(type: string): Bilingual {
  const key = type
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]+/g, " ")
    .trim();
  switch (key) {
    case "cni":
    case "id card":
    case "carte d identite":
    case "carte nationale d identite":
      return { en: "ID card", fr: "CNI" };
    case "passeport":
    case "passport":
      return { en: "Passport", fr: "Passeport" };
    case "permis":
    case "permis de conduire":
    case "driving license":
    case "driving licence":
      return { en: "Driving licence", fr: "Permis de conduire" };
    case "titre de sejour":
    case "residence permit":
      return { en: "Residence permit", fr: "Titre de séjour" };
    default:
      return { en: "ID document", fr: type.trim() };
  }
}
