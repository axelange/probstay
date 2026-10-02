import "server-only";

import {
  DOCUMENT_TYPE_OF_TEMPLATE,
  documentReference,
} from "@/features/documents/reference";
import type { DocumentTemplateTypeKey } from "@/features/documents/template-clauses";
import { rentalVisibilityFilter } from "@/features/rentals/services/rental-service";
import type { CurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Where a stored file came from. The two buckets hold different things —
 * what the app produced, and what came back from the signatories — and a
 * search over both is only useful if it keeps saying which is which.
 */
export type StoredDocumentOrigin = "GENERATED" | "SIGNED" | "AMENDMENT";

export type StoredDocumentRow = {
  id: string;
  origin: StoredDocumentOrigin;
  type: DocumentTemplateTypeKey;
  /** The reference printed on the document ("RC-0001240"). */
  reference: string;
  fileName: string;
  /** Null for generated documents: only uploads record their size. */
  sizeBytes: number | null;
  /** Generated at, or uploaded at — the moment the file entered storage. */
  storedAt: Date;
  /** Who generated or uploaded it. Null once that user is deleted. */
  authorName: string | null;
  rentalId: string;
  propertyName: string;
  tenantName: string | null;
};

function fullName(contact: {
  firstName: string | null;
  lastName: string | null;
}): string | null {
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
  return name === "" ? null : name;
}

/** The rental context every row carries, selected identically on both sides. */
const RENTAL_CONTEXT = {
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
} as const;

type RentalContext = {
  id: string;
  reference: number;
  property: { marketingName: string | null; city: string | null };
  tenants: { contact: { firstName: string | null; lastName: string | null } }[];
};

function describe(rental: RentalContext) {
  return {
    rentalId: rental.id,
    propertyName:
      rental.property.marketingName ?? rental.property.city ?? "Sans nom",
    tenantName: rental.tenants[0]
      ? fullName(rental.tenants[0].contact)
      : null,
  };
}

/**
 * Every document held in storage for the rentals this user may see, newest
 * first — the two buckets read as one list.
 *
 * Visibility is the rentals' own, reused rather than restated: a document is
 * exactly as visible as the booking it belongs to. Prisma bypasses RLS, so
 * this filter is the real check and the storage policies are the second line.
 *
 * Archived rentals are left out, as everywhere else. Their documents are not
 * deleted — an archived booking that comes back brings its paperwork with it.
 */
export async function listStoredDocuments(
  user: CurrentUser
): Promise<StoredDocumentRow[]> {
  const visible = rentalVisibilityFilter(user);
  if (visible === null) return [];

  const rental = { ...visible, archivedAt: null };

  const [generated, uploaded] = await Promise.all([
    prisma.generatedDocument.findMany({
      where: { rental },
      select: {
        id: true,
        type: true,
        reference: true,
        fileName: true,
        createdAt: true,
        generatedBy: { select: { fullName: true } },
        rental: RENTAL_CONTEXT,
      },
    }),
    prisma.signedDocument.findMany({
      where: { rental },
      select: {
        id: true,
        type: true,
        kind: true,
        fileName: true,
        sizeBytes: true,
        uploadedAt: true,
        uploadedBy: { select: { fullName: true } },
        rental: RENTAL_CONTEXT,
      },
    }),
  ]);

  const rows: StoredDocumentRow[] = [
    ...generated.map((doc) => ({
      id: doc.id,
      origin: "GENERATED" as const,
      type: doc.type,
      reference: doc.reference,
      fileName: doc.fileName,
      sizeBytes: null,
      storedAt: doc.createdAt,
      authorName: doc.generatedBy?.fullName ?? null,
      ...describe(doc.rental),
    })),
    ...uploaded.map((doc) => ({
      id: doc.id,
      origin: doc.kind,
      type: doc.type,
      // An upload stores no reference of its own — it is a copy of a document
      // the app produced, so it is labelled with that document's reference,
      // derived the same way rather than read back from a generation that may
      // never have been saved here.
      reference: documentReference(
        DOCUMENT_TYPE_OF_TEMPLATE[doc.type],
        doc.rental.reference
      ),
      fileName: doc.fileName,
      sizeBytes: doc.sizeBytes,
      storedAt: doc.uploadedAt,
      authorName: doc.uploadedBy?.fullName ?? null,
      ...describe(doc.rental),
    })),
  ];

  // Sorted after the merge rather than in each query: the two sides are
  // interleaved by date, so neither ordering survives the concatenation.
  return rows.sort((a, b) => b.storedAt.getTime() - a.storedAt.getTime());
}
