"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CalendarEventKind } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const schema = z
  .object({
    title: z.string().trim().min(1, "Un intitulé est nécessaire.").max(160),
    kind: z.enum(CalendarEventKind).default("OTHER"),
    startsOn: z.iso.date(),
    endsOn: z.iso.date(),
    propertyId: z
      .union([z.literal(""), z.uuid()])
      .transform((v) => (v === "" ? undefined : v))
      .optional(),
    notes: z.string().trim().max(500).optional(),
  })
  // Inclusive range, so a one-day event repeats its date rather than being
  // refused for ending when it starts.
  .refine((v) => v.endsOn >= v.startsOn, {
    path: ["endsOn"],
    message: "La fin ne peut pas précéder le début.",
  });

export type CreateCalendarEventResult =
  | { status: "success" }
  | { status: "error"; message: string };

/**
 * An entry the agency puts on the calendar itself.
 *
 * Never an arrival or a departure: those are the rentals, and a copy here
 * would drift the first time a booking moves. This is for what nothing else
 * records — a caretaker's visit, a pool service, an owner's own stay.
 */
export async function createCalendarEvent(
  input: unknown
): Promise<CreateCalendarEventResult> {
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
  const data = parsed.data;

  if (data.propertyId) {
    const property = await prisma.property.findFirst({
      where: { id: data.propertyId, archivedAt: null },
      select: { id: true },
    });
    if (!property) return { status: "error", message: "Ce bien n'existe plus." };
  }

  await prisma.calendarEvent.create({
    data: {
      title: data.title,
      kind: data.kind,
      startsOn: new Date(data.startsOn),
      endsOn: new Date(data.endsOn),
      propertyId: data.propertyId ?? null,
      notes: data.notes || null,
      createdById: user.id,
    },
  });

  revalidatePath("/calendar");
  return { status: "success" };
}
