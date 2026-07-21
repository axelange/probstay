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
import { ArrowUpDown, CircleCheck, Search, X } from "lucide-react";
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

// The three groups the user asked for. "En cours" is everything still
// moving through the pipeline; the other two are the terminal states.
const CATEGORIES = [
  {
    id: "active",
    label: "En cours",
    statuses: ["INQUIRY", "CONTRACT", "FINALISATION", "CHECK_IN"],
  },
  { id: "done", label: "Terminées", statuses: ["CHECK_OUT"] },
  { id: "cancelled", label: "Annulées", statuses: ["CANCELLED"] },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

export function RentalsList({ rentals }: { rentals: RentalListItem[] }) {
  const [category, setCategory] = React.useState<CategoryId>("active");
  const [sortId, setSortId] =
    React.useState<(typeof SORT_OPTIONS)[number]["id"]>("checkInDesc");
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  const counts = React.useMemo(() => {
    const byStatus = (statuses: readonly string[]) =>
      rentals.filter((r) => statuses.includes(r.bookingStatus)).length;
    return Object.fromEntries(
      CATEGORIES.map((c) => [c.id, byStatus(c.statuses)])
    ) as Record<CategoryId, number>;
  }, [rentals]);

  // Search and sort operate within the chosen group, so the list is
  // pre-filtered by category before TanStack sees it.
  const data = React.useMemo(() => {
    const statuses: readonly string[] = CATEGORIES.find(
      (c) => c.id === category
    )!.statuses;
    return rentals.filter((r) => statuses.includes(r.bookingStatus));
  }, [rentals, category]);

  const sorting = React.useMemo<SortingState>(
    () => [...(SORT_OPTIONS.find((o) => o.id === sortId)?.sorting ?? [])],
    [sortId]
  );

  const table = useReactTable({
    data,
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
  const rows = table.getRowModel().rows;

  return (
    <div className="space-y-4">
      {/* The three groups as tabs. Search and sort apply within the one
          selected. */}
      <div
        role="tablist"
        aria-label="Catégories de locations"
        className="bg-muted inline-flex rounded-lg p-1 text-sm"
      >
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={category === c.id}
            onClick={() => {
              setCategory(c.id);
              setGlobalFilter("");
            }}
            className={[
              "cursor-pointer rounded-md px-3 py-1.5 transition-colors",
              category === c.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {c.label}
            <span className="ml-1.5 tabular-nums opacity-70">
              {counts[c.id]}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-2">
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

        {globalFilter !== "" ? (
          <Button variant="ghost" size="sm" onClick={() => setGlobalFilter("")}>
            <X aria-hidden="true" />
            Effacer la recherche
          </Button>
        ) : null}

        <p className="text-muted-foreground text-xs" aria-live="polite">
          {rows.length === data.length
            ? `${data.length} location${data.length > 1 ? "s" : ""}`
            : `${rows.length} sur ${data.length}`}
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm">
          {data.length === 0
            ? "Aucune location dans cette catégorie."
            : "Aucune location ne correspond à cette recherche."}
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {rows.map((row) => {
            const rental = row.original;
            const lead = rental.tenants[0]?.contact;
            const leadName = lead
              ? [lead.firstName, lead.lastName].filter(Boolean).join(" ")
              : "Sans locataire";
            const others = rental.tenants.length - 1;

            return (
              <li key={rental.id}>
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
                      {/* The owner's word is what makes a booking real,
                          so it is shown on the row rather than buried in
                          the detail page. */}
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
                    </span>
                  </div>

                  <span className="shrink-0 text-xs tabular-nums">
                    {formatAmount(rental.grossAmount)}
                  </span>

                  <div className="flex shrink-0 flex-wrap gap-1">
                    <Badge
                      variant={
                        rental.bookingStatus === "CANCELLED"
                          ? "outline"
                          : "secondary"
                      }
                      className="font-normal"
                    >
                      {bookingStatusLabel(rental.bookingStatus)}
                    </Badge>
                    {/* Payment runs on its own axis, so a paid deposit is
                        worth seeing next to a booking still at enquiry. */}
                    {rental.depositStatus !== "UNPAID" ? (
                      <Badge variant="outline" className="font-normal">
                        Acompte {paymentStatusLabel(rental.depositStatus).toLowerCase()}
                      </Badge>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
