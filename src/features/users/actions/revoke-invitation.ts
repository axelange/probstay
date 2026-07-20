"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import {
  canAssignRole,
  canInviteExternal,
  hasPermission,
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export type RevokeInvitationResult =
  | { status: "success" }
  | { status: "error"; message: string };

/**
 * Withdraws an invitation that has not been accepted.
 *
 * Necessary rather than nice to have: `email` is unique, so a typo'd
 * invitation permanently blocks the correct address until it is removed.
 *
 * A hard delete, unlike the soft-delete rule applied to business
 * objects. An invitation is a pending grant of access, not a record of
 * anything that happened — and leaving revoked rows behind would keep
 * the address unusable, which is the problem this exists to solve.
 */
export async function revokeInvitation(
  invitationId: string
): Promise<RevokeInvitationResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { status: "error", message: "Session expirée." };
  }

  if (!hasPermission(user, "MANAGE_USERS")) {
    return {
      status: "error",
      message: "Vous n'avez pas la permission de gérer les invitations.",
    };
  }

  const invitation = await prisma.userInvitation.findUnique({
    where: { id: invitationId },
    select: { role: true, isExternal: true, acceptedAt: true },
  });

  if (!invitation) {
    return { status: "error", message: "Cette invitation n'existe plus." };
  }

  // Accepted invitations are kept: the auth hook consults this table on
  // every sign-in, not just the first, so deleting one locks out a
  // working account.
  if (invitation.acceptedAt) {
    return {
      status: "error",
      message: "Cette invitation a déjà été acceptée.",
    };
  }

  // Same ceiling as issuing one — otherwise an Admin could revoke a
  // Super administrateur's pending invitation.
  if (!canAssignRole(user, invitation.role)) {
    return {
      status: "error",
      message: "Vous ne pouvez pas gérer une invitation de ce rôle.",
    };
  }

  if (invitation.isExternal && !canInviteExternal(user)) {
    return {
      status: "error",
      message:
        "Seul un super administrateur peut gérer une invitation externe.",
    };
  }

  await prisma.userInvitation.delete({ where: { id: invitationId } });

  revalidatePath("/users");

  return { status: "success" };
}
