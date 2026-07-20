import type { Role } from "@/generated/prisma/enums";

/**
 * Roles are English in code and French on screen, per the coding
 * guidelines. Shared rather than restated per component so the topbar
 * and the users list can never drift into calling the same role two
 * different things.
 */
export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super administrateur",
  ADMIN: "Administrateur",
  MODERATOR: "Modérateur",
  AGENT: "Agent",
};

/**
 * Falls back to the raw value rather than an empty string: an
 * unrecognised role means the enum grew and this map didn't, and a
 * visible "SUPER_ADMIN" is a better bug report than a blank cell.
 */
export function roleLabel(role: string): string {
  return ROLE_LABELS[role as Role] ?? role;
}

/** First letters of the first two words, for an avatar fallback. */
export function initials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
