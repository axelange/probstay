import { z } from "zod";
import { DemandeMode } from "@/generated/prisma/enums";

const optionalBudget = z
  .union([z.literal(""), z.coerce.number().min(0)])
  .transform((v) => (v === "" ? undefined : Number(v)))
  .optional();

const optionalDate = z
  .union([z.literal(""), z.iso.date()])
  .transform((v) => (v === "" ? undefined : v))
  .optional();

const optionalGuests = z
  .union([z.literal(""), z.coerce.number().int().min(1).max(50)])
  .transform((v) => (v === "" ? undefined : Number(v)))
  .optional();

/**
 * Creating a demande.
 *
 * A precise demande names exactly one property with definite dates; a
 * wide one lists one or more properties with dates optional. There is
 * never a stay amount — only an optional budget. The origin is not
 * chosen: it is DIRECT when we create it (WEBSITE would come from the
 * site), so it is not in this form.
 */
export const createDemandeSchema = z
  .object({
    mode: z.enum(DemandeMode),
    contactId: z.uuid("Sélectionnez un prospect."),
    propertyIds: z.array(z.uuid()),
    checkIn: optionalDate,
    checkOut: optionalDate,
    guests: optionalGuests,
    budget: optionalBudget,
    notes: z.string().trim().max(2000).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.mode === "PRECISE") {
      if (v.propertyIds.length !== 1) {
        ctx.addIssue({
          path: ["propertyIds"],
          code: "custom",
          message: "Une demande précise porte sur un seul bien.",
        });
      }
      if (!v.checkIn || !v.checkOut) {
        ctx.addIssue({
          path: ["checkIn"],
          code: "custom",
          message: "Une demande précise a des dates définies.",
        });
      }
    } else {
      if (v.propertyIds.length < 1) {
        ctx.addIssue({
          path: ["propertyIds"],
          code: "custom",
          message: "Ajoutez au moins un bien.",
        });
      }
    }
    if (v.checkIn && v.checkOut && new Date(v.checkOut) <= new Date(v.checkIn)) {
      ctx.addIssue({
        path: ["checkOut"],
        code: "custom",
        message: "Le départ doit être postérieur à l'arrivée.",
      });
    }
  });

export type CreateDemandeInput = z.infer<typeof createDemandeSchema>;
