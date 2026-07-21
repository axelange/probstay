import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { CurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Decimalish = { toNumber(): number };
function toNumber(value: Decimalish | null): number | null {
  return value === null ? null : value.toNumber();
}

/**
 * Which demandes this user may see, mirroring the RLS on `demandes` — and
 * they must stay in step, since Prisma bypasses RLS.
 *
 *   MANAGE_RENTALS -> all
 *   AGENT          -> the one assigned to them; and, only while a demande
 *                     is unassigned, one whose properties are all theirs.
 *   anyone else    -> nothing
 *
 * Assignment is authoritative: once a demande is assigned, it follows that
 * person and no one else, even if a property later changes hands. The
 * property-based rule is only the fallback for the still-unassigned ones.
 */
function visibilityFilter(user: CurrentUser): Prisma.DemandeWhereInput | null {
  if (hasPermission(user, "MANAGE_RENTALS")) return {};

  if (user.role === "AGENT") {
    return {
      OR: [
        { assignedAgentId: user.id },
        {
          // Unassigned, non-empty, every property this agent's.
          AND: [
            { assignedAgentId: null },
            { properties: { some: {} } },
            { properties: { every: { property: { agentId: user.id } } } },
          ],
        },
      ],
    };
  }

  return null;
}

export type DemandeListItem = Awaited<ReturnType<typeof listDemandes>>[number];

/** Demandes this user may see, newest first. */
export async function listDemandes(user: CurrentUser) {
  const visible = visibilityFilter(user);
  if (visible === null) return [];

  const demandes = await prisma.demande.findMany({
    where: { ...visible, archivedAt: null },
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
      assignedAgent: { select: { id: true, fullName: true } },
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
              agentId: true,
            },
          },
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

export async function getDemandeDetail(id: string, user: CurrentUser) {
  const visible = visibilityFilter(user);
  if (visible === null) return null;

  const demande = await prisma.demande.findFirst({
    where: { ...visible, id, archivedAt: null },
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
      assignedAgent: { select: { id: true, fullName: true } },
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
              agent: { select: { id: true, fullName: true } },
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

/** Active agents, for the assignment control. */
export async function listAgents() {
  return prisma.user.findMany({
    where: { role: "AGENT", archivedAt: null },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });
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
