"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, SlidersHorizontal } from "lucide-react";
import { NAV_SECTIONS } from "@/lib/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { initials, roleLabel } from "@/lib/user-display";

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

      <div className="ml-auto flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label="Menu du compte"
                className="hover:bg-accent focus-visible:ring-ring flex cursor-pointer items-center gap-2 rounded-md p-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                {/* Stacked rather than inline: the role qualifies the
                    name, and reading it should not cost a click.
                    Text is right-aligned since it now runs up against
                    the avatar on its right. */}
                <span className="hidden flex-col items-end leading-tight sm:flex">
                  <span className="text-sm">{user.fullName}</span>
                  <span className="text-muted-foreground text-xs">
                    {roleLabel(user.role)}
                  </span>
                </span>
                <Avatar className="size-7">
                  <AvatarFallback className="text-xs">
                    {initials(user.fullName)}
                  </AvatarFallback>
                </Avatar>
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
                  {roleLabel(user.role)}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {/* A link to the page, not the controls themselves: preferences
                will multiply, and a menu that grows radio groups stops being
                a menu. */}
            <DropdownMenuItem
              nativeButton={false}
              render={<Link href="/preferences" />}
            >
              <SlidersHorizontal aria-hidden="true" />
              Préférences
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* A form post, not a click handler: sign-out must clear the
            httpOnly session cookies, which only the server can do.
            nativeButton is left alone here — this really is a button. */}
        <form action="/auth/signout" method="post">
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            aria-label="Se déconnecter"
            title="Se déconnecter"
            className="cursor-pointer"
          >
            <LogOut aria-hidden="true" />
          </Button>
        </form>
      </div>
    </header>
  );
}
