"use server";

import { getCurrentUser } from "@/lib/auth";
import { findOverlappingRentals } from "@/features/rentals/services/rental-service";
import { bookingStatusLabel, formatStay } from "@/features/rentals/components/rental-labels";

export type OverlapSummary = {
  total: number;
  confirmed: number;
  lines: string[];
};

/**
 * Other bookings on the same property and dates, for the warning shown
 * while filling in the form.
 *
 * Advisory only. Mandates are not exclusive and several agents
 * legitimately chase the same August week, so overlapping enquiries are
 * normal and must not be blocked. What may not happen twice is an owner
 * confirmation, and the database refuses that on its own — a check here
 * could not, since two agents confirming at the same instant would both
 * read "no conflict".
 */
export async function checkOverlaps(
  propertyId: string,
  checkIn: string,
  checkOut: string,
  exceptRentalId?: string
): Promise<OverlapSummary> {
  const user = await getCurrentUser();
  if (!user) return { total: 0, confirmed: 0, lines: [] };

  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return { total: 0, confirmed: 0, lines: [] };
  }

  const rentals = await findOverlappingRentals(
    propertyId,
    start,
    end,
    exceptRentalId
  );

  return {
    total: rentals.length,
    confirmed: rentals.filter((r) => r.ownerConfirmedAt !== null).length,
    lines: rentals.map((r) =>
      [
        formatStay(r.checkIn, r.checkOut),
        bookingStatusLabel(r.bookingStatus),
        r.ownerConfirmedAt ? "confirmée" : null,
        r.agent?.fullName,
      ]
        .filter(Boolean)
        .join(" · ")
    ),
  };
}
