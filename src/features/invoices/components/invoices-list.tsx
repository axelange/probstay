"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Ban,
  Check,
  Download,
  FileText,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { MultiSelectFilter } from "@/components/filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { documentDownloadHref } from "@/features/documents/download";
import { deleteDraftAction } from "@/features/invoices/actions/draft-invoice";
import { generateInvoicePdfAction } from "@/features/invoices/actions/generate-invoice-pdf";
import {
  cancelInvoiceAction,
  markInvoicePaidAction,
} from "@/features/invoices/actions/issue-invoice";
import {
  INVOICE_SOURCE_LABEL,
  invoiceStatusLabel,
} from "@/features/invoices/reference";
import type { InvoiceListItem } from "@/features/invoices/services/invoice-service";
import type { InvoiceFamily } from "@/generated/prisma/enums";
import { Money } from "@/features/rentals/components/money";
import { formatDate } from "@/features/rentals/components/rental-labels";

const fold = (value: unknown) =>
  String(value ?? "")
    .normalize("NFC")
    .toLowerCase();

const search: FilterFn<InvoiceListItem> = (row, columnId, value) => {
  const query = String(value ?? "").trim();
  if (!query) return true;
  return fold(row.getValue(columnId)).includes(fold(query));
};

/**
 * One haystack column: an invoice is looked up by its number, by the client,
 * by what it was for, or by the villa it concerns, and splitting those apart
 * would only make a search for "Villa Rose Dupont" match nothing.
 */
const columns: ColumnDef<InvoiceListItem>[] = [
  {
    id: "text",
    accessorFn: (row) =>
      [
        row.reference,
        row.clientName,
        row.description,
        row.propertyName,
        row.rentalReference,
        invoiceStatusLabel(row.status, row.family),
      ]
        .filter(Boolean)
        .join(" "),
  },
  {
    id: "status",
    accessorFn: (row) => invoiceStatusLabel(row.status, row.family),
    filterFn: "arrIncludesSome",
    enableGlobalFilter: false,
  },
  {
    // A draft has no issue date; it sorts as the newest thing there is, since
    // it is what still wants attention.
    id: "issuedOn",
    accessorFn: (row) => row.issuedOn?.getTime() ?? Number.MAX_SAFE_INTEGER,
    enableGlobalFilter: false,
  },
  { accessorKey: "totalTtc", enableGlobalFilter: false },
];

const SORT_OPTIONS = [
  {
    id: "recent",
    label: "Date (récente)",
    sorting: [{ id: "issuedOn", desc: true }],
  },
  {
    id: "oldest",
    label: "Date (ancienne)",
    sorting: [{ id: "issuedOn", desc: false }],
  },
  {
    id: "amount",
    label: "Montant (élevé)",
    sorting: [{ id: "totalTtc", desc: true }],
  },
] as const;

export function InvoicesList({
  invoices,
  canManage,
  family,
}: {
  invoices: InvoiceListItem[];
  canManage: boolean;
  family: InvoiceFamily;
}) {
  const detailBase = family === "FUND_CALL" ? "/payment-requests" : "/invoices";
  // The filter offers the same wording the badges use, agreed with this
  // register's own documents.
  const statusOptions = (
    ["DRAFT", "ISSUED", "PAID", "CANCELLED"] as const
  ).map((status) => invoiceStatusLabel(status, family));

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
    data: invoices,
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

  // What the agency is still owed, over whatever the filters currently show.
  // Drafts are excluded: nothing is owed on an invoice nobody has been sent.
  const outstanding = rows
    .filter((row) => row.original.status === "ISSUED")
    .reduce((sum, row) => sum + row.original.totalTtc, 0);
  const drafts = rows.filter((row) => row.original.status === "DRAFT").length;

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
            placeholder="Numéro, client, objet, bien…"
            aria-label="Rechercher un document"
            className="pl-8"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <MultiSelectFilter
            label="Statut"
            options={statusOptions}
            selected={filtered("status")}
            onChange={(next) =>
              table
                .getColumn("status")
                ?.setFilterValue(next.length > 0 ? next : undefined)
            }
          />
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm">
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
      </div>

      <p className="text-muted-foreground text-xs tabular-nums">
        {rows.length} document{rows.length > 1 ? "s" : ""}
        {rows.length !== invoices.length ? ` sur ${invoices.length}` : ""}
        {drafts > 0 ? ` · ${drafts} brouillon${drafts > 1 ? "s" : ""}` : ""}
        {outstanding > 0 ? (
          <>
            {" · "}
            <Money value={outstanding} /> en attente
          </>
        ) : null}
      </p>

      {rows.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-10 text-center text-sm">
          {invoices.length === 0 ? "Aucun document." : "Aucun résultat."}
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {rows.map((row) => (
            <InvoiceRow
              key={row.original.id}
              invoice={row.original}
              canManage={canManage}
              detailBase={detailBase}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function InvoiceRow({
  invoice,
  canManage,
  detailBase,
}: {
  invoice: InvoiceListItem;
  canManage: boolean;
  detailBase: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const draft = invoice.status === "DRAFT";

  function run(
    action: () => Promise<{ status: string; message?: string }>,
    success: string
  ) {
    startTransition(async () => {
      const result = await action();
      if (result.status === "error") {
        toast.error(result.message ?? "Action impossible.");
        return;
      }
      toast.success(success);
      router.refresh();
    });
  }

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm">
      <FileText
        aria-hidden="true"
        className={`size-4 shrink-0 ${draft ? "text-muted-foreground/60" : "text-muted-foreground"}`}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium tabular-nums">
          {invoice.reference ?? "Sans numéro"}
          {invoice.description ? (
            <span className="font-normal"> — {invoice.description}</span>
          ) : null}
        </p>
        <p className="text-muted-foreground truncate text-xs">
          {invoice.clientName}
          {invoice.propertyName ? ` · ${invoice.propertyName}` : ""}
        </p>
        <p className="text-muted-foreground truncate text-xs tabular-nums">
          {invoice.issuedOn
            ? formatDate(invoice.issuedOn)
            : "Non émise"}
          {invoice.dueOn ? ` · échéance ${formatDate(invoice.dueOn)}` : ""}
          {invoice.source === "UPLOADED"
            ? ` · ${INVOICE_SOURCE_LABEL.UPLOADED}`
            : ""}
          {invoice.authorName ? ` · ${invoice.authorName}` : ""}
        </p>
      </div>

      <span className="shrink-0 text-right text-xs tabular-nums">
        <span className="block font-medium">
          <Money value={invoice.totalTtc} /> TTC
        </span>
        <span className="text-muted-foreground block">
          <Money value={invoice.totalHt} /> HT
        </span>
      </span>

      <Badge
        variant={
          draft
            ? "outline"
            : invoice.status === "PAID"
              ? "secondary"
              : invoice.status === "CANCELLED"
                ? "outline"
                : "default"
        }
        className={`shrink-0 font-normal ${
          invoice.status === "CANCELLED" ? "line-through" : ""
        }`}
      >
        {invoiceStatusLabel(invoice.status, invoice.family)}
      </Badge>

      <div className="flex shrink-0 items-center gap-1">
        {invoice.rentalId ? (
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href={`/rentals/${invoice.rentalId}`} />}
          >
            Location
          </Button>
        ) : null}

        {/* Composing and issuing happen on the invoice's own page, where the
            document is visible beside the form. */}
        {invoice.source === "GENERATED" || draft ? (
          <Button
            variant={draft ? "default" : "ghost"}
            size="sm"
            nativeButton={false}
            render={<Link href={`${detailBase}/${invoice.id}`} />}
          >
            {draft ? (
              <>
                <Pencil aria-hidden="true" />
                Composer
              </>
            ) : (
              "Ouvrir"
            )}
          </Button>
        ) : null}

        {invoice.hasPdf ? (
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<a href={documentDownloadHref("invoice", invoice.id)} />}
          >
            <Download aria-hidden="true" />
            {draft ? "Fichier" : "Télécharger"}
          </Button>
        ) : null}

        {canManage ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Autres actions"
                  disabled={isPending}
                >
                  <MoreHorizontal aria-hidden="true" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              {draft ? (
                <DropdownMenuItem
                  onClick={() =>
                    run(
                      () => deleteDraftAction({ id: invoice.id }),
                      "Brouillon supprimé."
                    )
                  }
                >
                  <Trash2 aria-hidden="true" />
                  Supprimer le brouillon
                </DropdownMenuItem>
              ) : null}

              {invoice.status === "ISSUED" ? (
                <DropdownMenuItem
                  onClick={() =>
                    run(
                      () => markInvoicePaidAction({ id: invoice.id }),
                      "Document marqué payé."
                    )
                  }
                >
                  <Check aria-hidden="true" />
                  Marquer payée
                </DropdownMenuItem>
              ) : null}

              {/* Never a deletion: an issued invoice leaves the series only by
                  being cancelled, and stays visible. */}
              {!draft && invoice.status !== "CANCELLED" ? (
                <DropdownMenuItem
                  onClick={() =>
                    run(
                      () => cancelInvoiceAction({ id: invoice.id }),
                      "Document annulé."
                    )
                  }
                >
                  <Ban aria-hidden="true" />
                  Annuler le document
                </DropdownMenuItem>
              ) : null}

              {/* Only reachable when a render failed after the number was
                  taken — the invoice is valid, the file is missing. */}
              {!draft &&
              invoice.source === "GENERATED" &&
              !invoice.hasPdf ? (
                <DropdownMenuItem
                  onClick={() =>
                    run(
                      () => generateInvoicePdfAction({ id: invoice.id }),
                      "PDF produit."
                    )
                  }
                >
                  <FileText aria-hidden="true" />
                  Générer le PDF
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </li>
  );
}
