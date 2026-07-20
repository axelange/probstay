import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { CurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export type ContactListItem = Awaited<ReturnType<typeof listContacts>>[number];

/**
 * Which contacts this user may see, as a Prisma filter.
 *
 * Deliberately mirrors the three RLS policies on `contacts`, and they
 * MUST be kept in step. Prisma connects as the table owner and bypasses
 * RLS entirely, so this is the enforcement — RLS is the backstop for
 * anything arriving over PostgREST with a user's JWT.
 *
 *   MANAGE_CONTACTS  -> every contact
 *   AGENT            -> contacts holding CLIENT, plus the owners of the
 *                       properties they are assigned to
 *   anyone else      -> nothing
 *
 * The Agent's two cases are ORed, matching Postgres, which ORs
 * permissive policies together.
 */
function visibilityFilter(user: CurrentUser): Prisma.ContactWhereInput | null {
  if (hasPermission(user, "MANAGE_CONTACTS")) {
    return {};
  }

  if (user.role === "AGENT") {
    return {
      OR: [
        { types: { has: "CLIENT" } },
        // Scoped through the property's agent, so an Agent gains nothing
        // for an owner whose properties they don't manage.
        { properties: { some: { agentId: user.id, archivedAt: null } } },
      ],
    };
  }

  return null;
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
  if (where === null) return [];

  return prisma.contact.findMany({
    where: { ...where, archivedAt: null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      types: true,
      apimoId: true,
      _count: { select: { properties: true } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
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
export async function findContactByPhone(phone: string) {
  return prisma.contact.findFirst({
    where: { phone, archivedAt: null },
    select: { id: true, firstName: true, lastName: true },
  });
}
