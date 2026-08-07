import { z } from "zod";

/**
 * The agency's own record, as edited in Paramètres.
 *
 * Every field lands on a document, so each is trimmed and length-capped to
 * what its line can hold before it wraps out of the footer or the masthead.
 *
 * Only the three that identify the issuer are required. The rest may be blank:
 * an agency without a financial guarantee to quote should be able to leave the
 * line empty rather than invent one, and the documents skip what is empty.
 */
const line = (max: number) => z.string().trim().max(max);
const required = (max: number, label: string) =>
  line(max).min(1, `${label} est obligatoire.`);

export const agencySchema = z.object({
  name: required(60, "Le nom commercial"),
  tagline: line(120),
  legalName: required(120, "La raison sociale"),
  legalForm: line(60),
  capital: line(60),
  address: required(180, "L'adresse"),
  rcs: line(120),
  cartePro: line(120),
  garantieFinanciere: line(160),
  rcp: line(160),
  web: line(120),
  phone: line(40),

  representedBy: line(120),
  capacity: line(80),

  bankName: line(80),
  bankAccountName: line(80),
  // Spaces are how an IBAN is read on paper; they are kept as typed and only
  // the length is checked, so a wrong one is caught by the bank, not here.
  bankIban: line(60),
  bankBic: line(20),
});

export type AgencyInput = z.infer<typeof agencySchema>;
