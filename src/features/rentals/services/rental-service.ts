import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { CurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

type Decimalish = { toNumber(): number };

/**
 * Which rentals this user may see, mirroring the RLS on `rentals` — they
 * must stay in step, since Prisma bypasses RLS.
 *
 *   MANAGE_RENTALS -> all
 *   AGENT          -> those they are an agent of: the property's agent, or
 *                     the tenant-side co-agent carried from the demande.
 *   anyone else    -> nothing
 */
function rentalVisibilityFilter(
  user: CurrentUser
): Prisma.RentalWhereInput | null {
  if (hasPermission(user, "MANAGE_RENTALS")) return {};
  if (user.role === "AGENT") {
    return {
      OR: [{ property: { agentId: user.id } }, { tenantAgentId: user.id }],
    };
  }
  return null;
}

/**
 * Prisma returns DECIMAL as Decimal instances, which cannot cross into a
 * Client Component. Converted at the data layer so no caller has to
 * remember — the same rule the properties service follows.
 */
function toNumber(value: Decimalish | null): number | null {
  return value === null ? null : value.toNumber();
}

export type RentalListItem = Awaited<ReturnType<typeof listRentals>>[number];

/**
 * The rentals this user may see, newest stay first. Agents see only the
 * ones they are an agent or co-agent of. Rentals only exist once a demande
 * has been converted.
 */
export async function listRentals(user: CurrentUser) {
  const visible = rentalVisibilityFilter(user);
  if (visible === null) return [];

  const rentals = await prisma.rental.findMany({
    where: { ...visible, archivedAt: null },
    select: {
      id: true,
      checkIn: true,
      checkOut: true,
      guests: true,
      bookingStatus: true,
      depositStatus: true,
      balanceStatus: true,
      grossAmount: true,
      ownerConfirmedAt: true,
      property: {
        select: { id: true, marketingName: true, city: true, reference: true },
      },
      agent: { select: { id: true, fullName: true } },
      tenants: {
        select: {
          isPrimary: true,
          contact: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { isPrimary: "desc" },
      },
    },
    orderBy: [{ checkIn: "desc" }],
  });

  return rentals.map((rental) => ({
    ...rental,
    grossAmount: toNumber(rental.grossAmount),
  }));
}

/**
 * Whether this user may change a rental.
 *
 * Mirrors the rentals RLS write policies: MANAGE_RENTALS is full CRUD;
 * an Agent may only write where they are the *current* agent of the
 * rental's property. Deliberately the property's agent and not the
 * rental's own agentId — that field is an attribution snapshot, so an
 * agent taking over a property must be able to manage its in-flight
 * bookings, and the previous one must not keep write access forever.
 */
export function canManageRental(
  user: CurrentUser,
  rental: { property: { agentId: string | null }; tenantAgentId: string | null }
): boolean {
  if (hasPermission(user, "MANAGE_RENTALS")) return true;
  if (user.role !== "AGENT") return false;
  // Either co-agent may manage: the property's current agent (owner side)
  // or the tenant-side agent carried from the demande.
  return (
    rental.property.agentId === user.id || rental.tenantAgentId === user.id
  );
}

/** Whether this user may create a rental on this property. */
export function canBookProperty(
  user: CurrentUser,
  property: { agentId: string | null }
): boolean {
  if (hasPermission(user, "MANAGE_RENTALS")) return true;
  if (user.role !== "AGENT") return false;
  return property.agentId === user.id;
}

export type RentalDetail = NonNullable<Awaited<ReturnType<typeof getRentalDetail>>>;

export async function getRentalDetail(id: string, user: CurrentUser) {
  const visible = rentalVisibilityFilter(user);
  if (visible === null) return null;

  const rental = await prisma.rental.findFirst({
    where: { ...visible, id, archivedAt: null },
    select: {
      id: true,
      checkIn: true,
      checkOut: true,
      guests: true,
      bookingStatus: true,
      depositStatus: true,
      securityDepositStatus: true,
      balanceStatus: true,
      grossAmount: true,
      depositAmount: true,
      securityDepositAmount: true,
      commissionAmount: true,
      commissionRate: true,
      currency: true,
      notes: true,
      ownerConfirmedAt: true,
      ownerConfirmedBy: { select: { fullName: true } },
      contractSignedAt: true,
      contractSignedBy: { select: { fullName: true } },
      securityDepositReturnedAt: true,
      createdAt: true,
      property: {
        select: {
          id: true,
          marketingName: true,
          city: true,
          reference: true,
          agentId: true,
          agent: { select: { id: true, fullName: true } },
          // The property's current owner — shown as the rental owner until
          // the contract is signed and the real owner snapshot is frozen.
          owner: { select: { id: true, firstName: true, lastName: true } },
          includedServices: true,
        },
      },
      services: {
        select: { id: true, label: true, amount: true },
        orderBy: { createdAt: "asc" },
      },
      owner: { select: { id: true, firstName: true, lastName: true } },
      agent: { select: { id: true, fullName: true } },
      tenantAgentId: true,
      tenantAgent: { select: { id: true, fullName: true } },
      // The demande this rental was converted from, when it came from one —
      // the far end of the journey, so the whole path stays traceable from
      // either side. Null for a rental created directly.
      originatingDemande: {
        select: {
          id: true,
          mode: true,
          source: true,
          createdAt: true,
          convertedAt: true,
        },
      },
      tenants: {
        select: {
          isPrimary: true,
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { isPrimary: "desc" },
      },
      identityDocuments: {
        select: {
          id: true,
          type: true,
          number: true,
          contact: { select: { firstName: true, lastName: true } },
          uploadedAt: true,
        },
        orderBy: { uploadedAt: "asc" },
      },
    },
  });

  if (!rental) return null;

  // The tourist-tax rate for the property's commune, matched
  // case-insensitively like the settings screen. Null when the city has
  // no rate yet — the funnel then shows the tax as unavailable rather
  // than as zero.
  const taxRow = rental.property.city
    ? await prisma.$queryRaw<{ amount: number }[]>`
        SELECT amount::float8 AS amount FROM tourist_taxes
        WHERE lower(city) = lower(${rental.property.city})
        LIMIT 1
      `
    : [];

  return {
    ...rental,
    grossAmount: toNumber(rental.grossAmount),
    depositAmount: toNumber(rental.depositAmount),
    securityDepositAmount: toNumber(rental.securityDepositAmount),
    commissionAmount: toNumber(rental.commissionAmount),
    commissionRate: toNumber(rental.commissionRate),
    // amount is a non-null Decimal on this table, so convert directly.
    services: rental.services.map((s) => ({ ...s, amount: s.amount.toNumber() })),
    touristTaxRate: taxRow[0]?.amount ?? null,
  };
}

/**
 * Other rentals on the same property whose dates overlap.
 *
 * Shown as a warning when booking, because mandates are not exclusive
 * and several agents legitimately chase the same week. This is
 * informational only — the database refuses a second *confirmed*
 * booking on its own, which is the part that must not be racy.
 *
 * Half-open comparison, matching the exclusion constraint: a stay ending
 * on the day another begins does not overlap.
 */
export async function findOverlappingRentals(
  propertyId: string,
  checkIn: Date,
  checkOut: Date,
  exceptRentalId?: string
) {
  return prisma.rental.findMany({
    where: {
      propertyId,
      archivedAt: null,
      bookingStatus: { not: "CANCELLED" },
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
      ...(exceptRentalId ? { id: { not: exceptRentalId } } : {}),
    },
    select: {
      id: true,
      checkIn: true,
      checkOut: true,
      bookingStatus: true,
      ownerConfirmedAt: true,
      agent: { select: { fullName: true } },
    },
    orderBy: { checkIn: "asc" },
  });
}

/**
 * Properties a rental can be booked against — for the creation form and
 * for changing the villa while a booking is still an enquiry. Carries the
 * included services so the funnel can preview them the moment the agent
 * picks a different property, before saving.
 */
export async function listBookableProperties() {
  return prisma.property.findMany({
    where: { archivedAt: null },
    select: {
      id: true,
      marketingName: true,
      city: true,
      reference: true,
      agentId: true,
      ownerId: true,
      includedServices: true,
    },
    orderBy: [{ marketingName: "asc" }],
  });
}

/** Tourist-tax rate per city (lowercased key), for the funnel's live tax. */
export async function listTaxRatesByCity(): Promise<Record<string, number>> {
  const rows = await prisma.$queryRaw<{ city: string; amount: number }[]>`
    SELECT lower(city) AS city, amount::float8 AS amount FROM tourist_taxes
  `;
  return Object.fromEntries(rows.map((r) => [r.city, r.amount]));
}

/** Contacts that may be a tenant: the CLIENT type is trigger-enforced. */
export async function listTenantCandidates() {
  return prisma.contact.findMany({
    where: { archivedAt: null, types: { has: "CLIENT" } },
    select: { id: true, firstName: true, lastName: true, email: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}
