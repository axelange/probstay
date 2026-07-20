import type { RentalBookingStatus } from "@/generated/prisma/enums";

/**
 * When the owner and agent are frozen onto a rental.
 *
 * Only once the lease is signed — bookingStatus CONTRACT and beyond —
 * because that is the moment the booking matches a real signed document.
 * Until then it is an enquiry or is awaiting the owner's answer, and the
 * property may still be reassigned or change hands; reading the live
 * property is correct there, and a snapshot would freeze the wrong
 * parties. From CONTRACT onward, reassigning the property must never
 * rewrite who this booking legally belonged to.
 */
const SIGNED_OR_LATER: RentalBookingStatus[] = [
  "CONTRACT",
  "KYC",
  "CHECK_IN",
  "CHECK_OUT",
];

export function isContractSigned(status: RentalBookingStatus): boolean {
  return SIGNED_OR_LATER.includes(status);
}

/**
 * The ownerId/agentId to store for a rental at a given stage: the
 * property's current values once the contract is signed, null before.
 */
export function ownerAgentSnapshot(
  status: RentalBookingStatus,
  property: { ownerId: string | null; agentId: string | null }
): { ownerId: string | null; agentId: string | null } {
  return isContractSigned(status)
    ? { ownerId: property.ownerId, agentId: property.agentId }
    : { ownerId: null, agentId: null };
}
