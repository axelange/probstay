import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type {
  InvoiceFamily,
  InvoiceSource,
  InvoiceStatus,
} from "@/generated/prisma/enums";
import {
  defaultDueDate,
  invoiceReference,
  invoiceReferenceOrNull,
  invoiceTotals,
  roundToCents,
} from "@/features/invoices/reference";
import {
  billingAddress,
  billingName,
} from "@/features/invoices/billing-identity";
import { dueDateAtIssue } from "@/features/invoices/services/due-date";
import type { CurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Decimalish = { toNumber(): number };

/**
 * Prisma returns DECIMAL as Decimal instances, which cannot cross into a
 * Client Component. Converted at the data layer so no caller has to remember —
 * the rule the rentals and properties services already follow.
 */
function toNumber(value: Decimalish): number {
  return value.toNumber();
}

/**
 * Who may see the whole register.
 *
 * Two permissions rather than one: MANAGE_INVOICES issues documents,
 * VIEW_FINANCIALS reads the agency's figures without being able to bill
 * anyone. Both see everything, including the fee invoices that hang off no
 * booking at all.
 */
export function canReadAllInvoices(user: CurrentUser): boolean {
  return (
    hasPermission(user, "MANAGE_INVOICES") ||
    hasPermission(user, "VIEW_FINANCIALS")
  );
}

/**
 * Which documents a user may see, mirroring the RLS on `invoices` — they must
 * stay in step, since Prisma bypasses RLS and this is therefore the real check.
 *
 *   the two permissions -> all
 *   AGENT              -> those raised against a booking they handle, on
 *                         either side. A fee invoice naming no rental is out
 *                         of reach: a co-agency fee is the agency's business,
 *                         not the booking's.
 *   anyone else        -> nothing
 */
export function invoiceVisibilityFilter(
  user: CurrentUser
): Prisma.InvoiceWhereInput | null {
  if (canReadAllInvoices(user)) return {};
  if (user.role === "AGENT") {
    return {
      rental: {
        OR: [{ property: { agentId: user.id } }, { tenantAgentId: user.id }],
      },
    };
  }
  return null;
}

export function canManageInvoices(user: CurrentUser): boolean {
  return hasPermission(user, "MANAGE_INVOICES");
}

export type InvoiceLineItem = {
  label: string;
  description: string | null;
  /** Set when the line was taken from the catalogue. */
  productId: string | null;
  quantity: number;
  unitPrice: number;
  /** quantity × unitPrice, rounded to the cent as the paper prints it. */
  amount: number;
};

export type InvoiceListItem = {
  id: string;
  /** Null while it is a draft: the number is taken at issue. */
  number: number | null;
  reference: string | null;
  family: InvoiceFamily;
  status: InvoiceStatus;
  source: InvoiceSource;
  /** The document's own heading, "EN / FR". Null falls back to the family's. */
  title: string | null;
  description: string | null;
  clientName: string;
  clientId: string;
  rentalId: string | null;
  rentalReference: number | null;
  propertyName: string | null;
  issuedOn: Date | null;
  dueOn: Date | null;
  paidOn: Date | null;
  vatRate: number;
  totalHt: number;
  vatAmount: number;
  totalTtc: number;
  hasPdf: boolean;
  notes: string | null;
  authorName: string | null;
  lines: InvoiceLineItem[];
};

/** Everything a row needs, selected once so the list and the PDF agree. */
const INVOICE_SELECT = {
  id: true,
  number: true,
  family: true,
  status: true,
  source: true,
  title: true,
  description: true,
  clientId: true,
  clientName: true,
  clientAddress: true,
  rentalId: true,
  issuedOn: true,
  dueOn: true,
  paidOn: true,
  vatRate: true,
  totalHt: true,
  vatAmount: true,
  notes: true,
  storagePath: true,
  fileName: true,
  createdBy: { select: { fullName: true } },
  rental: {
    select: {
      reference: true,
      property: { select: { marketingName: true, city: true } },
    },
  },
  lines: {
    select: {
      label: true,
      description: true,
      productId: true,
      quantity: true,
      unitPrice: true,
    },
    orderBy: { position: "asc" },
  },
} as const;

type InvoiceRow = {
  id: string;
  number: number | null;
  family: InvoiceFamily;
  status: InvoiceStatus;
  source: InvoiceSource;
  title: string | null;
  description: string | null;
  clientId: string;
  clientName: string;
  clientAddress: string | null;
  rentalId: string | null;
  issuedOn: Date | null;
  dueOn: Date | null;
  paidOn: Date | null;
  vatRate: Decimalish;
  totalHt: Decimalish;
  vatAmount: Decimalish;
  notes: string | null;
  storagePath: string | null;
  fileName: string | null;
  createdBy: { fullName: string | null } | null;
  rental: {
    reference: number;
    property: { marketingName: string | null; city: string | null };
  } | null;
  lines: {
    label: string;
    description: string | null;
    productId: string | null;
    quantity: Decimalish;
    unitPrice: Decimalish;
  }[];
};

function toListItem(row: InvoiceRow): InvoiceListItem {
  const totalHt = toNumber(row.totalHt);
  const vatAmount = toNumber(row.vatAmount);

  return {
    id: row.id,
    number: row.number,
    // Assembled rather than stored, from the number and the issue date — see
    // the note in reference.ts. Null for a draft, which has neither.
    reference: invoiceReferenceOrNull(row.family, row.number, row.issuedOn),
    family: row.family,
    status: row.status,
    source: row.source,
    title: row.title,
    description: row.description,
    clientId: row.clientId,
    clientName: row.clientName,
    rentalId: row.rentalId,
    rentalReference: row.rental?.reference ?? null,
    propertyName:
      row.rental?.property.marketingName ?? row.rental?.property.city ?? null,
    issuedOn: row.issuedOn,
    dueOn: row.dueOn,
    paidOn: row.paidOn,
    vatRate: toNumber(row.vatRate),
    totalHt,
    vatAmount,
    // Never recomputed from the lines: the two stored figures are the ones on
    // the paper, and TTC is their exact sum.
    totalTtc: totalHt + vatAmount,
    hasPdf: row.storagePath !== null,
    notes: row.notes,
    authorName: row.createdBy?.fullName ?? null,
    lines: row.lines.map((line) => {
      const quantity = toNumber(line.quantity);
      const unitPrice = toNumber(line.unitPrice);
      return {
        label: line.label,
        description: line.description,
        productId: line.productId,
        quantity,
        unitPrice,
        amount: roundToCents(quantity * unitPrice),
      };
    }),
  };
}

/**
 * One family's register, drafts first, then by issue date.
 *
 * Always one family: the two are separate registers, and a list mixing them
 * would be neither. Drafts lead because they are the ones asking for
 * something — an issued document is done with, a draft is waiting to be
 * checked and numbered.
 */
export async function listInvoices(
  user: CurrentUser,
  family: InvoiceFamily
): Promise<InvoiceListItem[]> {
  // The register as a whole, so the permissions and nothing else: an agent
  // reaches their own documents from the booking, not from here.
  if (!canReadAllInvoices(user)) return [];

  const rows = await prisma.invoice.findMany({
    where: { family },
    select: INVOICE_SELECT,
    // Drafts lead, and they come out that way for free: Postgres puts NULLs
    // first on a DESC sort, and a draft has no issue date. Stating it through
    // Prisma's `{ sort, nulls }` form types fine but the engine refuses it —
    // that option needs a preview feature this client is not built with.
    orderBy: [{ issuedOn: "desc" }, { createdAt: "desc" }],
  });

  return rows.map((row) => toListItem(row as InvoiceRow));
}

/**
 * The billing documents raised against one booking, newest first.
 *
 * How an agent reaches theirs: the registers are the managers', and what
 * concerns a booking belongs on the booking. The same visibility rule applies,
 * so this returns nothing for someone who may not see them.
 */
export async function listRentalInvoices(
  rentalId: string,
  user: CurrentUser
): Promise<InvoiceListItem[]> {
  const visible = invoiceVisibilityFilter(user);
  if (visible === null) return [];

  const rows = await prisma.invoice.findMany({
    where: { rentalId, ...visible },
    select: INVOICE_SELECT,
    orderBy: [{ issuedOn: "desc" }, { createdAt: "desc" }],
  });
  return rows.map((row) => toListItem(row as InvoiceRow));
}

/** One invoice, with everything the PDF prints. Null when out of reach. */
export async function getInvoice(
  id: string,
  user: CurrentUser
): Promise<(InvoiceListItem & { clientAddress: string | null }) | null> {
  const visible = invoiceVisibilityFilter(user);
  if (visible === null) return null;

  // Absent and out of reach answer alike: a document someone may not see
  // should not be confirmed to exist.
  const row = await prisma.invoice.findFirst({
    where: { id, ...visible },
    select: INVOICE_SELECT,
  });
  if (!row) return null;

  const typed = row as InvoiceRow;
  return { ...toListItem(typed), clientAddress: typed.clientAddress };
}

/**
 * Who may be billed: every contact still on file, prospects aside.
 *
 * The same set the rentals dialog offers, for the same reason — a prospect has
 * not become anything yet, and billing one is not a case. An owner is here as
 * well as a client: concierge services are invoiced to owners.
 */
export async function listBillableContacts() {
  return prisma.contact.findMany({
    where: { archivedAt: null, NOT: { types: { has: "PROSPECT" } } },
    // The address fields come along because the editor's preview resolves the
    // billing block itself, with the same functions the save path uses.
    select: {
      id: true,
      kind: true,
      firstName: true,
      lastName: true,
      email: true,
      address: true,
      postalCode: true,
      city: true,
      country: true,
      company: { select: { legalForm: true, registeredOffice: true } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}

/**
 * The bookings an invoice may be attached to, newest first.
 *
 * Not filtered by rental visibility: reaching this list already requires
 * MANAGE_INVOICES, which is an agency-wide financial permission — someone
 * raising invoices for the whole agency has to be able to name any booking.
 */
export async function listInvoiceableRentals() {
  const rentals = await prisma.rental.findMany({
    where: { archivedAt: null },
    select: {
      id: true,
      reference: true,
      property: { select: { marketingName: true, city: true } },
      tenants: {
        select: { contact: { select: { firstName: true, lastName: true } } },
        orderBy: { isPrimary: "desc" },
        take: 1,
      },
    },
    orderBy: { checkIn: "desc" },
  });

  return rentals.map((rental) => {
    const tenant = rental.tenants[0]?.contact;
    return {
      id: rental.id,
      reference: rental.reference,
      property:
        rental.property.marketingName ?? rental.property.city ?? "Sans nom",
      tenant: tenant
        ? [tenant.firstName, tenant.lastName].filter(Boolean).join(" ")
        : null,
    };
  });
}

export type BillableContact = Awaited<
  ReturnType<typeof listBillableContacts>
>[number];
export type InvoiceableRental = Awaited<
  ReturnType<typeof listInvoiceableRentals>
>[number];

export type NewInvoiceLine = {
  label: string;
  description?: string;
  productId?: string;
  quantity: number;
  unitPrice: number;
};

export type DraftInput = {
  family: InvoiceFamily;
  title?: string;
  clientId: string;
  rentalId?: string;
  description?: string;
  dueOn?: Date;
  vatRate: number;
  notes?: string;
  lines: NewInvoiceLine[];
  /**
   * Given instead of derived, for an invoice drawn up elsewhere: its detail
   * lives in the file that was imported, and the register only needs to know
   * what it is worth. Absent for an invoice this app produces, whose totals
   * must come from the lines it prints.
   */
  totals?: { totalHt: number; vatAmount: number };
};

export type InvoiceMutationResult =
  | { status: "success"; id: string }
  | { status: "error"; message: string };

/** The client identity and the totals, resolved from an input. Null if unknown. */
async function resolveDraftData(input: DraftInput) {
  const client = await prisma.contact.findFirst({
    where: { id: input.clientId, archivedAt: null },
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
  });
  if (!client) return null;

  const { totalHt, vatAmount } =
    input.totals ?? invoiceTotals(input.lines, input.vatRate);

  return {
    family: input.family,
    title: input.title ?? null,
    clientId: input.clientId,
    clientName: billingName(client),
    clientAddress: billingAddress(client),
    rentalId: input.rentalId ?? null,
    description: input.description ?? null,
    dueOn: input.dueOn ?? null,
    vatRate: input.vatRate,
    totalHt,
    vatAmount,
    notes: input.notes ?? null,
  };
}

/** A named rental has to exist — an invoice cannot point at nothing. */
async function rentalExists(rentalId: string | undefined): Promise<boolean> {
  if (!rentalId) return true;
  const rental = await prisma.rental.findFirst({
    where: { id: rentalId, archivedAt: null },
    select: { id: true },
  });
  return rental !== null;
}

/**
 * Opens a draft.
 *
 * No number, no issue date: both are taken at issue, so a draft that is
 * abandoned costs the series nothing. The client's identity and the totals are
 * still resolved now — they are what the agent is checking — and resolved
 * again on every save, since the draft is a working document.
 */
export async function createDraft(
  input: DraftInput,
  user: CurrentUser,
  source: InvoiceSource = "GENERATED"
): Promise<InvoiceMutationResult> {
  if (!canManageInvoices(user)) {
    return { status: "error", message: "Vous n'avez pas la permission." };
  }
  if (!(await rentalExists(input.rentalId))) {
    return { status: "error", message: "Location introuvable." };
  }

  const data = await resolveDraftData(input);
  if (!data) return { status: "error", message: "Client introuvable." };

  const invoice = await prisma.invoice.create({
    data: {
      ...data,
      // Filled here and not in `resolveDraftData`, which serves the update
      // path too: clearing the field on a draft has to mean cleared, not
      // "back to the default".
      dueOn: data.dueOn ?? defaultDueDate(),
      source,
      createdById: user.id,
      lines: {
        create: input.lines.map((line, index) => ({
          position: index,
          label: line.label,
          description: line.description ?? null,
          productId: line.productId ?? null,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        })),
      },
    },
    select: { id: true },
  });

  return { status: "success", id: invoice.id };
}

/**
 * Rewrites a draft.
 *
 * The lines are replaced wholesale rather than reconciled: they carry no
 * identity of their own — no history hangs off a line — so matching them up
 * would be work in service of nothing. Refused on anything already issued,
 * where the database would refuse it too.
 */
export async function updateDraft(
  id: string,
  input: DraftInput,
  user: CurrentUser
): Promise<InvoiceMutationResult> {
  if (!canManageInvoices(user)) {
    return { status: "error", message: "Vous n'avez pas la permission." };
  }

  const current = await prisma.invoice.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!current) return { status: "error", message: "Facture introuvable." };
  if (current.status !== "DRAFT") {
    return {
      status: "error",
      message: "Une facture émise ne peut plus être modifiée.",
    };
  }
  if (!(await rentalExists(input.rentalId))) {
    return { status: "error", message: "Location introuvable." };
  }

  const data = await resolveDraftData(input);
  if (!data) return { status: "error", message: "Client introuvable." };

  await prisma.$transaction([
    prisma.invoiceLine.deleteMany({ where: { invoiceId: id } }),
    prisma.invoice.update({
      where: { id },
      data: {
        ...data,
        lines: {
          create: input.lines.map((line, index) => ({
            position: index,
            label: line.label,
            description: line.description ?? null,
            productId: line.productId ?? null,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
          })),
        },
      },
    }),
  ]);

  return { status: "success", id };
}

/**
 * Issues a draft: takes the next number, dates it, and seals it.
 *
 * The number is drawn inside the same statement that leaves DRAFT, so the two
 * can never disagree — and `WHERE status = 'DRAFT'` makes a second click a
 * no-op rather than a second number. `nextval` is not rolled back by a failed
 * transaction, which is why nothing that can fail is done before this point:
 * an invoice that has a number is already complete, and the PDF that follows
 * is a rendering of it.
 *
 * An imported invoice has to bring its file first. Numbering a row that points
 * at no document would put an entry in the register with nothing behind it.
 */
export async function issueInvoice(
  id: string,
  issuedOn: Date,
  user: CurrentUser
): Promise<
  { status: "success"; id: string; reference: string } | { status: "error"; message: string }
> {
  if (!canManageInvoices(user)) {
    return { status: "error", message: "Vous n'avez pas la permission." };
  }

  const current = await prisma.invoice.findUnique({
    where: { id },
    select: {
      status: true,
      family: true,
      source: true,
      storagePath: true,
      lines: { select: { id: true } },
    },
  });
  if (!current) return { status: "error", message: "Document introuvable." };
  if (current.status !== "DRAFT") {
    return { status: "error", message: "Ce document est déjà émis." };
  }
  if (current.source === "UPLOADED" && current.storagePath === null) {
    return {
      status: "error",
      message: "Aucun fichier n'est attaché à cette facture importée.",
    };
  }
  if (current.source === "GENERATED" && current.lines.length === 0) {
    return { status: "error", message: "Une facture a au moins une ligne." };
  }

  // The deadline is settled here, from the issue date and — for a fund call —
  // from the booking. Computed before the statement below and written by it:
  // the freeze trigger refuses any later change to a date that is printed on
  // the paper, and it is right to.
  const dueOn = await dueDateAtIssue(id, issuedOn);

  // Two series, drawn from by two statements rather than one with the sequence
  // name passed in: a series is not a parameter, and spelling both out means
  // neither can be reached by accident.
  const rows =
    current.family === "FUND_CALL"
      ? await prisma.$queryRaw<{ number: number }[]>`
          UPDATE "invoices"
             SET "number"    = nextval('fund_calls_number_seq'),
                 "issuedOn"  = ${issuedOn}::date,
                 "dueOn"     = ${dueOn}::date,
                 "status"    = 'ISSUED',
                 "updatedAt" = now()
           WHERE "id" = ${id}::uuid AND "status" = 'DRAFT'
          RETURNING "number"
        `
      : await prisma.$queryRaw<{ number: number }[]>`
          UPDATE "invoices"
             SET "number"    = nextval('invoices_number_seq'),
                 "issuedOn"  = ${issuedOn}::date,
                 "dueOn"     = ${dueOn}::date,
                 "status"    = 'ISSUED',
                 "updatedAt" = now()
           WHERE "id" = ${id}::uuid AND "status" = 'DRAFT'
          RETURNING "number"
        `;

  const number = rows[0]?.number;
  if (number === undefined) {
    return { status: "error", message: "Ce document est déjà émis." };
  }


  return {
    status: "success",
    id,
    reference: invoiceReference(current.family, number, issuedOn),
  };
}

/**
 * Cancels an issued invoice. The row and its number stay: the series has to be
 * readable end to end, and a cancelled invoice is part of that history.
 */
export async function cancelInvoice(
  id: string,
  user: CurrentUser
): Promise<InvoiceMutationResult> {
  if (!canManageInvoices(user)) {
    return { status: "error", message: "Vous n'avez pas la permission." };
  }

  const current = await prisma.invoice.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!current) return { status: "error", message: "Facture introuvable." };
  if (current.status === "DRAFT") {
    return {
      status: "error",
      message: "Un brouillon se supprime, il ne s'annule pas.",
    };
  }
  if (current.status === "CANCELLED") {
    return { status: "error", message: "Cette facture est déjà annulée." };
  }

  await prisma.invoice.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
  return { status: "success", id };
}

/** Records that an issued invoice has been settled. */
export async function markInvoicePaid(
  id: string,
  paidOn: Date,
  user: CurrentUser
): Promise<InvoiceMutationResult> {
  if (!canManageInvoices(user)) {
    return { status: "error", message: "Vous n'avez pas la permission." };
  }

  const current = await prisma.invoice.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!current) return { status: "error", message: "Facture introuvable." };
  if (current.status !== "ISSUED") {
    return {
      status: "error",
      message: "Seule une facture émise peut être marquée payée.",
    };
  }

  await prisma.invoice.update({
    where: { id },
    data: { status: "PAID", paidOn },
  });
  return { status: "success", id };
}

/**
 * Discards a draft.
 *
 * Only a draft: it carries no number, so nothing leaves the series with it.
 * An issued invoice is cancelled instead, and the database refuses the
 * difference rather than trusting this check alone.
 */
export async function deleteDraft(
  id: string,
  user: CurrentUser
): Promise<InvoiceMutationResult> {
  if (!canManageInvoices(user)) {
    return { status: "error", message: "Vous n'avez pas la permission." };
  }

  const current = await prisma.invoice.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!current) return { status: "error", message: "Facture introuvable." };
  if (current.status !== "DRAFT") {
    return {
      status: "error",
      message: "Une facture émise ne se supprime pas — annulez-la.",
    };
  }

  await prisma.invoice.delete({ where: { id } });
  return { status: "success", id };
}

/**
 * Points a draft at the file that was uploaded for it.
 *
 * Guarded like every other write, though its only caller has already checked:
 * an exported function that writes should not depend on being called from the
 * right place, and an Agent reaching it would be attaching a file to a
 * document they may read but never change.
 */
export async function attachInvoiceFile(
  id: string,
  storagePath: string,
  fileName: string,
  user: CurrentUser
): Promise<void> {
  if (!canManageInvoices(user)) return;
  await prisma.invoice.update({
    where: { id },
    data: { storagePath, fileName },
  });
}
