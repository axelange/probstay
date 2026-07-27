import "server-only";

import type { CurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { AGENCY } from "@/features/documents/agency";
import type { ContratData } from "@/features/documents/templates/contrat-location-saisonniere";

const MONEY = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
type Dec = { toNumber(): number } | null;
const n = (v: Dec) => (v ? v.toNumber() : 0);
const money = (v: number) => MONEY.format(v);
const date = (d: Date) => DATE.format(d);
const nights = (a: Date, b: Date) =>
  Math.max(1, Math.round((b.getTime() - a.getTime()) / 86_400_000));

const fullName = (c: { firstName: string | null; lastName: string } | null) =>
  c ? [c.firstName, c.lastName].filter(Boolean).join(" ") : "—";

/**
 * Assembles the data for a "Contrat de location saisonnière" from a rental —
 * property, owner, tenant (with a company's legal identity), dates, amounts —
 * so the document (and its live preview) is pre-filled, never typed by hand.
 * Returns null if the rental is missing or the user may not see it.
 */
export async function buildContratData(
  rentalId: string,
  user: CurrentUser
): Promise<ContratData | null> {
  const rental = await prisma.rental.findFirst({
    where: { id: rentalId, archivedAt: null },
    select: {
      checkIn: true,
      checkOut: true,
      guests: true,
      netOwnerAmount: true,
      commissionAmount: true,
      grossAmount: true,
      depositAmount: true,
      securityDepositAmount: true,
      tenantAgentId: true,
      owner: { select: { firstName: true, lastName: true } },
      property: {
        select: {
          marketingName: true,
          address: true,
          addressMore: true,
          city: true,
          zipcode: true,
          areaValue: true,
          rooms: true,
          bedrooms: true,
          sleeps: true,
          agentId: true,
          owner: { select: { firstName: true, lastName: true } },
        },
      },
      services: {
        select: { label: true, amount: true, includedInStay: true },
        orderBy: { createdAt: "asc" },
      },
      tenants: {
        where: { isPrimary: true },
        take: 1,
        select: {
          contact: {
            select: {
              firstName: true,
              lastName: true,
              kind: true,
              email: true,
              phone: true,
              company: {
                select: {
                  legalForm: true,
                  registrationNumber: true,
                  registeredOffice: true,
                  repFirstName: true,
                  repLastName: true,
                  repCapacity: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!rental) return null;

  // Visibility: MANAGE_RENTALS sees all; an agent only their own rentals.
  const isManager = hasPermission(user, "MANAGE_RENTALS");
  const isAgent =
    user.role === "AGENT" &&
    (rental.property.agentId === user.id || rental.tenantAgentId === user.id);
  if (!isManager && !isAgent) return null;

  const p = rental.property;
  const tenant = rental.tenants[0]?.contact ?? null;
  const co = tenant?.company ?? null;

  // Loyer + billed (non-included) services + tourist tax → client total.
  const rent = n(rental.grossAmount);
  const billed = rental.services.filter((sv) => !sv.includedInStay);
  const billedTotal = billed.reduce((sum, sv) => sum + n(sv.amount), 0);

  const taxRow = p.city
    ? await prisma.$queryRaw<{ amount: number }[]>`
        SELECT amount::float8 AS amount FROM tourist_taxes
        WHERE lower(city) = lower(${p.city}) LIMIT 1`
    : [];
  const taxRate = taxRow[0]?.amount ?? null;
  const stayNights = nights(rental.checkIn, rental.checkOut);
  const guests = rental.guests ?? 0;
  const touristTax =
    taxRate !== null && guests > 0 ? taxRate * guests * stayNights : 0;

  const total = rent + billedTotal + touristTax;
  const owner = rental.owner ?? p.owner;

  const bedrooms = p.bedrooms ?? 0;
  const sleeps = p.sleeps ?? 0;

  return {
    reference: `BS-${rentalId.slice(0, 8).toUpperCase()}`,
    place: p.city ?? AGENCY.address,
    date: date(new Date()),
    agency: { ...AGENCY },
    owner: {
      name: fullName(owner),
      detail: "Propriétaire du bien ci-après désigné.",
    },
    tenant:
      tenant?.kind === "COMPANY"
        ? {
            kind: "COMPANY",
            name: tenant.lastName,
            legalForm: co?.legalForm ?? undefined,
            registrationNumber: co?.registrationNumber ?? undefined,
            registeredOffice: co?.registeredOffice ?? undefined,
            representative:
              co && (co.repFirstName || co.repLastName)
                ? [co.repFirstName, co.repLastName].filter(Boolean).join(" ")
                : undefined,
            capacity: co?.repCapacity ?? undefined,
          }
        : {
            kind: "INDIVIDUAL",
            name: fullName(tenant),
            email: tenant?.email ?? undefined,
            phone: tenant?.phone ?? undefined,
          },
    property: {
      name: p.marketingName ?? "Le bien loué",
      address:
        [p.address, p.addressMore].filter(Boolean).join(", ") ||
        "adresse communiquée au preneur",
      city: [p.city, p.zipcode].filter(Boolean).join(" ") || "—",
      kind: "logement meublé de tourisme",
      surface: p.areaValue ? `${p.areaValue} m²` : "surface indiquée au mandat",
      rooms: p.rooms
        ? `${p.rooms} pièces${bedrooms ? ` dont ${bedrooms} chambres` : ""}`
        : "plusieurs pièces",
      sleeps: `jusqu'à ${sleeps || guests || "—"} personnes`,
    },
    stay: {
      checkIn: date(rental.checkIn),
      checkOut: date(rental.checkOut),
      nights: `${stayNights} nuits`,
      guests: `${guests || "—"} personnes`,
    },
    money: {
      rent: money(rent),
      services: billed.map((sv) => ({
        label: sv.label,
        amount: money(n(sv.amount)),
      })),
      touristTax: taxRate !== null ? money(touristTax) : "—",
      total: money(total),
      securityDeposit: money(n(rental.securityDepositAmount)),
      deposit: money(n(rental.depositAmount)),
    },
  };
}
