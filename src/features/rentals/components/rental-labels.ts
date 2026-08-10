import type {
  IdentityDocumentType,
  RentalBookingStatus,
  RentalPaymentStatus,
} from "@/generated/prisma/enums";

/**
 * Identifiers English, labels French. INQUIRY is labelled "Informations":
 * a rental only exists once a demande has converted into one, so its
 * opening stage is where the booking's information is completed before the
 * contract — the request itself is a separate Demande.
 */
export const BOOKING_STATUS_LABELS: Record<RentalBookingStatus, string> = {
  INQUIRY: "Informations",
  FINANCIAL: "Financier",
  CONTRACT: "Contrat",
  FINALISATION: "Finalisation",
  CHECK_IN: "Séjour",
  CHECK_OUT: "Départ",
  CANCELLED: "Annulée",
};

/**
 * The pipeline in order. CANCELLED is deliberately outside it: reachable
 * from any stage, and not a step forward.
 */
export const BOOKING_PIPELINE: RentalBookingStatus[] = [
  "INQUIRY",
  "FINANCIAL",
  "CONTRACT",
  "FINALISATION",
  "CHECK_IN",
  "CHECK_OUT",
];

export const BOOKING_STATUSES: RentalBookingStatus[] = [
  ...BOOKING_PIPELINE,
  "CANCELLED",
];

export const PAYMENT_STATUS_LABELS: Record<RentalPaymentStatus, string> = {
  UNPAID: "Impayé",
  PARTIALLY_PAID: "Partiel",
  PAID: "Payé",
  REFUNDED: "Remboursé",
};

export const PAYMENT_STATUSES: RentalPaymentStatus[] = [
  "UNPAID",
  "PARTIALLY_PAID",
  "PAID",
  "REFUNDED",
];

// The identity-document labels used to live here too, spelling ID_CARD
// "Carte d'identité" where the contact forms spelled it "CNI". Nothing read
// them, so they are gone: ID_DOC_TYPES in contact-type-labels.ts is the one
// list, and idDocTypeLabel the one way to name a type.

export const IDENTITY_TYPES: IdentityDocumentType[] = [
  "PASSPORT",
  "ID_CARD",
  "DRIVING_LICENSE",
];

export function bookingStatusLabel(status: string): string {
  return BOOKING_STATUS_LABELS[status as RentalBookingStatus] ?? status;
}

export function paymentStatusLabel(status: string): string {
  return PAYMENT_STATUS_LABELS[status as RentalPaymentStatus] ?? status;
}

// Always two decimals: the agency works to the cent, so a price is
// "10 300,50 €", never rounded to the euro.
const MONEY = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Null is "—" rather than "0 €": an enquiry has no agreed price. */
export function formatAmount(value: number | null): string {
  return value === null ? "—" : MONEY.format(value);
}

const DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Paris",
});

export function formatDate(date: Date): string {
  return DATE.format(date);
}

export function formatStay(checkIn: Date, checkOut: Date): string {
  return `${formatDate(checkIn)} – ${formatDate(checkOut)}`;
}

export function nights(checkIn: Date, checkOut: Date): number {
  const ms = checkOut.getTime() - checkIn.getTime();
  return Math.max(1, Math.round(ms / 86_400_000));
}
