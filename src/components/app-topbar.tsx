"use client";

import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { NAV_SECTIONS } from "@/lib/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super administrateur",
  ADMIN: "Administrateur",
  MODERATOR: "Modérateur",
  AGENT: "Agent",
};

function initials(fullName: string) {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** The full config, not the user's filtered copy — this only names the
 *  current page, and they're already on it. */
function usePageTitle() {
  const pathname = usePathname();

  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      const matches =
        item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
      if (matches) return item.label;
    }
  }

  return "BSTAY PRO";
}

export function AppTopbar({
  user,
}: {
  user: { fullName: string; email: string; role: string };
}) {
  const title = usePageTitle();

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-4" />
      <h1 className="truncate text-sm font-medium">{title}</h1>

      <div className="ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label="Menu du compte"
                className="hover:bg-accent focus-visible:ring-ring flex cursor-pointer items-center gap-2 rounded-md p-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <Avatar className="size-7">
                  <AvatarFallback className="text-xs">
                    {initials(user.fullName)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm sm:inline">
                  {user.fullName}
                </span>
              </button>
            }
          />

          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <span className="truncate text-sm font-medium">
                  {user.fullName}
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  {user.email}
                </span>
                <span className="text-muted-foreground mt-1 text-xs">
                  {ROLE_LABELS[user.role] ?? user.role}
                </span>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            {/* A form post, not a click handler: sign-out must clear the
                httpOnly session cookies, which only the server can do. */}
            <form action="/auth/signout" method="post">
              <DropdownMenuItem
                render={
                  <button type="submit" className="w-full cursor-pointer">
                    <LogOut aria-hidden="true" />
                    Se déconnecter
                  </button>
                }
              />
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
