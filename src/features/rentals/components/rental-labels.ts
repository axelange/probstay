import type {
  IdentityDocumentType,
  RentalBookingStatus,
  RentalPaymentStatus,
} from "@/generated/prisma/enums";

/** Identifiers English, labels French — as for roles and contact types. */
export const BOOKING_STATUS_LABELS: Record<RentalBookingStatus, string> = {
  INQUIRY: "Demande",
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

export const IDENTITY_TYPE_LABELS: Record<IdentityDocumentType, string> = {
  PASSPORT: "Passeport",
  ID_CARD: "Carte d'identité",
  DRIVING_LICENSE: "Permis de conduire",
};

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

export function identityTypeLabel(type: string): string {
  return IDENTITY_TYPE_LABELS[type as IdentityDocumentType] ?? type;
}

const MONEY = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
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
