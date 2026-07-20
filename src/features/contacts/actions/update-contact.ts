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

  try {
    await prisma.contact.update({
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
        specialties: data.specialties,
        otherSpecialty: data.otherSpecialty || null,
        notes: data.notes || null,
        iban: data.iban || null,
      },
    });

    revalidatePath("/contacts");
    revalidatePath(`/contacts/${data.id}`);

    return { status: "success" };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        status: "error",
        message: `${data.email} est déjà utilisé par un autre contact.`,
      };
    }

    console.error("updateContact failed", error);
    return { status: "error", message: "Enregistrement impossible." };
  }
}
