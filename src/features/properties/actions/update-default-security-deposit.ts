"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  propertyId: z.uuid(),
  // Empty clears it. Accepts a comma as the decimal mark, since that is what a
  // French keyboard produces and rejecting it would read as a bug.
  amount: z
    .string()
    .trim()
    .transform((v) => v.replace(",", "."))
    .refine((v) => v === "" || (Number.isFinite(Number(v)) && Number(v) >= 0), {
      message: "Montant invalide.",
    }),
});

export type DefaultSecurityDepositResult =
  | { status: "success"; amount: string | null }
  | { status: "error"; message: string };

/**
 * The security deposit this property is normally let with.
 *
 * Seeds a rental's own amount at conversion and nothing more — changing it
 * here never touches a rental that already exists, which may already have a
 * signed contract quoting the old figure.
 *
 * Authorisation is checked server-side on every call, not inferred from the
 * form being rendered: a server action is a public endpoint, and anyone can
 * post to it whether or not they were shown the input.
 */
export async function updateDefaultSecurityDeposit(
  input: unknown
): Promise<DefaultSecurityDepositResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée." };

  if (!hasPermission(user, "MANAGE_PROPERTIES")) {
    return {
      status: "error",
      message: "Vous n'avez pas la permission de modifier ce bien.",
    };
  }

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }

  const { propertyId, amount } = parsed.data;
  // Empty means "no default", not zero: zero is an amount someone chose, and
  // the caution is required, so the two must not be conflated.
  const value = amount === "" ? null : amount;

  try {
    const updated = await prisma.property.update({
      where: { id: propertyId },
      data: { defaultSecurityDeposit: value },
      select: { defaultSecurityDeposit: true },
    });
    revalidatePath(`/properties/${propertyId}`);
    return {
      status: "success",
      amount: updated.defaultSecurityDeposit?.toFixed(2) ?? null,
    };
  } catch (error) {
    console.error("updateDefaultSecurityDeposit failed", error);
    return { status: "error", message: "Enregistrement impossible." };
  }
}
