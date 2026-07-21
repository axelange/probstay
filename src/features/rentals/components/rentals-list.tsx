"use client";

import * as React from "react";
import Link from "next/link";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type FilterFn,
  type SortingState,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, CircleCheck, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { RentalListItem } from "@/features/rentals/services/rental-service";
import {
  BOOKING_STATUS_LABELS,
  bookingStatusLabel,
  formatAmount,
  formatStay,
  nights,
  paymentStatusLabel,
  sourceLabel,
} from "@/features/rentals/components/rental-labels";

const search: FilterFn<RentalListItem> = (row, columnId, value) => {
  const query = String(value ?? "").trim();
  if (!query) return true;
  return String(row.getValue(columnId) ?? "")
    .toLowerCase()
    .includes(query.toLowerCase());
};

const columns: ColumnDef<RentalListItem>[] = [
  {
    id: "property",
    accessorFn: (row) =>
      [row.property.marketingName, row.property.city, row.property.reference]
        .filter(Boolean)
        .join(" "),
  },
  {
    id: "tenants",
    accessorFn: (row) =>
      row.tenants
        .map((t) => [t.contact.firstName, t.contact.lastName].filter(Boolean).join(" "))
        .join(" "),
  },
  {
    id: "agent",
    accessorFn: (row) => row.agent?.fullName ?? "",
  },
  {
    // Searching "contrat" must match, not the stored CONTRACT.
    id: "statusLabel",
    accessorFn: (row) => BOOKING_STATUS_LABELS[row.bookingStatus],
  },
  {
    id: "status",
    accessorFn: (row) => row.bookingStatus,
    filterFn: "arrIncludesSome",
    enableGlobalFilter: false,
  },
  { accessorKey: "checkIn", enableGlobalFilter: false },
  { accessorKey: "grossAmount", enableGlobalFilter: false },
];

const SORT_OPTIONS = [
  {
    id: "checkInDesc",
    label: "Arrivée (récente)",
    sorting: [{ id: "checkIn", desc: true }],
  },
  {
    id: "checkInAsc",
    label: "Arrivée (ancienne)",
    sorting: [{ id: "checkIn", desc: false }],
  },
  {
    id: "amount",
    label: "Montant (élevé)",
    sorting: [{ id: "grossAmount", desc: true }],
  },
] as const;

// Bookings (converted) split into their live and terminal states.
const BOOKING_CATEGORIES = [
  {
    id: "active",
    label: "En cours",
    statuses: ["CONTRACT", "FINALISATION", "CHECK_IN"],
  },
  { id: "done", label: "Terminées", statuses: ["CHECK_OUT"] },
  { id: "cancelled", label: "Annulées", statuses: ["CANCELLED"] },
] as const;

// Demandes (not yet converted): still open, or lost.
const DEMANDE_CATEGORIES = [
  { id: "pending", label: "En attente", statuses: ["INQUIRY"] },
  { id: "lost", label: "Perdues", statuses: ["CANCELLED"] },
] as const;

export function RentalsList({
  rentals,
  variant = "bookings",
}: {
  rentals: RentalListItem[];
  variant?: "bookings" | "demandes";
}) {
  const CATEGORIES =
    variant === "demandes" ? DEMANDE_CATEGORIES : BOOKING_CATEGORIES;
  const [sortId, setSortId] =
    React.useState<(typeof SORT_OPTIONS)[number]["id"]>("checkInDesc");
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  const sorting = React.useMemo<SortingState>(
    () => [...(SORT_OPTIONS.find((o) => o.id === sortId)?.sorting ?? [])],
    [sortId]
  );

  const table = useReactTable({
    data: rentals,
    columns,
    state: { sorting, globalFilter, columnFilters },
    globalFilterFn: search,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const activeSort = SORT_OPTIONS.find((o) => o.id === sortId);
  // One search over everything; the matching, sorted rows are then split
  // into the three lists so a single query surfaces results across all.
  const rows = table.getRowModel().rows;
  const sections = CATEGORIES.map((c) => {
    const statuses: readonly string[] = c.statuses;
    return {
      ...c,
      rows: rows.filter((r) => statuses.includes(r.original.bookingStatus)),
    };
  });

  return (
    <div className="space-y-6">
      {/* One search and one sort over all three lists. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
          />
          <Input
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder="Bien, locataire, agent, statut…"
            aria-label="Rechercher une location"
            className="pl-8"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" className="justify-between sm:w-auto">
                <ArrowUpDown aria-hidden="true" />
                {activeSort?.label}
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup
              value={sortId}
              onValueChange={(value) =>
                setSortId(value as (typeof SORT_OPTIONS)[number]["id"])
              }
            >
              {SORT_OPTIONS.map((option) => (
                <DropdownMenuRadioItem key={option.id} value={option.id}>
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* The three lists in order, always shown — even empty. A search
          narrows all three at once. */}
      {sections.map((section) => (
        <section key={section.id} className="space-y-2">
          <h3 className="text-sm font-medium">
            {section.label}
            <span className="text-muted-foreground ml-1.5 tabular-nums">
              {section.rows.length}
            </span>
          </h3>
          {section.rows.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center text-sm">
              {globalFilter !== ""
                ? "Aucun résultat."
                : variant === "demandes"
                  ? "Aucune demande."
                  : "Aucune location."}
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {section.rows.map((row) => (
                <RentalRow key={row.original.id} rental={row.original} />
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

function RentalRow({ rental }: { rental: RentalListItem }) {
  const lead = rental.tenants[0]?.contact;
  const leadName = lead
    ? [lead.firstName, lead.lastName].filter(Boolean).join(" ")
    : "Sans locataire";
  const others = rental.tenants.length - 1;

  return (
    <li>
      <Link
        href={`/rentals/${rental.id}`}
        className="hover:bg-accent flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm transition-colors"
      >
        <div className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="truncate font-medium">
              {rental.property.marketingName ??
                rental.property.city ??
                "Sans nom"}
            </span>
            {rental.ownerConfirmedAt ? (
              <span
                className="text-muted-foreground inline-flex items-center gap-1 text-xs"
                title="Confirmé par le propriétaire"
              >
                <CircleCheck aria-hidden="true" className="size-3" />
                Confirmé
              </span>
            ) : null}
          </span>
          <span className="text-muted-foreground block truncate text-xs">
            {leadName}
            {others > 0 ? ` +${others}` : ""}
            {" · "}
            {formatStay(rental.checkIn, rental.checkOut)}
            {" · "}
            {nights(rental.checkIn, rental.checkOut)} nuits
            {rental.source ? ` · ${sourceLabel(rental.source)}` : ""}
          </span>
        </div>

        <span className="shrink-0 text-xs tabular-nums">
          {formatAmount(rental.grossAmount)}
        </span>

        <div className="flex shrink-0 flex-wrap gap-1">
          <Badge
            variant={
              rental.bookingStatus === "CANCELLED" ? "outline" : "secondary"
            }
            className="font-normal"
          >
            {bookingStatusLabel(rental.bookingStatus)}
          </Badge>
          {rental.depositStatus !== "UNPAID" ? (
            <Badge variant="outline" className="font-normal">
              Acompte {paymentStatusLabel(rental.depositStatus).toLowerCase()}
            </Badge>
          ) : null}
        </div>
      </Link>
    </li>
  );
}
