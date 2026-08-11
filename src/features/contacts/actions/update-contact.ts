"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { updateContactSchema } from "@/features/contacts/schemas/contact-schema";
import { findContactByPhone } from "@/features/contacts/services/contact-service";

export type UpdateContactResult =
  | { status: "success" }
  | { status: "error"; message: string }
  /** A soft warning the user may overrule by resubmitting. */
  | { status: "duplicate-phone"; message: string };

export async function updateContact(
  input: unknown
): Promise<UpdateContactResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { status: "error", message: "Session expirée." };
  }

  if (!hasPermission(user, "MANAGE_CONTACTS")) {
    return {
      status: "error",
      message: "Vous n'avez pas la permission de modifier ce contact.",
    };
  }

  const parsed = updateContactSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }

  const data = parsed.data;

  const existing = await prisma.contact.findFirst({
    where: { id: data.id, archivedAt: null },
    select: { id: true, apimoId: true },
  });
  if (!existing) {
    return { status: "error", message: "Ce contact n'existe plus." };
  }

  // Only MANAGE_CONTACTS reaches this action at all, so the IBAN is
  // always writable here. Stated rather than assumed: if creation or
  // editing is ever opened to Agents, this is the line that has to grow
  // the same narrowing getContactDetail already applies on read.

  if (data.phone && !data.acceptDuplicatePhone) {
    const other = await findContactByPhone(data.phone, data.id);
    if (other) {
      const who = [other.firstName, other.lastName].filter(Boolean).join(" ");
      return {
        status: "duplicate-phone",
        message: `${who} a déjà ce numéro. Enregistrer quand même ?`,
      };
    }
  }

  // Identity fields on an APIMO-sourced contact are rewritten by every
  // sync, so accepting an edit here would show a change that silently
  // reverts. They are refused rather than written and lost — the form
  // shows them read-only for the same reason.
  //
  // Everything else is BSTAY's own and safe to edit on any contact:
  // specialties, notes, IBAN, and the type membership the sync only ever
  // adds OWNER to.
  const fromApimo = existing.apimoId !== null;

  // Company details are BSTAY's own, editable on any contact (APIMO
  // included). They only make sense for a company, so an individual clears
  // the whole side row; a company upserts it. `kind` itself is always
  // stored — it is the manual person/company call.
  const isCompany = data.kind === "COMPANY";
  const companyData = {
    legalForm: data.legalForm ?? null,
    registrationNumber: data.registrationNumber ?? null,
    registeredOffice: data.registeredOffice ?? null,
    repFirstName: data.repFirstName ?? null,
    repLastName: data.repLastName ?? null,
    repCapacity: data.repCapacity ?? null,
    // Stored as a DATE column; the schema hands back a yyyy-mm-dd string.
    repBirthDate: data.repBirthDate ? new Date(data.repBirthDate) : null,
    repBirthPlace: data.repBirthPlace ?? null,
    repNationality: data.repNationality ?? null,
    mainActivity: data.mainActivity ?? null,
    officePostalCode: data.officePostalCode ?? null,
    officeCity: data.officeCity ?? null,
    officeCountry: data.officeCountry ?? null,
    repOccupation: data.repOccupation ?? null,
    repPhone: data.repPhone ?? null,
    repEmail: data.repEmail ?? null,
    repIdDocType: data.repIdDocType ?? null,
    repIdDocNumber: data.repIdDocNumber ?? null,
    paraHotelRegime: data.paraHotelRegime,
  };

  try {
    await prisma.$transaction([
      prisma.contact.update({
        where: { id: data.id },
        data: {
          ...(fromApimo
            ? {}
            : {
                firstName: data.firstName || null,
                lastName: data.lastName,
                email: data.email ?? null,
                phone: data.phone || null,
              }),
          types: data.types,
          kind: data.kind,
          // Civil identity is an individual's — cleared for a company,
          // whose identity lives on the company block instead.
          birthDate: isCompany
            ? null
            : data.birthDate
              ? new Date(data.birthDate)
              : null,
          birthPlace: isCompany ? null : (data.birthPlace ?? null),
          nationality: isCompany ? null : (data.nationality ?? null),
          idDocType: isCompany ? null : (data.idDocType ?? null),
          idDocNumber: isCompany ? null : (data.idDocNumber ?? null),
          address: isCompany ? null : (data.address ?? null),
          occupation: isCompany ? null : (data.occupation ?? null),
          maritalStatus: isCompany ? null : (data.maritalStatus ?? null),
          postalCode: isCompany ? null : (data.postalCode ?? null),
          city: isCompany ? null : (data.city ?? null),
          country: isCompany ? null : (data.country ?? null),
          specialties: data.specialties,
          otherSpecialty: data.otherSpecialty || null,
          notes: data.notes || null,
          iban: data.iban || null,
        },
      }),
      isCompany
        ? prisma.contactCompany.upsert({
            where: { contactId: data.id },
            create: { contactId: data.id, ...companyData },
            update: companyData,
          })
        : prisma.contactCompany.deleteMany({ where: { contactId: data.id } }),
    ]);

    revalidatePath("/contacts");
    revalidatePath(`/contacts/${data.id}`);

    return { status: "success" };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // Two identity keys can collide: an individual's email, or a
      // company's registration number. Name the right one.
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
        message: `${data.email} est déjà utilisé par un autre particulier.`,
      };
    }

    console.error("updateContact failed", error);
    return { status: "error", message: "Enregistrement impossible." };
  }
}
