"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const schema = z.object({ id: z.uuid() });

export type DeleteCalendarEventResult =
  | { status: "success" }
  | { status: "error"; message: string };

/**
 * Removing an entry from the calendar.
 *
 * A real delete, not an archive. Nothing depends on a calendar entry — no
 * document quotes it, no figure counts it — so keeping a cancelled gardener's
 * visit forever would only be clutter someone has to read past.
 */
export async function deleteCalendarEvent(
  input: unknown
): Promise<DeleteCalendarEventResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Données invalides." };

  const event = await prisma.calendarEvent.findUnique({
    where: { id: parsed.data.id },
    select: { createdById: true },
  });
  if (!event) return { status: "success" };

  if (event.createdById !== user.id && !hasPermission(user, "MANAGE_EVENTS")) {
    return {
      status: "error",
      message: "Seul l'auteur de cet événement peut le supprimer.",
    };
  }

  await prisma.calendarEvent.delete({ where: { id: parsed.data.id } });

  revalidatePath("/calendar");
  return { status: "success" };
}
