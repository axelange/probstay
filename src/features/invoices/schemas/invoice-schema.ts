import { z } from "zod";

/**
 * What the draft form may send.
 *
 * Amounts arrive as strings from the inputs and are coerced here, at the
 * boundary, so nothing downstream has to wonder which it is holding. The
 * ceilings are deliberately generous — a villa season runs into six figures —
 * and exist to catch a slipped decimal point, not to express a business rule.
 */
const lineSchema = z.object({
  label: z.string().trim().min(1, "Désignation manquante.").max(200),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  /** Set when the line was taken from the catalogue. */
  productId: z
    .union([z.literal(""), z.uuid()])
    .optional()
    .transform((value) =>
      value === "" || value === undefined ? undefined : value
    ),
  quantity: z.coerce.number().positive().max(10_000),
  // Negative is allowed: a deduction — an acompte already received — is a line
  // owed the other way, and it belongs on the document that deducts it.
  unitPrice: z.coerce.number().min(-10_000_000).max(10_000_000),
});

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value === "" ? undefined : value));

/** An optional date field: the form sends "" when it was left alone. */
const optionalDate = z
  .union([z.literal(""), z.iso.date()])
  .optional()
  .transform((value) =>
    value === "" || value === undefined ? undefined : value
  );

/**
 * The draft itself. No issue date and no number: both are taken when the
 * invoice is issued, which is a separate act with its own schema below.
 */
export const draftInvoiceSchema = z.object({
  clientId: z.uuid(),
  rentalId: z
    .union([z.literal(""), z.uuid()])
    .optional()
    .transform((value) =>
      value === "" || value === undefined ? undefined : value
    ),
  /** The document's own heading, printed in place of the generic one. */
  title: optionalText(200),
  /** The one-line object of the invoice, printed under the title. */
  description: optionalText(300),
  dueOn: optionalDate,
  // A rate, not a constant: stored per invoice so a change by decree does not
  // rewrite what was already issued.
  vatRate: z.coerce.number().min(0).max(100),
  // Long: the mentions a catalogue product carries run to a paragraph in each
  // language, and several products may each add their own.
  notes: optionalText(10_000),
  // Empty is allowed here and refused at issue: a draft is a working document
  // and may well be saved before its lines are known. An imported invoice
  // keeps none at all — its detail is in the file.
  family: z.enum(["FEE", "FUND_CALL"]),
  lines: z.array(lineSchema).max(50),
});

export const updateDraftSchema = z
  .object({ id: z.uuid() })
  .and(draftInvoiceSchema);

/**
 * Opening a payment request: the booking, and which of its sums is being
 * asked for.
 *
 * Not a category stored on the document — nothing records one. It says which
 * composition to write: the balance is the one headed by the rent line.
 */
export const newFundCallSchema = z.object({
  rentalId: z.uuid(),
  head: z.enum(["DEPOSIT", "RENT", "SECURITY_DEPOSIT"]),
});

/** Issuing: the only thing to decide is the date the invoice bears. */
export const issueInvoiceSchema = z.object({
  id: z.uuid(),
  issuedOn: z.iso.date(),
});

export type DraftInvoiceInput = z.infer<typeof draftInvoiceSchema>;
