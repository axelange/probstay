import type { Permission } from "@/generated/prisma/enums";

/**
 * Icons are referenced by key rather than as components so a filtered
 * navigation can be resolved on the server and handed to the client as
 * plain data — functions don't cross that boundary.
 */
export type NavIcon =
  | "demandes"
  | "dashboard"
  | "properties"
  | "rentals"
  | "contacts"
  | "calendar"
  | "documents"
  | "invoices"
  | "users"
  | "settings";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  /** Omitted means any signed-in user may see it. */
  permission?: Permission;
};

export type NavSection = {
  /** Omitted renders the group without a heading. */
  label?: string;
  items: NavItem[];
};

/**
 * Routes are English (code), labels are French (shown to users) — per
 * the coding guidelines.
 *
 * Properties, Rentals and Contacts carry no permission: Agents are
 * meant to see all three. What they may *do* there, and which fields
 * they see, is decided inside each page — RLS is row-level and can't
 * hide individual columns.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    items: [{ href: "/", label: "Tableau de bord", icon: "dashboard" }],
  },
  {
    label: "Métier",
    items: [
      { href: "/properties", label: "Biens", icon: "properties" },
      { href: "/demandes", label: "Demandes", icon: "demandes" },
      { href: "/rentals", label: "Locations", icon: "rentals" },
      { href: "/contacts", label: "Contacts", icon: "contacts" },
      { href: "/calendar", label: "Calendrier", icon: "calendar" },
    ],
  },
  {
    label: "Documents",
    items: [
      { href: "/documents", label: "Documents", icon: "documents" },
      {
        href: "/documents/templates",
        label: "Modèles",
        icon: "documents",
        permission: "MANAGE_DOCUMENT_TEMPLATES",
      },
      {
        href: "/invoices",
        label: "Factures",
        icon: "invoices",
        permission: "MANAGE_INVOICES",
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        href: "/users",
        label: "Utilisateurs",
        icon: "users",
        permission: "MANAGE_USERS",
      },
      {
        href: "/settings",
        label: "Paramètres",
        icon: "settings",
        permission: "MANAGE_USERS",
      },
    ],
  },
];
