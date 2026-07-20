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
 * Editing a rental's progress and money.
 *
 * Dates, property and tenants are not here: changing the property would
 * strand the owner/agent snapshot, and changing dates interacts with the
 * overlap constraint — both are deliberately out of scope for now.
 *
 * The cross-field rules (an amount is required past enquiry, the owner
 * must be confirmed before contract) are checked in the action, where
 * the rental's current state is known, not here.
 */
export const updateRentalSchema = z.object({
  id: z.uuid(),
  bookingStatus: z.enum(RentalBookingStatus),
  grossAmount: optionalAmount,
  depositAmount: optionalAmount,
  securityDepositAmount: optionalAmount,
  depositStatus: z.enum(RentalPaymentStatus),
  balanceStatus: z.enum(RentalPaymentStatus),
  securityDepositStatus: z.enum(RentalPaymentStatus),
  // A one-way flag: ticking it records the owner's confirmation now.
  // Never clears an existing one — the action ignores it once set.
  confirmOwner: z.boolean().default(false),
  notes: z.string().trim().max(2000).optional(),
});

export type UpdateRentalInput = z.infer<typeof updateRentalSchema>;
