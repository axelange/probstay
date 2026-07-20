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
    specialties,
    otherSpecialty,
    notes,
  } = parsed.data;

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
        firstName: firstName || null,
        lastName,
        email: email ?? null,
        phone: phone || null,
        notes: notes || null,
        types,
        specialties,
        otherSpecialty: otherSpecialty || null,
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
      // email is the only unique column a user can collide on. The
      // database is the arbiter rather than a prior lookup, which could
      // pass and then lose a race to a concurrent save.
      return {
        status: "error",
        message: `${email} est déjà utilisé par un autre contact.`,
      };
    }

    console.error("createContact failed", error);
    return { status: "error", message: "Enregistrement impossible." };
  }
}
