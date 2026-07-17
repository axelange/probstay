"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  type ColumnDef,
  type SortingState,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, ImageOff, Search } from "lucide-react";
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
import type { PropertyListItem } from "@/features/properties/services/property-service";
import {
  formatArea,
  formatPrice,
  propertyTypeLabel,
} from "@/features/properties/utils/apimo-labels";

/**
 * TanStack drives sorting, filtering and search; only the rendering is
 * ours. It's a headless library, so a list of rows is as legitimate a
 * presentation as a <table> — and a table of eight columns can't fit a
 * phone without horizontal scrolling, which is what this replaces.
 *
 * Columns are declared purely as a data model. None of them render;
 * they exist so TanStack knows what can be sorted and searched.
 */
const columns: ColumnDef<PropertyListItem>[] = [
  { accessorKey: "reference" },
  { accessorKey: "marketingName" },
  { accessorKey: "city" },
  { accessorKey: "district" },
  { accessorKey: "zipcode" },
  { accessorKey: "priceValue" },
  { accessorKey: "areaValue" },
  { accessorKey: "sleeps" },
  {
    id: "typeLabel",
    // Searching "maison" should match, not the raw code 2.
    accessorFn: (row) => propertyTypeLabel(row.type) ?? "",
  },
];

const SORT_OPTIONS = [
  {
    id: "name",
    label: "Nom (A–Z)",
    sorting: [{ id: "marketingName", desc: false }],
  },
  { id: "city", label: "Ville (A–Z)", sorting: [{ id: "city", desc: false }] },
  {
    id: "price-desc",
    label: "Tarif (décroissant)",
    sorting: [{ id: "priceValue", desc: true }],
  },
  {
    id: "price-asc",
    label: "Tarif (croissant)",
    sorting: [{ id: "priceValue", desc: false }],
  },
  {
    id: "area-desc",
    label: "Surface (décroissante)",
    sorting: [{ id: "areaValue", desc: true }],
  },
  {
    id: "sleeps-desc",
    label: "Couchages (décroissant)",
    sorting: [{ id: "sleeps", desc: true }],
  },
] as const;

function PropertyRow({ property }: { property: PropertyListItem }) {
  const url = property.pictures[0]?.url;
  const typeLabel = propertyTypeLabel(property.type);

  return (
    <li>
      <Link
        href={`/properties/${property.id}`}
        className="hover:bg-accent/50 focus-visible:ring-ring block rounded-lg border transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <article className="flex flex-col gap-4 p-3 sm:flex-row">
          {/* Full-width above the text on a phone, a square thumbnail
              alongside it from sm up. */}
          <div className="bg-muted relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-md sm:aspect-square sm:w-28">
            {url ? (
              <Image
                src={url}
                alt=""
                fill
                sizes="(min-width: 640px) 112px, 100vw"
                className="object-cover"
              />
            ) : (
              <div className="text-muted-foreground flex size-full items-center justify-center">
                <ImageOff aria-hidden="true" className="size-5" />
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            {/* The town leads: it's what anyone recognises a property by.
                The APIMO reference is a lookup key, so it sits out of the
                way in the corner. */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <span className="truncate font-medium">
                  {property.marketingName ?? property.city ?? "—"}
                </span>
                <span className="text-muted-foreground truncate text-sm">
                  {[property.city, property.district].filter(Boolean).join(" · ")}
                </span>
                {typeLabel ? (
                  <Badge variant="secondary">{typeLabel}</Badge>
                ) : null}
              </div>
              <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                {property.reference ?? "—"}
              </span>
            </div>

            <p className="text-muted-foreground text-sm tabular-nums">
              {property.rooms ?? "—"} pièces · {property.bathrooms ?? "—"} sdb ·{" "}
              {property.sleeps ?? "—"} couchages
              {property.areaValue ? ` · ${formatArea(property.areaValue)}` : ""}
            </p>

            <div className="mt-auto flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pt-1">
              <span className="font-medium tabular-nums">
                {formatPrice(
                  property.priceValue,
                  property.priceCurrency,
                  property.pricePeriod
                )}
              </span>
              <span className="text-muted-foreground text-xs">
                {property.agent?.fullName ?? "Non assigné"}
              </span>
            </div>
          </div>
        </article>
      </Link>
    </li>
  );
}

export function PropertiesList({ data }: { data: PropertyListItem[] }) {
  const [sortId, setSortId] =
    React.useState<(typeof SORT_OPTIONS)[number]["id"]>("name");
  const [globalFilter, setGlobalFilter] = React.useState("");

  const sorting = React.useMemo<SortingState>(
    () => [...(SORT_OPTIONS.find((o) => o.id === sortId)?.sorting ?? [])],
    [sortId]
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const rows = table.getRowModel().rows;
  const activeSort = SORT_OPTIONS.find((o) => o.id === sortId);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
          />
          <Input
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder="Rechercher un bien…"
            aria-label="Rechercher un bien"
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

      {rows.length ? (
        <ul className="space-y-2">
          {rows.map((row) => (
            <PropertyRow key={row.original.id} property={row.original} />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground rounded-lg border py-12 text-center text-sm">
          Aucun bien ne correspond à cette recherche.
        </p>
      )}

      <p aria-live="polite" className="text-muted-foreground text-sm">
        {rows.length} bien{rows.length > 1 ? "s" : ""}
        {globalFilter ? ` sur ${data.length}` : ""}
      </p>
    </div>
  );
}
