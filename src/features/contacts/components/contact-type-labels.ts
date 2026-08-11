import type {
  ContactType,
  IdentityDocumentType,
} from "@/generated/prisma/enums";

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
/**
 * The identity documents, in the order they are offered.
 *
 * The stored value is the `IdentityDocumentType` enum; the label is only what
 * a French-speaking user reads. They were the same thing when the column held
 * free text, which is why "CNI" used to be both — a contract then had to guess
 * what an unrecognised spelling meant.
 */
export const ID_DOC_TYPES = [
  { value: "ID_CARD", label: "CNI", labelEn: "ID card" },
  { value: "PASSPORT", label: "Passeport", labelEn: "Passport" },
  {
    value: "DRIVING_LICENSE",
    label: "Permis de conduire",
    labelEn: "Driving licence",
  },
  {
    value: "RESIDENCE_PERMIT",
    label: "Titre de séjour",
    labelEn: "Residence permit",
  },
  {
    value: "COMPANY_REGISTRATION",
    label: "Extrait KBIS ou équivalent",
    labelEn: "Company registration extract",
  },
] as const satisfies readonly {
  value: IdentityDocumentType;
  label: string;
  labelEn: string;
}[];

/**
 * The documents a natural person presents.
 *
 * The registration extract sits in the same table and the same bucket — it
 * identifies a party too — but it is a company's paper, so it never belongs in
 * a picker asking someone which ID they hold.
 */
export const PERSON_ID_DOC_TYPES = ID_DOC_TYPES.filter(
  (t) => t.value !== "COMPANY_REGISTRATION"
);

/** How recent a registration extract must be, in months, at signature. */
export const COMPANY_REGISTRATION_MAX_AGE_MONTHS = 3;

/**
 * The English label sits beside the French one because two audiences read
 * these: the agency, in French, and the client filling in their own details,
 * who is often not French-speaking. Keeping both in one table is what stops
 * the contract calling it an "ID card" while the form offers a "CNI".
 */
export function idDocTypeLabel(type: IdentityDocumentType): string {
  return ID_DOC_TYPES.find((t) => t.value === type)?.label ?? type;
}
