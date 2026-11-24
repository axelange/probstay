import { redirect } from "next/navigation";
import { listContacts } from "@/features/contacts/services/contact-service";
import { DocumentPreviewLoader } from "@/features/documents/components/document-preview-loader";
import {
  listProperties,
  listPropertyOwnerNames,
} from "@/features/properties/services/property-service";
import { listRentals } from "@/features/rentals/services/rental-service";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Aperçu — PROBSTAY" };

export default async function DocumentPreviewPage() {
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

  // The concierge agreement is not driven by a rental: it is sold to an owner
  // for a residence, which may not even be one the agency manages. So it takes
  // a contact and, optionally, a property — both listed here rather than
  // fetched from the client, which has no session of its own.
  const [contacts, properties, ownerNames] = await Promise.all([
    listContacts(user),
    listProperties(),
    listPropertyOwnerNames(user),
  ]);

  const contactOptions = contacts.map((c) => ({
    id: c.id,
    label:
      [c.firstName, c.lastName].filter(Boolean).join(" ").trim() || "Sans nom",
    hint: c.kind === "COMPANY" ? "Société" : undefined,
  }));

  const propertyOptions = properties.map((p) => ({
    id: p.id,
    label: p.marketingName ?? p.city ?? "Bien",
    hint: p.marketingName ? (p.city ?? undefined) : undefined,
    // APIMO's type 1. The mandate starts from different defaults for a flat.
    isApartment: p.type === 1,
    // A property with an owner on file brings that owner to the mandate.
    ownerName: ownerNames[p.id],
  }));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="page-title">Aperçu</h2>
        <p className="text-muted-foreground text-sm">
          Choisissez un type de document et une location — l&apos;aperçu se
          pré-remplit, en temps réel.
        </p>
      </div>

      <DocumentPreviewLoader
        rentals={options}
        contacts={contactOptions}
        properties={propertyOptions}
      />
    </div>
  );
}
