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
  ["lastName", "Last name / Nom"],
  ["firstName", "First name / Prénom"],
  ["occupation", "Occupation / Profession"],
  ["nationality", "Nationality / Nationalité"],
  ["maritalStatus", "Marital status / Situation matrimoniale"],
  ["birthDate", "Date of birth / Date de naissance"],
  ["birthPlace", "Place of birth / Lieu de naissance"],
  ["address", "Address / Adresse"],
  ["postalCode", "Postal code / Code postal"],
  ["city", "City / Ville"],
  ["country", "Country / Pays"],
  ["phone", "Phone / Téléphone"],
  ["email", "Email / Adresse e-mail"],
  ["idDocType", "ID document / Pièce d'identité"],
  ["idDocNumber", "Number / Numéro"],
] as const satisfies readonly (readonly [keyof IntakeIndividual, string])[];

export const COMPANY_REQUIRED = [
  ["companyName", "Company name / Dénomination sociale"],
  ["legalForm", "Legal form / Forme juridique"],
  ["registrationNumber", "Registration number / Numéro SIREN"],
  ["mainActivity", "Main business activity / Activité principale"],
  ["registeredOffice", "Registered office / Adresse du siège social"],
  ["officePostalCode", "Postal code / Code postal"],
  ["officeCity", "City / Ville"],
  ["officeCountry", "Country / Pays"],
  ["companyPhone", "Phone / Téléphone"],
  ["companyEmail", "Email / Adresse e-mail"],
  ["repLastName", "Representative — Last name / Nom"],
  ["repFirstName", "Representative — First name / Prénom"],
  ["repCapacity", "Representative — Position / Fonction"],
  ["repOccupation", "Representative — Occupation / Profession"],
  ["repNationality", "Representative — Nationality / Nationalité"],
  ["repPhone", "Representative — Phone / Téléphone"],
  ["repEmail", "Representative — Email / Adresse e-mail"],
  ["repIdDocType", "Representative — ID document / Pièce d'identité"],
  ["repIdDocNumber", "Representative — Number / Numéro"],
] as const satisfies readonly (readonly [keyof IntakeCompany, string])[];

export const OCCUPANT_REQUIRED = [
  ["lastName", "Last name / Nom"],
  ["firstName", "First name / Prénom"],
  ["idDocType", "ID document / Pièce d'identité"],
  ["idDocNumber", "Number / Numéro"],
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
  {
    scope,
    isCompany,
    expectedOccupants = 0,
  }: {
    scope: IntakeScope;
    isCompany: boolean;
    /**
     * How many other adults the booking says are coming.
     *
     * The form opens one slot per expected adult and no longer lets a client
     * add or remove one, so "at least one guest" — the rule this replaces —
     * stopped being the question. It could not tell three expected adults from
     * one, and with the slots now fixed it would deadlock a booking that
     * expects none: no slot to fill, no button to add one, and a submission
     * refused for having nobody in it.
     *
     * Checked against the booking rather than the payload because the payload
     * is the client's: a submission naming one adult out of three is the shape
     * this catches, and the browser cannot be the only place it is caught.
     */
    expectedOccupants?: number;
  }
): string[] {
  const missing: string[] = [];

  if (scope === "FULL") {
    if (isCompany) {
      for (const [key, label] of COMPANY_REQUIRED) {
        if (blank(data.company[key])) missing.push(label);
      }
      if (blank(data.company.repIdDocPath)) {
        missing.push(
          "Representative — Copy of the ID document / Copie de la pièce d'identité"
        );
      }
    } else {
      for (const [key, label] of INDIVIDUAL_REQUIRED) {
        if (blank(data.individual[key])) missing.push(label);
      }
      if (blank(data.individual.idDocPath)) {
        missing.push("Copy of the ID document / Copie de la pièce d'identité");
      }
    }
    // Occupants are deliberately not checked here: they are asked again at
    // finalisation, and holding up the tenant's own identification over names
    // they may not know yet would defeat the point of asking early.
    return missing;
  }

  // OCCUPANTS: the other adults, and nothing else.
  //
  // Numbered from 2 throughout: the primary tenant is the first person on the
  // stay and is identified in their own section, so the first of the other
  // adults is the second occupant. The form's own labels follow the same
  // count, or a client would be told to fix a card that is not on screen.
  //
  // Walked to the expected count and not to the array's length, so a slot the
  // client left out of the payload is reported as missing rather than passing
  // for want of anything to check.
  const slots = Math.max(expectedOccupants, data.occupants.length);
  for (let i = 0; i < slots; i += 1) {
    const o = data.occupants[i] ?? {};
    for (const [key, label] of OCCUPANT_REQUIRED) {
      if (blank(o[key])) missing.push(`Occupant ${i + 2} — ${label}`);
    }
  }
  return missing;
}
