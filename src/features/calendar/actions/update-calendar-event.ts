"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CalendarEventKind } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { optionalTimeOfDay } from "@/lib/time-of-day";

const schema = z
  .object({
    id: z.uuid(),
    title: z.string().trim().min(1, "Un intitulé est nécessaire.").max(160),
    kind: z.enum(CalendarEventKind),
    startsOn: z.iso.date(),
    endsOn: z.iso.date(),
    startTime: optionalTimeOfDay,
    endTime: optionalTimeOfDay,
    propertyId: z
      .union([z.literal(""), z.uuid()])
      .transform((v) => (v === "" ? undefined : v))
      .optional(),
    rentalId: z
      .union([z.literal(""), z.uuid()])
      .transform((v) => (v === "" ? undefined : v))
      .optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.endsOn >= v.startsOn, {
    path: ["endsOn"],
    message: "La fin ne peut pas précéder le début.",
  });

export type UpdateCalendarEventResult =
  | { status: "success" }
  | { status: "error"; message: string };

/**
 * Correcting an entry the agency put on the calendar.
 *
 * Freely editable, unlike almost everything else in this application: a
 * calendar entry is a note to the office, not a term anyone agreed to, and a
 * gardener who comes on Thursday instead of Wednesday should not need a
 * correcting entry to say so.
 */
export async function updateCalendarEvent(
  input: unknown
): Promise<UpdateCalendarEventResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }
  const data = parsed.data;

  const event = await prisma.calendarEvent.findUnique({
    where: { id: data.id },
    select: { id: true, createdById: true },
  });
  if (!event) return { status: "error", message: "Cet événement n'existe plus." };

  // Its author, or someone allowed to reach across. Whoever wrote the entry
  // knows what they meant by it; MANAGE_EVENTS is for tidying up after a
  // colleague who has left or is away.
  if (event.createdById !== user.id && !hasPermission(user, "MANAGE_EVENTS")) {
    return {
      status: "error",
      message: "Seul l'auteur de cet événement peut le modifier.",
    };
  }

  // A booking carries its own villa, so attaching to one settles the property
  // too — an entry on a booking pointing at a different villa is a
  // contradiction the calendar would draw.
  let propertyId = data.propertyId ?? null;
  if (data.rentalId) {
    const rental = await prisma.rental.findFirst({
      where: { id: data.rentalId, archivedAt: null },
      select: { propertyId: true },
    });
    if (!rental) {
      return { status: "error", message: "Cette location n'existe plus." };
    }
    propertyId = rental.propertyId;
  }

  await prisma.calendarEvent.update({
    where: { id: data.id },
    data: {
      title: data.title,
      kind: data.kind,
      startsOn: new Date(data.startsOn),
      endsOn: new Date(data.endsOn),
      startTime: data.startTime ?? null,
      endTime: data.endTime ?? null,
      propertyId,
      rentalId: data.rentalId ?? null,
      notes: data.notes || null,
    },
  });

  revalidatePath("/calendar");
  return { status: "success" };
}
