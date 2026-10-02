import "server-only";

import {
  FUND_CALL_LEAD_DAYS,
  SIGNATURE_WINDOW_DAYS,
} from "@/features/invoices/reference";
import {
  canManageInvoices,
  canReadAllInvoices,
  invoiceVisibilityFilter,
} from "@/features/invoices/services/invoice-service";
import type { CurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DAY = 86_400_000;

/** The bookings a fund call can still be raised against. */
const LIVE = ["INQUIRY", "FINANCIAL", "CONTRACT", "FINALISATION", "CHECK_IN"] as const;

export type BillingReminder = {
  key: string;
  kind: "ISSUE_DOCUMENT" | "PREPARE_FUND_CALL" | "OVERDUE_DOCUMENT";
  label: string;
  detail: string;
  href: string;
  /** Sorts the list: the sooner it bites, the higher it sits. */
  urgency: number;
};

/**
 * What the billing side is waiting on someone for.
 *
 * Derived, never stored. A reminder is a question the data is asking — a draft
 * nobody has issued, a stay approaching with no call sent for it, a document
 * past its date — and it disappears the moment the answer exists. A table of
 * reminders would have to be kept in step with all three, and would be wrong
 * the first time someone acted without it.
 *
 * Scoped like everything else that hangs off a booking: the two financial
 * permissions see the agency's, an agent sees their own bookings' and nothing
 * more. A fee invoice naming no rental therefore never reaches an agent, which
 * is the same line the visibility rule draws.
 *
 * The wording follows what the reader can actually do. An agent cannot issue,
 * so a document waiting for a number is reported to them as waiting, not as
 * something for them to validate and send.
 */
export async function listBillingReminders(
  user: CurrentUser
): Promise<BillingReminder[]> {
  const visible = invoiceVisibilityFilter(user);
  if (visible === null) return [];

  // The same scope, said in the rentals' own terms for the third query, which
  // starts from bookings rather than from documents.
  const rentalScope = canReadAllInvoices(user)
    ? {}
    : {
        OR: [{ property: { agentId: user.id } }, { tenantAgentId: user.id }],
      };
  const canIssue = canManageInvoices(user);

  const now = new Date();
  const villa = (p: { marketingName: string | null; city: string | null }) =>
    p.marketingName ?? p.city ?? "Sans nom";

  const [drafts, overdue, upcoming] = await Promise.all([
    // Written and left. Someone has to look at it and spend a number on it.
    prisma.invoice.findMany({
      where: { status: "DRAFT", ...visible },
      orderBy: { createdAt: "asc" },
      take: 20,
      select: {
        id: true,
        family: true,
        clientName: true,
        description: true,
        createdAt: true,
        totalHt: true,
      },
    }),
    // Issued, past its date, and nothing has come in.
    prisma.invoice.findMany({
      where: { status: "ISSUED", dueOn: { lt: now }, ...visible },
      orderBy: { dueOn: "asc" },
      take: 20,
      select: {
        id: true,
        family: true,
        number: true,
        issuedOn: true,
        dueOn: true,
        clientName: true,
      },
    }),
    // Stays close enough that a call should be out, with what has already been
    // raised against them so the two can be compared.
    prisma.rental.findMany({
      where: {
        archivedAt: null,
        bookingStatus: { in: [...LIVE] },
        checkIn: {
          gte: now,
          lte: new Date(now.getTime() + FUND_CALL_LEAD_DAYS.BALANCE * DAY),
        },
        ...rentalScope,
      },
      orderBy: { checkIn: "asc" },
      take: 40,
      select: {
        id: true,
        reference: true,
        checkIn: true,
        createdAt: true,
        property: { select: { marketingName: true, city: true } },
        invoices: {
          where: { family: "FUND_CALL", status: { not: "CANCELLED" } },
          select: {
            lines: { select: { product: { select: { role: true } } } },
          },
        },
      },
    }),
  ]);

  const reminders: BillingReminder[] = [];

  for (const draft of drafts) {
    const what =
      draft.family === "FUND_CALL" ? "Avis de paiement" : "Facture d'honoraires";
    const waiting = Math.floor((now.getTime() - draft.createdAt.getTime()) / DAY);
    reminders.push({
      key: `draft-${draft.id}`,
      kind: "ISSUE_DOCUMENT",
      label: canIssue
        ? `${what} à valider et envoyer`
        : `${what} en attente d'émission`,
      detail: [
        draft.clientName,
        draft.description?.split("\n")[0],
        waiting > 0 ? `en attente depuis ${waiting} j` : "ouvert aujourd'hui",
      ]
        .filter(Boolean)
        .join(" · "),
      href:
        draft.family === "FUND_CALL"
          ? `/payment-requests/${draft.id}`
          : `/invoices/${draft.id}`,
      // A draft grows more pressing the longer it sits, and never outranks a
      // document that is already late.
      urgency: 200 - Math.min(waiting, 60),
    });
  }

  for (const document of overdue) {
    const late = Math.floor(
      (now.getTime() - (document.dueOn?.getTime() ?? now.getTime())) / DAY
    );
    reminders.push({
      key: `overdue-${document.id}`,
      kind: "OVERDUE_DOCUMENT",
      label:
        document.family === "FUND_CALL"
          ? "Avis de paiement impayé"
          : "Facture impayée",
      detail: `${document.clientName} · ${late} j de retard`,
      href:
        document.family === "FUND_CALL"
          ? `/payment-requests/${document.id}`
          : `/invoices/${document.id}`,
      urgency: -late,
    });
  }

  for (const rental of upcoming) {
    // Booked close to the stay: everything was settled at signature, so no
    // call is owed and none should be asked for.
    const bookedAhead = Math.round(
      (rental.checkIn.getTime() - rental.createdAt.getTime()) / DAY
    );
    if (bookedAhead < SIGNATURE_WINDOW_DAYS) continue;

    // What has already been asked for, read from the line that heads each
    // request: a balance carries the rent, a caution carries the caution.
    const raised = new Set(
      rental.invoices.flatMap((invoice) =>
        invoice.lines
          .map((line) => line.product?.role)
          .filter((role): role is NonNullable<typeof role> => Boolean(role))
      )
    );
    const daysToArrival = Math.round(
      (rental.checkIn.getTime() - now.getTime()) / DAY
    );

    for (const [kind, what, lead] of [
      ["RENT", "solde", FUND_CALL_LEAD_DAYS.BALANCE],
      ["SECURITY_DEPOSIT", "dépôt de garantie", FUND_CALL_LEAD_DAYS.SECURITY_DEPOSIT],
    ] as const) {
      if (daysToArrival > lead || raised.has(kind)) continue;
      reminders.push({
        key: `call-${rental.id}-${kind}`,
        kind: "PREPARE_FUND_CALL",
        label: canIssue
          ? `Avis de paiement à préparer — ${what}`
          : `Avis de paiement attendu — ${what}`,
        detail: `Réservation ${rental.reference} · ${villa(rental.property)} · arrivée dans ${daysToArrival} j`,
        href: "/payment-requests",
        // Counted from the day it should have gone out, so one that is late
        // sorts above one that is merely due.
        urgency: daysToArrival - lead,
      });
    }
  }

  return reminders.sort((a, b) => a.urgency - b.urgency);
}
