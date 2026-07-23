import { z } from "zod";
import {
  ContactKind,
  ContactSpecialty,
  ContactType,
} from "@/generated/prisma/enums";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

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
 */
const companyFields = {
  kind: z.enum(ContactKind).default("INDIVIDUAL"),
  legalForm: optionalText(160),
  registrationNumber: optionalText(60),
  registeredOffice: optionalText(300),
  repFirstName: optionalText(120),
  repLastName: optionalText(120),
  repCapacity: optionalText(120),
  repBirthDate: optionalDate,
  repBirthPlace: optionalText(160),
  repNationality: optionalText(120),
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
  .object({ ...contactFields, ...companyFields })
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
