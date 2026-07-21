"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { touristTaxSchema } from "@/features/settings/schemas/tourist-tax-schema";

export type UpsertTouristTaxResult =
  | { status: "success" }
  | { status: "error"; message: string };

/**
 * Creates or updates a commune's tourist-tax rate.
 *
 * MANAGE_USERS only — the admin level, matching "revised by the Admin".
 * Re-checked here because Prisma bypasses the RLS that enforces the same
 * rule, and because a server action is a public endpoint.
 */
export async function upsertTouristTax(
  input: unknown
): Promise<UpsertTouristTaxResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée." };

  if (!hasPermission(user, "MANAGE_USERS")) {
    return {
      status: "error",
      message: "Seul un administrateur peut modifier les taxes de séjour.",
    };
  }

  const parsed = touristTaxSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }

  const { city, amount } = parsed.data;

  await prisma.touristTax.upsert({
    where: { city },
    create: { city, amount, updatedById: user.id },
    update: { amount, updatedById: user.id },
  });

  revalidatePath("/settings");
  return { status: "success" };
}
