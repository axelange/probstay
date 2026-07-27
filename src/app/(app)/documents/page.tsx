import { redirect } from "next/navigation";
import { DocumentPreviewLoader } from "@/features/documents/components/document-preview-loader";
import { listRentals } from "@/features/rentals/services/rental-service";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Documents — BSTAY PRO" };

export default async function DocumentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // The rentals this user may see become the pre-fill source for documents.
  const rentals = await listRentals(user);
  const options = rentals.map((r) => {
    const tenant = r.tenants[0]?.contact;
    const who = tenant
      ? [tenant.firstName, tenant.lastName].filter(Boolean).join(" ")
      : "—";
    const villa = r.property.marketingName ?? r.property.city ?? "Location";
    return { id: r.id, label: `${villa} · ${who}` };
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">Documents</h2>
        <p className="text-muted-foreground text-sm">
          Choisissez un type de document et une location — l&apos;aperçu se
          pré-remplit, en temps réel.
        </p>
      </div>

      <DocumentPreviewLoader rentals={options} />
    </div>
  );
}
