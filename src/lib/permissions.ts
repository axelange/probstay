import type { Permission } from "@/generated/prisma/enums";
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
  if (user.role === "ADMIN" || user.role === "MODERATOR") {
    return permission !== "MANAGE_REGISTERS";
  }

  return false;
}
