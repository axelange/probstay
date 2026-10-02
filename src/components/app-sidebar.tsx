"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProbstayLogo } from "@/components/probstay-logo";
import {
  Building2,
  CalendarDays,
  FileText,
  HandCoins,
  Inbox,
  PackageSearch,
  LayoutDashboard,
  type LucideIcon,
  Receipt,
  Settings,
  UsersRound,
  Contact,
  KeyRound,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import type { NavIcon, NavSection } from "@/lib/navigation";

const ICONS: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  properties: Building2,
  demandes: Inbox,
  rentals: KeyRound,
  contacts: Contact,
  calendar: CalendarDays,
  documents: FileText,
  invoices: Receipt,
  fundCalls: HandCoins,
  catalog: PackageSearch,
  users: UsersRound,
  settings: Settings,
};

export function AppSidebar({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname();

  // The most specific matching item, and only that one: /documents holds
  // three routes beneath it, so a plain startsWith would highlight the
  // section's parent alongside the page actually open.
  const activeHref = React.useMemo(() => {
    const matches = sections
      .flatMap((section) => section.items)
      .filter((item) =>
        item.href === "/"
          ? pathname === "/"
          : pathname === item.href || pathname.startsWith(`${item.href}/`)
      );
    return matches.reduce(
      (longest, item) => (item.href.length > longest.length ? item.href : longest),
      ""
    );
  }, [sections, pathname]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          href="/"
          className="focus-visible:ring-ring flex items-center rounded-md px-2 py-1.5 focus-visible:ring-2 focus-visible:outline-none"
          aria-label="PROBSTAY — accueil"
        >
          {/* The wordmark when there is room for it, the monogram alone
              when the rail is collapsed to icons. */}
          <ProbstayLogo className="h-5 w-auto group-data-[collapsible=icon]:hidden" />
          {/* A size up on the wordmark: the monogram's interlocking strokes
              close into a blot at 20px, and the collapsed rail is a square it
              can afford to fill. */}
          <ProbstayLogo
            mark
            className="hidden h-6 w-auto group-data-[collapsible=icon]:block"
          />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {sections.map((section, index) => (
          <SidebarGroup key={section.label ?? `section-${index}`}>
            {section.label ? (
              <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            ) : null}
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const Icon = ICONS[item.icon];
                  const isActive = item.href === activeHref;

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={
                          <Link href={item.href}>
                            <Icon aria-hidden="true" />
                            <span>{item.label}</span>
                          </Link>
                        }
                        isActive={isActive}
                        tooltip={item.label}
                      />
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
