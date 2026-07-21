import "server-only";

import { prisma } from "@/lib/prisma";

type Decimalish = { toNumber(): number };
function toNumber(value: Decimalish | null): number | null {
  return value === null ? null : value.toNumber();
}

export type DemandeListItem = Awaited<ReturnType<typeof listDemandes>>[number];

/**
 * Every demande, newest first. No RLS-style hiding — demandes are read by
 * everyone signed in; who may act is decided by MANAGE_RENTALS in the
 * actions.
 */
export async function listDemandes() {
  const demandes = await prisma.demande.findMany({
    where: { archivedAt: null },
    select: {
      id: true,
      mode: true,
      source: true,
      checkIn: true,
      checkOut: true,
      guests: true,
      budget: true,
      convertedAt: true,
      lostAt: true,
      createdAt: true,
      contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      properties: {
        select: {
          property: { select: { id: true, marketingName: true, city: true } },
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  return demandes.map((d) => ({ ...d, budget: toNumber(d.budget) }));
}

export type DemandeDetail = NonNullable<
  Awaited<ReturnType<typeof getDemandeDetail>>
>;

export async function getDemandeDetail(id: string) {
  const demande = await prisma.demande.findFirst({
    where: { id, archivedAt: null },
    select: {
      id: true,
      mode: true,
      source: true,
      checkIn: true,
      checkOut: true,
      guests: true,
      budget: true,
      notes: true,
      convertedAt: true,
      convertedRentalId: true,
      lostAt: true,
      createdAt: true,
      createdBy: { select: { fullName: true } },
      contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      properties: {
        select: {
          property: {
            select: {
              id: true,
              marketingName: true,
              city: true,
              reference: true,
            },
          },
        },
        orderBy: { property: { marketingName: "asc" } },
      },
    },
  });

  if (!demande) return null;
  return { ...demande, budget: toNumber(demande.budget) };
}

/**
 * Contacts that can be a demande's prospect: those holding PROSPECT. A
 * prospect is exclusively a prospect until their demande converts, when
 * they become a client — so a converted one no longer appears here.
 */
export async function listProspectCandidates() {
  return prisma.contact.findMany({
    where: { archivedAt: null, types: { has: "PROSPECT" } },
    select: { id: true, firstName: true, lastName: true, email: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}
