import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RentalFunnel } from "@/features/rentals/components/rental-funnel";
import {
  formatDate,
  formatStay,
  nights,
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

      {/* Status now lives in the funnel's stepper, so the header just
          names the booking. */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold tracking-tight">
          {rental.property.marketingName ?? rental.property.city ?? "Sans nom"}
        </h2>
        <span className="text-muted-foreground text-sm">
          {formatStay(rental.checkIn, rental.checkOut)}
        </span>
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
              <Field label="Personnes">
                <span className="tabular-nums">{rental.guests ?? "—"}</span>
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

            {/* Set on the property, shown here — what the stay includes. */}
            {rental.property.includedServices.length > 0 ? (
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">Services inclus</p>
                <div className="flex flex-wrap gap-1.5">
                  {rental.property.includedServices.map((s) => (
                    <Badge key={s} variant="secondary" className="font-normal">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <Separator />

          {/* The pipeline as a funnel: a stepper, and the current stage's
              own panel with its fields and the condition to advance.
              Read-only inside for anyone who doesn't manage the booking. */}
          <RentalFunnel
            canManage={canManage}
            rental={{
              id: rental.id,
              bookingStatus: rental.bookingStatus,
              guests: rental.guests,
              grossAmount: rental.grossAmount,
              depositAmount: rental.depositAmount,
              securityDepositAmount: rental.securityDepositAmount,
              depositStatus: rental.depositStatus,
              balanceStatus: rental.balanceStatus,
              securityDepositStatus: rental.securityDepositStatus,
              ownerConfirmedAt: rental.ownerConfirmedAt,
              ownerConfirmedByName: rental.ownerConfirmedBy?.fullName ?? null,
              contractSignedAt: rental.contractSignedAt,
              contractSignedByName: rental.contractSignedBy?.fullName ?? null,
              securityDepositReturnedAt: rental.securityDepositReturnedAt,
              identityDocumentCount: rental.identityDocuments.length,
              notes: rental.notes,
            }}
          />
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
