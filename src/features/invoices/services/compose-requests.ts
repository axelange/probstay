import "server-only";

import { roundToCents } from "@/features/invoices/reference";
import type { ProductRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

type Decimalish = { toNumber(): number } | null;
const n = (value: Decimalish) => (value ? value.toNumber() : 0);

const DAY = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Europe/Paris",
});

/** One line of a composed request, ready to be written or offered. */
export type RequestLine = {
  label: string;
  description: string | null;
  productId: string | null;
  unitPrice: number;
};

/** A whole request: what heads it, what it says, and what it asks for. */
export type ComposedRequest = {
  /** The line role that heads it — how the document is recognised later. */
  head: "DEPOSIT" | "SECURITY_DEPOSIT" | "RENT";
  /** For a picker: "Solde", "Acompte", "Dépôt de garantie". */
  shortLabel: string;
  /** The heading the document takes, "EN / FR". Null falls back to the family. */
  title: string | null;
  /** Mentions the catalogue attaches, for the document's observations. */
  notes: string | null;
  lines: RequestLine[];
  total: number;
};

/** What each role is called when the catalogue has no entry for it. */
const FALLBACK_LABEL: Record<ProductRole, string> = {
  DEPOSIT: "Acompte",
  SECURITY_DEPOSIT: "Dépôt de garantie",
  RENT: "Montant de la location",
  TOURIST_TAX: "Taxe de séjour",
  DEPOSIT_PAID: "Acompte versé",
};

/** The short name a picker shows, which is the request rather than the line. */
const SHORT_LABEL = {
  DEPOSIT: "Acompte",
  SECURITY_DEPOSIT: "Dépôt de garantie",
  RENT: "Solde",
} as const;

/**
 * The payment requests a booking can be asked for, composed line by line.
 *
 * The balance is the one that earns the breakdown: the rent, then every
 * service billed on top of the stay under its own name — a client seeing four
 * hundred euros more wants to know it is the cleaning — then the taxe de
 * séjour, and finally the acompte deducted, but only once it has actually been
 * received. While it is still owed it stays inside the sum being asked for.
 *
 * The wording of each line comes from the catalogue, which is the agency's to
 * edit; the arithmetic stays here, where it already lived. A service carries
 * no catalogue entry at all: its name was typed on the contract, and that is
 * the name the client agreed to.
 *
 * The figures are the contract's — rent, services and the frozen taxe de
 * séjour — so a request composed from them says what the client signed.
 */
export async function composeRequests(
  rentalId: string
): Promise<ComposedRequest[]> {
  const [rental, products] = await Promise.all([
    prisma.rental.findFirst({
      where: { id: rentalId, archivedAt: null },
      select: {
        grossAmount: true,
        depositAmount: true,
        // Whether the booking takes an acompte at all. Without it a request
        // could still be raised for one the contract never mentions, which is
        // a bill for something nobody agreed to.
        depositBasis: true,
        depositStatus: true,
        securityDepositAmount: true,
        touristTaxAmount: true,
        services: {
          select: { label: true, amount: true, includedInStay: true },
        },
        payments: {
          where: { kind: "DEPOSIT" },
          select: { paidAt: true },
          orderBy: { paidAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.product.findMany({
      where: { role: { not: null }, archivedAt: null },
      select: { id: true, label: true, notes: true, documentTitle: true, role: true },
    }),
  ]);
  if (!rental) return [];

  const entry = (role: ProductRole) => products.find((p) => p.role === role);
  const line = (
    role: ProductRole,
    unitPrice: number,
    description: string | null = null
  ): RequestLine => {
    const product = entry(role);
    return {
      label: product?.label ?? FALLBACK_LABEL[role],
      description,
      productId: product?.id ?? null,
      unitPrice,
    };
  };

  const requests: ComposedRequest[] = [];
  const deposit =
    rental.depositBasis === "NONE" ? 0 : n(rental.depositAmount);

  // The acompte, asked for on its own while it is still owed.
  if (deposit > 0 && rental.depositStatus !== "PAID") {
    requests.push(build("DEPOSIT", [line("DEPOSIT", deposit)]));
  }

  // The balance: the client total, broken down, less what has been received.
  const rent = n(rental.grossAmount);
  const tax = n(rental.touristTaxAmount);
  const billed = rental.services.filter((service) => !service.includedInStay);

  const balance: RequestLine[] = [];
  if (rent > 0) balance.push(line("RENT", rent));
  for (const service of billed) {
    // No catalogue entry: the label is the one the contract carries.
    balance.push({
      label: service.label,
      description: null,
      productId: null,
      unitPrice: n(service.amount),
    });
  }
  if (tax > 0) balance.push(line("TOURIST_TAX", tax));

  // Deducted only once it is in: an acompte still owed belongs inside the sum
  // being asked for, not shown as received.
  if (deposit > 0 && rental.depositStatus === "PAID") {
    const paidAt = rental.payments[0]?.paidAt;
    balance.push(
      line(
        "DEPOSIT_PAID",
        -deposit,
        paidAt ? `Reçu le ${DAY.format(paidAt)}` : null
      )
    );
  }
  if (balance.length > 0) requests.push(build("RENT", balance));

  const caution = n(rental.securityDepositAmount);
  if (caution > 0) {
    requests.push(build("SECURITY_DEPOSIT", [line("SECURITY_DEPOSIT", caution)]));
  }

  return requests.filter((request) => request.total > 0);

  function build(
    head: ComposedRequest["head"],
    lines: RequestLine[]
  ): ComposedRequest {
    const product = entry(head);
    return {
      head,
      shortLabel: SHORT_LABEL[head],
      title: product?.documentTitle ?? null,
      notes: product?.notes ?? null,
      lines,
      total: roundToCents(
        lines.reduce((sum, l) => sum + roundToCents(l.unitPrice), 0)
      ),
    };
  }
}
