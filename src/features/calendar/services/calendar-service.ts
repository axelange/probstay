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
  /** The booking it concerns, when it was attached to one. */
  rentalId: string | null;
  // Enough to reopen the entry for editing without a second round trip.
  propertyId: string | null;
  startTime: string | null;
  endTime: string | null;
  /** Its author may always edit it; anyone else needs MANAGE_EVENTS. */
  canEdit: boolean;
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
  const mayManageEvents = hasPermission(user, "MANAGE_EVENTS");
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
        rentalId: true,
        propertyId: true,
        startTime: true,
        endTime: true,
        createdById: true,
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
      rentalId: e.rentalId,
      propertyId: e.propertyId,
      startTime: e.startTime,
      endTime: e.endTime,
      // Decided here, per entry: "can this user edit this one" is a question
      // about the pair, not about the user alone.
      canEdit: e.createdById === user.id || mayManageEvents,
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
  // Closed at the end of the last day, in UTC: a bound at local midnight of
  // day N lands before a stay stored at UTC midnight of that same day, and the
  // last day of the range would silently drop out.
  const to = new Date(
    Date.UTC(
      from.getFullYear(),
      from.getMonth(),
      from.getDate() + days,
      23,
      59,
      59,
      999
    )
  );

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

export type DayItem = {
  key: string;
  /** "16h00" when placed on the clock, null when the item spans the day. */
  time: string | null;
  endTime: string | null;
  type: "CHECK_IN" | "CHECK_OUT" | "STAY" | "EVENT";
  label: string;
  detail: string | null;
  href: string | null;
};

/**
 * One day, hour by hour.
 *
 * Arrivals and departures already carry an hour — the rental's own, or failing
 * that the property's — so they take their place on the clock beside the
 * events rather than sitting in a separate list. A stay merely running through
 * the day has no hour and belongs above it, as context.
 */
export async function listDay(
  user: CurrentUser,
  day: Date
): Promise<{ timed: DayItem[]; allDay: DayItem[] }> {
  // In UTC, like the stored dates: a window built from local midnight starts
  // two hours late and misses a stay beginning that very day.
  const start = new Date(
    Date.UTC(day.getFullYear(), day.getMonth(), day.getDate())
  );
  const end = new Date(
    Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999)
  );

  const [rentals, events] = await Promise.all([
    prisma.rental.findMany({
      where: {
        archivedAt: null,
        bookingStatus: LIVE,
        checkIn: { lte: end },
        checkOut: { gte: start },
        ...rentalScope(user),
      },
      select: {
        id: true,
        checkIn: true,
        checkOut: true,
        checkInTime: true,
        checkOutTime: true,
        property: {
          select: {
            marketingName: true,
            city: true,
            checkInTime: true,
            checkOutTime: true,
          },
        },
        tenants: {
          where: { isPrimary: true },
          take: 1,
          select: { contact: { select: { firstName: true, lastName: true } } },
        },
      },
    }),
    prisma.calendarEvent.findMany({
      where: { startsOn: { lte: end }, endsOn: { gte: start } },
      orderBy: [{ startTime: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        kind: true,
        startTime: true,
        endTime: true,
        notes: true,
        property: { select: { marketingName: true, city: true } },
      },
    }),
  ]);

  // Read in UTC on both sides: `checkIn` is stored at UTC midnight, so its
  // local calendar day is only the same one by the grace of the time zone.
  const sameDay = (d: Date) =>
    d.getUTCFullYear() === start.getUTCFullYear() &&
    d.getUTCMonth() === start.getUTCMonth() &&
    d.getUTCDate() === start.getUTCDate();
  const villa = (p: { marketingName: string | null; city: string | null }) =>
    p.marketingName ?? p.city ?? "Sans nom";
  const who = (t: { contact: { firstName: string | null; lastName: string } }[]) =>
    t[0]
      ? [t[0].contact.firstName, t[0].contact.lastName].filter(Boolean).join(" ")
      : null;

  const timed: DayItem[] = [];
  const allDay: DayItem[] = [];

  for (const r of rentals) {
    if (sameDay(r.checkIn)) {
      timed.push({
        key: `in-${r.id}`,
        time: r.checkInTime ?? r.property.checkInTime,
        endTime: null,
        type: "CHECK_IN",
        label: villa(r.property),
        detail: who(r.tenants),
        href: `/rentals/${r.id}`,
      });
    }
    if (sameDay(r.checkOut)) {
      timed.push({
        key: `out-${r.id}`,
        time: r.checkOutTime ?? r.property.checkOutTime,
        endTime: null,
        type: "CHECK_OUT",
        label: villa(r.property),
        detail: who(r.tenants),
        href: `/rentals/${r.id}`,
      });
    }
    // Neither arriving nor leaving: the villa is simply occupied today.
    if (!sameDay(r.checkIn) && !sameDay(r.checkOut)) {
      allDay.push({
        key: `stay-${r.id}`,
        time: null,
        endTime: null,
        type: "STAY",
        label: villa(r.property),
        detail: who(r.tenants),
        href: `/rentals/${r.id}`,
      });
    }
  }

  for (const e of events) {
    const item: DayItem = {
      key: `ev-${e.id}`,
      time: e.startTime,
      endTime: e.endTime,
      type: "EVENT",
      label: e.title,
      detail: [e.property ? villa(e.property) : null, e.notes]
        .filter(Boolean)
        .join(" · "),
      href: null,
    };
    // An event without an hour is about the day, not a moment in it.
    (e.startTime ? timed : allDay).push(item);
  }

  timed.sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  return { timed, allDay };
}

/**
 * Bookings an event can be attached to, newest first.
 *
 * Bounded and recent: an entry is pencilled against a stay that is coming or
 * has just happened, never against one from three seasons ago, and the picker
 * should not carry the whole history to prove it.
 */
export async function listAttachableRentals(user: CurrentUser) {
  const from = new Date();
  from.setMonth(from.getMonth() - 3);

  const rentals = await prisma.rental.findMany({
    where: {
      archivedAt: null,
      bookingStatus: LIVE,
      checkOut: { gte: from },
      ...rentalScope(user),
    },
    orderBy: { checkIn: "asc" },
    take: 200,
    select: {
      id: true,
      reference: true,
      checkIn: true,
      checkOut: true,
      property: { select: { marketingName: true, city: true } },
    },
  });

  const DATE = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Paris",
  });

  return rentals.map((r) => ({
    value: r.id,
    label: r.property.marketingName ?? r.property.city ?? "Sans nom",
    hint: `${DATE.format(r.checkIn)}–${DATE.format(r.checkOut)} · réf. ${r.reference}`,
  }));
}
