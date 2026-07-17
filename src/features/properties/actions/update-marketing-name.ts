"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { marketingNameSchema } from "@/features/properties/schemas/marketing-name-schema";

export type MarketingNameResult =
  | { status: "success"; marketingName: string | null }
  | { status: "error"; message: string };

/**
 * The marketing name is the one field on a property that BSTAY owns
 * rather than APIMO, so it's the only one editable here.
 *
 * Authorisation is checked server-side on every call, not inferred from
 * the form being rendered: a server action is a public endpoint, and
 * anyone can post to it whether or not they were shown the input.
 */
export async function updateMarketingName(
  input: unknown
): Promise<MarketingNameResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { status: "error", message: "Session expirée." };
  }

  if (!hasPermission(user, "MANAGE_PROPERTIES")) {
    return {
      status: "error",
      message: "Vous n'avez pas la permission de modifier ce bien.",
    };
  }

  const parsed = marketingNameSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }

  const { propertyId, marketingName } = parsed.data;

  // Empty means "no name", not an empty string: "" would collide with
  // every other blank one under the unique index.
  const value = marketingName === "" ? null : marketingName;

  try {
    const property = await prisma.property.update({
      where: { id: propertyId },
      data: { marketingName: value },
      select: { marketingName: true },
    });

    revalidatePath(`/properties/${propertyId}`);
    revalidatePath("/properties");

    return { status: "success", marketingName: property.marketingName };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Unique violation — the database is the arbiter here rather than a
      // prior lookup, which could pass and then lose a race to a
      // concurrent save.
      if (error.code === "P2002") {
        return {
          status: "error",
          message: `« ${value} » est déjà utilisé par un autre bien.`,
        };
      }
      if (error.code === "P2025") {
        return { status: "error", message: "Ce bien n'existe plus." };
      }
    }

    console.error("updateMarketingName failed", error);
    return { status: "error", message: "Enregistrement impossible." };
  }
}
