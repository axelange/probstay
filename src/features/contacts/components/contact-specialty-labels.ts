import type { ContactSpecialty } from "@/generated/prisma/enums";

/**
 * Identifiers are English, labels French — per the coding guidelines,
 * and the same split already used for roles and contact types.
 */
export const CONTACT_SPECIALTY_LABELS: Record<ContactSpecialty, string> = {
  CLEANING: "Ménage",
  BAILIFF: "Huissier",
  DESIGN: "Design",
  ARCHITECT: "Architecte",
  PLUMBING: "Plombier",
  ELECTRICAL: "Électricien",
  HVAC: "Climatiseur",
  CONSTRUCTION: "BTP",
  BUSINESS_INTRODUCER: "Apporteur d'affaire",
  ACCOUNTING: "Comptable",
  EVENTS: "Évènements",
  CATERING: "Chef/Traiteur",
  TRANSPORT: "Transporteur",
  OTHER: "Autre",
};

/**
 * Display order, matching the order the list was given in. OTHER stays
 * last: it is the escape hatch, not a peer of the others.
 */
export const CONTACT_SPECIALTIES: ContactSpecialty[] = [
  "CLEANING",
  "BAILIFF",
  "DESIGN",
  "ARCHITECT",
  "PLUMBING",
  "ELECTRICAL",
  "HVAC",
  "CONSTRUCTION",
  "BUSINESS_INTRODUCER",
  "ACCOUNTING",
  "EVENTS",
  "CATERING",
  "TRANSPORT",
  "OTHER",
];

export function contactSpecialtyLabel(specialty: string): string {
  return CONTACT_SPECIALTY_LABELS[specialty as ContactSpecialty] ?? specialty;
}

/**
 * What to show for a contact: the named trades, with OTHER replaced by
 * whatever was typed. A contact marked OTHER with nothing written falls
 * back to "Autre" rather than rendering an empty badge.
 */
export function specialtyLabels(
  specialties: readonly ContactSpecialty[],
  otherSpecialty: string | null
): string[] {
  return CONTACT_SPECIALTIES.filter((s) => specialties.includes(s)).map((s) =>
    s === "OTHER" ? (otherSpecialty?.trim() || "Autre") : contactSpecialtyLabel(s)
  );
}
