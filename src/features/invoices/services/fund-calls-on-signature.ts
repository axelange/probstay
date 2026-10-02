import "server-only";

import {
  billingAddress,
  billingName,
} from "@/features/invoices/billing-identity";
import { defaultDueDate } from "@/features/invoices/reference";
import { composeRequests } from "@/features/invoices/services/compose-requests";
import { fundCallSubject } from "@/features/invoices/services/fund-call-subject";
import { prisma } from "@/lib/prisma";

/**
 * Opens the payment requests a booking owes, the moment its contract is signed.
 *
 * Signature is the right instant and the only one: it is where the dossier
 * freezes — the tourist tax at the day's rate, the owner and agent snapshot,
 * the dates — so the figures taken here are the contract's own. Anywhere later
 * would be reading a dossier that has moved on.
 *
 * What each request contains is decided by `composeRequests`, which is also
 * what the editor offers by hand: one path, one composition, so a document
 * opened here and one opened by an agent say the same thing.
 *
 * Drafts carry no number, so this cannot put a hole in either series — which
 * is what makes it safe to do automatically at all.
 *
 * Deliberately not gated on MANAGE_INVOICES. The permission governs what a
 * *user* may do; this is the application reacting to an event, and the person
 * who ticked the signature is often an agent who could never raise a document
 * themselves. They are recorded as the origin all the same: someone caused it.
 *
 * Called once, because the signature gate fires once — `contractSignedAt` is
 * only ever set while it is null, and nothing un-signs a booking.
 */
export async function createFundCallsOnSignature(
  rentalId: string,
  actorId: string
): Promise<number> {
  const [requests, subject, tenant] = await Promise.all([
    composeRequests(rentalId),
    fundCallSubject(rentalId),
    prisma.rentalTenant.findFirst({
      where: { rentalId },
      orderBy: { isPrimary: "desc" },
      select: {
        contactId: true,
        // The billing identity, resolved by the same functions the manual path
        // uses so both say the same thing.
        contact: {
          select: {
            kind: true,
            firstName: true,
            lastName: true,
            address: true,
            postalCode: true,
            city: true,
            country: true,
            company: { select: { legalForm: true, registeredOffice: true } },
          },
        },
      },
    }),
  ]);

  // A contract cannot be drawn up without a tenant, so this should not happen.
  // It costs one check to let a booking that somehow lacks one sign anyway,
  // rather than failing on the way out.
  if (!subject || !tenant) return 0;

  for (const request of requests) {
    await prisma.invoice.create({
      data: {
        family: "FUND_CALL",
        clientId: tenant.contactId,
        clientName: billingName(tenant.contact),
        clientAddress: billingAddress(tenant.contact),
        rentalId,
        title: request.title,
        description: subject.description,
        // The same provisional deadline the manual path opens a draft with,
        // and for a reason that bites: `dueDateAtIssue` reads a null here as a
        // date someone cleared on purpose and leaves it null, so a document
        // opened without one would be issued with no deadline at all.
        dueOn: defaultDueDate(),
        vatRate: 0,
        totalHt: request.total,
        vatAmount: 0,
        notes: request.notes,
        createdById: actorId,
        lines: {
          create: request.lines.map((line, index) => ({
            position: index,
            label: line.label,
            description: line.description,
            productId: line.productId,
            quantity: 1,
            unitPrice: line.unitPrice,
          })),
        },
      },
      select: { id: true },
    });
  }

  return requests.length;
}
