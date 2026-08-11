import "server-only";

import type { CurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { SEASONAL_RENTAL_CATEGORY } from "@/features/rentals/services/rental-service";

/**
 * What the dashboard answers, which is not the same question for everyone.
 *
 * An agent asks "what do I have to do"; a manager also asks "where does the
 * agency stand". So the tasks are scoped like every other rental view — an
 * agent sees their own bookings — while the figures are gated on
 * VIEW_FINANCIALS and cover the whole agency.
 *
 * Counts of things (properties, contacts) are deliberately thin here: a list
 * already says how many there are, and a number nobody acts on is decoration.
 */

const LIVE = { not: "CANCELLED" } as const;

function rentalScope(user: CurrentUser) {
  if (hasPermission(user, "MANAGE_RENTALS")) return {};
  return {
    OR: [{ property: { agentId: user.id } }, { tenantAgentId: user.id }],
  };
}

export type AgencyFigures = {
  year: number;
  /** Commission actually earned: bookings closed out, regularisation included. */
  earned: number;
  /** Of which came from clients paying above the total — see below. */
  regularised: number;
  /** Commission on bookings not yet closed. Expected, never counted. */
  pending: number;
  /** Expenses the agency bore on the closed bookings, already deducted. */
  expenses: number;
  /** How many bookings each figure rests on. */
  counts: { closed: number; open: number; suspect: number };
  /** Closed bookings whose figures do not add up, left out of the total. */
  suspect: { reference: number; paid: number; owed: number }[];
  properties: { rentals: number; sales: number };
};

/**
 * What the agency has actually earned this year.
 *
 * Commission counts only once a booking is closed — the caution returned —
 * and not before. Until that moment the figure is provisional in three ways:
 * an expense may still be charged to the agency, a client may have paid above
 * the total, and the caution itself may be partly withheld. Counting at the
 * signature would credit a season that has not happened, and counting at the
 * stay would still miss what happens after the guests leave.
 *
 * The year is that of the closing, not of the stay: a booking in December
 * settled in January is earned in January. That is a receipts view, which is
 * what "revenus sur l'année" means to whoever asks.
 *
 * Three parts to the figure:
 *   • the commission agreed on the contract;
 *   • plus whatever the client paid above the client total — the owner's net
 *     is fixed by the contract, so a surplus falls to the agency;
 *   • less the expenses the agency took on for that booking.
 *
 * A surplus wildly out of proportion is not counted. A mistyped transfer —
 * 50 000 where 5 000 was meant — is otherwise absorbed as revenue, and a
 * figure nobody can explain is worse than one that is missing. Those bookings
 * are returned separately so they can be looked at.
 */
/** Beyond this share of the client total, a surplus is an anomaly, not income. */
const SURPLUS_TOLERANCE = 0.1;
/** Below this, a small overpayment is rounding or a tip, not a mistake. */
const SURPLUS_FLOOR = 50;

export async function agencyFigures(year: number): Promise<AgencyFigures> {
  const from = new Date(Date.UTC(year, 0, 1));
  const to = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

  const [closed, open, rentals, sales] = await Promise.all([
    prisma.rental.findMany({
      where: {
        archivedAt: null,
        bookingStatus: LIVE,
        securityDepositReturnedAt: { gte: from, lte: to },
      },
      select: {
        reference: true,
        commissionAmount: true,
        grossAmount: true,
        touristTaxAmount: true,
        services: { select: { amount: true, includedInStay: true } },
        payments: { select: { kind: true, amount: true } },
        expenses: {
          where: { bearer: "AGENCY", settlement: "COMMISSION" },
          select: { amount: true },
        },
      },
    }),
    prisma.rental.aggregate({
      where: {
        archivedAt: null,
        bookingStatus: LIVE,
        securityDepositReturnedAt: null,
        checkIn: { gte: from, lte: to },
      },
      _sum: { commissionAmount: true },
      _count: true,
    }),
    prisma.property.count({
      where: { archivedAt: null, category: SEASONAL_RENTAL_CATEGORY },
    }),
    prisma.property.count({
      where: { archivedAt: null, category: { not: SEASONAL_RENTAL_CATEGORY } },
    }),
  ]);

  let commission = 0;
  let regularised = 0;
  let expenses = 0;
  let counted = 0;
  const suspect: AgencyFigures["suspect"] = [];

  for (const r of closed) {
    const num = (d: { toNumber(): number } | null) => (d ? d.toNumber() : 0);

    // The client total the acompte and the balance divide between them. The
    // caution is not part of it: it is held and given back.
    const billed = r.services
      .filter((sv) => !sv.includedInStay)
      .reduce((sum, sv) => sum + num(sv.amount), 0);
    const clientTotal = num(r.grossAmount) + billed + num(r.touristTaxAmount);
    const paid = r.payments
      .filter((p) => p.kind !== "SECURITY_DEPOSIT")
      .reduce((sum, p) => sum + num(p.amount), 0);
    const surplus = Math.max(0, paid - clientTotal);

    const outOfProportion =
      surplus > SURPLUS_FLOOR &&
      (clientTotal <= 0 || surplus > clientTotal * SURPLUS_TOLERANCE);
    if (outOfProportion) {
      suspect.push({ reference: r.reference, paid, owed: clientTotal });
      continue;
    }

    counted += 1;
    commission += num(r.commissionAmount);
    expenses += r.expenses.reduce((sum, e) => sum + num(e.amount), 0);
    regularised += surplus;
  }

  return {
    year,
    earned: commission + regularised - expenses,
    regularised,
    pending: open._sum.commissionAmount?.toNumber() ?? 0,
    expenses,
    counts: { closed: counted, open: open._count, suspect: suspect.length },
    suspect,
    properties: { rentals, sales },
  };
}

export type DashboardTask = {
  key: string;
  kind:
    | "RETURN_DEPOSIT"
    | "SIGN_CONTRACT"
    | "AWAITING_CLIENT"
    | "OVERDUE_PAYMENT";
  label: string;
  detail: string;
  href: string;
  /** Sorts the list: the sooner it bites, the higher it sits. */
  urgency: number;
};

const DAY = 86_400_000;

/**
 * What is waiting on someone, most pressing first.
 *
 * Only things that can actually be done, each linking to where it is done.
 * Scoped like the rest: an agent is shown their own bookings, a manager the
 * agency's.
 */
export async function listTasks(user: CurrentUser): Promise<DashboardTask[]> {
  const now = new Date();
  const scope = rentalScope(user);
  const villa = (p: { marketingName: string | null; city: string | null }) =>
    p.marketingName ?? p.city ?? "Sans nom";

  const [toReturn, unsigned, awaiting, overdue] = await Promise.all([
    // The stay is over and the caution is still held.
    prisma.rental.findMany({
      where: {
        archivedAt: null,
        bookingStatus: "CHECK_OUT",
        securityDepositReturnedAt: null,
        ...scope,
      },
      orderBy: { checkOut: "asc" },
      take: 20,
      select: {
        id: true,
        checkOut: true,
        property: { select: { marketingName: true, city: true } },
      },
    }),
    // Guests arrive within the month on an unsigned contract.
    prisma.rental.findMany({
      where: {
        archivedAt: null,
        bookingStatus: LIVE,
        contractSignedAt: null,
        checkIn: { gte: now, lte: new Date(now.getTime() + 30 * DAY) },
        ...scope,
      },
      orderBy: { checkIn: "asc" },
      take: 20,
      select: {
        id: true,
        checkIn: true,
        property: { select: { marketingName: true, city: true } },
      },
    }),
    // A client was asked for their details a week ago and has not answered.
    prisma.clientIntakeLink.findMany({
      where: {
        submittedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
        createdAt: { lte: new Date(now.getTime() - 7 * DAY) },
        rental: { archivedAt: null, bookingStatus: LIVE, ...scope },
      },
      orderBy: { createdAt: "asc" },
      take: 20,
      select: {
        id: true,
        createdAt: true,
        rentalId: true,
        contact: { select: { firstName: true, lastName: true } },
      },
    }),
    // The guests have arrived and the money has not.
    prisma.rental.findMany({
      where: {
        archivedAt: null,
        bookingStatus: LIVE,
        checkIn: { lte: now },
        OR: [{ balanceStatus: "UNPAID" }, { depositStatus: "UNPAID" }],
        ...scope,
      },
      orderBy: { checkIn: "asc" },
      take: 20,
      select: {
        id: true,
        checkIn: true,
        balanceStatus: true,
        depositStatus: true,
        property: { select: { marketingName: true, city: true } },
      },
    }),
  ]);

  const days = (d: Date) => Math.round((now.getTime() - d.getTime()) / DAY);
  const DATE = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris",
  });

  return [
    ...toReturn.map((r) => ({
      key: `dep-${r.id}`,
      kind: "RETURN_DEPOSIT" as const,
      label: villa(r.property),
      // A booking can sit at the departure step before the guests have
      // actually left — an agent moves it there to prepare. "Terminé depuis
      // -9 jours" is the sort of thing that makes a screen look broken.
      detail:
        days(r.checkOut) > 0
          ? `Séjour terminé depuis ${days(r.checkOut)} jour(s) — caution non restituée`
          : `Départ le ${DATE.format(r.checkOut)} — caution à restituer`,
      href: `/rentals/${r.id}`,
      urgency: 1000 + days(r.checkOut),
    })),
    ...unsigned.map((r) => ({
      key: `sig-${r.id}`,
      kind: "SIGN_CONTRACT" as const,
      label: villa(r.property),
      detail: `Arrivée dans ${-days(r.checkIn)} jour(s) — contrat non signé`,
      href: `/rentals/${r.id}`,
      // The closer the arrival, the more pressing.
      urgency: 2000 + days(r.checkIn),
    })),
    ...overdue.map((r) => ({
      key: `pay-${r.id}`,
      kind: "OVERDUE_PAYMENT" as const,
      label: villa(r.property),
      detail:
        r.balanceStatus === "UNPAID"
          ? "Solde impayé et séjour commencé"
          : "Acompte impayé et séjour commencé",
      href: `/rentals/${r.id}`,
      urgency: 1500 + days(r.checkIn),
    })),
    ...awaiting.map((l) => ({
      key: `int-${l.id}`,
      kind: "AWAITING_CLIENT" as const,
      label: [l.contact.firstName, l.contact.lastName].filter(Boolean).join(" "),
      detail: `Informations demandées il y a ${days(l.createdAt)} jour(s), sans réponse`,
      href: l.rentalId ? `/rentals/${l.rentalId}` : "/contacts",
      urgency: 500 + days(l.createdAt),
    })),
  ].sort((a, b) => b.urgency - a.urgency);
}
