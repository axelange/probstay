import { PropertiesTable } from "@/features/properties/components/properties-table";
import { listProperties } from "@/features/properties/services/property-service";

export const metadata = { title: "Biens — BSTAY PRO" };

export default async function PropertiesPage() {
  const properties = await listProperties();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">Biens</h2>
        <p className="text-muted-foreground text-sm">
          Synchronisés depuis APIMO — lecture seule.
        </p>
      </div>

      <PropertiesTable data={properties} />
    </div>
  );
}
