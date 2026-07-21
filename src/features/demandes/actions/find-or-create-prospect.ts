"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  firstName: z.string().trim().max(120).optional(),
  lastName: z.string().trim().min(1, "Le nom est obligatoire.").max(120),
  email: z
    .union([z.literal(""), z.email("Adresse e-mail invalide.")])
    .transform((v) => (v === "" ? undefined : v.trim().toLowerCase()))
    .optional(),
  phone: z.string().trim().max(40).optional(),
});

export type FindOrCreateProspectResult =
  | {
      status: "success";
      contact: {
        id: string;
        firstName: string | null;
        lastName: string;
        email: string | null;
      };
      reused: boolean;
    }
  | { status: "error"; message: string };

/**
 * The prospect for a demande: an existing contact matched by email, or a
 * new one created as a PROSPECT.
 *
 * The email is the identity. If one already exists — a past prospect, or
 * a returning client — that contact is used as-is, never duplicated, and
 * its type is left untouched (a client stays a client). A genuinely new
 * person becomes a PROSPECT, nothing else.
 *
 * Gated on MANAGE_RENTALS: creating the prospect is part of taking a
 * request, so it does not require the separate contacts permission.
 */
export async function findOrCreateProspect(
  input: unknown
): Promise<FindOrCreateProspectResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée." };

  if (!hasPermission(user, "MANAGE_RENTALS")) {
    return { status: "error", message: "Vous n'avez pas la permission." };
  }

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }
  const { firstName, lastName, email, phone } = parsed.data;

  const select = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
  } as const;

  // Reuse an existing contact if the email is already on file.
  if (email) {
    const existing = await prisma.contact.findFirst({
      where: { email, archivedAt: null },
      select,
    });
    if (existing) {
      return { status: "success", contact: existing, reused: true };
    }
  }

  try {
    const created = await prisma.contact.create({
      data: {
        firstName: firstName || null,
        lastName,
        email: email ?? null,
        phone: phone || null,
        types: ["PROSPECT"],
      },
      select,
    });
    return { status: "success", contact: created, reused: false };
  } catch (error) {
    // An email held by an archived contact can still collide on the
    // unique index. The database is the arbiter rather than a prior read.
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return {
        status: "error",
        message: `${email} est déjà utilisé par un contact archivé.`,
      };
    }
    console.error("findOrCreateProspect failed", error);
    return { status: "error", message: "Enregistrement impossible." };
  }
}
