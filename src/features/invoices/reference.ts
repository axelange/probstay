/**
 * Numbering for both documents, and the file names built from it.
 *
 * Each family runs its own continuous counter in the database
 * (`invoices_number_seq`, `fund_calls_number_seq`); what gets printed is
 * assembled here — the same split the rentals reference uses, where the column
 * holds the number and the formatter decides how it reads.
 *
 * A fee invoice prints "2026-0240": the year it was issued, then the number on
 * four digits. The counter opens at 240 rather than 1 because the agency was
 * invoicing before this software existed and its series continues — an
 * accountant should find 239 followed by 240, not a second series starting
 * over. Four digits leave room to 9999 a year and keep every reference the
 * same width, which is what makes a column of them readable.
 *
 * A fund call prints "LOC-2026-0001" — the same shape behind a prefix naming
 * what it belongs to, a location. The two registers must never be mistaken for
 * one another, and without it these numbers would read like an invoice's.
 *
 * Neither counter restarts in January. A series that resets has to be proven
 * complete year by year, while one that never does is complete by
 * construction — and the year in front still tells an accountant which
 * exercice a document belongs to at a glance.
 *
 * Client-safe: no server imports, so the lists and the PDF all read from here.
 */

import type { InvoiceFamily, InvoiceStatus } from "@/generated/prisma/enums";

/** Width the counter is padded to: 0240, not 240. */
const NUMBER_DIGITS = 4;

/** `("FEE", 240, 2026-08-20)` → `"2026-0240"`; a fund call takes "LOC-". */
export function invoiceReference(
  family: InvoiceFamily,
  invoiceNumber: number,
  issuedOn: Date
): string {
  const year = issuedOn.getFullYear();
  // Past four digits it simply grows rather than truncating — a wrong number
  // is worse than a wide one.
  const padded = String(invoiceNumber).padStart(NUMBER_DIGITS, "0");
  return family === "FUND_CALL" ? `LOC-${year}-${padded}` : `${year}-${padded}`;
}

/**
 * The reference of an invoice that may not have one yet.
 *
 * A draft carries neither number nor issue date — it takes both at issue — so
 * there is nothing to print for one. Null rather than a placeholder, so each
 * screen decides how to say "not yet numbered" in its own space.
 */
export function invoiceReferenceOrNull(
  family: InvoiceFamily,
  invoiceNumber: number | null,
  issuedOn: Date | null
): string | null {
  return invoiceNumber !== null && issuedOn !== null
    ? invoiceReference(family, invoiceNumber, issuedOn)
    : null;
}

/**
 * The name the PDF is saved and downloaded under:
 * `"2026-0240 - Villa Rose SCI.pdf"`.
 *
 * Reference first, so a folder of these sorts by number rather than by client,
 * and the client second because that is what someone scans for when the number
 * means nothing to them yet. The client name is cleaned the same way a
 * document's is — free text an agent typed can carry a slash, which a download
 * and a storage key both read as a path separator.
 */
export function invoiceFileName(reference: string, clientName: string): string {
  const client = clientName
    .replace(/[/\\:*?"<>|]|\p{Cc}/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `${[reference, client].filter(Boolean).join(" - ")}.pdf`;
}

/**
 * What each document is called on screen. Never "facture" for the second one —
 * that is the whole point of the family, and the wording has to hold wherever
 * the word could appear, not only on the PDF.
 *
 * The document itself says something else again: "Payment Request / Demande de
 * paiement". The screens speak of an avis de paiement, the paper asks for it.
 * Both are set out where they are used — here for the app, in the template for
 * the document.
 */
export const INVOICE_FAMILY_LABEL: Record<InvoiceFamily, string> = {
  FEE: "Facture d'honoraires",
  FUND_CALL: "Avis de paiement",
};

/** The short form, for a column header or a badge. */
export const INVOICE_FAMILY_SHORT: Record<InvoiceFamily, string> = {
  FEE: "Facture",
  FUND_CALL: "Avis de paiement",
};

/**
 * The terms a document is payable under, in days.
 *
 * Counted in days, not months: a fee invoice drawn up on 31 January falls due
 * on 3 March. The term is a number of days the client has, never "the same
 * date next month".
 */
export const PAYMENT_TERM_DAYS = 31;

/** What a fund call for a balance or a caution allows, from its issue. */
export const FUND_CALL_TERM_DAYS = 7;

/**
 * How close to the stay a booking has to be for everything to be settled at
 * signature instead of called for in advance.
 */
export const SIGNATURE_WINDOW_DAYS = 31;

/**
 * How far ahead of arrival each call goes out. The agency asks for the balance
 * two months before and the caution one month before, so a reminder appears
 * that far out and grows more pressing as the date passes.
 */
export const FUND_CALL_LEAD_DAYS = {
  BALANCE: 60,
  SECURITY_DEPOSIT: 30,
} as const;

/**
 * A date shifted by whole days, on the Paris calendar.
 *
 * The calendar day rather than the instant: a draft opened at half past
 * midnight belongs to today here, and counting from the instant would date it
 * from yesterday and land a day short. Negative shifts go backwards, which is
 * how "the day before arrival" is expressed.
 */
export function addDays(from: Date, days: number): Date {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
  }).format(from);
  const shifted = new Date(`${day}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted;
}

/** Whether two dates fall on the same day, ignoring the time of day. */
export function sameDay(a: Date, b: Date): boolean {
  return addDays(a, 0).getTime() === addDays(b, 0).getTime();
}

/**
 * The provisional deadline a draft opens with: the day it is drawn up plus the
 * usual term. What actually binds is settled at issue — see `dueDateAtIssue`,
 * which recomputes it unless the agent has set one themselves.
 */
export function defaultDueDate(from: Date = new Date()): Date {
  return addDays(from, PAYMENT_TERM_DAYS);
}

/**
 * A status, agreed with the document it describes: une facture is émise, un
 * avis de paiement is émis. Two families, two genders, and a badge reading
 * "Émise" beside an avis would be a slip a French reader sees at once.
 */
const STATUS_LABEL: Record<InvoiceStatus, { fr: string; masculine: string }> = {
  DRAFT: { fr: "Brouillon", masculine: "Brouillon" },
  ISSUED: { fr: "Émise", masculine: "Émis" },
  PAID: { fr: "Payée", masculine: "Payé" },
  CANCELLED: { fr: "Annulée", masculine: "Annulé" },
};

export function invoiceStatusLabel(
  status: InvoiceStatus,
  family: InvoiceFamily
): string {
  const label = STATUS_LABEL[status];
  return family === "FUND_CALL" ? label.masculine : label.fr;
}

/** Whether the app produced the PDF, or someone handed one over. */
export const INVOICE_SOURCE_LABEL = {
  GENERATED: "Générée",
  UPLOADED: "Importée",
} as const;

/**
 * Rounds to the cent, half away from zero.
 *
 * A line total is a quantity times a unit price, and both carry two decimals,
 * so the product can land on four — 1,5 × 33,33 = 49,995. Left alone it would
 * be stored to two decimals by Postgres anyway, but only after the sum had
 * been taken on the unrounded values, and the total on the paper would then
 * disagree with the lines above it by a cent.
 */
export function roundToCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export type InvoiceTotals = {
  totalHt: number;
  vatAmount: number;
  totalTtc: number;
};

/**
 * The three figures an invoice prints, from its lines and its rate.
 *
 * Each line is rounded before the sum, so the total is exactly what a reader
 * gets by adding the printed line amounts. TTC is an addition of two figures
 * already at the cent, so it never needs rounding of its own.
 */
export function invoiceTotals(
  lines: { quantity: number; unitPrice: number }[],
  vatRate: number
): InvoiceTotals {
  const totalHt = roundToCents(
    lines.reduce(
      (sum, line) => sum + roundToCents(line.quantity * line.unitPrice),
      0
    )
  );
  const vatAmount = roundToCents((totalHt * vatRate) / 100);
  return { totalHt, vatAmount, totalTtc: totalHt + vatAmount };
}
