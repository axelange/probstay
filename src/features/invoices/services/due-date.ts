import "server-only";

import {
  FUND_CALL_TERM_DAYS,
  PAYMENT_TERM_DAYS,
  SIGNATURE_WINDOW_DAYS,
  addDays,
  defaultDueDate,
  sameDay,
} from "@/features/invoices/reference";
import { prisma } from "@/lib/prisma";

/**
 * The date a document falls due, decided when it is issued.
 *
 * A draft opens with a provisional date — the day it was drawn up plus the
 * usual term — because a form with an empty deadline invites one to be typed.
 * What actually binds is settled at issue, from the issue date and, for a fund
 * call, from the booking:
 *
 *   fee invoice        issue + 31 days
 *   fund call
 *     stay within 31 days of issue   no deadline: everything is due at
 *                                    signature, so the document says nothing
 *     acompte                        the day before arrival
 *     solde, dépôt de garantie       issue + 7 days
 *
 * A date the agent set themselves is never overwritten. "Untouched" means it
 * still equals what opening the draft put there; anything else, including a
 * cleared field, is a decision and stands.
 *
 * Which of the three a request is asking for is read from its lines: the
 * catalogue entries carry a role, and a line composed from one keeps pointing
 * at it. A balance is the one carrying the rent. Nothing on the invoice itself
 * records a category — there is none.
 */
export async function dueDateAtIssue(
  invoiceId: string,
  issuedOn: Date
): Promise<Date | null> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      family: true,
      dueOn: true,
      createdAt: true,
      rental: { select: { checkIn: true } },
      lines: { select: { product: { select: { role: true } } } },
    },
  });
  if (!invoice) return null;

  // Set by hand, or deliberately cleared: not ours to move.
  const provisional = defaultDueDate(invoice.createdAt);
  const untouched = invoice.dueOn !== null && sameDay(invoice.dueOn, provisional);
  if (!untouched) return invoice.dueOn;

  if (invoice.family === "FEE") return addDays(issuedOn, PAYMENT_TERM_DAYS);

  const checkIn = invoice.rental?.checkIn ?? null;
  if (checkIn === null) return addDays(issuedOn, FUND_CALL_TERM_DAYS);

  // Booked close to the stay: nothing is called for in advance, it is all
  // settled at signature. A deadline printed on such a document would be
  // later than the money is actually wanted.
  const daysToArrival = Math.round(
    (checkIn.getTime() - issuedOn.getTime()) / 86_400_000
  );
  if (daysToArrival < SIGNATURE_WINDOW_DAYS) return null;

  const roles = invoice.lines
    .map((line) => line.product?.role)
    .filter((role) => role !== null && role !== undefined);

  // The balance and the caution are called for a week ahead. The acompte,
  // which the agency raises only by exception, is due the day before arrival.
  // A balance is recognised by its rent line — see `composeRequests`.
  if (roles.includes("RENT") || roles.includes("SECURITY_DEPOSIT")) {
    return addDays(issuedOn, FUND_CALL_TERM_DAYS);
  }
  if (roles.includes("DEPOSIT")) return addDays(checkIn, -1);

  return addDays(issuedOn, FUND_CALL_TERM_DAYS);
}
