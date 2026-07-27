import "server-only";

import type { CurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export type DocumentType = "CONTRAT" | "CONFIRMATION";

/** Where a field is persisted when the agent completes it before generating. */
export type FieldTarget = "tenant" | "owner" | "location";

export type ReadinessField = {
  key: string;
  label: string;
  target: FieldTarget;
  required: boolean;
  present: boolean;
};

export type DocumentReadiness = {
  complete: boolean;
  fields: ReadinessField[];
  missing: ReadinessField[];
};

const filled = (v: unknown) =>
  v !== null && v !== undefined && String(v).trim() !== "";

/**
 * What a document needs, and what is still missing, for a given rental.
 *
 * Every required field must be filled before generation. Identity fields
 * live on the contacts (tenant/owner), booking fields on the rental — which
 * is where the completion screen writes them back. Caution and the tenant's
 * ID are required (agency rule).
 */
export async function documentReadiness(
  rentalId: string,
  _docType: DocumentType,
  user: CurrentUser
): Promise<DocumentReadiness | null> {
  const rental = await prisma.rental.findFirst({
    where: { id: rentalId, archivedAt: null },
    select: {
      checkIn: true,
      checkOut: true,
      guests: true,
      grossAmount: true,
      securityDepositAmount: true,
      tenantAgentId: true,
      owner: { select: { firstName: true, lastName: true, kind: true, company: { select: { repFirstName: true, repLastName: true, repCapacity: true } } } },
      property: {
        select: {
          marketingName: true,
          address: true,
          agentId: true,
          owner: {
            select: {
              firstName: true,
              lastName: true,
              kind: true,
              company: { select: { repFirstName: true, repLastName: true, repCapacity: true } },
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
              lastName: true,
              kind: true,
              birthDate: true,
              birthPlace: true,
              nationality: true,
              idDocType: true,
              idDocNumber: true,
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

  const isManager = hasPermission(user, "MANAGE_RENTALS");
  const isAgent =
    user.role === "AGENT" &&
    (rental.property.agentId === user.id || rental.tenantAgentId === user.id);
  if (!isManager && !isAgent) return null;

  const tenant = rental.tenants[0]?.contact ?? null;
  const owner = rental.owner ?? rental.property.owner;
  const fields: ReadinessField[] = [];
  const add = (
    key: string,
    label: string,
    target: FieldTarget,
    value: unknown,
    required = true
  ) => fields.push({ key, label, target, required, present: filled(value) });

  // --- Tenant ------------------------------------------------------
  add("tenant.name", "Locataire — nom / dénomination", "tenant", tenant?.lastName);
  if (tenant?.kind === "COMPANY") {
    const c = tenant.company;
    add("tenant.legalForm", "Locataire — forme juridique", "tenant", c?.legalForm);
    add("tenant.registrationNumber", "Locataire — n° d'immatriculation", "tenant", c?.registrationNumber);
    add("tenant.registeredOffice", "Locataire — siège social", "tenant", c?.registeredOffice);
    add("tenant.rep", "Locataire — représentant légal", "tenant", [c?.repFirstName, c?.repLastName].filter(Boolean).join(" "));
    add("tenant.repCapacity", "Locataire — qualité du représentant", "tenant", c?.repCapacity);
  } else {
    add("tenant.birthDate", "Locataire — date de naissance", "tenant", tenant?.birthDate);
    add("tenant.birthPlace", "Locataire — lieu de naissance", "tenant", tenant?.birthPlace);
    add("tenant.nationality", "Locataire — nationalité", "tenant", tenant?.nationality);
    add("tenant.idDocType", "Locataire — pièce d'identité", "tenant", tenant?.idDocType);
    add("tenant.idDocNumber", "Locataire — n° de pièce d'identité", "tenant", tenant?.idDocNumber);
  }

  // --- Owner -------------------------------------------------------
  add("owner.name", "Propriétaire — nom / dénomination", "owner", owner?.lastName);
  if (owner?.kind === "COMPANY") {
    const c = owner.company;
    add("owner.rep", "Propriétaire — représentant légal", "owner", [c?.repFirstName, c?.repLastName].filter(Boolean).join(" "));
    add("owner.repCapacity", "Propriétaire — qualité du représentant", "owner", c?.repCapacity);
  }

  // --- Property & booking -----------------------------------------
  add("property.name", "Bien — nom", "location", rental.property.marketingName);
  add("property.address", "Bien — adresse", "location", rental.property.address);
  add("stay.checkIn", "Séjour — arrivée", "location", rental.checkIn);
  add("stay.checkOut", "Séjour — départ", "location", rental.checkOut);
  add("stay.guests", "Séjour — occupants", "location", rental.guests);
  add("money.rent", "Loyer", "location", rental.grossAmount);
  add("money.securityDeposit", "Caution (dépôt de garantie)", "location", rental.securityDepositAmount);

  const missing = fields.filter((f) => f.required && !f.present);
  return { complete: missing.length === 0, fields, missing };
}
