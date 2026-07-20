import type { ContactType } from "@/generated/prisma/enums";

/** Types are English in code, French on screen, per the guidelines. */
export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  OWNER: "Propriétaire",
  CLIENT: "Client",
  PARTNER: "Partenaire",
  PROVIDER: "Prestataire",
};

/** Declaration order, used to keep badges in a stable sequence. */
export const CONTACT_TYPES: ContactType[] = [
  "OWNER",
  "CLIENT",
  "PARTNER",
  "PROVIDER",
];

export function contactTypeLabel(type: string): string {
  return CONTACT_TYPE_LABELS[type as ContactType] ?? type;
}
