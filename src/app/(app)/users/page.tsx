import { notFound, redirect } from "next/navigation";
import { InviteUserDialog } from "@/features/users/components/invite-user-dialog";
import { PendingInvitations } from "@/features/users/components/pending-invitations";
import { UsersList } from "@/features/users/components/users-list";
import {
  listPendingInvitations,
  listUsers,
} from "@/features/users/services/user-service";
import { getCurrentUser } from "@/lib/auth";
import {
  assignableRoles,
  canInviteExternal,
  hasPermission,
} from "@/lib/permissions";

export const metadata = { title: "Utilisateurs — BSTAY PRO" };

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Checked here and not only in the navigation: the sidebar filters
  // this link out for anyone without MANAGE_USERS, but a hidden link is
  // not access control — the route is still reachable by typing it.
  //
  // notFound() rather than a redirect, so the page's existence isn't
  // confirmed to someone who may not see it.
  if (!hasPermission(user, "MANAGE_USERS")) {
    notFound();
  }

  const [users, invitations] = await Promise.all([
    listUsers(),
    listPendingInvitations(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">
            Utilisateurs
          </h2>
          <p className="text-muted-foreground text-sm">
            {users.length === 1
              ? "1 utilisateur actif."
              : `${users.length} utilisateurs actifs.`}
          </p>
        </div>

        {/* Roles are resolved server-side so one the inviter may not
            grant is never offered. The action re-checks regardless —
            rendering a control is not permission. */}
        <InviteUserDialog
          assignableRoles={assignableRoles(user)}
          canInviteExternal={canInviteExternal(user)}
        />
      </div>

      <UsersList users={users} currentUserId={user.id} />

      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">Invitations en attente</h3>
          <p className="text-muted-foreground text-sm">
            Ces adresses peuvent se connecter mais n&apos;ont pas encore de
            compte.
          </p>
        </div>

        <PendingInvitations invitations={invitations} />
      </section>
    </div>
  );
}
