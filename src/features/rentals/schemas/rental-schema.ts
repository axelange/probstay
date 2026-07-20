import { z } from "zod";
import { RentalBookingStatus } from "@/generated/prisma/enums";

const optionalAmount = z
  .union([z.literal(""), z.coerce.number().min(0)])
  .transform((v) => (v === "" ? undefined : Number(v)))
  .optional();

/**
 * Creating a rental.
 *
 * `grossAmount` is optional only while the booking is an enquiry — a
 * client asking about dates has no agreed price yet. The database
 * enforces the same rule with a CHECK; this exists so the user gets a
 * sentence instead of a constraint violation.
 *
 * A tenant is required: a rental with nobody in it is not a booking, and
 * the join table's trigger would reject a non-CLIENT contact anyway.
 */
export const createRentalSchema = z
  .object({
    propertyId: z.uuid("Sélectionnez un bien."),
    checkIn: z.iso.date("Date d'arrivée invalide."),
    checkOut: z.iso.date("Date de départ invalide."),
    bookingStatus: z.enum(RentalBookingStatus).default("INQUIRY"),
    grossAmount: optionalAmount,
    depositAmount: optionalAmount,
    securityDepositAmount: optionalAmount,
    tenantIds: z.array(z.uuid()).min(1, "Sélectionnez au moins un locataire."),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((v) => new Date(v.checkOut) > new Date(v.checkIn), {
    path: ["checkOut"],
    message: "Le départ doit être postérieur à l'arrivée.",
  })
  .refine(
    (v) =>
      v.bookingStatus === "INQUIRY" ||
      v.bookingStatus === "CANCELLED" ||
      v.grossAmount !== undefined,
    {
      path: ["grossAmount"],
      message: "Le montant est obligatoire au-delà de la demande.",
    }
  );

export type CreateRentalInput = z.infer<typeof createRentalSchema>;
