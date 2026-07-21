"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  propertyId: z.uuid(),
  services: z
    .array(z.string().trim().min(1).max(120))
    // Deduplicated and capped so the field stays a tidy list, not a dump.
    .max(40)
    .transform((list) => Array.from(new Set(list))),
});

export type UpdateIncludedServicesResult =
  | { status: "success"; services: string[] }
  | { status: "error"; message: string };

/**
 * The services included with a stay. BSTAY's own field on a property,
 * like the marketing name — the sync never touches it.
 */
export async function updateIncludedServices(
  input: unknown
): Promise<UpdateIncludedServicesResult> {
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

  const { propertyId, services } = parsed.data;

  try {
    const property = await prisma.property.update({
      where: { id: propertyId },
      data: { includedServices: services },
      select: { includedServices: true },
    });

    revalidatePath(`/properties/${propertyId}`);

    return { status: "success", services: property.includedServices };
  } catch (error) {
    console.error("updateIncludedServices failed", error);
    return { status: "error", message: "Enregistrement impossible." };
  }
}
