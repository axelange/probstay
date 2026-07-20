import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CircleCheck, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EditRentalForm } from "@/features/rentals/components/edit-rental-form";
import {
  bookingStatusLabel,
  formatAmount,
  formatDate,
  formatStay,
  nights,
  paymentStatusLabel,
} from "@/features/rentals/components/rental-labels";
import {
  canManageRental,
  getRentalDetail,
} from "@/features/rentals/services/rental-service";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Location — BSTAY PRO" };

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm">{children ?? "—"}</dd>
    </div>
  );
}

export default async function RentalDetailPage({
  // Next 16: params is a promise.
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const rental = await getRentalDetail(id);
  if (!rental) notFound();

  const canManage = canManageRental(user, rental);

  // Derived, never stored: a stored balance drifts from its parts.
  const balance =
    rental.grossAmount === null
      ? null
      : rental.grossAmount - (rental.depositAmount ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/rentals" />}
        >
          <ArrowLeft aria-hidden="true" />
          Toutes les locations
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold tracking-tight">
          {rental.property.marketingName ?? rental.property.city ?? "Sans nom"}
        </h2>
        <Badge
          variant={rental.bookingStatus === "CANCELLED" ? "outline" : "secondary"}
          className="font-normal"
        >
          {bookingStatusLabel(rental.bookingStatus)}
        </Badge>
        {rental.ownerConfirmedAt ? (
          <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
            <CircleCheck aria-hidden="true" className="size-3.5" />
            Confirmée par le propriétaire le{" "}
            {formatDate(rental.ownerConfirmedAt)}
            {rental.ownerConfirmedBy
              ? ` (${rental.ownerConfirmedBy.fullName})`
              : ""}
          </span>
        ) : null}
        {!canManage ? (
          <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
            <Lock aria-hidden="true" className="size-3" />
            Lecture seule — vous ne gérez pas ce bien
          </span>
        ) : null}
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-medium">Séjour</h3>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label="Dates">
                {formatStay(rental.checkIn, rental.checkOut)}
              </Field>
              <Field label="Nuits">
                <span className="tabular-nums">
                  {nights(rental.checkIn, rental.checkOut)}
                </span>
              </Field>
              <Field label="Bien">
                <Link
                  href={`/properties/${rental.property.id}`}
                  className="underline underline-offset-2"
                >
                  {rental.property.reference}
                </Link>
              </Field>
            </dl>
          </section>

          <Separator />

          {/* Progress, money and payments are editable for whoever
              manages this booking, and read-only otherwise. Dates and
              property stay fixed here: changing them interacts with the
              overlap constraint and the snapshot, and belongs elsewhere. */}
          {canManage ? (
            <EditRentalForm
              rental={{
                id: rental.id,
                bookingStatus: rental.bookingStatus,
                grossAmount: rental.grossAmount,
                depositAmount: rental.depositAmount,
                securityDepositAmount: rental.securityDepositAmount,
                depositStatus: rental.depositStatus,
                balanceStatus: rental.balanceStatus,
                securityDepositStatus: rental.securityDepositStatus,
                ownerConfirmedAt: rental.ownerConfirmedAt,
                ownerConfirmedByName: rental.ownerConfirmedBy?.fullName ?? null,
                notes: rental.notes,
              }}
            />
          ) : (
            <>
              <section className="space-y-3">
                <h3 className="text-sm font-medium">Montants</h3>
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Field label="Séjour">
                    <span className="tabular-nums">
                      {formatAmount(rental.grossAmount)}
                    </span>
                  </Field>
                  <Field label="Acompte">
                    <span className="tabular-nums">
                      {formatAmount(rental.depositAmount)}
                    </span>
                  </Field>
                  <Field label="Solde">
                    <span className="tabular-nums">{formatAmount(balance)}</span>
                  </Field>
                  <Field label="Dépôt de garantie">
                    <span className="tabular-nums">
                      {formatAmount(rental.securityDepositAmount)}
                    </span>
                  </Field>
                </dl>
              </section>

              <Separator />

              <section className="space-y-3">
                <h3 className="text-sm font-medium">Paiements</h3>
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <Field label="Acompte">
                    {paymentStatusLabel(rental.depositStatus)}
                  </Field>
                  <Field label="Solde">
                    {paymentStatusLabel(rental.balanceStatus)}
                  </Field>
                  <Field label="Dépôt de garantie">
                    {paymentStatusLabel(rental.securityDepositStatus)}
                  </Field>
                </dl>
              </section>

              {rental.notes ? (
                <>
                  <Separator />
                  <section className="space-y-2">
                    <h3 className="text-sm font-medium">Notes internes</h3>
                    <p className="text-muted-foreground max-w-prose text-sm whitespace-pre-line">
                      {rental.notes}
                    </p>
                  </section>
                </>
              ) : null}
            </>
          )}
        </div>

        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-medium">
              Locataires{" "}
              <span className="text-muted-foreground tabular-nums">
                ({rental.tenants.length})
              </span>
            </h3>
            <ul className="divide-y rounded-lg border">
              {rental.tenants.map((t) => (
                <li key={t.contact.id}>
                  <Link
                    href={`/contacts/${t.contact.id}`}
                    className="hover:bg-accent flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {[t.contact.firstName, t.contact.lastName]
                          .filter(Boolean)
                          .join(" ")}
                      </span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {t.contact.email ?? t.contact.phone ?? "Aucune coordonnée"}
                      </span>
                    </span>
                    {t.isPrimary && rental.tenants.length > 1 ? (
                      <Badge variant="outline" className="shrink-0 font-normal">
                        Principal
                      </Badge>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-medium">Suivi</h3>
            <dl className="grid grid-cols-2 gap-4">
              {/* Snapshots taken when the lease was signed, not live
                  lookups — empty before that. Reassigning the property
                  must not rewrite who this booking belonged to. */}
              <Field label="Propriétaire">
                {rental.owner ? (
                  <Link
                    href={`/contacts/${rental.owner.id}`}
                    className="underline underline-offset-2"
                  >
                    {[rental.owner.firstName, rental.owner.lastName]
                      .filter(Boolean)
                      .join(" ")}
                  </Link>
                ) : null}
              </Field>
              <Field label="Agent">{rental.agent?.fullName}</Field>
              <Field label="Créée le">{formatDate(rental.createdAt)}</Field>
            </dl>
            <p className="text-muted-foreground text-xs">
              Propriétaire et agent sont figés à la signature du contrat :
              réassigner le bien ensuite ne réécrit pas l&apos;historique de
              cette location.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
