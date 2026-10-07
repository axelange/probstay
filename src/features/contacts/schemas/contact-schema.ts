import { z } from "zod";
import { country } from "@/lib/countries";
import { optionalIdDocType } from "@/features/contacts/schemas/id-doc-type";
import {
  ContactKind,
  ContactSpecialty,
  ContactType,
  MaritalStatus,
} from "@/generated/prisma/enums";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

/**
 * An ISO 3166-1 alpha-2 country code, or empty.
 *
 * Checked against the shipped list rather than merely shaped: a two-letter
 * string is easy to satisfy by accident, and a code nothing can resolve prints
 * as a blank on a contract instead of failing where it was typed.
 */
const optionalCountry = z
  .union([z.literal(""), z.string().trim().toUpperCase()])
  .transform((v) => (v === "" ? undefined : v))
  .optional()
  .refine((v) => v === undefined || country(v) !== null, {
    message: "Pays inconnu.",
  });

/**
 * Up to three nationalities, as country codes.
 *
 * Three rather than two because dual nationality is ordinary here and triple
 * happens; the column itself is uncapped, so this number can move without a
 * migration. Duplicates are dropped rather than refused — picking the same
 * one twice is a slip, not an error worth a message.
 */
const nationalityList = z
  .array(z.string().trim().toUpperCase())
  .max(3, "Trois nationalités au maximum.")
  .optional()
  .transform((v) => (v ? [...new Set(v.filter(Boolean))] : []))
  .refine((v) => v.every((c) => country(c) !== null), {
    message: "Nationalité inconnue.",
  });

/** An optional ISO date (yyyy-mm-dd) or empty. */
const optionalDate = z
  .union([z.literal(""), z.iso.date("Date de naissance invalide.")])
  .transform((v) => (v === "" ? undefined : v))
  .optional();

/**
 * Company details, kept apart from the identity fields — everything a
 * contract needs about a legal entity and its signing representative. All
 * optional and international by design (the real records are Monaco/foreign,
 * not French SIREN/SIRET). Only stored when kind is COMPANY — the action
 * drops the whole block for an individual. The representative's email and
 * phone are the contact-level ones, not repeated here.
 *
 * Exported so a rental created directly can capture the same fields for a
 * company tenant — one definition, no drift.
 */
export const companyDetailFields = {
  legalForm: optionalText(160),
  registrationNumber: optionalText(60),
  registeredOffice: optionalText(300),
  repFirstName: optionalText(120),
  repLastName: optionalText(120),
  repCapacity: optionalText(120),
  repBirthDate: optionalDate,
  repBirthCountry: optionalCountry,
  repBirthCity: optionalText(120),
  repNationalities: nationalityList,
  // Collected from the client's own intake form, so the two must agree: a
  // field the client can fill and an agent cannot is a field that silently
  // reverts the next time the fiche is saved.
  mainActivity: optionalText(160),
  officeLine2: optionalText(160),
  officePostalCode: optionalText(20),
  officeCity: optionalText(120),
  officeCountry: optionalCountry,
  repOccupation: optionalText(120),
  repPhone: optionalText(40),
  repEmail: optionalText(160),
  repIdDocType: optionalIdDocType,
  repIdDocNumber: optionalText(60),
  // Régime parahôtelier: this company owner charges 10% VAT on their net
  // rental income, which the documents then add to the client total.
  paraHotelRegime: z.boolean().default(false),
};

const companyFields = {
  kind: z.enum(ContactKind).default("INDIVIDUAL"),
  ...companyDetailFields,
};

/**
 * Civil identity of an individual, needed on rental contracts. All optional
 * here; a document's completeness gate is what makes them required at
 * generation time. Shared with the direct-rental flow.
 */
export const individualDetailFields = {
  birthDate: optionalDate,
  birthCountry: optionalCountry,
  birthCity: optionalText(120),
  nationalities: nationalityList,
  idDocType: optionalIdDocType,
  idDocNumber: optionalText(60),
  address: optionalText(300),
  // Same set the client's intake form collects — see companyDetailFields.
  occupation: optionalText(120),
  maritalStatus: z
    .union([z.literal(""), z.enum(MaritalStatus)])
    .transform((v) => (v === "" ? undefined : v))
    .optional(),
  addressLine2: optionalText(160),
  postalCode: optionalText(20),
  city: optionalText(120),
  country: optionalCountry,
};

/**
 * The same rules the database enforces, restated so the user gets a
 * message rather than a constraint violation.
 *
 * `lastName` is the only required name: it is present on every real
 * APIMO contact, whereas first names are routinely absent for
 * surname-only and company records. `email` and `phone` are optional
 * because the agency's records genuinely lack them — 14 of the 46
 * property owners have no email at all.
 */
const contactFields = {
  firstName: z.string().trim().max(120).optional(),
  lastName: z
    .string()
    .trim()
    .min(1, "Le nom est obligatoire.")
    .max(120, "Le nom ne peut pas dépasser 120 caractères."),
  // Lowercased for the same reason as the sync: casing variants must
  // not become two people under the unique index.
  email: z
    .union([z.literal(""), z.email("Adresse e-mail invalide.")])
    .transform((v) => (v === "" ? undefined : v.trim().toLowerCase()))
    .optional(),
  phone: z.string().trim().max(40).optional(),
  types: z.array(z.enum(ContactType)).min(1, "Sélectionnez au moins un type."),
  // Optional: a client or an owner has no trade.
  specialties: z.array(z.enum(ContactSpecialty)).default([]),
  otherSpecialty: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(2000).optional(),
  /** Set once the user has been shown a possible duplicate and kept it. */
  acceptDuplicatePhone: z.boolean().default(false),
};

/**
 * "Autre" with nothing written is not a specialty, it is an unfinished
 * form — and it would render as an empty badge.
 */
const OTHER_NEEDS_TEXT = {
  path: ["otherSpecialty"],
  message: "Précisez la spécialité pour « Autre ».",
};

export const contactSchema = z
  .object({ ...contactFields, ...companyFields, ...individualDetailFields })
  .refine(
    (v) => !v.specialties.includes("OTHER") || Boolean(v.otherSpecialty),
    OTHER_NEEDS_TEXT
  )
  // Free text left behind after unticking "Autre" would be stored and
  // never shown, so it is dropped rather than kept as a ghost value.
  .transform((v) => ({
    ...v,
    otherSpecialty: v.specialties.includes("OTHER")
      ? v.otherSpecialty
      : undefined,
  }));

/**
 * Editing adds the id and the IBAN.
 *
 * IBAN is absent from creation on purpose: it is owner banking detail,
 * which belongs to a considered edit rather than to a quick "add the
 * plumber" form.
 */
export const updateContactSchema = z
  .object({
    ...contactFields,
    ...companyFields,
    ...individualDetailFields,
    id: z.uuid(),
    iban: z.string().trim().max(34).optional(),
  })
  .refine(
    (v) => !v.specialties.includes("OTHER") || Boolean(v.otherSpecialty),
    OTHER_NEEDS_TEXT
  )
  .transform((v) => ({
    ...v,
    otherSpecialty: v.specialties.includes("OTHER")
      ? v.otherSpecialty
      : undefined,
  }));

export type ContactInput = z.infer<typeof contactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
