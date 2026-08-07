"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { timeOfDay } from "@/lib/time-of-day";

/**
 * The hours this property normally turns over on.
 *
 * A rental may override them for one stay; this is the value every rental
 * starts from and the one used when none overrides it.
 */
const schema = z.object({
  propertyId: z.uuid(),
  checkInTime: timeOfDay,
  checkOutTime: timeOfDay,
});

export type CheckTimesResult =
  | { status: "success"; checkInTime: string; checkOutTime: string }
  | { status: "error"; message: string };

export async function updateCheckTimes(
  input: unknown
): Promise<CheckTimesResult> {
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

  const { propertyId, checkInTime, checkOutTime } = parsed.data;

  try {
    const updated = await prisma.property.update({
      where: { id: propertyId },
      data: { checkInTime, checkOutTime },
      select: { checkInTime: true, checkOutTime: true },
    });
    revalidatePath(`/properties/${propertyId}`);
    return { status: "success", ...updated };
  } catch (error) {
    console.error("updateCheckTimes failed", error);
    return { status: "error", message: "Enregistrement impossible." };
  }
}
