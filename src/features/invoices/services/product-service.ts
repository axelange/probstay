import "server-only";

import {
  canManageInvoices,
  canReadAllInvoices,
} from "@/features/invoices/services/invoice-service";
import type { ProductRole } from "@/generated/prisma/enums";
import type { CurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type CatalogProduct = {
  id: string;
  label: string;
  description: string | null;
  unitPrice: number;
  /** Mentions carried onto a document's observations when it is used. */
  notes: string | null;
  /** Set on the entries a request is composed from. */
  role: ProductRole | null;
  /** The heading a document takes when this entry opens one. */
  documentTitle: string | null;
  archivedAt: Date | null;
  /** How many issued documents have billed it. */
  timesBilled: number;
};

export type ProductMutationResult =
  | { status: "success"; id: string }
  | { status: "error"; message: string };

/**
 * The catalogue, alphabetically.
 *
 * Withdrawn products are returned too, and marked: the page shows them so they
 * can be brought back, while every picker filters them out. A product is never
 * deleted once billed — the lines that came from it are part of documents that
 * cannot change.
 */
export async function listProducts(
  user: CurrentUser
): Promise<CatalogProduct[]> {
  // The register's own permissions, not a document's: the catalogue is the
  // agency's price list, and an agent who may read a line on one of their
  // bookings has no business with the list it was drawn from.
  if (!canReadAllInvoices(user)) return [];

  const rows = await prisma.product.findMany({
    select: {
      id: true,
      label: true,
      description: true,
      unitPrice: true,
      notes: true,
      role: true,
      documentTitle: true,
      archivedAt: true,
      _count: { select: { lines: true } },
    },
    orderBy: [{ archivedAt: "asc" }, { label: "asc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    description: row.description,
    unitPrice: row.unitPrice.toNumber(),
    notes: row.notes,
    role: row.role,
    documentTitle: row.documentTitle,
    archivedAt: row.archivedAt,
    timesBilled: row._count.lines,
  }));
}

/** What a picker offers: everything still in the catalogue. */
export async function listAvailableProducts(user: CurrentUser) {
  const products = await listProducts(user);
  return products.filter((product) => product.archivedAt === null);
}

export type ProductInput = {
  label: string;
  description?: string;
  unitPrice: number;
  notes?: string;
};

export async function createProduct(
  input: ProductInput,
  user: CurrentUser
): Promise<ProductMutationResult> {
  if (!canManageInvoices(user)) {
    return { status: "error", message: "Vous n'avez pas la permission." };
  }

  const product = await prisma.product.create({
    data: {
      label: input.label,
      description: input.description ?? null,
      unitPrice: input.unitPrice,
      notes: input.notes ?? null,
      createdById: user.id,
    },
    select: { id: true },
  });
  return { status: "success", id: product.id };
}

/**
 * Edits a catalogue entry.
 *
 * It changes nothing on any document: a line copies the label and the price it
 * was billed at, so correcting a price here sets what the *next* invoice will
 * carry and leaves the ones already written alone.
 */
export async function updateProduct(
  id: string,
  input: ProductInput,
  user: CurrentUser
): Promise<ProductMutationResult> {
  if (!canManageInvoices(user)) {
    return { status: "error", message: "Vous n'avez pas la permission." };
  }

  await prisma.product.update({
    where: { id },
    data: {
      label: input.label,
      description: input.description ?? null,
      unitPrice: input.unitPrice,
      notes: input.notes ?? null,
    },
  });
  return { status: "success", id };
}

/** Withdraws a product, or brings it back. */
export async function setProductArchived(
  id: string,
  archived: boolean,
  user: CurrentUser
): Promise<ProductMutationResult> {
  if (!canManageInvoices(user)) {
    return { status: "error", message: "Vous n'avez pas la permission." };
  }

  await prisma.product.update({
    where: { id },
    data: { archivedAt: archived ? new Date() : null },
  });
  return { status: "success", id };
}
