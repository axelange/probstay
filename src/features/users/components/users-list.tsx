import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { UserListItem } from "@/features/users/services/user-service";
import { initials, roleLabel } from "@/lib/user-display";

/**
 * Rows rather than a `<table>`, matching the properties list: the same
 * reasoning applies, and a table of five columns still forces a
 * horizontal scroll on a phone.
 *
 * A Server Component — there is nothing interactive here yet, so
 * shipping it to the browser would buy nothing.
 */
export function UsersList({
  users,
  currentUserId,
}: {
  users: UserListItem[];
  /** Marked so it is obvious which row is you — the rules forbid
   *  editing your own access, so this will matter once the row has
   *  actions on it. */
  currentUserId: string;
}) {
  if (users.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        Aucun utilisateur.
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-lg border">
      {users.map((user) => {
        const isSelf = user.id === currentUserId;

        return (
          <li
            key={user.id}
            className="flex items-center gap-3 px-4 py-3 text-sm"
          >
            <Avatar className="size-8 shrink-0">
              <AvatarFallback className="text-xs">
                {initials(user.fullName)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate font-medium">{user.fullName}</span>
                {isSelf ? (
                  <span className="text-muted-foreground text-xs">(vous)</span>
                ) : null}
              </div>
              <span className="text-muted-foreground block truncate text-xs">
                {user.email}
              </span>
            </div>

            <Badge variant="secondary" className="shrink-0 font-normal">
              {roleLabel(user.role)}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}
