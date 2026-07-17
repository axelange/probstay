import type { CurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

/**
 * Whether a user may see a property's confidential side: the exact
 * address, internal notes, commission and fees, and the owner (including
 * banking details).
 *
 * Agents see every property but only the confidential parts of the ones
 * they manage. That is a column-level rule, and RLS is row-level, so it
 * cannot be expressed there — this is the enforcement, not a convenience.
 *
 * MANAGE_PROPERTIES covers SUPER_ADMIN, ADMIN and MODERATOR; it is false
 * for AGENT, whose access is decided by assignment instead.
 */
export function canSeePropertyConfidential(
  user: CurrentUser,
  property: { agentId: string | null }
): boolean {
  if (hasPermission(user, "MANAGE_PROPERTIES")) {
    return true;
  }

  if (user.role === "AGENT") {
    // Unassigned properties stay confidential rather than falling open
    // to every agent when both sides are null.
    return property.agentId !== null && property.agentId === user.id;
  }

  return false;
}
