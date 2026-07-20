import "server-only";

import { prisma } from "@/lib/prisma";

export type UserListItem = Awaited<ReturnType<typeof listUsers>>[number];

/**
 * Everyone with an account.
 *
 * Ordered by role first: the `Role` enum is declared in descending
 * authority, and Prisma sorts enums by declaration order, so this puts
 * Super administrateurs at the top and Agents at the bottom without a
 * hand-written rank.
 *
 * Archived users are excluded, matching listProperties — business
 * objects are soft-deleted and an archived profile must stop working.
 * There is no archive/restore UI yet, so nothing here can produce one.
 *
 * No permission check lives in this function: it is the caller's job,
 * and the page does it. Stated so nobody assumes otherwise and calls
 * this from somewhere unguarded.
 */
export type PendingInvitation = Awaited<
  ReturnType<typeof listPendingInvitations>
>[number];

/**
 * Invitations issued but not yet used.
 *
 * Shown alongside the user list because otherwise the page misrepresents
 * who has access: an invited address can sign in and be provisioned at
 * any moment, but appears nowhere in `users` until it does.
 *
 * Accepted ones are filtered out rather than deleted — the auth hook
 * consults this table on every sign-in, not just the first, so the row
 * has to survive.
 */
export async function listPendingInvitations() {
  return prisma.userInvitation.findMany({
    where: { acceptedAt: null },
    select: {
      id: true,
      email: true,
      role: true,
      isExternal: true,
      createdAt: true,
      inviter: { select: { fullName: true } },
    },
    orderBy: [{ role: "asc" }, { email: "asc" }],
  });
}

export async function listUsers() {
  return prisma.user.findMany({
    where: { archivedAt: null },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: [{ role: "asc" }, { fullName: "asc" }],
  });
}
