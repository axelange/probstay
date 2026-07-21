import { notFound, redirect } from "next/navigation";
import { TouristTaxSettings } from "@/features/settings/components/tourist-tax-settings";
import { listCityTaxRates } from "@/features/settings/services/tourist-tax-service";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata = { title: "Paramètres — BSTAY PRO" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Settings is admin territory; the nav filters the link, but the route
  // is reachable by typing it, so it is checked here too. notFound()
  // rather than a redirect, so the page's existence isn't confirmed.
  const canEdit = hasPermission(user, "MANAGE_USERS");
  if (!canEdit) notFound();

  const cities = await listCityTaxRates();

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
          <h3 className="text-sm font-medium">Taxes de séjour</h3>
          <p className="text-muted-foreground text-sm">
            Montant par personne et par nuit, selon la commune du bien. La
            liste des villes vient des biens. Révisé en général une fois par
            an.
          </p>
        </div>

        <TouristTaxSettings cities={cities} canEdit={canEdit} />
      </section>
    </div>
  );
}
