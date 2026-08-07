import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getCurrentUser } from "@/lib/auth";
import { NAV_SECTIONS } from "@/lib/navigation";
import { hasPermission } from "@/lib/permissions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // proxy.ts turns away requests with no session. This catches the case
  // it can't see: authenticated with Google but holding no profile —
  // which would otherwise render the shell with nothing in it.
  if (!user) {
    redirect("/login");
  }

  // Filtered here rather than in the client component so items the user
  // can't reach are never serialised to the browser at all. The pages
  // themselves still check — a hidden link is not access control.
  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) =>
        !item.permission ||
        (Array.isArray(item.permission)
          ? item.permission.some((permission) =>
              hasPermission(user, permission)
            )
          : hasPermission(user, item.permission))
    ),
  })).filter((section) => section.items.length > 0);

  // Read back the sidebar's own cookie so a collapsed sidebar renders
  // collapsed on the server, instead of flashing open then snapping shut.
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar sections={sections} />
      <SidebarInset>
        <AppTopbar
          user={{
            fullName: user.fullName,
            email: user.email,
            role: user.role,
          }}
        />
        <div className="flex-1 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
