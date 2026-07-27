"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageRental } from "@/features/rentals/services/rental-service";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

const optionalDate = z
  .union([z.literal(""), z.iso.date("Date invalide.")])
  .transform((v) => (v === "" ? undefined : v))
  .optional();

const optionalEmail = z
  .union([z.literal(""), z.email("Adresse e-mail invalide.")])
  .transform((v) => (v === "" ? undefined : v.trim().toLowerCase()))
  .optional();

const companyBlock = z.object({
  legalForm: optionalText(160),
  registrationNumber: optionalText(60),
  registeredOffice: optionalText(300),
  repFirstName: optionalText(120),
  repLastName: optionalText(120),
  repCapacity: optionalText(120),
});

/**
 * The contract step writes back to the sources: identity onto the contact
 * (tenant, and the owner's company block), the caution onto the rental.
 * Email is deliberately absent — it is the individual's identity key,
 * shown greyed in the form and changed only from the contact page.
 */
const schema = z.object({
  rentalId: z.uuid(),
  tenant: z.object({
    firstName: optionalText(120),
    lastName: z.string().trim().min(1, "Le nom du locataire est obligatoire.").max(160),
    phone: optionalText(40),
    address: optionalText(300),
    birthDate: optionalDate,
    birthPlace: optionalText(160),
    nationality: optionalText(120),
    idDocType: optionalText(60),
    idDocNumber: optionalText(60),
    company: companyBlock.optional(),
  }),
  // An individual owner's contact block, when the completion form sent it.
  owner: z
    .object({
      firstName: optionalText(120),
      lastName: optionalText(160),
      email: optionalEmail,
      phone: optionalText(40),
      address: optionalText(300),
    })
    .optional(),
  ownerCompany: companyBlock.optional(),
  securityDepositAmount: z
    .union([z.literal(""), z.coerce.number().min(0)])
    .transform((v) => (v === "" ? undefined : Number(v)))
    .optional(),
});

export type SaveContractCompletionResult =
  | { status: "success" }
  | { status: "error"; message: string };

export async function saveContractCompletion(
  input: unknown
): Promise<SaveContractCompletionResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }
  const data = parsed.data;

  const rental = await prisma.rental.findFirst({
    where: { id: data.rentalId, archivedAt: null },
    select: {
      id: true,
      tenantAgentId: true,
      owner: { select: { id: true, kind: true, apimoId: true } },
      property: {
        select: {
          agentId: true,
          ownerId: true,
          owner: { select: { id: true, kind: true, apimoId: true } },
        },
      },
      tenants: {
        where: { isPrimary: true },
        take: 1,
        select: {
          contact: { select: { id: true, kind: true, apimoId: true } },
        },
      },
    },
  });
  if (!rental) return { status: "error", message: "Cette location n'existe plus." };
  if (!canManageRental(user, rental)) {
    return { status: "error", message: "Vous ne gérez pas ce bien." };
  }

  const tenant = rental.tenants[0]?.contact;
  if (!tenant) return { status: "error", message: "Aucun locataire principal." };
  const ownerContact = rental.owner ?? rental.property.owner;

  const t = data.tenant;
  const isCompanyTenant = tenant.kind === "COMPANY";
  // APIMO rewrites name/phone on every sync; the address and civil-identity
  // blocks are BSTAY's own and always editable. Email/phone survive when
  // APIMO carries none (the sync COALESCEs them).
  const tenantLocked = tenant.apimoId !== null;

  const tenantUpdate: Prisma.ContactUncheckedUpdateInput = isCompanyTenant
    ? tenantLocked
      ? {}
      : { firstName: null, lastName: t.lastName }
    : {
        // firstName/phone COALESCE-survive a sync, so completing them is
        // safe even for an APIMO contact; lastName stays APIMO's when
        // synced (it is always present there). Address and civil identity
        // are BSTAY's own.
        firstName: t.firstName ?? null,
        phone: t.phone ?? null,
        ...(tenantLocked ? {} : { lastName: t.lastName }),
        address: t.address ?? null,
        birthDate: t.birthDate ? new Date(t.birthDate) : null,
        birthPlace: t.birthPlace ?? null,
        nationality: t.nationality ?? null,
        idDocType: t.idDocType ?? null,
        idDocNumber: t.idDocNumber ?? null,
      };

  const companyData = (c: z.infer<typeof companyBlock>) => ({
    legalForm: c.legalForm ?? null,
    registrationNumber: c.registrationNumber ?? null,
    registeredOffice: c.registeredOffice ?? null,
    repFirstName: c.repFirstName ?? null,
    repLastName: c.repLastName ?? null,
    repCapacity: c.repCapacity ?? null,
  });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.contact.update({ where: { id: tenant.id }, data: tenantUpdate });

      if (isCompanyTenant && t.company) {
        const cd = companyData(t.company);
        await tx.contactCompany.upsert({
          where: { contactId: tenant.id },
          create: { contactId: tenant.id, ...cd },
          update: cd,
        });
      }

      // An individual owner's contact block. Name follows the APIMO rule
      // (locked when synced); address is BSTAY's own; email/phone are
      // completable and survive a sync that carries none.
      if (
        data.owner &&
        ownerContact &&
        ownerContact.kind === "INDIVIDUAL"
      ) {
        const ownerLocked = ownerContact.apimoId !== null;
        await tx.contact.update({
          where: { id: ownerContact.id },
          data: {
            // firstName/email/phone COALESCE-survive a sync; lastName stays
            // APIMO's when synced (always present there).
            firstName: data.owner.firstName ?? null,
            ...(ownerLocked || !data.owner.lastName
              ? {}
              : { lastName: data.owner.lastName }),
            email: data.owner.email ?? null,
            phone: data.owner.phone ?? null,
            address: data.owner.address ?? null,
          },
        });
      }

      // The owner's company block — only when the completion form sent it
      // (the owner is a legal entity). Full replace is fine here since the
      // form shows the current values.
      if (data.ownerCompany && ownerContact) {
        const cd = companyData(data.ownerCompany);
        await tx.contactCompany.upsert({
          where: { contactId: ownerContact.id },
          create: { contactId: ownerContact.id, ...cd },
          update: cd,
        });
      }

      if (data.securityDepositAmount !== undefined) {
        await tx.rental.update({
          where: { id: rental.id },
          data: { securityDepositAmount: data.securityDepositAmount },
        });
      }
    });

    revalidatePath(`/rentals/${rental.id}`);
    revalidatePath("/contacts");
    return { status: "success" };
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return {
        status: "error",
        message: "Cet e-mail est déjà utilisé par un autre contact.",
      };
    }
    console.error("saveContractCompletion failed", error);
    return { status: "error", message: "Enregistrement impossible." };
  }
}
