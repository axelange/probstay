"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { contactSchema } from "@/features/contacts/schemas/contact-schema";
import { findContactByPhone } from "@/features/contacts/services/contact-service";

export type CreateContactResult =
  | { status: "success"; id: string; name: string }
  | { status: "error"; message: string }
  /** A soft warning the user may overrule by resubmitting. */
  | { status: "duplicate-phone"; message: string };

/**
 * Creates a contact that BSTAY owns rather than APIMO.
 *
 * `apimoId` is left null, which is what distinguishes the two origins.
 * If APIMO later reports this same person as a property owner, the sync
 * inserts a *separate* row keyed on its own apimoId — adopting an
 * existing manual contact is not implemented yet, and would need a
 * matching rule agreed first.
 */
export async function createContact(
  input: unknown
): Promise<CreateContactResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { status: "error", message: "Session expirée." };
  }

  // Agents may read some contacts but never create one; creation is
  // MANAGE_CONTACTS only, matching the RLS write policy.
  if (!hasPermission(user, "MANAGE_CONTACTS")) {
    return {
      status: "error",
      message: "Vous n'avez pas la permission de créer un contact.",
    };
  }

  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }

  const {
    firstName,
    lastName,
    email,
    phone,
    types,
    kind,
    specialties,
    otherSpecialty,
    notes,
  } = parsed.data;
  const data = parsed.data;
  const isCompany = kind === "COMPANY";

  // A shared number is legitimate — households and couples share a line —
  // so this warns once and lets the user proceed, rather than refusing.
  if (phone && !parsed.data.acceptDuplicatePhone) {
    const existing = await findContactByPhone(phone);
    if (existing) {
      const who = [existing.firstName, existing.lastName]
        .filter(Boolean)
        .join(" ");
      return {
        status: "duplicate-phone",
        message: `${who} a déjà ce numéro. Créer quand même ?`,
      };
    }
  }

  try {
    const contact = await prisma.contact.create({
      data: {
        firstName: isCompany ? null : firstName || null,
        // For a company, lastName holds the raison sociale.
        lastName,
        email: email ?? null,
        phone: phone || null,
        notes: notes || null,
        types,
        kind,
        // Civil identity — only for an individual.
        birthDate: !isCompany && data.birthDate ? new Date(data.birthDate) : null,
        birthPlace: isCompany ? null : (data.birthPlace ?? null),
        nationality: isCompany ? null : (data.nationality ?? null),
        idDocType: isCompany ? null : (data.idDocType ?? null),
        idDocNumber: isCompany ? null : (data.idDocNumber ?? null),
        address: isCompany ? null : (data.address ?? null),
        specialties,
        otherSpecialty: otherSpecialty || null,
        // The company block, only for a legal entity. Its email/phone are
        // the contact-level ones — the representative's contact details.
        ...(isCompany
          ? {
              company: {
                create: {
                  legalForm: data.legalForm ?? null,
                  registrationNumber: data.registrationNumber ?? null,
                  registeredOffice: data.registeredOffice ?? null,
                  repFirstName: data.repFirstName ?? null,
                  repLastName: data.repLastName ?? null,
                  repCapacity: data.repCapacity ?? null,
                  repBirthDate: data.repBirthDate
                    ? new Date(data.repBirthDate)
                    : null,
                  repBirthPlace: data.repBirthPlace ?? null,
                  repNationality: data.repNationality ?? null,
                  paraHotelRegime: data.paraHotelRegime,
                },
              },
            }
          : {}),
      },
      select: { id: true, firstName: true, lastName: true },
    });

    revalidatePath("/contacts");

    return {
      status: "success",
      id: contact.id,
      name: [contact.firstName, contact.lastName].filter(Boolean).join(" "),
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // Two identity keys can collide: an individual's email or a
      // company's registration number. The database is the arbiter rather
      // than a prior lookup, which could pass and then lose a race.
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
        message: `${email} est déjà utilisé par un autre particulier.`,
      };
    }

    console.error("createContact failed", error);
    return { status: "error", message: "Enregistrement impossible." };
  }
}
