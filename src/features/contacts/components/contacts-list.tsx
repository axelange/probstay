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
import { ArrowUpDown, Mail, Phone, Search, X } from "lucide-react";
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
import { MultiSelectFilter } from "@/components/filters";
import type { ContactListItem } from "@/features/contacts/services/contact-service";
import {
  CONTACT_TYPES,
  CONTACT_TYPE_LABELS,
  contactTypeLabel,
} from "@/features/contacts/components/contact-type-labels";
import {
  CONTACT_SPECIALTIES,
  CONTACT_SPECIALTY_LABELS,
  specialtyLabels,
} from "@/features/contacts/components/contact-specialty-labels";

/**
 * Free-text search across one column.
 *
 * The default `includesString` compares the query verbatim, which is
 * wrong for a phone number: someone typing "06 14" would match nothing,
 * because the stored value holds no spaces. So the query is reduced to
 * digits before comparing against the digits column, and left alone
 * everywhere else.
 *
 * TanStack ORs this across columns, so a row matches on any of them.
 */
const search: FilterFn<ContactListItem> = (row, columnId, value) => {
  const query = String(value ?? "").trim();
  if (!query) return true;

  const cell = String(row.getValue(columnId) ?? "").toLowerCase();

  if (columnId === "phoneDigits") {
    const digits = query.replace(/\D/g, "");
    return digits.length > 0 && cell.includes(digits);
  }

  return cell.includes(query.toLowerCase());
};

/**
 * TanStack drives search, sorting and filtering; the rendering is ours.
 * Same arrangement as the properties list — headless, so rows are as
 * legitimate a presentation as a <table>.
 *
 * Columns are a data model only. None of them render.
 */
const columns: ColumnDef<ContactListItem>[] = [
  {
    id: "name",
    accessorFn: (row) =>
      [row.firstName, row.lastName].filter(Boolean).join(" "),
  },
  { accessorKey: "email" },
  // Digits only, so spacing and punctuation never defeat a search.
  //
  // Both forms are indexed because the numbers are stored international
  // (+33 6 …) while people type national (06 …): "33614269921" does not
  // contain "0614269921", so searching the familiar format would find
  // nothing without this.
  {
    id: "phoneDigits",
    accessorFn: (row) => {
      const digits = (row.phone ?? "").replace(/\D/g, "");
      if (!digits) return "";
      const national = digits.replace(/^33/, "0");
      return national === digits ? digits : `${digits} ${national}`;
    },
  },
  // Excluded from search: the raw codes would let "prov" match
  // PROVIDER, while `labels` below already covers the French words
  // people actually type.
  {
    id: "types",
    accessorFn: (row) => row.types,
    filterFn: "arrIncludesSome",
    enableGlobalFilter: false,
  },
  {
    id: "specialties",
    accessorFn: (row) => row.specialties,
    filterFn: "arrIncludesSome",
    enableGlobalFilter: false,
  },
  {
    // Searching "plombier" must match, not the stored code PLUMBING —
    // the same reason the properties list carries a typeLabel column.
    // Includes the free text behind "Autre", so "jardinier" finds one.
    id: "labels",
    accessorFn: (row) =>
      [
        ...row.types.map((t) => CONTACT_TYPE_LABELS[t]),
        ...specialtyLabels(row.specialties, row.otherSpecialty),
      ].join(" "),
  },
  {
    // An owner is often looked up from the villa rather than by name,
    // so both the marketing name and the APIMO reference find them.
    id: "properties",
    accessorFn: (row) =>
      row.properties
        .map((p) => [p.marketingName, p.reference].filter(Boolean).join(" "))
        .join(" "),
  },
  // Sort-only: searching "3" should not surface everyone with 3
  // properties, nor everyone created in 2026.
  {
    id: "propertyCount",
    accessorFn: (row) => row.properties.length,
    enableGlobalFilter: false,
  },
  { accessorKey: "createdAt", enableGlobalFilter: false },
];

const SORT_OPTIONS = [
  { id: "name", label: "Nom (A–Z)", sorting: [{ id: "name", desc: false }] },
  { id: "nameDesc", label: "Nom (Z–A)", sorting: [{ id: "name", desc: true }] },
  {
    id: "properties",
    label: "Biens (plus nombreux)",
    sorting: [{ id: "propertyCount", desc: true }],
  },
  {
    id: "recent",
    label: "Ajout récent",
    sorting: [{ id: "createdAt", desc: true }],
  },
] as const;

const TYPE_OPTIONS = CONTACT_TYPES.map((t) => contactTypeLabel(t));
const SPECIALTY_OPTIONS = CONTACT_SPECIALTIES.map(
  (s) => CONTACT_SPECIALTY_LABELS[s]
);

/** Labels are what the user picks; the table filters on stored codes. */
const TYPE_BY_LABEL = new Map(
  CONTACT_TYPES.map((t) => [CONTACT_TYPE_LABELS[t], t])
);
const SPECIALTY_BY_LABEL = new Map(
  CONTACT_SPECIALTIES.map((s) => [CONTACT_SPECIALTY_LABELS[s], s])
);

export function ContactsList({ contacts }: { contacts: ContactListItem[] }) {
  const [sortId, setSortId] =
    React.useState<(typeof SORT_OPTIONS)[number]["id"]>("name");
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = React.useState<
    string[]
  >([]);

  const sorting = React.useMemo<SortingState>(
    () => [...(SORT_OPTIONS.find((o) => o.id === sortId)?.sorting ?? [])],
    [sortId]
  );

  const table = useReactTable({
    data: contacts,
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
  const hasAnyFilter =
    globalFilter !== "" ||
    selectedTypes.length > 0 ||
    selectedSpecialties.length > 0;

  function setTypes(labels: string[]) {
    setSelectedTypes(labels);
    const codes = labels
      .map((l) => TYPE_BY_LABEL.get(l))
      .filter((c): c is NonNullable<typeof c> => Boolean(c));
    table.getColumn("types")?.setFilterValue(codes.length ? codes : undefined);
  }

  function setSpecialties(labels: string[]) {
    setSelectedSpecialties(labels);
    const codes = labels
      .map((l) => SPECIALTY_BY_LABEL.get(l))
      .filter((c): c is NonNullable<typeof c> => Boolean(c));
    table
      .getColumn("specialties")
      ?.setFilterValue(codes.length ? codes : undefined);
  }

  function reset() {
    setGlobalFilter("");
    setTypes([]);
    setSpecialties([]);
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
              placeholder="Nom, e-mail, téléphone, métier…"
              aria-label="Rechercher un contact"
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

        <div className="flex flex-wrap items-center gap-2">
          <MultiSelectFilter
            label="Type"
            options={TYPE_OPTIONS}
            selected={selectedTypes}
            onChange={setTypes}
          />
          <MultiSelectFilter
            label="Spécialité"
            options={SPECIALTY_OPTIONS}
            selected={selectedSpecialties}
            onChange={setSpecialties}
          />

          {hasAnyFilter ? (
            <Button variant="ghost" size="sm" onClick={reset}>
              <X aria-hidden="true" />
              Réinitialiser
            </Button>
          ) : null}
        </div>

        {/* aria-live so the count is announced when a filter changes,
            not only seen. */}
        <p className="text-muted-foreground text-xs" aria-live="polite">
          {rows.length === contacts.length
            ? `${contacts.length} contacts`
            : `${rows.length} sur ${contacts.length} contacts`}
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm">
          {contacts.length === 0
            ? "Aucun contact."
            : "Aucun contact ne correspond à cette recherche."}
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {rows.map((row) => {
            const contact = row.original;
            const name =
              [contact.firstName, contact.lastName].filter(Boolean).join(" ") ||
              "Sans nom";
            const types = CONTACT_TYPES.filter((t) =>
              contact.types.includes(t)
            );
            const trades = specialtyLabels(
              contact.specialties,
              contact.otherSpecialty
            );

            return (
              <li key={contact.id}>
                <Link
                  href={`/contacts/${contact.id}`}
                  className="hover:bg-accent flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="truncate font-medium">{name}</span>
                      {/* The trade sits with the name, not among the type
                          badges: "Plombier" is what you scan for, while
                          "Prestataire" only says how they relate to us. */}
                      {trades.length > 0 ? (
                        <span className="text-muted-foreground truncate text-xs">
                          {trades.join(" · ")}
                        </span>
                      ) : null}
                    </span>

                    <span className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                      {contact.email ? (
                        <span className="inline-flex min-w-0 items-center gap-1">
                          <Mail aria-hidden="true" className="size-3 shrink-0" />
                          <span className="truncate">{contact.email}</span>
                        </span>
                      ) : null}

                      {contact.phone ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone
                            aria-hidden="true"
                            className="size-3 shrink-0"
                          />
                          <span className="tabular-nums">{contact.phone}</span>
                        </span>
                      ) : null}

                      {/* Missing contact details are stated rather than
                          left blank: for an owner it is a gap someone
                          has to close, not a neutral absence. */}
                      {!contact.email && !contact.phone ? (
                        <span>Aucune coordonnée</span>
                      ) : null}
                    </span>
                  </div>

                  {/* Named rather than counted up to two, so a search on
                      a villa shows why this row matched. Beyond that the
                      count stays scannable. */}
                  {contact.properties.length > 0 ? (
                    <span className="text-muted-foreground max-w-[14rem] shrink-0 truncate text-xs">
                      {contact.properties.length <= 2
                        ? contact.properties
                            .map((p) => p.marketingName ?? p.reference)
                            .join(" · ")
                        : `${contact.properties.length} biens`}
                    </span>
                  ) : null}

                  <div className="flex shrink-0 flex-wrap gap-1">
                    {contact.kind === "COMPANY" ? (
                      <Badge className="font-normal">Société</Badge>
                    ) : null}
                    {types.map((type) => (
                      <Badge
                        key={type}
                        variant="secondary"
                        className="font-normal"
                      >
                        {contactTypeLabel(type)}
                      </Badge>
                    ))}
                    {/* Origin matters: an APIMO-sourced contact is
                        overwritten by the next sync, a BSTAY one is not. */}
                    {contact.apimoId === null ? (
                      <Badge variant="outline" className="font-normal">
                        BSTAY
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
