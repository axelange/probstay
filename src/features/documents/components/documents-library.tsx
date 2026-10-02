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
import {
  ArrowUpDown,
  Download,
  FileCheck2,
  FilePlus2,
  FileText,
  Search,
} from "lucide-react";
import { MultiSelectFilter } from "@/components/filters";
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
import { documentDownloadHref } from "@/features/documents/download";
import { formatFileSize } from "@/features/documents/format";
import { DOCUMENT_NAME, DOCUMENT_TYPE_OF_TEMPLATE } from "@/features/documents/reference";
import type {
  StoredDocumentOrigin,
  StoredDocumentRow,
} from "@/features/documents/services/document-library-service";
import { formatDate } from "@/features/rentals/components/rental-labels";

const ORIGIN_LABEL: Record<StoredDocumentOrigin, string> = {
  GENERATED: "Généré",
  SIGNED: "Signé",
  AMENDMENT: "Avenant",
};

const ORIGIN_ICON = {
  GENERATED: FileText,
  SIGNED: FileCheck2,
  AMENDMENT: FilePlus2,
} as const;

const typeLabel = (row: StoredDocumentRow) =>
  DOCUMENT_NAME[DOCUMENT_TYPE_OF_TEMPLATE[row.type]];

/**
 * Case-insensitive substring, over the one searchable column.
 *
 * Both sides are normalised: an uploaded file name may still carry macOS's
 * decomposed accents from before they were normalised on the way in, and
 * "écran" typed here would not match "e" + combining accent stored there.
 */
const fold = (value: unknown) =>
  String(value ?? "")
    .normalize("NFC")
    .toLowerCase();

const search: FilterFn<StoredDocumentRow> = (row, columnId, value) => {
  const query = String(value ?? "").trim();
  if (!query) return true;
  return fold(row.getValue(columnId)).includes(fold(query));
};

/**
 * One haystack column rather than one per field: a document is looked up by
 * whatever the person happens to remember — the reference on the paper, the
 * villa, the tenant, or the file name a colleague sent them — and splitting
 * that into columns would only make "Villa Rose Dupont" fail to match.
 */
const columns: ColumnDef<StoredDocumentRow>[] = [
  {
    id: "text",
    accessorFn: (row) =>
      [
        row.fileName,
        row.reference,
        row.propertyName,
        row.tenantName,
        row.authorName,
        typeLabel(row),
        ORIGIN_LABEL[row.origin],
      ]
        .filter(Boolean)
        .join(" "),
  },
  {
    id: "type",
    accessorFn: typeLabel,
    filterFn: "arrIncludesSome",
    enableGlobalFilter: false,
  },
  {
    id: "origin",
    accessorFn: (row) => ORIGIN_LABEL[row.origin],
    filterFn: "arrIncludesSome",
    enableGlobalFilter: false,
  },
  { accessorKey: "storedAt", enableGlobalFilter: false },
  { accessorKey: "fileName", enableGlobalFilter: false },
];

const SORT_OPTIONS = [
  {
    id: "recent",
    label: "Date (récente)",
    sorting: [{ id: "storedAt", desc: true }],
  },
  {
    id: "oldest",
    label: "Date (ancienne)",
    sorting: [{ id: "storedAt", desc: false }],
  },
  {
    id: "name",
    label: "Nom du fichier",
    sorting: [{ id: "fileName", desc: false }],
  },
] as const;

const TYPE_OPTIONS = Object.values(DOCUMENT_NAME);
const ORIGIN_OPTIONS = Object.values(ORIGIN_LABEL);

/**
 * Everything in the agency's two document buckets, searchable in one place.
 *
 * Filtering is client-side because the whole set is small — a document per
 * booking or three — and because a search that answers as you type is worth
 * more here than a round trip: this page exists for the moment someone is on
 * the phone with an owner asking which contract was sent.
 */
export function DocumentsLibrary({
  documents,
}: {
  documents: StoredDocumentRow[];
}) {
  const [sortId, setSortId] =
    React.useState<(typeof SORT_OPTIONS)[number]["id"]>("recent");
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );

  const sorting = React.useMemo<SortingState>(
    () => [...(SORT_OPTIONS.find((o) => o.id === sortId)?.sorting ?? [])],
    [sortId]
  );

  const table = useReactTable({
    data: documents,
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
  const filtered = (id: string) =>
    (table.getColumn(id)?.getFilterValue() as string[] | undefined) ?? [];

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
            placeholder="Référence, bien, locataire, fichier…"
            aria-label="Rechercher un document"
            className="pl-8"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <MultiSelectFilter
            label="Type"
            options={TYPE_OPTIONS}
            selected={filtered("type")}
            onChange={(next) =>
              table
                .getColumn("type")
                ?.setFilterValue(next.length > 0 ? next : undefined)
            }
          />
          <MultiSelectFilter
            label="Nature"
            options={ORIGIN_OPTIONS}
            selected={filtered("origin")}
            onChange={(next) =>
              table
                .getColumn("origin")
                ?.setFilterValue(next.length > 0 ? next : undefined)
            }
          />

          <DropdownSort sortId={sortId} onChange={setSortId} label={activeSort?.label} />
        </div>
      </div>

      <p className="text-muted-foreground text-xs tabular-nums">
        {rows.length} document{rows.length > 1 ? "s" : ""}
        {rows.length !== documents.length ? ` sur ${documents.length}` : ""}
      </p>

      {rows.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-10 text-center text-sm">
          {documents.length === 0
            ? "Aucun document en stockage. Ils se génèrent et se téléversent depuis la fiche d’une location."
            : "Aucun résultat."}
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {rows.map((row) => (
            <DocumentRow
              key={`${row.original.origin}-${row.original.id}`}
              doc={row.original}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function DropdownSort({
  sortId,
  label,
  onChange,
}: {
  sortId: string;
  label: string | undefined;
  onChange: (id: (typeof SORT_OPTIONS)[number]["id"]) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm">
            <ArrowUpDown aria-hidden="true" />
            {label}
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={sortId}
          onValueChange={(value) =>
            onChange(value as (typeof SORT_OPTIONS)[number]["id"])
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
  );
}

function DocumentRow({ doc }: { doc: StoredDocumentRow }) {
  const Icon = ORIGIN_ICON[doc.origin];
  // Only the first bucket holds what the app produced; a signed copy and an
  // avenant are both uploads, and live in the other.
  const href = documentDownloadHref(
    doc.origin === "GENERATED" ? "generated" : "signed",
    doc.id
  );

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm">
      <Icon
        aria-hidden="true"
        className={`size-4 shrink-0 ${
          doc.origin === "GENERATED" ? "text-muted-foreground" : "text-emerald-600"
        }`}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{doc.fileName}</p>
        <p className="text-muted-foreground truncate text-xs">
          {doc.reference} · {doc.propertyName}
          {doc.tenantName ? ` · ${doc.tenantName}` : ""}
        </p>
        <p className="text-muted-foreground truncate text-xs tabular-nums">
          {formatDate(doc.storedAt)}
          {doc.authorName ? ` · ${doc.authorName}` : ""}
          {doc.sizeBytes !== null ? ` · ${formatFileSize(doc.sizeBytes)}` : ""}
        </p>
      </div>

      <Badge
        variant={doc.origin === "GENERATED" ? "secondary" : "outline"}
        className="shrink-0 font-normal"
      >
        {ORIGIN_LABEL[doc.origin]}
      </Badge>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href={`/rentals/${doc.rentalId}`} />}
        >
          Location
        </Button>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<a href={href} />}
        >
          <Download aria-hidden="true" />
          Télécharger
        </Button>
      </div>
    </li>
  );
}
