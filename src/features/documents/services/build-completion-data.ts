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

type Party = {
  id: string;
  kind: "INDIVIDUAL" | "COMPANY";
  /** APIMO-synced identity is rewritten by every sync — name shown locked. */
  apimoLocked: boolean;
  firstName: string | null;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  company: CompanyBlock | null;
};

export type CompletionData = {
  tenant: Party & {
    birthDate: string | null; // yyyy-mm-dd for the date input
    birthPlace: string | null;
    nationality: string | null;
    idDocType: string | null;
    idDocNumber: string | null;
  };
  owner: Party | null;
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

const partySelect = {
  select: {
    id: true,
    apimoId: true,
    kind: true,
    firstName: true,
    lastName: true,
    email: true,
    phone: true,
    address: true,
    company: companySelect,
  },
} as const;

type PartyRow = {
  id: string;
  apimoId: number | null;
  kind: "INDIVIDUAL" | "COMPANY";
  firstName: string | null;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  company: CompanyBlock | null;
};

const party = (c: PartyRow): Party => ({
  id: c.id,
  kind: c.kind,
  apimoLocked: c.apimoId !== null,
  firstName: c.firstName,
  lastName: c.lastName,
  email: c.email,
  phone: c.phone,
  address: c.address,
  company: c.company,
});

/**
 * Everything the contract step's completion form edits, with its current
 * values: the tenant's full identity (civil identity or company block), the
 * owner's identity — an individual owner's name/address/email/phone, or a
 * company's legal block — and the rental's caution. Same visibility rule as
 * the readiness check.
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
      owner: partySelect,
      property: {
        select: { agentId: true, owner: partySelect },
      },
      tenants: {
        where: { isPrimary: true },
        take: 1,
        select: {
          contact: {
            select: {
              ...partySelect.select,
              birthDate: true,
              birthPlace: true,
              nationality: true,
              idDocType: true,
              idDocNumber: true,
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
      ...party(t),
      birthDate: toDateInput(t.birthDate),
      birthPlace: t.birthPlace,
      nationality: t.nationality,
      idDocType: t.idDocType,
      idDocNumber: t.idDocNumber,
    },
    owner: owner ? party(owner) : null,
    securityDepositAmount: rental.securityDepositAmount
      ? rental.securityDepositAmount.toNumber()
      : null,
  };
}
