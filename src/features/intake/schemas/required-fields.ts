import type {
  IntakeCompany,
  IntakeIndividual,
  IntakeOccupant,
} from "@/features/intake/schemas/intake-schema";

/**
 * What has to be filled in, and when.
 *
 * The two halves of the form answer to different deadlines. The party the
 * agency contracts with is identified *before* the contract — that is the
 * obligation — so on a FULL link every one of their fields is required. The
 * other adults are a fact about one stay, usually unknown that early, so they
 * are optional there and chased at finalisation through an OCCUPANTS link,
 * where they become required instead.
 *
 * One module, used by the form to mark and refuse, and by the action to check
 * again — a form is only HTML, and the action is reachable without it.
 */
export type IntakeScope = "FULL" | "OCCUPANTS";

export const INDIVIDUAL_REQUIRED = [
  ["lastName", "Nom / Last name"],
  ["firstName", "Prénom / First name"],
  ["occupation", "Profession / Occupation"],
  ["nationality", "Nationalité / Nationality"],
  ["maritalStatus", "Situation matrimoniale / Marital status"],
  ["birthDate", "Date de naissance / Date of birth"],
  ["birthPlace", "Lieu de naissance / Place of birth"],
  ["address", "Adresse / Address"],
  ["postalCode", "Code postal / Postal code"],
  ["city", "Ville / City"],
  ["country", "Pays / Country"],
  ["phone", "Téléphone / Phone"],
  ["email", "Adresse e-mail / Email"],
  ["idDocType", "Pièce d'identité / ID document"],
  ["idDocNumber", "Numéro / Number"],
] as const satisfies readonly (readonly [keyof IntakeIndividual, string])[];

export const COMPANY_REQUIRED = [
  ["companyName", "Dénomination sociale / Company name"],
  ["legalForm", "Forme juridique / Legal form"],
  ["registrationNumber", "Numéro SIREN / Registration number"],
  ["mainActivity", "Activité principale / Main business activity"],
  ["registeredOffice", "Adresse du siège social / Registered office"],
  ["officePostalCode", "Code postal / Postal code"],
  ["officeCity", "Ville / City"],
  ["officeCountry", "Pays / Country"],
  ["companyPhone", "Téléphone / Phone"],
  ["companyEmail", "Adresse e-mail / Email"],
  ["repLastName", "Représentant — Nom / Last name"],
  ["repFirstName", "Représentant — Prénom / First name"],
  ["repCapacity", "Représentant — Fonction / Position"],
  ["repOccupation", "Représentant — Profession / Occupation"],
  ["repNationality", "Représentant — Nationalité / Nationality"],
  ["repPhone", "Représentant — Téléphone / Phone"],
  ["repEmail", "Représentant — Adresse e-mail / Email"],
  ["repIdDocType", "Représentant — Pièce d'identité / ID document"],
  ["repIdDocNumber", "Représentant — Numéro / Number"],
] as const satisfies readonly (readonly [keyof IntakeCompany, string])[];

export const OCCUPANT_REQUIRED = [
  ["lastName", "Nom / Last name"],
  ["firstName", "Prénom / First name"],
  ["idDocType", "Pièce d'identité / ID document"],
  ["idDocNumber", "Numéro / Number"],
] as const satisfies readonly (readonly [keyof IntakeOccupant, string])[];

const blank = (v: unknown) =>
  v === undefined || v === null || String(v).trim() === "";

/**
 * The labels of everything still missing, in reading order.
 *
 * The identity copy counts as a required field of its own on a FULL link:
 * verifying an identity means holding the document, not only its number.
 */
export function missingIntakeFields(
  // Values are `unknown` rather than the parsed types: this runs against the
  // browser's form state, where a select yields a plain string, as well as
  // against a parsed submission. All it asks of a value is whether it is
  // blank, and the keys stay checked either way.
  data: {
    individual: Partial<Record<keyof IntakeIndividual, unknown>>;
    company: Partial<Record<keyof IntakeCompany, unknown>>;
    occupants: Partial<Record<keyof IntakeOccupant, unknown>>[];
  },
  { scope, isCompany }: { scope: IntakeScope; isCompany: boolean }
): string[] {
  const missing: string[] = [];

  if (scope === "FULL") {
    if (isCompany) {
      for (const [key, label] of COMPANY_REQUIRED) {
        if (blank(data.company[key])) missing.push(label);
      }
      if (blank(data.company.repIdDocPath)) {
        missing.push(
          "Représentant — Copie de la pièce d'identité / Copy of the ID document"
        );
      }
    } else {
      for (const [key, label] of INDIVIDUAL_REQUIRED) {
        if (blank(data.individual[key])) missing.push(label);
      }
      if (blank(data.individual.idDocPath)) {
        missing.push("Copie de la pièce d'identité / Copy of the ID document");
      }
    }
    // Occupants are deliberately not checked here: they are asked again at
    // finalisation, and holding up the tenant's own identification over names
    // they may not know yet would defeat the point of asking early.
    return missing;
  }

  // OCCUPANTS: the other adults, and nothing else.
  data.occupants.forEach((o, i) => {
    for (const [key, label] of OCCUPANT_REQUIRED) {
      if (blank(o[key])) missing.push(`Occupant ${i + 2} — ${label}`);
    }
  });
  if (data.occupants.length === 0) {
    missing.push("Au moins un occupant / At least one guest");
  }
  return missing;
}
