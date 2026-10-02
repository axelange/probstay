import { pdfSpaces } from "@/features/documents/format";
import { roundToCents } from "@/features/invoices/reference";
import type { InvoiceDocumentData } from "@/features/invoices/templates/facture";
import type { InvoiceFamily } from "@/generated/prisma/enums";

/**
 * Turns invoice figures into the strings the template prints.
 *
 * Client-safe, and read from both sides: the generator calls it with a stored
 * invoice, the editor calls it with whatever is currently in the form. That is
 * what makes the live preview honest — it is not an approximation of the
 * document, it is the document, built by the same function and rendered by the
 * same component.
 *
 * Every figure goes through `pdfSpaces`: fr-FR's grouping and currency spaces
 * are ones the document faces cannot draw.
 */

const MONEY = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "1" or "1,5" — a whole quantity should not print two decimals. */
const QUANTITY = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

/** A rate as it is written on the paper: "TVA 20 %", "TVA 5,5 %". */
const RATE = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

const DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Paris",
});

const money = (value: number) => pdfSpaces(MONEY.format(value));

export type InvoiceAgency = {
  legalName: string;
  address: string;
  rcs: string;
  cartePro: string;
  garantieFinanciere: string;
  rcp: string;
  web: string;
  phone: string;
  bankName: string;
  bankAccountName: string;
  bankIban: string;
  bankBic: string;
};

export type InvoiceDocumentInput = {
  family: InvoiceFamily;
  /** The document's own heading, "EN / FR". Null falls back to the family's. */
  title: string | null;
  /** Null while it is a draft: the number is taken at issue. */
  reference: string | null;
  description: string | null;
  /** Null while it is a draft, so the preview shows the day it would bear. */
  issuedOn: Date | null;
  dueOn: Date | null;
  agency: InvoiceAgency;
  client: { name: string; address: string | null };
  lines: {
    label: string;
    description: string | null;
    quantity: number;
    unitPrice: number;
  }[];
  vatRate: number;
  totalHt: number;
  vatAmount: number;
  notes: string | null;
};

export function buildInvoiceDocument(
  input: InvoiceDocumentInput
): InvoiceDocumentData {
  const a = input.agency;

  // A fund call carries no VAT: it asks for money the agency holds on behalf
  // of an owner or a tenant, which is not its own revenue.
  const showVat = input.family === "FEE";

  // "Balance Payment Request / Demande de paiement du solde" splits into the
  // two lines of the masthead. Without a slash the whole string heads the
  // English line, which is what a one-language title should do.
  const [titleEn, titleFr] = (input.title ?? "").split(" / ");

  return {
    family: input.family,
    titleEn: titleEn?.trim() || undefined,
    titleFr: titleFr?.trim() || undefined,
    showVat,
    // A draft says so where the number will go, rather than leaving the slot
    // empty: the agent should see the space the number is about to take.
    reference: input.reference ?? "Brouillon",
    description: input.description ?? undefined,
    // Not yet issued: the date it would carry today, which is what issuing
    // proposes. Nothing is decided by showing it.
    issuedOn: DATE.format(input.issuedOn ?? new Date()),
    dueOn: input.dueOn ? DATE.format(input.dueOn) : undefined,
    agency: {
      legalName: a.legalName,
      address: a.address,
      rcs: a.rcs,
      cartePro: a.cartePro,
      garantieFinanciere: a.garantieFinanciere,
      rcp: a.rcp,
      web: a.web,
      phone: a.phone,
    },
    client: {
      name: input.client.name,
      address: input.client.address ?? undefined,
    },
    lines: input.lines.map((line) => ({
      label: line.label,
      description: line.description ?? undefined,
      quantity: pdfSpaces(QUANTITY.format(line.quantity)),
      unitPrice: money(line.unitPrice),
      amount: money(roundToCents(line.quantity * line.unitPrice)),
    })),
    totals: {
      ht: money(input.totalHt),
      vatLabel: `TVA ${pdfSpaces(RATE.format(input.vatRate))} %`,
      vat: money(input.vatAmount),
      ttc: money(showVat ? input.totalHt + input.vatAmount : input.totalHt),
    },
    payment: {
      bankName: a.bankName,
      accountName: a.bankAccountName,
      iban: a.bankIban,
      bic: a.bankBic,
    },
    notes: input.notes ?? undefined,
  };
}
