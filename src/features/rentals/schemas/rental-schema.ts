import { z } from "zod";
import { RentalSource } from "@/generated/prisma/enums";

const optionalAmount = z
  .union([z.literal(""), z.coerce.number().min(0)])
  .transform((v) => (v === "" ? undefined : Number(v)))
  .optional();

/**
 * Creating a rental.
 *
 * A booking always begins as an enquiry — it may even arrive from the
 * website that way (V2). It advances through the gated edit flow, not at
 * creation, so there is no status to choose here and the amount is
 * always optional at this point.
 *
 * A tenant is required: a rental with nobody in it is not a booking, and
 * the join table's trigger would reject a non-CLIENT contact anyway.
 */
export const createRentalSchema = z
  .object({
    propertyId: z.uuid("Sélectionnez un bien."),
    source: z.enum(RentalSource),
    checkIn: z.iso.date("Date d'arrivée invalide."),
    checkOut: z.iso.date("Date de départ invalide."),
    grossAmount: optionalAmount,
    // Number of guests, not of named tenants. Optional at enquiry.
    guests: z
      .union([z.literal(""), z.coerce.number().int().min(1).max(50)])
      .transform((v) => (v === "" ? undefined : Number(v)))
      .optional(),
    tenantIds: z.array(z.uuid()).min(1, "Sélectionnez au moins un locataire."),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((v) => new Date(v.checkOut) > new Date(v.checkIn), {
    path: ["checkOut"],
    message: "Le départ doit être postérieur à l'arrivée.",
  });

export type CreateRentalInput = z.infer<typeof createRentalSchema>;
