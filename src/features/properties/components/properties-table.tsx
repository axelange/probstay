"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, ImageOff, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PropertyListItem } from "@/features/properties/services/property-service";
import {
  formatArea,
  formatPrice,
  propertyTypeLabel,
} from "@/features/properties/utils/apimo-labels";

function SortableHeader({
  label,
  onToggle,
}: {
  label: string;
  onToggle: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onToggle}
      className="-ml-2.5 h-8 data-[state=open]:bg-accent"
    >
      {label}
      <ArrowUpDown aria-hidden="true" className="ml-1 size-3.5 opacity-50" />
    </Button>
  );
}

const columns: ColumnDef<PropertyListItem>[] = [
  {
    id: "picture",
    header: () => <span className="sr-only">Photo</span>,
    enableSorting: false,
    cell: ({ row }) => {
      const url = row.original.pictures[0]?.url;
      const reference = row.original.reference;

      return (
        <div className="bg-muted relative size-12 overflow-hidden rounded-md">
          {url ? (
            <Image
              src={url}
              // Decorative in this context: the reference column beside
              // it already names the row.
              alt=""
              fill
              sizes="48px"
              className="object-cover"
            />
          ) : (
            <div className="text-muted-foreground flex size-full items-center justify-center">
              <ImageOff aria-hidden="true" className="size-4" />
              <span className="sr-only">
                Aucune photo pour le bien {reference}
              </span>
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "reference",
    header: ({ column }) => (
      <SortableHeader
        label="Référence"
        onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    ),
    cell: ({ row }) => (
      <Link
        href={`/properties/${row.original.id}`}
        className="focus-visible:ring-ring rounded-sm font-medium tabular-nums underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
      >
        {row.original.reference}
      </Link>
    ),
  },
  {
    accessorKey: "city",
    header: ({ column }) => (
      <SortableHeader
        label="Ville"
        onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span>{row.original.city ?? "—"}</span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {[row.original.zipcode, row.original.district]
            .filter(Boolean)
            .join(" · ") || "—"}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => {
      const label = propertyTypeLabel(row.original.type);
      return label ? <Badge variant="secondary">{label}</Badge> : "—";
    },
  },
  {
    id: "capacity",
    header: "Pièces / Ch. / Couchages",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="tabular-nums">
        {row.original.rooms ?? "—"} · {row.original.bedrooms ?? "—"} ·{" "}
        {row.original.sleeps ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "areaValue",
    header: ({ column }) => (
      <SortableHeader
        label="Surface"
        onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    ),
    cell: ({ row }) => (
      <span className="tabular-nums">{formatArea(row.original.areaValue)}</span>
    ),
  },
  {
    accessorKey: "priceValue",
    header: ({ column }) => (
      <SortableHeader
        label="Tarif"
        onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    ),
    cell: ({ row }) => {
      const { priceValue, priceMax, priceCurrency, pricePeriod } = row.original;

      return (
        <div className="flex flex-col">
          <span className="tabular-nums">
            {formatPrice(
              priceValue ? Number(priceValue) : null,
              priceCurrency,
              pricePeriod
            )}
          </span>
          {priceMax && Number(priceMax) !== Number(priceValue) ? (
            <span className="text-muted-foreground text-xs tabular-nums">
              jusqu&apos;à{" "}
              {formatPrice(Number(priceMax), priceCurrency, pricePeriod)}
            </span>
          ) : null}
        </div>
      );
    },
  },
  {
    id: "agent",
    header: "Agent",
    enableSorting: false,
    cell: ({ row }) =>
      row.original.agent ? (
        row.original.agent.fullName
      ) : (
        <span className="text-muted-foreground">Non assigné</span>
      ),
  },
];

export function PropertiesTable({ data }: { data: PropertyListItem[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const rows = table.getRowModel().rows;

  return (
    <div className="space-y-4">
      <div className="relative max-w-xs">
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

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-muted-foreground h-24 text-center"
                >
                  Aucun bien ne correspond à cette recherche.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <p aria-live="polite" className="text-muted-foreground text-sm">
        {rows.length} bien{rows.length > 1 ? "s" : ""}
        {globalFilter ? ` sur ${data.length}` : ""}
      </p>
    </div>
  );
}
