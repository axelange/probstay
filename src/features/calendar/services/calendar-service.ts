import "server-only";

import type { CurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { CalendarEventKind } from "@/generated/prisma/enums";

/**
 * The calendar: what occupies a villa, and what the agency has pencilled in.
 *
 * Two sources that stay separate on purpose. A stay is a rental — its dates
 * live there, and copying them into an events table would create a second
 * version that drifts the first time a booking moves. Everything else is a
 * `CalendarEvent`.
 *
 * Everything is day-granular. The calendar is read by the day, and hours would
 * drag a time zone into dates that have none.
 */

export type CalendarStay = {
  id: string;
  reference: number;
  property: string;
  tenant: string | null;
  checkIn: Date;
  checkOut: Date;
  bookingStatus: string;
};

export type CalendarEntry = {
  id: string;
  title: string;
  kind: CalendarEventKind;
  startsOn: Date;
  endsOn: Date;
  property: string | null;
  notes: string | null;
};

/** Arrivals and departures, which is how a calendar is actually read. */
export type UpcomingMovement = {
  key: string;
  on: Date;
  type: "CHECK_IN" | "CHECK_OUT" | "EVENT";
  label: string;
  detail: string | null;
  href: string | null;
};

/** Cancelled bookings occupy nothing and clutter the month. */
const LIVE = { not: "CANCELLED" } as const;

/**
 * An agent sees the bookings they handle; a manager sees them all. Events are
 * visible to everyone with a profile — a calendar half of the office cannot
 * read is worse than none.
 */
function rentalScope(user: CurrentUser) {
  if (hasPermission(user, "MANAGE_RENTALS")) return {};
  return {
    OR: [{ property: { agentId: user.id } }, { tenantAgentId: user.id }],
  };
}

export async function listMonth(
  user: CurrentUser,
  from: Date,
  to: Date
): Promise<{ stays: CalendarStay[]; events: CalendarEntry[] }> {
  const [rentals, events] = await Promise.all([
    prisma.rental.findMany({
      // Overlapping the window, not contained in it: a stay running from the
      // previous month into this one is very much part of it.
      where: {
        archivedAt: null,
        bookingStatus: LIVE,
        checkIn: { lte: to },
        checkOut: { gte: from },
        ...rentalScope(user),
      },
      orderBy: { checkIn: "asc" },
      select: {
        id: true,
        reference: true,
        checkIn: true,
        checkOut: true,
        bookingStatus: true,
        property: { select: { marketingName: true, city: true } },
        tenants: {
          where: { isPrimary: true },
          take: 1,
          select: { contact: { select: { firstName: true, lastName: true } } },
        },
      },
    }),
    prisma.calendarEvent.findMany({
      where: { startsOn: { lte: to }, endsOn: { gte: from } },
      orderBy: { startsOn: "asc" },
      select: {
        id: true,
        title: true,
        kind: true,
        startsOn: true,
        endsOn: true,
        notes: true,
        property: { select: { marketingName: true, city: true } },
      },
    }),
  ]);

  return {
    stays: rentals.map((r) => ({
      id: r.id,
      reference: r.reference,
      property: r.property.marketingName ?? r.property.city ?? "Sans nom",
      tenant: r.tenants[0]
        ? [r.tenants[0].contact.firstName, r.tenants[0].contact.lastName]
            .filter(Boolean)
            .join(" ")
        : null,
      checkIn: r.checkIn,
      checkOut: r.checkOut,
      bookingStatus: r.bookingStatus,
    })),
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      kind: e.kind,
      startsOn: e.startsOn,
      endsOn: e.endsOn,
      property: e.property?.marketingName ?? e.property?.city ?? null,
      notes: e.notes,
    })),
  };
}

/**
 * What is coming, as movements rather than as stays.
 *
 * A booking appears twice — once when the guests arrive and once when they
 * leave — because those are two different days of work, and a list of stays
 * would bury a departure inside a booking that started weeks ago.
 */
export async function listUpcoming(
  user: CurrentUser,
  from: Date,
  days: number
): Promise<UpcomingMovement[]> {
  const to = new Date(from);
  to.setDate(to.getDate() + days);

  const [arrivals, departures, events] = await Promise.all([
    prisma.rental.findMany({
      where: {
        archivedAt: null,
        bookingStatus: LIVE,
        checkIn: { gte: from, lte: to },
        ...rentalScope(user),
      },
      orderBy: { checkIn: "asc" },
      select: {
        id: true,
        checkIn: true,
        checkInTime: true,
        property: {
          select: { marketingName: true, city: true, checkInTime: true },
        },
        tenants: {
          where: { isPrimary: true },
          take: 1,
          select: { contact: { select: { firstName: true, lastName: true } } },
        },
      },
    }),
    prisma.rental.findMany({
      where: {
        archivedAt: null,
        bookingStatus: LIVE,
        checkOut: { gte: from, lte: to },
        ...rentalScope(user),
      },
      orderBy: { checkOut: "asc" },
      select: {
        id: true,
        checkOut: true,
        checkOutTime: true,
        property: {
          select: { marketingName: true, city: true, checkOutTime: true },
        },
        tenants: {
          where: { isPrimary: true },
          take: 1,
          select: { contact: { select: { firstName: true, lastName: true } } },
        },
      },
    }),
    prisma.calendarEvent.findMany({
      where: { startsOn: { gte: from, lte: to } },
      orderBy: { startsOn: "asc" },
      select: {
        id: true,
        title: true,
        startsOn: true,
        notes: true,
        property: { select: { marketingName: true, city: true } },
      },
    }),
  ]);

  const name = (t: { contact: { firstName: string | null; lastName: string } }[]) =>
    t[0]
      ? [t[0].contact.firstName, t[0].contact.lastName].filter(Boolean).join(" ")
      : null;
  const villa = (p: { marketingName: string | null; city: string | null }) =>
    p.marketingName ?? p.city ?? "Sans nom";

  const movements: UpcomingMovement[] = [
    ...arrivals.map((r) => ({
      key: `in-${r.id}`,
      on: r.checkIn,
      type: "CHECK_IN" as const,
      label: villa(r.property),
      detail: [name(r.tenants), r.checkInTime ?? r.property.checkInTime]
        .filter(Boolean)
        .join(" · "),
      href: `/rentals/${r.id}`,
    })),
    ...departures.map((r) => ({
      key: `out-${r.id}`,
      on: r.checkOut,
      type: "CHECK_OUT" as const,
      label: villa(r.property),
      detail: [name(r.tenants), r.checkOutTime ?? r.property.checkOutTime]
        .filter(Boolean)
        .join(" · "),
      href: `/rentals/${r.id}`,
    })),
    ...events.map((e) => ({
      key: `ev-${e.id}`,
      on: e.startsOn,
      type: "EVENT" as const,
      label: e.title,
      detail: [e.property ? villa(e.property) : null, e.notes]
        .filter(Boolean)
        .join(" · "),
      href: null,
    })),
  ];

  return movements.sort((a, b) => a.on.getTime() - b.on.getTime());
}
