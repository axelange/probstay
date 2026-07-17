"use client";

import * as React from "react";
import Image from "next/image";
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
import { ArrowUpDown, EyeOff, ImageOff, Search, X } from "lucide-react";
import {
  EMPTY_RANGE,
  MultiSelectFilter,
  type NumberRange,
  RangeFilter,
  SingleSelectFilter,
  isRangeActive,
} from "@/features/properties/components/property-filters";
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

/** Row value ≥ the filter. Used for capacity: "sleeps at least 8". */
const atLeast: FilterFn<PropertyListItem> = (row, columnId, value) => {
  const n = row.getValue<number | null>(columnId);
  return n !== null && n >= Number(value);
};

/**
 * Within a min/max range, either bound optional. Used for budget.
 *
 * A property with no rate is excluded once a budget is set. It might
 * well be within budget, but nobody can say so — and quietly listing an
 * unpriced villa under "≤ 30 000 €" asserts something untrue.
 */
const inRange: FilterFn<PropertyListItem> = (row, columnId, value) => {
  const n = row.getValue<number | null>(columnId);
  if (n === null) return false;
  const { min, max } = value as NumberRange;
  if (min !== null && n < min) return false;
  if (max !== null && n > max) return false;
  return true;
};

/**
 * TanStack drives sorting, filtering and search; only the rendering is
 * ours. It's a headless library, so a list of rows is as legitimate a
 * presentation as a <table> — and a table of eight columns can't fit a
 * phone without horizontal scrolling, which is what this replaces.
 *
 * Columns are declared purely as a data model. None of them render; they
 * exist so TanStack knows what can be sorted, searched and filtered.
 */
const columns: ColumnDef<PropertyListItem>[] = [
  { accessorKey: "reference" },
  { accessorKey: "marketingName" },
  { accessorKey: "city", filterFn: "arrIncludesSome" },
  { accessorKey: "district" },
  { accessorKey: "zipcode" },
  { accessorKey: "priceValue", filterFn: inRange },
  { accessorKey: "areaValue" },
  { accessorKey: "sleeps", filterFn: atLeast },
  { accessorKey: "bedrooms", filterFn: atLeast },
  {
    // The raw code, for filtering. Distinct from typeLabel below, which
    // exists so search matches the word rather than the number.
    id: "type",
    accessorFn: (row) => String(row.type ?? ""),
    filterFn: "equals",
  },
  {
    id: "typeLabel",
    // Searching "maison" should match, not the raw code 2.
    accessorFn: (row) => propertyTypeLabel(row.type) ?? "",
  },
];

const TYPE_OPTIONS = [
  { value: "1", label: "Appartement" },
  { value: "2", label: "Maison" },
];

// The trigger already says "Couchages", so the menu needn't repeat it.
const SLEEPS_OPTIONS = [2, 4, 6, 8, 10, 12].map((n) => ({
  value: String(n),
  label: `${n}+`,
}));

const BEDROOMS_OPTIONS = [1, 2, 3, 4, 5, 6].map((n) => ({
  value: String(n),
  label: `${n}+`,
}));

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
              <span className="flex items-center gap-1.5">
                <span
                  className={
                    property.priceValue === null
                      ? "text-muted-foreground text-sm italic"
                      : "font-medium tabular-nums"
                  }
                >
                  {formatPrice(
                    property.priceValue,
                    property.priceCurrency,
                    property.pricePeriod
                  )}
                </span>
                {property.priceHidden ? (
                  <EyeOff
                    aria-hidden="true"
                    className="text-muted-foreground size-3.5 shrink-0"
                  />
                ) : null}
                {property.priceHidden ? (
                  <span className="sr-only">Tarif masqué, à ne pas publier</span>
                ) : null}
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
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );

  const sorting = React.useMemo<SortingState>(
    () => [...(SORT_OPTIONS.find((o) => o.id === sortId)?.sorting ?? [])],
    [sortId]
  );

  // Towns come from the data rather than a hardcoded list: the agency's
  // selection changes, and a stale list would either hide a town or
  // offer one with nothing in it.
  const cities = React.useMemo(
    () =>
      [...new Set(data.map((p) => p.city).filter((c): c is string => !!c))].sort(
        (a, b) => a.localeCompare(b, "fr")
      ),
    [data]
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, columnFilters },
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const rows = table.getRowModel().rows;
  const activeSort = SORT_OPTIONS.find((o) => o.id === sortId);

  function filterValue(columnId: string) {
    return (table.getColumn(columnId)?.getFilterValue() as string) ?? "";
  }

  function setFilter(columnId: string, value: string) {
    table.getColumn(columnId)?.setFilterValue(value === "" ? undefined : value);
  }

  const selectedCities =
    (table.getColumn("city")?.getFilterValue() as string[]) ?? [];

  const budget =
    (table.getColumn("priceValue")?.getFilterValue() as NumberRange) ??
    EMPTY_RANGE;

  const activeFilterCount = columnFilters.length;
  const hasAnyFilter = activeFilterCount > 0 || globalFilter !== "";

  function reset() {
    setColumnFilters([]);
    setGlobalFilter("");
  }

  return (
    <div className="space-y-4">
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

        {/* Wraps rather than scrolls: on a phone these stack onto as many
            rows as they need instead of running off the side. */}
        <div className="flex flex-wrap items-center gap-2">
          <MultiSelectFilter
            label="Ville"
            options={cities}
            selected={selectedCities}
            onChange={(next) =>
              table
                .getColumn("city")
                ?.setFilterValue(next.length ? next : undefined)
            }
          />
          <SingleSelectFilter
            label="Type"
            options={TYPE_OPTIONS}
            value={filterValue("type")}
            onChange={(v) => setFilter("type", v)}
          />
          <SingleSelectFilter
            label="Couchages"
            options={SLEEPS_OPTIONS}
            value={filterValue("sleeps")}
            onChange={(v) => setFilter("sleeps", v)}
          />
          <SingleSelectFilter
            label="Chambres"
            options={BEDROOMS_OPTIONS}
            value={filterValue("bedrooms")}
            onChange={(v) => setFilter("bedrooms", v)}
          />
          <RangeFilter
            label="Budget"
            unit="€"
            placeholderMin="1 000"
            placeholderMax="50 000"
            value={budget}
            onChange={(next) =>
              table
                .getColumn("priceValue")
                ?.setFilterValue(isRangeActive(next) ? next : undefined)
            }
          />

          {hasAnyFilter ? (
            <Button variant="ghost" size="sm" onClick={reset}>
              <X aria-hidden="true" />
              Réinitialiser
            </Button>
          ) : null}
        </div>
      </div>

      {rows.length ? (
        <ul className="space-y-2">
          {rows.map((row) => (
            <PropertyRow key={row.original.id} property={row.original} />
          ))}
        </ul>
      ) : (
        <div className="space-y-3 rounded-lg border py-12 text-center">
          <p className="text-muted-foreground text-sm">
            Aucun bien ne correspond à ces critères.
          </p>
          <Button variant="outline" size="sm" onClick={reset}>
            Réinitialiser les filtres
          </Button>
        </div>
      )}

      {/* aria-live so the count is announced as filters change — the
          result of a dropdown selection is otherwise silent. */}
      <p aria-live="polite" className="text-muted-foreground text-sm">
        {rows.length} bien{rows.length > 1 ? "s" : ""}
        {hasAnyFilter ? ` sur ${data.length}` : ""}
      </p>
    </div>
  );
}
