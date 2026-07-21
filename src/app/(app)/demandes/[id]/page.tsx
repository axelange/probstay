import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DemandeActions } from "@/features/demandes/components/demande-actions";
import {
  demandeStatus,
  modeLabel,
  sourceLabel,
  STATUS_LABELS,
} from "@/features/demandes/components/demande-labels";
import { getDemandeDetail } from "@/features/demandes/services/demande-service";
import { formatDate, formatStay } from "@/features/rentals/components/rental-labels";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Demande — BSTAY PRO" };

const MONEY = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function toDateInput(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(date);
}

export default async function DemandeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const demande = await getDemandeDetail(id);
  if (!demande) notFound();

  const status = demandeStatus(demande);
  const name =
    [demande.contact.firstName, demande.contact.lastName]
      .filter(Boolean)
      .join(" ") || "Prospect";
  const properties = demande.properties.map((p) => p.property);

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/demandes" />}
        >
          <ArrowLeft aria-hidden="true" />
          Toutes les demandes
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold tracking-tight">{name}</h2>
        <Badge variant="secondary" className="font-normal">
          Demande {modeLabel(demande.mode).toLowerCase()}
        </Badge>
        <Badge
          variant={status === "lost" ? "outline" : "secondary"}
          className="font-normal"
        >
          {STATUS_LABELS[status]}
        </Badge>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-medium">Séjour souhaité</h3>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="space-y-0.5">
                <dt className="text-muted-foreground text-xs">Dates</dt>
                <dd className="text-sm">
                  {demande.checkIn && demande.checkOut
                    ? formatStay(demande.checkIn, demande.checkOut)
                    : "Ouvertes"}
                </dd>
              </div>
              <div className="space-y-0.5">
                <dt className="text-muted-foreground text-xs">Personnes</dt>
                <dd className="text-sm tabular-nums">{demande.guests ?? "—"}</dd>
              </div>
              <div className="space-y-0.5">
                <dt className="text-muted-foreground text-xs">Budget</dt>
                <dd className="text-sm tabular-nums">
                  {demande.budget !== null ? MONEY.format(demande.budget) : "—"}
                </dd>
              </div>
            </dl>
          </section>

          <Separator />

          <section className="space-y-3">
            <h3 className="text-sm font-medium">
              Biens d&apos;intérêt{" "}
              <span className="text-muted-foreground tabular-nums">
                ({properties.length})
              </span>
            </h3>
            {properties.length === 0 ? (
              <p className="text-muted-foreground text-sm">Aucun bien.</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {properties.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/properties/${p.id}`}
                      className="hover:bg-accent flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {p.marketingName ?? p.city ?? "Sans nom"}
                        </span>
                        <span className="text-muted-foreground block truncate text-xs">
                          {p.city}
                        </span>
                      </span>
                      <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                        {p.reference}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {demande.notes ? (
            <>
              <Separator />
              <section className="space-y-2">
                <h3 className="text-sm font-medium">Notes internes</h3>
                <p className="text-muted-foreground max-w-prose text-sm whitespace-pre-line">
                  {demande.notes}
                </p>
              </section>
            </>
          ) : null}
        </div>

        <div className="space-y-6">
          {/* The prospect and how to reach them back — what they left. */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium">Prospect</h3>
            <div className="space-y-1.5 rounded-lg border p-4 text-sm">
              <Link
                href={`/contacts/${demande.contact.id}`}
                className="font-medium underline underline-offset-2"
              >
                {name}
              </Link>
              <p className="text-muted-foreground flex items-center gap-1.5">
                <Mail aria-hidden="true" className="size-3.5 shrink-0" />
                {demande.contact.email ?? "Aucun e-mail"}
              </p>
              <p className="text-muted-foreground flex items-center gap-1.5">
                <Phone aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="tabular-nums">
                  {demande.contact.phone ?? "Aucun téléphone"}
                </span>
              </p>
            </div>
          </section>

          <DemandeActions
            demandeId={demande.id}
            status={status}
            convertedRentalId={demande.convertedRentalId}
            properties={properties}
            defaultCheckIn={demande.checkIn ? toDateInput(demande.checkIn) : ""}
            defaultCheckOut={demande.checkOut ? toDateInput(demande.checkOut) : ""}
          />

          <section className="space-y-1 text-xs text-muted-foreground">
            <p>Origine : {sourceLabel(demande.source)}</p>
            <p>
              Créée le {formatDate(demande.createdAt)}
              {demande.createdBy ? ` par ${demande.createdBy.fullName}` : ""}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
