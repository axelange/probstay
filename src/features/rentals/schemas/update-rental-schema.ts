import { z } from "zod";
import {
  RentalBookingStatus,
  RentalPaymentStatus,
} from "@/generated/prisma/enums";

const optionalAmount = z
  .union([z.literal(""), z.coerce.number().min(0)])
  .transform((v) => (v === "" ? undefined : Number(v)))
  .optional();

/**
 * Editing a rental from the funnel.
 *
 * property, dates and guests are editable only while the booking is an
 * enquiry — the agent still shaping a request that may have arrived for a
 * fully-booked villa. The action enforces the enquiry-only rule; the
 * fields are optional here so later stages simply omit them.
 *
 * The gate checkboxes are one-way flags. The client (tenant) is never
 * editable here — it is fixed once the booking exists.
 */
export const updateRentalSchema = z.object({
  id: z.uuid(),
  bookingStatus: z.enum(RentalBookingStatus),

  // Enquiry-only edits.
  propertyId: z.uuid().optional(),
  checkIn: z.iso.date().optional(),
  checkOut: z.iso.date().optional(),
  guests: z
    .union([z.literal(""), z.coerce.number().int().min(1).max(50)])
    .transform((v) => (v === "" ? undefined : Number(v)))
    .optional(),

  grossAmount: optionalAmount,
  depositAmount: optionalAmount,
  securityDepositAmount: optionalAmount,

  // Extra priced services. The whole list is sent and reconciled.
  additionalServices: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(120),
        amount: z.coerce.number().min(0),
      })
    )
    .max(40)
    .default([]),

  depositStatus: z.enum(RentalPaymentStatus),
  balanceStatus: z.enum(RentalPaymentStatus),
  securityDepositStatus: z.enum(RentalPaymentStatus),
  confirmOwner: z.boolean().default(false),
  signContract: z.boolean().default(false),
  returnSecurityDeposit: z.boolean().default(false),
  notes: z.string().trim().max(2000).optional(),
});

export type UpdateRentalInput = z.infer<typeof updateRentalSchema>;
