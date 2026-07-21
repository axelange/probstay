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
 * The two gate checkboxes are one-way flags: ticking `confirmOwner` or
 * `signContract` records that event now. They never clear an existing
 * one — the action ignores them once set. Dates, property and tenants
 * are edited elsewhere.
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
  confirmOwner: z.boolean().default(false),
  signContract: z.boolean().default(false),
  returnSecurityDeposit: z.boolean().default(false),
  notes: z.string().trim().max(2000).optional(),
});

export type UpdateRentalInput = z.infer<typeof updateRentalSchema>;
