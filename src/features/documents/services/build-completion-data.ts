import "server-only";

import type { CurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export type CompanyBlock = {
  legalForm: string | null;
  registrationNumber: string | null;
  registeredOffice: string | null;
  repFirstName: string | null;
  repLastName: string | null;
  repCapacity: string | null;
};

export type CompletionData = {
  tenant: {
    id: string;
    kind: "INDIVIDUAL" | "COMPANY";
    /** APIMO-synced identity is rewritten by every sync — shown locked. */
    apimoLocked: boolean;
    firstName: string | null;
    lastName: string;
    email: string | null;
    phone: string | null;
    birthDate: string | null; // yyyy-mm-dd for the date input
    birthPlace: string | null;
    nationality: string | null;
    idDocType: string | null;
    idDocNumber: string | null;
    company: CompanyBlock | null;
  };
  owner: {
    id: string;
    kind: "INDIVIDUAL" | "COMPANY";
    name: string;
    company: CompanyBlock | null;
  } | null;
  securityDepositAmount: number | null;
};

const toDateInput = (d: Date | null) =>
  d ? new Date(d).toISOString().slice(0, 10) : null;

const companySelect = {
  select: {
    legalForm: true,
    registrationNumber: true,
    registeredOffice: true,
    repFirstName: true,
    repLastName: true,
    repCapacity: true,
  },
} as const;

/**
 * Everything the contract step's completion form edits, with its current
 * values: the tenant's full identity (individual civil identity or company
 * block), the owner's company block when the owner is a legal entity, and
 * the rental's caution. Same visibility rule as the readiness check.
 */
export async function buildCompletionData(
  rentalId: string,
  user: CurrentUser
): Promise<CompletionData | null> {
  const rental = await prisma.rental.findFirst({
    where: { id: rentalId, archivedAt: null },
    select: {
      securityDepositAmount: true,
      tenantAgentId: true,
      owner: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          kind: true,
          company: companySelect,
        },
      },
      property: {
        select: {
          agentId: true,
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              kind: true,
              company: companySelect,
            },
          },
        },
      },
      tenants: {
        where: { isPrimary: true },
        take: 1,
        select: {
          contact: {
            select: {
              id: true,
              apimoId: true,
              kind: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              birthDate: true,
              birthPlace: true,
              nationality: true,
              idDocType: true,
              idDocNumber: true,
              company: companySelect,
            },
          },
        },
      },
    },
  });
  if (!rental) return null;

  const isManager = hasPermission(user, "MANAGE_RENTALS");
  const isAgent =
    user.role === "AGENT" &&
    (rental.property.agentId === user.id || rental.tenantAgentId === user.id);
  if (!isManager && !isAgent) return null;

  const t = rental.tenants[0]?.contact;
  if (!t) return null;
  const owner = rental.owner ?? rental.property.owner;

  return {
    tenant: {
      id: t.id,
      kind: t.kind,
      apimoLocked: t.apimoId !== null,
      firstName: t.firstName,
      lastName: t.lastName,
      email: t.email,
      phone: t.phone,
      birthDate: toDateInput(t.birthDate),
      birthPlace: t.birthPlace,
      nationality: t.nationality,
      idDocType: t.idDocType,
      idDocNumber: t.idDocNumber,
      company: t.company,
    },
    owner: owner
      ? {
          id: owner.id,
          kind: owner.kind,
          name: [owner.firstName, owner.lastName].filter(Boolean).join(" "),
          company: owner.company,
        }
      : null,
    securityDepositAmount: rental.securityDepositAmount
      ? rental.securityDepositAmount.toNumber()
      : null,
  };
}
