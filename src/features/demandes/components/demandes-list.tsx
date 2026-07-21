"use client";

import * as React from "react";
import Link from "next/link";
import { Mail, Phone, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { DemandeListItem } from "@/features/demandes/services/demande-service";
import {
  demandeStatus,
  modeLabel,
} from "@/features/demandes/components/demande-labels";
import { formatStay } from "@/features/rentals/components/rental-labels";

const CATEGORIES = [
  { id: "pending", label: "En attente" },
  { id: "converted", label: "Converties" },
  { id: "lost", label: "Perdues" },
] as const;

const MONEY = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function haystack(d: DemandeListItem): string {
  return [
    d.contact.firstName,
    d.contact.lastName,
    d.contact.email,
    d.contact.phone,
    ...d.properties.map((p) => p.property.marketingName),
    ...d.properties.map((p) => p.property.city),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function DemandesList({ demandes }: { demandes: DemandeListItem[] }) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? demandes.filter((d) => haystack(d).includes(q)) : demandes;
  }, [demandes, query]);

  const sections = CATEGORIES.map((c) => ({
    ...c,
    items: filtered.filter((d) => demandeStatus(d) === c.id),
  }));

  return (
    <div className="space-y-6">
      <div className="relative sm:max-w-xs">
        <Search
          aria-hidden="true"
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Prospect, bien, e-mail, téléphone…"
          aria-label="Rechercher une demande"
          className="pl-8"
        />
      </div>

      {sections.map((section) => (
        <section key={section.id} className="space-y-2">
          <h3 className="text-sm font-medium">
            {section.label}
            <span className="text-muted-foreground ml-1.5 tabular-nums">
              {section.items.length}
            </span>
          </h3>
          {section.items.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center text-sm">
              {query !== "" ? "Aucun résultat." : "Aucune demande."}
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {section.items.map((d) => (
                <DemandeRow key={d.id} demande={d} />
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

function DemandeRow({ demande: d }: { demande: DemandeListItem }) {
  const name =
    [d.contact.firstName, d.contact.lastName].filter(Boolean).join(" ") ||
    "Prospect";
  const villas = d.properties
    .map((p) => p.property.marketingName ?? p.property.city)
    .filter(Boolean);

  return (
    <li>
      <Link
        href={`/demandes/${d.id}`}
        className="hover:bg-accent flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm transition-colors"
      >
        <div className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="truncate font-medium">{name}</span>
            <span className="text-muted-foreground text-xs">
              {modeLabel(d.mode)}
            </span>
          </span>
          <span className="text-muted-foreground block truncate text-xs">
            {villas.length === 0
              ? "Aucun bien"
              : villas.length <= 2
                ? villas.join(" · ")
                : `${villas.length} biens`}
            {d.checkIn && d.checkOut
              ? ` · ${formatStay(d.checkIn, d.checkOut)}`
              : " · dates ouvertes"}
          </span>
        </div>

        {/* How to reach the prospect back — what they left. */}
        <span className="text-muted-foreground hidden shrink-0 items-center gap-3 text-xs sm:flex">
          {d.contact.email ? (
            <span className="inline-flex items-center gap-1">
              <Mail aria-hidden="true" className="size-3" />
              {d.contact.email}
            </span>
          ) : null}
          {d.contact.phone ? (
            <span className="inline-flex items-center gap-1">
              <Phone aria-hidden="true" className="size-3" />
              <span className="tabular-nums">{d.contact.phone}</span>
            </span>
          ) : null}
        </span>

        {d.budget !== null ? (
          <span className="shrink-0 text-xs tabular-nums">
            ≤ {MONEY.format(d.budget)}
          </span>
        ) : null}
      </Link>
    </li>
  );
}
