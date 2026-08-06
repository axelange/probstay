import { redirect } from "next/navigation";
import { PropertiesList } from "@/features/properties/components/properties-list";
import { listProperties } from "@/features/properties/services/property-service";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Biens — BSTAY PRO" };

export default async function PropertiesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const properties = await listProperties();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">Biens</h2>
        <p className="text-muted-foreground text-sm">
          Synchronisés depuis APIMO — lecture seule.
        </p>
      </div>

      {/* The preference seeds the Mandat filter; it does not withhold rows,
          so the control still shows what is applied and can be changed. */}
      <PropertiesList
        data={properties}
        mandatePreference={user.mandatePreference}
      />
    </div>
  );
}
