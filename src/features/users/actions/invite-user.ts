"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth";
import {
  canAssignRole,
  canInviteExternal,
  hasPermission,
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { invitationSchema } from "@/features/users/schemas/invitation-schema";

export type InviteUserResult =
  | { status: "success"; email: string }
  | { status: "error"; message: string };

/**
 * Creates an invitation, which is what actually grants access: the
 * before-user-created auth hook refuses any address without one, and
 * the provisioning trigger reads the role from here on first sign-in.
 *
 * Every rule is re-checked server-side. RLS enforces the same ones, but
 * the application connects to Postgres as the table owner and bypasses
 * RLS entirely, so these checks are the enforcement here, not a
 * convenience for the form.
 */
export async function inviteUser(input: unknown): Promise<InviteUserResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { status: "error", message: "Session expirée." };
  }

  if (!hasPermission(user, "MANAGE_USERS")) {
    return {
      status: "error",
      message: "Vous n'avez pas la permission d'inviter des utilisateurs.",
    };
  }

  const parsed = invitationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }

  const { email, role, isExternal } = parsed.data;

  // Strictly beneath the inviter. Blocks minting a peer or a superior,
  // which would otherwise be escalation one sign-in later.
  if (!canAssignRole(user, role)) {
    return {
      status: "error",
      message: "Vous ne pouvez inviter qu'un rôle inférieur au vôtre.",
    };
  }

  if (isExternal && !canInviteExternal(user)) {
    return {
      status: "error",
      message:
        "Seul un super administrateur peut inviter une adresse externe.",
    };
  }

  // No database constraint spans the two tables, so an address that
  // already has an account would otherwise be invitable again — and the
  // resulting invitation could never be consumed, since the trigger only
  // fires on first sign-in.
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    return {
      status: "error",
      message: `${email} a déjà un compte.`,
    };
  }

  try {
    await prisma.userInvitation.create({
      data: { email, role, isExternal, invitedBy: user.id },
    });

    revalidatePath("/users");

    return { status: "success", email };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // The database is the arbiter rather than a prior lookup, which
      // could pass and then lose a race to a concurrent invite.
      return {
        status: "error",
        message: `${email} a déjà été invité.`,
      };
    }

    console.error("inviteUser failed", error);
    return { status: "error", message: "Invitation impossible." };
  }
}
