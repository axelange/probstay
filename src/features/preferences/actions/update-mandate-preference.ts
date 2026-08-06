"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  mandatePreference: z.enum(["RENTALS", "SALES", "BOTH"]),
});

export type MandatePreferenceResult =
  | { status: "success" }
  | { status: "error"; message: string };

/**
 * Sets the signed-in user's own mandate preference.
 *
 * No permission check beyond being signed in, deliberately: this is the user's
 * own preference and grants nothing. It always writes to `user.id` and never
 * takes a user id from the caller, so it cannot be used to change anyone
 * else's — which is what keeps "no permission needed" safe rather than lax.
 */
export async function updateMandatePreference(
  input: unknown
): Promise<MandatePreferenceResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Choix invalide." };

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { mandatePreference: parsed.data.mandatePreference },
    });
    // The Biens list reads it to seed its filter.
    revalidatePath("/preferences");
    revalidatePath("/properties");
    return { status: "success" };
  } catch (error) {
    console.error("updateMandatePreference failed", error);
    return { status: "error", message: "Enregistrement impossible." };
  }
}
