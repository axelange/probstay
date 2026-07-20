import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { CurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export type ContactListItem = Awaited<ReturnType<typeof listContacts>>[number];

/**
 * Which contacts this user may see, as a Prisma filter.
 *
 * Deliberately mirrors the RLS policies on `contacts`, and they MUST be
 * kept in step. Prisma connects as the table owner and bypasses RLS
 * entirely, so this is the enforcement — RLS is the backstop for
 * anything arriving over PostgREST with a user's JWT.
 *
 *   MANAGE_CONTACTS -> every contact
 *   anyone signed in -> contacts holding PARTNER or PROVIDER
 *   AGENT           -> the above, plus contacts holding CLIENT, plus the
 *                      owners of the properties they are assigned to
 *
 * Owners and Clients stay restricted; a plumber or an introducing agent
 * is a working contact anyone may need. The cases are ORed, matching
 * Postgres, which ORs permissive policies together.
 */
function visibilityFilter(user: CurrentUser): Prisma.ContactWhereInput {
  if (hasPermission(user, "MANAGE_CONTACTS")) {
    return {};
  }

  const openToEveryone: Prisma.ContactWhereInput[] = [
    { types: { has: "PROVIDER" } },
    { types: { has: "PARTNER" } },
  ];

  if (user.role === "AGENT") {
    return {
      OR: [
        ...openToEveryone,
        { types: { has: "CLIENT" } },
        // Scoped through the property's agent, so an Agent gains nothing
        // for an owner whose properties they don't manage.
        { properties: { some: { agentId: user.id, archivedAt: null } } },
      ],
    };
  }

  return { OR: openToEveryone };
}

/**
 * Whether this user may see a contact's banking details.
 *
 * Narrower than seeing the contact at all, and deliberately so. A
 * contact can hold several types, so an Owner also tagged PROVIDER is
 * now visible to everyone — their name and trade should be, their IBAN
 * should not. Without this, tagging an owner as a provider would quietly
 * publish their bank details to every agent.
 *
 * An Agent still sees the IBAN of an owner whose property they manage,
 * which is the existing confidential-fields rule for properties.
 */
function canSeeBankingDetails(
  user: CurrentUser,
  properties: { agentId: string | null }[]
): boolean {
  if (hasPermission(user, "MANAGE_CONTACTS")) return true;
  if (user.role !== "AGENT") return false;
  return properties.some((p) => p.agentId === user.id);
}

/**
 * Contacts visible to this user.
 *
 * `iban` is not selected. It is the most sensitive column on the table
 * and a list never needs it — the same narrow-projection rule the
 * properties list follows, so it cannot reach the client by accident.
 */
export async function listContacts(user: CurrentUser) {
  const where = visibilityFilter(user);

  return prisma.contact.findMany({
    where: { ...where, archivedAt: null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      types: true,
      specialties: true,
      otherSpecialty: true,
      apimoId: true,
      createdAt: true,
      _count: { select: { properties: true } },
    },
    // A stable default; the list re-sorts client-side from here.
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}

export type ContactDetail = NonNullable<
  Awaited<ReturnType<typeof getContactDetail>>
>;

/**
 * One contact in full, or null if this user may not see it.
 *
 * Reuses the same visibility filter as the list rather than restating
 * it: a detail page reachable by typing an id is exactly where a second,
 * looser copy of the rule would leak.
 *
 * `iban` is read here — unlike the list — because the edit form needs
 * it, and then stripped unless this user may see banking details. It
 * never travels for 48 contacts at once, only for the one being opened,
 * and only to someone entitled to it.
 */
export async function getContactDetail(id: string, user: CurrentUser) {
  const where = visibilityFilter(user);

  const contact = await prisma.contact.findFirst({
    where: { ...where, id, archivedAt: null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      iban: true,
      notes: true,
      types: true,
      specialties: true,
      otherSpecialty: true,
      apimoId: true,
      createdAt: true,
      properties: {
        where: { archivedAt: null },
        select: {
          id: true,
          marketingName: true,
          city: true,
          reference: true,
          // Read to decide banking visibility, not for display.
          agentId: true,
        },
        orderBy: { marketingName: "asc" },
      },
    },
  });

  if (!contact) return null;

  // Stripped in place rather than conditionally selected: Prisma cannot
  // express that cleanly, and the value never leaves the server either
  // way. `canSeeBankingDetails` is returned so the form can omit the
  // field entirely instead of rendering a misleadingly empty one.
  const banking = canSeeBankingDetails(user, contact.properties);

  return {
    ...contact,
    iban: banking ? contact.iban : null,
    canSeeBankingDetails: banking,
  };
}

/**
 * An existing contact sharing this phone number, if any.
 *
 * Phone is deliberately not unique in the database: 182 numbers are
 * shared across the agency's contacts because households and couples
 * share a line, so a constraint would refuse legitimate records. The
 * duplicate check belongs here instead, as a warning the user can
 * overrule.
 */
export async function findContactByPhone(phone: string, exceptId?: string) {
  return prisma.contact.findFirst({
    where: {
      phone,
      archivedAt: null,
      // On edit, the contact's own number is not a duplicate of itself.
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    select: { id: true, firstName: true, lastName: true },
  });
}
