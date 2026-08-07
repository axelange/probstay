import { z } from "zod";
import {
  DepositBasis,
  RentalBookingStatus,
  RentalPaymentStatus,
} from "@/generated/prisma/enums";
import { optionalTimeOfDay } from "@/lib/time-of-day";

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
  // Part of the total, not on top of it: "6 personnes, dont 2 enfants". Zero
  // is a real answer and clears the mention, so it is allowed.
  children: z
    .union([z.literal(""), z.coerce.number().int().min(0).max(50)])
    .transform((v) => (v === "" ? undefined : Number(v)))
    .optional(),

  // Arrival and departure hours for this stay. Blank means the property's own
  // hours; a value is an override agreed for this tenant, and it is what the
  // contract prints.
  checkInTime: optionalTimeOfDay,
  checkOutTime: optionalTimeOfDay,

  // `presentation` is deliberately absent: it is written by
  // setRentalPresentation the moment the radio is clicked, not carried by this
  // save. Two writers for one column is how the two disagree.

  // The stay amount ("Loyer") is no longer entered — it is derived from
  // these two plus the services flagged as included.
  netOwnerAmount: optionalAmount,
  commissionAmount: optionalAmount,
  // The resolved figure, which the documents read. When the basis is a
  // percentage the funnel computes it from the same total it displays, so what
  // is stored is what the agent was looking at.
  depositAmount: optionalAmount,
  depositBasis: z.enum(DepositBasis).default("PERCENT"),
  depositPercent: z.coerce.number().min(0).max(100).default(50),
  securityDepositAmount: optionalAmount,

  // Priced services (cleaning and extras). `includedInStay` rolls a line
  // into the stay amount; otherwise it is billed on top in the client
  // total. The whole list is sent and reconciled.
  additionalServices: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(120),
        amount: z.coerce.number().min(0),
        includedInStay: z.boolean().default(false),
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
})
  // Children are counted within the occupancy, and a booking needs someone who
  // can sign for them — so the count is strictly below the headcount, never
  // equal to it. Caught here because only this object sees both numbers at
  // once; a CHECK on the table enforces the same rule for every other writer.
  .refine(
    (v) =>
      v.children === undefined ||
      v.guests === undefined ||
      v.children < v.guests,
    {
      path: ["children"],
      message:
        "Une location compte au moins un adulte : les enfants doivent être moins nombreux que les occupants.",
    }
  );

export type UpdateRentalInput = z.infer<typeof updateRentalSchema>;
