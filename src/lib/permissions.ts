import type { Permission, Role } from "@/generated/prisma/enums";
import type { CurrentUser } from "@/lib/auth";

/**
 * Resolves whether a user holds a permission.
 *
 * This deliberately mirrors internal.has_permission() in the database,
 * and the two MUST be kept in step. The duplication is unavoidable
 * rather than sloppy: the SQL function decides from auth.uid(), which is
 * only populated for requests arriving through PostgREST with a user's
 * JWT. The application talks to Postgres through Prisma as the table
 * owner, where auth.uid() is null and that function would return false
 * for everyone.
 *
 * Treat this as the app's answer and RLS as the backstop underneath it.
 * If you change one, change the other — see the RLS migration.
 *
 * Resolution order matches the SQL exactly: an explicit per-user
 * override always beats the role baseline.
 */
export function hasPermission(
  user: CurrentUser,
  permission: Permission
): boolean {
  const override = user.permissions.find((p) => p.permission === permission);
  if (override) {
    return override.granted;
  }

  if (user.role === "SUPER_ADMIN") {
    return true;
  }

  // Registers are immutable by law, so even an Admin is refused.
  if (user.role === "ADMIN") {
    return permission !== "MANAGE_REGISTERS";
  }

  // A Moderator mirrors an Admin except that managing people and editing
  // the document templates are not theirs by default. An Admin may still
  // grant either per-Moderator, which lands in user_permissions and is
  // caught by the override above.
  if (user.role === "MODERATOR") {
    return (
      permission !== "MANAGE_REGISTERS" &&
      permission !== "MANAGE_USERS" &&
      permission !== "MANAGE_DOCUMENT_TEMPLATES"
    );
  }

  return false;
}

/**
 * Authority, highest first. The Prisma enum is declared in this order
 * and Postgres compares enums by declaration, so this array and the
 * `role > internal.current_user_role()` tests in the RLS policies are
 * the same ordering stated twice — keep them in step.
 */
const ROLE_RANK: Role[] = ["SUPER_ADMIN", "ADMIN", "MODERATOR", "AGENT"];

/**
 * Whether `user` may hand out `role` — to an invitee, or to an existing
 * account.
 *
 * Strictly beneath the actor's own rank. Equal is refused, so an Admin
 * cannot mint another Admin and peers cannot promote each other, and
 * nobody can create their own rank or above. Mirrors the
 * `role > internal.current_user_role()` test in the RLS policies.
 */
export function canAssignRole(user: CurrentUser, role: Role): boolean {
  if (!hasPermission(user, "MANAGE_USERS")) {
    return false;
  }

  return ROLE_RANK.indexOf(role) > ROLE_RANK.indexOf(user.role);
}

/** Every role this user may hand out, in authority order. */
export function assignableRoles(user: CurrentUser): Role[] {
  return ROLE_RANK.filter((role) => canAssignRole(user, role));
}

/**
 * Whether `user` may administer the account identified by `target`.
 *
 * Rank, plus the rule that you may never act on yourself. The second is
 * not politeness — it is what stops an Admin granting themselves the
 * one permission their role is meant to refuse.
 */
export function canManageUser(
  user: CurrentUser,
  target: { id: string; role: Role }
): boolean {
  if (target.id === user.id) {
    return false;
  }

  return canAssignRole(user, target.role);
}

/**
 * Inviting someone from outside the company bypasses the @b-stay.com
 * rule, so it is SUPER_ADMIN's alone — matching the
 * user_invitations_all_super_admin policy. Existing use is the external
 * developer.
 */
export function canInviteExternal(user: CurrentUser): boolean {
  return user.role === "SUPER_ADMIN";
}

/**
 * Whether `user` may confer `permission` on someone else.
 *
 * You cannot hand out what you do not hold. Without this an Admin could
 * grant MANAGE_REGISTERS to a Moderator beneath them and act through
 * that person, which defeats the legal immutability rule just as
 * thoroughly as granting it to themselves would.
 */
export function canGrantPermission(
  user: CurrentUser,
  permission: Permission
): boolean {
  return hasPermission(user, permission);
}
