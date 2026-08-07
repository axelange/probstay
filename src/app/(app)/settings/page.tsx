import { notFound, redirect } from "next/navigation";
import { AgencySettings } from "@/features/settings/components/agency-settings";
import { TouristTaxSettings } from "@/features/settings/components/tourist-tax-settings";
import { listCityTaxRates } from "@/features/settings/services/tourist-tax-service";
import { getAgency } from "@/features/documents/agency";
import { agencySchema } from "@/features/settings/schemas/agency-schema";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata = { title: "Paramètres — BSTAY PRO" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Settings is admin territory; the nav filters the link, but the route
  // is reachable by typing it, so it is checked here too. notFound()
  // rather than a redirect, so the page's existence isn't confirmed.
  const canEditTax = hasPermission(user, "MANAGE_USERS");
  const canEditAgency = hasPermission(user, "MANAGE_AGENCY");
  if (!canEditTax && !canEditAgency) notFound();

  const [cities, agency] = await Promise.all([listCityTaxRates(), getAgency()]);

  // The row carries an id, a timestamp and who last touched it; the form takes
  // only the editable lines. Picked through the schema so the two cannot drift:
  // a field added to one without the other stops the build.
  const agencyValues = agencySchema.parse(agency);

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">Paramètres</h2>
        <p className="text-muted-foreground text-sm">
          Configuration de l&apos;application.
        </p>
      </div>

      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">Agence</h3>
          <p className="text-muted-foreground text-sm">
            Ce que les documents impriment sur l&apos;agence elle-même. Une
            correction ici s&apos;applique au prochain document généré ; ceux
            déjà émis gardent le texte qu&apos;ils portent.
          </p>
        </div>

        <AgencySettings agency={agencyValues} canEdit={canEditAgency} />
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">Taxes de séjour</h3>
          <p className="text-muted-foreground text-sm">
            Montant par personne et par nuit, selon la commune du bien. La
            liste des villes vient des biens. Révisé en général une fois par
            an.
          </p>
        </div>

        <TouristTaxSettings cities={cities} canEdit={canEditTax} />
      </section>
    </div>
  );
}
