import { z } from "zod";
import { ContactSpecialty, ContactType } from "@/generated/prisma/enums";

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
export const contactSchema = z
  .object({
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
    types: z
      .array(z.enum(ContactType))
      .min(1, "Sélectionnez au moins un type."),
    // Optional: a client or an owner has no trade.
    specialties: z.array(z.enum(ContactSpecialty)).default([]),
    otherSpecialty: z.string().trim().max(120).optional(),
    notes: z.string().trim().max(2000).optional(),
    /** Set once the user has been shown a possible duplicate and kept it. */
    acceptDuplicatePhone: z.boolean().default(false),
  })
  // "Autre" with nothing written is not a specialty, it is an unfinished
  // form — and it would render as an empty badge.
  .refine(
    (v) => !v.specialties.includes("OTHER") || Boolean(v.otherSpecialty),
    {
      path: ["otherSpecialty"],
      message: "Précisez la spécialité pour « Autre ».",
    }
  )
  // Free text left behind after unticking "Autre" would be stored and
  // never shown, so it is dropped rather than kept as a ghost value.
  .transform((v) => ({
    ...v,
    otherSpecialty: v.specialties.includes("OTHER") ? v.otherSpecialty : undefined,
  }));

export type ContactInput = z.infer<typeof contactSchema>;
