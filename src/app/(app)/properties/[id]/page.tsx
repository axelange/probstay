import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, EyeOff, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AgentAssignField } from "@/features/properties/components/agent-assign-field";
import { DefaultSecurityDepositField } from "@/features/properties/components/default-security-deposit-field";
import { IncludedServicesField } from "@/features/properties/components/included-services-field";
import { MarketingNameField } from "@/features/properties/components/marketing-name-field";
import { PropertyGallery } from "@/features/properties/components/property-gallery";
import {
  getPropertyDetail,
  listAssignableAgents,
} from "@/features/properties/services/property-service";
import {
  formatAmount,
  formatArea,
  formatPrice,
  propertyTypeLabel,
} from "@/features/properties/utils/apimo-labels";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

/**
 * Timezone and locale are pinned rather than left to the runtime: this
 * renders on the server, and an unpinned format would read differently
 * depending on where the server happens to run.
 */
const SYNCED_AT_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

function formatSyncedAt(date: Date) {
  return SYNCED_AT_FORMAT.format(date);
}

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

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium">{title}</h3>
      {children}
    </section>
  );
}

export default async function PropertyDetailPage({
  // Next 16: params is a promise.
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const property = await getPropertyDetail(id, user);
  if (!property) notFound();

  const typeLabel = propertyTypeLabel(property.type);
  // Decided here rather than in the client component: the same check runs
  // again inside the action, since rendering an input is not permission.
  const canEditMarketingName = hasPermission(user, "MANAGE_PROPERTIES");
  const canAssignAgent = canEditMarketingName;
  const assignableAgents = canAssignAgent ? await listAssignableAgents() : [];

  return (
    <div className="space-y-6">
      <div>
        {/* nativeButton={false}: this renders an <a>, not a <button>.
            Base UI assumes a native button and would otherwise attach
            button semantics to a link. It is a link — it navigates. */}
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/properties" />}
        >
          <ArrowLeft aria-hidden="true" />
          Tous les biens
        </Button>
      </div>

      {/* The marketing name leads: it's how clients and staff refer to the
          property. The town qualifies it, and the APIMO reference is a
          lookup key, so it sits small and grey in the corner. */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h2 className="truncate text-xl font-semibold tracking-tight">
            {property.marketingName ?? property.city ?? "Sans nom"}
          </h2>
          <span className="text-muted-foreground text-sm">
            {[property.city, property.district].filter(Boolean).join(" · ")}
          </span>
          {typeLabel ? <Badge variant="secondary">{typeLabel}</Badge> : null}
        </div>
        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
          {property.reference ?? "Sans référence"}
        </span>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <PropertyGallery
          pictures={property.pictures}
          reference={property.reference}
        />

        <div className="space-y-6">
          <Section title="Nom marketing">
            <p id="marketing-name-help" className="text-muted-foreground text-sm">
              Le nom présenté aux clients. Unique, et le seul champ de cette
              page qui ne vient pas d&apos;APIMO.
            </p>
            <MarketingNameField
              propertyId={property.id}
              initialValue={property.marketingName}
              canEdit={canEditMarketingName}
            />
          </Section>

          <Separator />

          <Section title="Services inclus">
            <p className="text-muted-foreground text-sm">
              Ce qui est compris dans le séjour. Affiché sur chaque location de
              ce bien.
            </p>
            <IncludedServicesField
              propertyId={property.id}
              initial={property.includedServices}
              canEdit={canEditMarketingName}
            />
          </Section>

          <Separator />

          <Section title="Caution par défaut">
            <p className="text-muted-foreground text-sm">
              Le dépôt de garantie habituel de ce bien. Toute location créée
              ensuite le reprend&nbsp;; c&apos;est la seule source de ce montant,
              qu&apos;aucune location ne doit omettre.
            </p>
            <DefaultSecurityDepositField
              propertyId={property.id}
              initialValue={property.defaultSecurityDeposit?.toFixed(2) ?? null}
              canEdit={canEditMarketingName}
            />
          </Section>

          <Separator />

          <Section title="Caractéristiques">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label="Pièces">
                <span className="tabular-nums">{property.rooms ?? "—"}</span>
              </Field>
              <Field label="Chambres">
                <span className="tabular-nums">{property.bedrooms ?? "—"}</span>
              </Field>
              <Field label="Salles de bains">
                <span className="tabular-nums">{property.bathrooms ?? "—"}</span>
              </Field>
              <Field label="Couchages">
                <span className="tabular-nums">{property.sleeps ?? "—"}</span>
              </Field>
              <Field label="Surface">
                <span className="tabular-nums">
                  {formatArea(property.areaValue)}
                </span>
              </Field>
              <Field label="Rénovation">
                <span className="tabular-nums">
                  {property.renovationYear ?? "—"}
                </span>
              </Field>
              <Field label="Construction">
                <span className="tabular-nums">
                  {property.constructionYear ?? "—"}
                </span>
              </Field>
            </dl>
          </Section>

          <Separator />

          <Section title="Tarif">
            <dl className="grid grid-cols-2 gap-4">
              <Field label="À partir de">
                <span className="tabular-nums">
                  {formatPrice(
                    property.priceValue,
                    property.priceCurrency,
                    property.pricePeriod
                  )}
                </span>
              </Field>
              <Field label="Jusqu'à">
                <span className="tabular-nums">
                  {/* A missing max means there is no upper rate — not
                      that the rate is on request. */}
                  {property.priceMax === null
                    ? "—"
                    : formatPrice(
                        property.priceMax,
                        property.priceCurrency,
                        property.pricePeriod
                      )}
                </span>
              </Field>
            </dl>

            {property.priceHidden ? (
              <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <EyeOff aria-hidden="true" className="size-3.5 shrink-0" />
                Tarif masqué dans APIMO — visible en interne, à ne pas
                publier.
              </p>
            ) : null}
          </Section>

          <Separator />

          <Section title="Localisation">
            <dl className="grid grid-cols-2 gap-4">
              <Field label="Ville">{property.city}</Field>
              <Field label="Code postal">
                <span className="tabular-nums">{property.zipcode}</span>
              </Field>
              <Field label="Quartier">{property.district}</Field>
              <Field label="Pays">{property.country}</Field>
            </dl>
          </Section>

          <Separator />

          <Section title="Suivi">
            <dl className="grid grid-cols-2 gap-4">
              <Field label="Agent">
                <AgentAssignField
                  propertyId={property.id}
                  initialAgentId={property.agent?.id ?? null}
                  agents={assignableAgents}
                  canEdit={canAssignAgent}
                  fallback={
                    property.agent?.fullName ?? (
                      <span className="text-muted-foreground">
                        Non assigné
                      </span>
                    )
                  }
                />
              </Field>
              <Field label="Dernière synchronisation">
                <span className="tabular-nums">
                  {formatSyncedAt(property.updatedAt)}
                </span>
              </Field>
            </dl>
          </Section>
        </div>
      </div>

      {property.descriptionFr ? (
        <>
          <Separator />
          <Section title="Description">
            {/* APIMO's text carries its own line breaks; whitespace-pre-line
                keeps them without trusting the source enough to render HTML. */}
            <p className="text-muted-foreground max-w-prose text-sm leading-relaxed whitespace-pre-line">
              {property.descriptionFr}
            </p>
          </Section>
        </>
      ) : null}

      <Separator />

      {property.confidential ? (
        <Section title="Informations confidentielles">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Adresse">
              {[property.address, property.addressMore]
                .filter(Boolean)
                .join(", ") || "—"}
            </Field>
            <Field label="Commission">
              <span className="tabular-nums">
                {formatAmount(property.priceCommission, property.priceCurrency)}
              </span>
            </Field>
            <Field label="Honoraires">
              <span className="tabular-nums">
                {formatAmount(property.priceFees, property.priceCurrency)}
              </span>
            </Field>
            <Field label="Dépôt de garantie">
              <span className="tabular-nums">
                {formatAmount(property.priceDeposit, property.priceCurrency)}
              </span>
            </Field>
            <Field label="Propriétaire">
              {property.owner
                ? `${property.owner.firstName} ${property.owner.lastName}`
                : "—"}
            </Field>
            <Field label="Contact propriétaire">
              {property.owner?.email ?? property.owner?.phone ?? "—"}
            </Field>
            <Field label="IBAN">
              <span className="font-mono text-xs">
                {property.owner?.iban ?? "—"}
              </span>
            </Field>
            <Field label="Notes internes">{property.notes}</Field>
          </dl>
        </Section>
      ) : (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Lock aria-hidden="true" className="size-4" />
          <p>
            Les informations confidentielles ne sont visibles que pour l&apos;agent
            en charge de ce bien.
          </p>
        </div>
      )}
    </div>
  );
}
