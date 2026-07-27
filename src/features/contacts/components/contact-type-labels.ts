import type { ContactType } from "@/generated/prisma/enums";

/** Types are English in code, French on screen, per the guidelines. */
export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  OWNER: "Propriétaire",
  CLIENT: "Client",
  PARTNER: "Partenaire",
  PROVIDER: "Prestataire",
  PROSPECT: "Prospect",
};

/** Declaration order, used to keep badges in a stable sequence. */
export const CONTACT_TYPES: ContactType[] = [
  "OWNER",
  "CLIENT",
  "PARTNER",
  "PROVIDER",
  "PROSPECT",
];

export function contactTypeLabel(type: string): string {
  return CONTACT_TYPE_LABELS[type as ContactType] ?? type;
}

/**
 * The identity documents accepted on a contract. Stored as the displayed
 * text (the column is free text and documents print it verbatim) — one
 * list shared by the contact form and the contract completion step.
 */
export const ID_DOC_TYPES = ["CNI", "Passeport", "Permis de conduire"] as const;
