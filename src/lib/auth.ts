import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import type { Prisma } from "@/generated/prisma/client";

/**
 * A signed-in user together with their permission overrides, which are
 * needed to resolve anything they're allowed to do.
 */
export type CurrentUser = Prisma.UserGetPayload<{
  include: { permissions: true };
}>;

/**
 * The signed-in user's profile, or null if there isn't one.
 *
 * Authentication and authorisation are separate here: Google proves who
 * someone is, but every permission resolves through the `users` row,
 * which only exists once an invitation has been accepted. A valid Google
 * session with no profile therefore has no access, which is why this
 * returns null rather than throwing.
 *
 * Archived users are excluded — business objects are soft-deleted, and
 * an archived profile must stop working.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();

  // getUser revalidates against Supabase rather than trusting the
  // cookie, so it's safe to make access decisions on.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return prisma.user.findFirst({
    where: { id: user.id, archivedAt: null },
    include: { permissions: true },
  });
}
