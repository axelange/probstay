import "server-only";

import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

/** How long a link stays usable, in days, unless revoked sooner. */
export const INTAKE_LINK_DAYS = 30;

/**
 * The token is the entire credential, so it is 32 random bytes rather than an
 * id anyone could guess or increment. base64url keeps it URL-safe and short
 * enough to sit in an email without wrapping.
 */
export function newIntakeToken(): string {
  return randomBytes(32).toString("base64url");
}

export type IntakePrefill = {
  contactName: string;
  isCompany: boolean;
  /** FULL asks who the agency contracts with; OCCUPANTS only the other adults. */
  scope: "FULL" | "OCCUPANTS";
  /** Present only when the link was opened for a booking. */
  stay: {
    property: string;
    checkIn: Date;
    checkOut: Date;
    /** Adults besides the primary tenant, from the headcount. */
    otherAdults: number;
    stayPurpose: string | null;
    stayPurposeOther: string | null;
    occupants: { firstName: string; lastName: string; idDocType: string | null; idDocNumber: string | null }[];
  } | null;
  individual: Record<string, string>;
  company: Record<string, string>;
};

const str = (v: string | null | undefined) => v ?? "";
const day = (d: Date | null | undefined) =>
  d ? d.toISOString().slice(0, 10) : "";

/**
 * Resolves a token to the form behind it, or null.
 *
 * Expiry, revocation and a missing token all answer the same way. A client
 * whose link has lapsed should be told to ask for a new one; telling them
 * *why* would let anyone probing tokens learn which ones exist.
 *
 * The form is pre-filled with what the agency already holds, which the agency
 * decided is worth the disclosure: the client corrects rather than retypes.
 * The link is bounded by expiry, revocation and being tied to one contact.
 */
export async function resolveIntake(token: string): Promise<
  | { link: { id: string; contactId: string; rentalId: string | null }; prefill: IntakePrefill }
  | null
> {
  if (!token || token.length < 20) return null;

  const link = await prisma.clientIntakeLink.findUnique({
    where: { token },
    select: {
      id: true,
      contactId: true,
      rentalId: true,
      scope: true,
      expiresAt: true,
      revokedAt: true,
      contact: {
        select: {
          firstName: true,
          lastName: true,
          kind: true,
          occupation: true,
          nationality: true,
          maritalStatus: true,
          birthDate: true,
          birthPlace: true,
          address: true,
          postalCode: true,
          city: true,
          country: true,
          phone: true,
          email: true,
          idDocType: true,
          idDocNumber: true,
          company: true,
        },
      },
      rental: {
        select: {
          checkIn: true,
          checkOut: true,
          guests: true,
          children: true,
          stayPurpose: true,
          stayPurposeOther: true,
          property: { select: { marketingName: true, city: true } },
          occupants: {
            orderBy: { createdAt: "asc" },
            select: { firstName: true, lastName: true, idDocType: true, idDocNumber: true },
          },
        },
      },
    },
  });

  if (!link) return null;
  if (link.revokedAt !== null) return null;
  if (link.expiresAt.getTime() <= Date.now()) return null;

  const c = link.contact;
  const co = c.company;
  const r = link.rental;

  return {
    link: { id: link.id, contactId: link.contactId, rentalId: link.rentalId },
    prefill: {
      contactName: [c.firstName, c.lastName].filter(Boolean).join(" "),
      isCompany: c.kind === "COMPANY",
      scope: link.scope,
      stay: r
        ? {
            property: r.property.marketingName ?? r.property.city ?? "Le bien loué",
            checkIn: r.checkIn,
            checkOut: r.checkOut,
            // The tenant filling this in is one of the adults, so the others
            // are the rest. Shown as guidance, never enforced.
            otherAdults: Math.max(0, (r.guests ?? 0) - (r.children ?? 0) - 1),
            stayPurpose: r.stayPurpose,
            stayPurposeOther: r.stayPurposeOther,
            occupants: r.occupants,
          }
        : null,
      individual: {
        lastName: str(c.lastName),
        firstName: str(c.firstName),
        occupation: str(c.occupation),
        nationality: str(c.nationality),
        maritalStatus: str(c.maritalStatus),
        birthDate: day(c.birthDate),
        birthPlace: str(c.birthPlace),
        address: str(c.address),
        postalCode: str(c.postalCode),
        city: str(c.city),
        country: str(c.country),
        phone: str(c.phone),
        email: str(c.email),
        idDocType: str(c.idDocType),
        idDocNumber: str(c.idDocNumber),
      },
      company: {
        companyName: str(c.lastName),
        legalForm: str(co?.legalForm),
        registrationNumber: str(co?.registrationNumber),
        mainActivity: str(co?.mainActivity),
        registeredOffice: str(co?.registeredOffice),
        officePostalCode: str(co?.officePostalCode),
        officeCity: str(co?.officeCity),
        officeCountry: str(co?.officeCountry),
        companyPhone: str(c.phone),
        companyEmail: str(c.email),
        repLastName: str(co?.repLastName),
        repFirstName: str(co?.repFirstName),
        repCapacity: str(co?.repCapacity),
        repOccupation: str(co?.repOccupation),
        repNationality: str(co?.repNationality),
        repPhone: str(co?.repPhone),
        repEmail: str(co?.repEmail),
        repIdDocType: str(co?.repIdDocType),
        repIdDocNumber: str(co?.repIdDocNumber),
      },
    },
  };
}

export type IntakeLinkListRow = {
  id: string;
  token: string;
  expiresAt: Date;
  revokedAt: Date | null;
  submittedAt: Date | null;
  createdAt: Date;
  authorName: string | null;
  scope: "FULL" | "OCCUPANTS";
  /**
   * Whether the link still works. Decided here rather than in the browser:
   * "is it expired" is a question about now, and a component that asks it
   * while rendering is not a pure function of its props.
   */
  isActive: boolean;
};

/**
 * The links issued to a contact, newest first — for one booking when a rental
 * is given, or the contact's own (rental-less) ones when it is not.
 */
export async function listIntakeLinks(
  contactId: string,
  rentalId: string | null,
  scope: "FULL" | "OCCUPANTS" = "FULL"
): Promise<IntakeLinkListRow[]> {
  const rows = await prisma.clientIntakeLink.findMany({
    where: { contactId, rentalId, scope },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      token: true,
      expiresAt: true,
      revokedAt: true,
      submittedAt: true,
      createdAt: true,
      scope: true,
      createdBy: { select: { fullName: true } },
    },
  });
  const now = Date.now();
  return rows.map((r) => ({
    id: r.id,
    token: r.token,
    expiresAt: r.expiresAt,
    revokedAt: r.revokedAt,
    submittedAt: r.submittedAt,
    createdAt: r.createdAt,
    authorName: r.createdBy?.fullName ?? null,
    scope: r.scope,
    isActive: r.revokedAt === null && r.expiresAt.getTime() > now,
  }));
}

export type OccupantsState = {
  expected: number;
  listed: number;
  /** Rows named but missing an identity document. */
  incomplete: string[];
  complete: boolean;
};

/**
 * Whether the other adults are accounted for.
 *
 * Expected count comes from the headcount less the children and less the
 * tenant themself, who is guest 1. "Complete" means as many rows as expected
 * and every one of them carrying a document type and number — the same rule
 * the client's own form applies on an OCCUPANTS link.
 */
export async function occupantsState(
  rentalId: string
): Promise<OccupantsState> {
  const rental = await prisma.rental.findUnique({
    where: { id: rentalId },
    select: {
      guests: true,
      children: true,
      occupants: {
        orderBy: { createdAt: "asc" },
        select: { firstName: true, lastName: true, idDocType: true, idDocNumber: true },
      },
    },
  });
  if (!rental) return { expected: 0, listed: 0, incomplete: [], complete: true };

  const expected = Math.max(
    0,
    (rental.guests ?? 0) - (rental.children ?? 0) - 1
  );
  const incomplete = rental.occupants
    .filter((o) => !o.idDocType || !o.idDocNumber?.trim())
    .map((o) => [o.firstName, o.lastName].filter(Boolean).join(" ") || "sans nom");

  return {
    expected,
    listed: rental.occupants.length,
    incomplete,
    complete:
      rental.occupants.length >= expected && incomplete.length === 0,
  };
}
