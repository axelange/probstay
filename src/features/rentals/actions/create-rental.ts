"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import type { ContactType } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canBookProperty } from "@/features/rentals/services/rental-service";
import { createRentalSchema } from "@/features/rentals/schemas/create-rental-schema";

export type CreateRentalResult =
  | { status: "success"; rentalId: string }
  | { status: "error"; message: string };

/** Add CLIENT, drop PROSPECT (which cannot coexist), keep the rest. */
function clientTypes(types: ContactType[]): ContactType[] {
  return Array.from(
    new Set([...types.filter((t) => t !== "PROSPECT"), "CLIENT" as const])
  );
}

/**
 * Opens a rental directly, without going through a demande.
 *
 * The booking starts at INQUIRY ("Informations") with the chosen property,
 * tenant and dates — the same shape a conversion produces. The tenant is an
 * existing contact or a new person captured here; either way they are
 * promoted to CLIENT in the same transaction (a rental tenant must hold it,
 * a DB trigger enforces it). Owner and agent stay null — frozen only at
 * contract signature; the creating agent becomes the tenant-side agent.
 */
export async function createRental(
  input: unknown
): Promise<CreateRentalResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée." };

  const parsed = createRentalSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }
  const data = parsed.data;

  if (new Date(data.checkOut) <= new Date(data.checkIn)) {
    return {
      status: "error",
      message: "Le départ doit être postérieur à l'arrivée.",
    };
  }

  // Any property this user may book — their own for an agent, any for
  // MANAGE_RENTALS. The same gate a conversion uses.
  const property = await prisma.property.findFirst({
    where: { id: data.propertyId, archivedAt: null },
    select: { id: true, agentId: true },
  });
  if (!property) {
    return { status: "error", message: "Ce bien n'existe plus." };
  }
  if (!canBookProperty(user, property)) {
    return { status: "error", message: "Vous ne gérez pas ce bien." };
  }

  // Resolve the tenant to a contact (reading only). Writes happen in the
  // transaction below, so a failed rental rolls back any promotion/creation.
  //   existing  -> the chosen contact, promoted to CLIENT
  //   new+email -> reuse the contact holding that email, promoted; else new
  //   new       -> a brand-new CLIENT contact
  const tenant = data.tenant;
  let resolved:
    | { kind: "promote"; id: string; types: ContactType[] }
    | { kind: "create" };

  if (tenant.mode === "existing") {
    const contact = await prisma.contact.findFirst({
      where: { id: tenant.contactId, archivedAt: null },
      select: { id: true, types: true },
    });
    if (!contact) {
      return { status: "error", message: "Ce contact n'existe plus." };
    }
    resolved = { kind: "promote", id: contact.id, types: contact.types };
  } else {
    // Reuse by email only for an individual — that is the individual's
    // identity key, and it must not match a company that merely shares its
    // representative's address. A company is always created fresh here.
    const existing =
      tenant.kind === "INDIVIDUAL" && tenant.email
        ? await prisma.contact.findFirst({
            where: {
              email: tenant.email,
              kind: "INDIVIDUAL",
              archivedAt: null,
            },
            select: { id: true, types: true },
          })
        : null;
    resolved = existing
      ? { kind: "promote", id: existing.id, types: existing.types }
      : { kind: "create" };
  }

  // The tenant-side agent is the person opening the booking, when they are
  // an agent — the owner-side agent stays the property's own.
  const tenantAgentId = user.role === "AGENT" ? user.id : null;

  try {
    const rental = await prisma.$transaction(async (tx) => {
      let tenantContactId: string;

      if (resolved.kind === "promote") {
        await tx.contact.update({
          where: { id: resolved.id },
          data: { types: clientTypes(resolved.types) },
        });
        tenantContactId = resolved.id;
      } else {
        // tenant.mode is "new" here — a fresh client contact. A company
        // has no first name of its own; its lastName is the raison sociale,
        // and it carries the same contract block as the contact page.
        const t = tenant as Extract<typeof tenant, { mode: "new" }>;
        const isCompanyTenant = t.kind === "COMPANY";
        const created = await tx.contact.create({
          data: {
            firstName: isCompanyTenant ? null : t.firstName || null,
            lastName: t.lastName,
            email: t.email ?? null,
            phone: t.phone || null,
            kind: t.kind,
            types: ["CLIENT"],
            ...(isCompanyTenant
              ? {
                  company: {
                    create: {
                      legalForm: t.legalForm ?? null,
                      registrationNumber: t.registrationNumber ?? null,
                      registeredOffice: t.registeredOffice ?? null,
                      repFirstName: t.repFirstName ?? null,
                      repLastName: t.repLastName ?? null,
                      repCapacity: t.repCapacity ?? null,
                      repBirthDate: t.repBirthDate
                        ? new Date(t.repBirthDate)
                        : null,
                      repBirthPlace: t.repBirthPlace ?? null,
                      repNationality: t.repNationality ?? null,
                    },
                  },
                }
              : {}),
          },
          select: { id: true },
        });
        tenantContactId = created.id;
      }

      return tx.rental.create({
        data: {
          propertyId: property.id,
          bookingStatus: "INQUIRY",
          tenantAgentId,
          guests: data.guests ?? null,
          checkIn: new Date(data.checkIn),
          checkOut: new Date(data.checkOut),
          tenants: { create: [{ contactId: tenantContactId, isPrimary: true }] },
        },
        select: { id: true },
      });
    });

    revalidatePath("/rentals");
    return { status: "success", rentalId: rental.id };
  } catch (error) {
    // A new tenant's identity key can still collide: an individual's email
    // (possibly on an archived contact the lookup skipped) or a company's
    // registration number. The database is the arbiter.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const target = JSON.stringify(error.meta?.target ?? "");
      if (target.includes("registrationNumber")) {
        return {
          status: "error",
          message:
            "Ce numéro d'immatriculation est déjà utilisé par une autre société.",
        };
      }
      return {
        status: "error",
        message: "Cet e-mail est déjà utilisé par un autre particulier.",
      };
    }
    console.error("createRental failed", error);
    return { status: "error", message: "Création impossible." };
  }
}
