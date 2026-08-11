import "server-only";

import { prisma } from "@/lib/prisma";
import { COMPANY_REGISTRATION_MAX_AGE_MONTHS } from "@/features/contacts/components/contact-type-labels";
import type { IdentityDocumentType } from "@/generated/prisma/enums";

export const IDENTITY_BUCKET = "identity-documents";

export type ContactDocumentRow = {
  id: string;
  type: IdentityDocumentType;
  number: string | null;
  issuedAt: Date | null;
  fileName: string | null;
  uploadedAt: Date;
  /** The booking it came in with, when it came through a client's link. */
  rental: { id: string; reference: number } | null;
};

/** Every document held against a contact, newest first. */
export async function listContactDocuments(
  contactId: string
): Promise<ContactDocumentRow[]> {
  const rows = await prisma.identityDocument.findMany({
    where: { contactId },
    orderBy: { uploadedAt: "desc" },
    select: {
      id: true,
      type: true,
      number: true,
      issuedAt: true,
      storagePath: true,
      uploadedAt: true,
      rental: { select: { id: true, reference: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    number: r.number,
    issuedAt: r.issuedAt,
    // The stored name is the opaque key; what a reader wants is the last
    // segment, which is all the download names it anyway.
    fileName: r.storagePath.split("/").pop() ?? null,
    uploadedAt: r.uploadedAt,
    rental: r.rental,
  }));
}

/**
 * Whether a registration extract is recent enough to contract on.
 *
 * The reference is the signature, not the stay and not today: the extract
 * evidences that the company existed and was represented as claimed when the
 * agreement was entered into. A booking signed in April on a March extract is
 * in order however far off the stay is.
 *
 * Nothing re-checks it later, deliberately. Confirming the company still
 * exists shortly before arrival is a search anyone can run, not a document to
 * collect again — so this answers one question, at one moment.
 */
export function registrationIsFresh(
  issuedAt: Date | null,
  atSignature: Date
): boolean | null {
  if (issuedAt === null) return null;
  const limit = new Date(atSignature);
  limit.setMonth(limit.getMonth() - COMPANY_REGISTRATION_MAX_AGE_MONTHS);
  return issuedAt.getTime() >= limit.getTime();
}

export type ContactRentalRow = {
  id: string;
  reference: number;
  checkIn: Date;
  checkOut: Date;
  bookingStatus: string;
  property: string;
  /** How this contact is involved: as the tenant, or as the owner paid. */
  role: "tenant" | "owner";
};

/**
 * The bookings a contact has been part of, newest first.
 *
 * Both sides, because a contact is not always one or the other: an owner who
 * rents elsewhere on the coast appears in both lists, and reading only one of
 * them would say their history is shorter than it is.
 */
export async function listContactRentals(
  contactId: string
): Promise<ContactRentalRow[]> {
  const rentals = await prisma.rental.findMany({
    where: {
      archivedAt: null,
      OR: [{ tenants: { some: { contactId } } }, { ownerId: contactId }],
    },
    orderBy: { checkIn: "desc" },
    // Bounded: the fiche shows ten and pages the rest in a dialog, so nothing
    // needs the whole history at once, and an owner of twenty villas should
    // not make this query grow without limit.
    take: 200,
    select: {
      id: true,
      reference: true,
      checkIn: true,
      checkOut: true,
      bookingStatus: true,
      ownerId: true,
      property: { select: { marketingName: true, city: true } },
    },
  });

  return rentals.map((r) => ({
    id: r.id,
    reference: r.reference,
    checkIn: r.checkIn,
    checkOut: r.checkOut,
    bookingStatus: r.bookingStatus,
    property: r.property.marketingName ?? r.property.city ?? "Sans nom",
    role: r.ownerId === contactId ? ("owner" as const) : ("tenant" as const),
  }));
}
