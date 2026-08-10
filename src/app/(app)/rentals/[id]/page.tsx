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
import { modeLabel } from "@/features/demandes/components/demande-labels";
import { ContractCompletionForm } from "@/features/documents/components/contract-completion-form";
import { buildCompletionData } from "@/features/documents/services/build-completion-data";
import { documentReadiness } from "@/features/documents/services/document-readiness";
import { listGeneratedDocuments } from "@/features/documents/services/generated-document-service";
import { listSignedDocuments } from "@/features/documents/services/signed-document-service";
import {
  listIntakeLinks,
  occupantsState,
} from "@/features/intake/services/intake-service";
import { IntakeLinkPanel } from "@/features/intake/components/intake-link-panel";
import { SignedDocuments } from "@/features/documents/components/signed-documents";
import { RentalDocuments } from "@/features/documents/components/rental-documents";
import {
  canManageRental,
  getRentalDetail,
  listBookableProperties,
  listTaxRatesByCity,
} from "@/features/rentals/services/rental-service";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

/** yyyy-mm-dd for a date input, in the pinned Paris zone. */
function toDateInput(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
  }).format(date);
}

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

  const rental = await getRentalDetail(id, user);
  if (!rental) notFound();

  const canManage = canManageRental(user, rental);

  // The owner snapshot is frozen only at contract signature. Before that,
  // fall back to the property's current owner so the field isn't empty —
  // flagged "(actuel)" since it isn't yet locked to this booking.
  const owner = rental.owner ?? rental.property.owner;

  // The villa can be changed while the booking is an enquiry, so the
  // funnel needs the choices — filtered to what an agent may book.
  const [allProperties, taxRatesByCity] = canManage
    ? await Promise.all([listBookableProperties(), listTaxRatesByCity()])
    : [[], {} as Record<string, number>];
  const canManageAll = hasPermission(user, "MANAGE_RENTALS");
  const properties = canManageAll
    ? allProperties
    : allProperties.filter((p) => p.agentId === user.id);

  // The contract stage carries the documents' completion form: what is
  // missing, and every current value so the agent can correct the client
  // on the spot. Only assembled when the booking is at that stage.
  const [readiness, completion] =
    rental.bookingStatus === "CONTRACT" && canManage
      ? await Promise.all([
          documentReadiness(rental.id, "CONTRAT", user),
          buildCompletionData(rental.id, user),
        ])
      : [null, null];

  // Generated documents are listed from the contract stage onward: they stay
  // reachable after the contract is signed, which is when someone is most
  // likely to need the file again.
  const generated =
    rental.bookingStatus === "CONTRACT" ||
    rental.bookingStatus === "FINALISATION" ||
    rental.bookingStatus === "CHECK_IN" ||
    rental.bookingStatus === "CHECK_OUT"
      ? await listGeneratedDocuments(rental.id, user)
      : null;
  const documentsStep = generated ? (
    <RentalDocuments
      rentalId={rental.id}
      documents={generated}
      canManage={canManage}
    />
  ) : undefined;

  // The signed copies sit alongside, from the same stage: an agent generates,
  // sends, and attaches what comes back without leaving the step.
  const signed = generated ? await listSignedDocuments(rental.id, user) : null;
  const signedStep = signed ? (
    <SignedDocuments
      rentalId={rental.id}
      documents={signed}
      canManage={canManage}
    />
  ) : undefined;

  // The client's own identification (LCB-FT / TRACFIN), collected through a
  // link they fill in themselves. Tied to the primary tenant, since that is
  // the party the agency is required to identify.
  const primaryTenant = rental.tenants.find((t) => t.isPrimary)?.contact ?? null;
  const intakeLinks =
    canManage && primaryTenant
      ? await listIntakeLinks(primaryTenant.id, rental.id)
      : [];
  const intakeStep = primaryTenant ? (
    <IntakeLinkPanel
      contactId={primaryTenant.id}
      rentalId={rental.id}
      contactName={[primaryTenant.firstName, primaryTenant.lastName]
        .filter(Boolean)
        .join(" ")}
      contactEmail={primaryTenant.email ?? null}
      stayLabel={rental.property.marketingName ?? rental.property.city ?? undefined}
      links={intakeLinks}
      canManage={canManage}
    />
  ) : undefined;

  // The other adults, chased at finalisation: optional before the contract
  // because the tenant rarely knows who is coming that early, required once
  // the stay is being finalised.
  const occupants =
    canManage && primaryTenant ? await occupantsState(rental.id) : null;
  const occupantLinks =
    canManage && primaryTenant
      ? await listIntakeLinks(primaryTenant.id, rental.id, "OCCUPANTS")
      : [];
  const occupantsStep =
    primaryTenant && occupants ? (
      <IntakeLinkPanel
        contactId={primaryTenant.id}
        rentalId={rental.id}
        contactName={[primaryTenant.firstName, primaryTenant.lastName]
          .filter(Boolean)
          .join(" ")}
        contactEmail={primaryTenant.email ?? null}
        stayLabel={rental.property.marketingName ?? rental.property.city ?? undefined}
        links={occupantLinks}
        canManage={canManage}
        scope="OCCUPANTS"
        title="Autres occupants"
        intro="Les autres adultes du séjour, hors enfants. Un lien dédié demande uniquement ces informations — le locataire principal n'a pas à redéclarer les siennes."
      >
        {occupants.complete ? (
          <p className="text-sm text-emerald-600">
            {occupants.listed} occupant{occupants.listed > 1 ? "s" : ""} renseigné
            {occupants.listed > 1 ? "s" : ""}.
          </p>
        ) : (
          <div className="space-y-1 text-sm text-amber-600">
            <p>
              {occupants.listed} sur {occupants.expected} occupant
              {occupants.expected > 1 ? "s" : ""} attendu
              {occupants.expected > 1 ? "s" : ""}.
            </p>
            {occupants.incomplete.length > 0 ? (
              <p className="text-xs">
                Pièce d&apos;identité manquante&nbsp;:{" "}
                {occupants.incomplete.join(", ")}.
              </p>
            ) : null}
          </div>
        )}
      </IntakeLinkPanel>
    ) : undefined;

  const contractStep =
    readiness && completion ? (
      <ContractCompletionForm
        rentalId={rental.id}
        data={completion}
        missingKeys={readiness.missing.map((m) => m.key)}
        missingLabels={readiness.missing.map((m) => m.label)}
        complete={readiness.complete}
      />
    ) : undefined;

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
                {rental.children ? (
                  <span className="text-muted-foreground">
                    {" "}
                    dont <span className="tabular-nums">{rental.children}</span>{" "}
                    enfant{rental.children > 1 ? "s" : ""}
                  </span>
                ) : null}
              </Field>
              <Field label="Horaires">
                <span className="tabular-nums">
                  {rental.checkInTime ?? rental.property.checkInTime}
                </span>
                {" → "}
                <span className="tabular-nums">
                  {rental.checkOutTime ?? rental.property.checkOutTime}
                </span>
                {rental.checkInTime === null && rental.checkOutTime === null ? null : (
                  <span className="text-muted-foreground text-xs">
                    {" "}
                    (propre à ce séjour)
                  </span>
                )}
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
            properties={properties}
            taxRatesByCity={taxRatesByCity}
            contractStep={contractStep}
            documentsStep={documentsStep}
            signedStep={signedStep}
            intakeStep={intakeStep}
            occupantsStep={occupantsStep}
            hasSignedConfirmation={
              signed?.some((d) => d.type === "RENTAL_CONFIRMATION") ?? false
            }
            hasSignedContract={
              signed?.some((d) => d.type === "SEASONAL_RENTAL_CONTRACT") ?? false
            }
            contractReady={readiness?.complete ?? false}
            rental={{
              id: rental.id,
              bookingStatus: rental.bookingStatus,
              propertyId: rental.property.id,
              checkIn: toDateInput(rental.checkIn),
              checkOut: toDateInput(rental.checkOut),
              guests: rental.guests,
              children: rental.children,
              checkInTime: rental.checkInTime,
              checkOutTime: rental.checkOutTime,
              presentation: rental.presentation,
              netOwnerAmount: rental.netOwnerAmount,
              commissionAmount: rental.commissionAmount,
              touristTaxAmount: rental.touristTaxAmount,
              touristTaxRate: rental.touristTaxAmount !== null ? rental.touristTaxRate : null,
              grossAmount: rental.grossAmount,
              depositAmount: rental.depositAmount,
              depositBasis: rental.depositBasis,
              depositPercent: rental.depositPercent,
              securityDepositAmount: rental.securityDepositAmount,
              depositStatus: rental.depositStatus,
              balanceStatus: rental.balanceStatus,
              securityDepositStatus: rental.securityDepositStatus,
              additionalServices: rental.services,
              payments: rental.payments,
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
                {owner ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Link
                      href={`/contacts/${owner.id}`}
                      className="underline underline-offset-2"
                    >
                      {[owner.firstName, owner.lastName]
                        .filter(Boolean)
                        .join(" ")}
                    </Link>
                    {!rental.owner ? (
                      <span className="text-muted-foreground text-xs">
                        (actuel)
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </Field>
              {/* Co-agents when the tenant-side agent (from the demande)
                  differs from the property's agent (owner side). Otherwise
                  a single agent. */}
              {rental.tenantAgent &&
              rental.property.agent &&
              rental.tenantAgent.id !== rental.property.agent.id ? (
                <>
                  <Field label="Agent locataire">
                    {rental.tenantAgent.fullName}
                  </Field>
                  <Field label="Agent propriétaire">
                    {rental.property.agent.fullName}
                  </Field>
                </>
              ) : (
                <Field label="Agent">
                  {(rental.property.agent ?? rental.tenantAgent)?.fullName ??
                    "—"}
                </Field>
              )}
              <Field label="Créée le">{formatDate(rental.createdAt)}</Field>
              {/* The far end of the journey: the demande this booking came
                  from, so the full path stays traceable both ways. */}
              {rental.originatingDemande ? (
                <Field label="Origine">
                  <Link
                    href={`/demandes/${rental.originatingDemande.id}`}
                    className="underline underline-offset-2"
                  >
                    Demande {modeLabel(rental.originatingDemande.mode).toLowerCase()}{" "}
                    du {formatDate(rental.originatingDemande.createdAt)}
                  </Link>
                </Field>
              ) : null}
            </dl>
            <p className="text-muted-foreground text-xs">
              {rental.tenantAgent &&
              rental.property.agent &&
              rental.tenantAgent.id !== rental.property.agent.id
                ? "Deux co-agents gèrent cette location : l'un côté locataire, l'autre côté propriétaire."
                : "Propriétaire et agent figés à la signature du contrat : réassigner le bien ensuite ne réécrit pas l'historique."}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
