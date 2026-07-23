import { z } from "zod";
import { ContactKind } from "@/generated/prisma/enums";
import { companyDetailFields } from "@/features/contacts/schemas/contact-schema";

/**
 * The tenant of a directly-created rental: either an existing contact, or
 * a new person/company captured on the spot. In practice a booking should
 * follow a demande, but things move fast and an agent often opens the
 * rental first — so a brand-new tenant must not require creating a contact
 * beforehand.
 *
 * A new INDIVIDUAL is matched by email first (never duplicated) and
 * otherwise created. A new COMPANY carries its raison sociale in
 * `lastName` and is always created — companies are keyed by registration,
 * not email, and that detail is filled later on the contact page. Either
 * way the action promotes the tenant to CLIENT.
 */
const tenantSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("existing"),
    contactId: z.uuid("Choisissez un locataire."),
  }),
  z.object({
    mode: z.literal("new"),
    kind: z.enum(ContactKind).default("INDIVIDUAL"),
    // For a company, this is the raison sociale.
    firstName: z.string().trim().max(120).optional(),
    lastName: z
      .string()
      .trim()
      .min(1, "Le nom du locataire est obligatoire.")
      .max(160),
    email: z
      .union([z.literal(""), z.email("Adresse e-mail du locataire invalide.")])
      .transform((v) => (v === "" ? undefined : v.trim().toLowerCase()))
      .optional(),
    phone: z.string().trim().max(40).optional(),
    // Company block — the same fields as the contact page, only meaningful
    // for a COMPANY tenant.
    ...companyDetailFields,
  }),
]);

/**
 * Creating a rental directly, without a demande.
 *
 * The booking opens at INQUIRY with a property, a tenant and dates — the
 * same shape a demande conversion produces.
 */
export const createRentalSchema = z.object({
  propertyId: z.uuid("Choisissez un bien."),
  tenant: tenantSchema,
  checkIn: z.iso.date("Date d'arrivée requise."),
  checkOut: z.iso.date("Date de départ requise."),
  guests: z
    .union([z.literal(""), z.coerce.number().int().min(1).max(50)])
    .transform((v) => (v === "" ? undefined : Number(v)))
    .optional(),
});

export type CreateRentalInput = z.infer<typeof createRentalSchema>;
