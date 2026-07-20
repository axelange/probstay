import type {
  RentalBookingStatus,
  RentalPaymentStatus,
} from "@/generated/prisma/enums";

/** Identifiers English, labels French — as for roles and contact types. */
export const BOOKING_STATUS_LABELS: Record<RentalBookingStatus, string> = {
  INQUIRY: "Demande",
  BOOKING_CONFIRMATION: "Confirmation propriétaire",
  CONTRACT: "Contrat",
  KYC: "KYC",
  CHECK_IN: "Arrivée",
  CHECK_OUT: "Départ",
  CANCELLED: "Annulée",
};

/**
 * The pipeline in order. CANCELLED is deliberately outside it: it is
 * reachable from any stage and is not a step forward, so showing it as
 * the seventh position would misrepresent the process.
 */
export const BOOKING_PIPELINE: RentalBookingStatus[] = [
  "INQUIRY",
  "BOOKING_CONFIRMATION",
  "CONTRACT",
  "KYC",
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

export function bookingStatusLabel(status: string): string {
  return BOOKING_STATUS_LABELS[status as RentalBookingStatus] ?? status;
}

export function paymentStatusLabel(status: string): string {
  return PAYMENT_STATUS_LABELS[status as RentalPaymentStatus] ?? status;
}

/**
 * Amounts are stored as DECIMAL and converted to number at the data
 * layer, so this only formats. Null is "—" rather than "0 €": an
 * enquiry with no agreed price has no amount, which is not zero.
 */
const MONEY = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function formatAmount(value: number | null): string {
  return value === null ? "—" : MONEY.format(value);
}

const DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  // Pinned: this renders on the server, and an unpinned zone would read
  // differently depending on where that server runs.
  timeZone: "Europe/Paris",
});

export function formatDate(date: Date): string {
  return DATE.format(date);
}

/** "12 juil. – 19 juil. 2026", collapsing the repeated year. */
export function formatStay(checkIn: Date, checkOut: Date): string {
  return `${formatDate(checkIn)} – ${formatDate(checkOut)}`;
}

/** Nights, which is what a stay is actually sold in. */
export function nights(checkIn: Date, checkOut: Date): number {
  const ms = checkOut.getTime() - checkIn.getTime();
  return Math.max(1, Math.round(ms / 86_400_000));
}
