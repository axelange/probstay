import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EditContactForm } from "@/features/contacts/components/edit-contact-form";
import {
  CONTACT_TYPES,
  contactTypeLabel,
} from "@/features/contacts/components/contact-type-labels";
import { getContactDetail } from "@/features/contacts/services/contact-service";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { ContactDocuments } from "@/features/contacts/components/contact-documents";
import {
  listContactDocuments,
  listContactRentals,
} from "@/features/contacts/services/contact-documents";
import { ContactRentals } from "@/features/contacts/components/contact-rentals";

export const metadata = { title: "Contact — BSTAY PRO" };

export default async function ContactDetailPage({
  // Next 16: params is a promise.
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // getContactDetail applies the same visibility filter as the list, so
  // a contact this user may not see is a 404 rather than a page they
  // reached by typing an id.
  const contact = await getContactDetail(id, user);
  if (!contact) notFound();

  const canEdit = hasPermission(user, "MANAGE_CONTACTS");
  const name =
    [contact.firstName, contact.lastName].filter(Boolean).join(" ") ||
    "Sans nom";
  const types = CONTACT_TYPES.filter((t) => contact.types.includes(t));

  const [documents, rentals] = await Promise.all([
    listContactDocuments(contact.id),
    listContactRentals(contact.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        {/* nativeButton={false}: this renders an <a>, not a <button>. */}
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/contacts" />}
        >
          <ArrowLeft aria-hidden="true" />
          Tous les contacts
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold tracking-tight">{name}</h2>
        {contact.kind === "COMPANY" ? (
          <Badge className="font-normal">Société</Badge>
        ) : null}
        {types.map((type) => (
          <Badge key={type} variant="secondary" className="font-normal">
            {contactTypeLabel(type)}
          </Badge>
        ))}
        {contact.apimoId === null ? (
          <Badge variant="outline" className="font-normal">
            BSTAY
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <EditContactForm
          contact={contact}
          canEdit={canEdit}
          canSeeBankingDetails={contact.canSeeBankingDetails}
        />

        <div className="space-y-8">
          <section className="space-y-3">
            <h3 className="text-sm font-medium">
              Pièces et justificatifs{" "}
              <span className="text-muted-foreground tabular-nums">
                ({documents.length})
              </span>
            </h3>
            <ContactDocuments
              contactId={contact.id}
              isCompany={contact.kind === "COMPANY"}
              documents={documents}
              canEdit={canEdit}
            />
          </section>

          {/* The bookings behind the contact, both sides of them, each one a
              link back — a name in the address book is rarely what someone
              came here for. */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium">
              Locations{" "}
              <span className="text-muted-foreground tabular-nums">
                ({rentals.length})
              </span>
            </h3>
            <ContactRentals rentals={rentals} />
          </section>

        <div className="space-y-3">
          <h3 className="text-sm font-medium">
            Biens{" "}
            <span className="text-muted-foreground tabular-nums">
              ({contact.properties.length})
            </span>
          </h3>

          {contact.properties.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-sm">
              Aucun bien rattaché à ce contact.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {contact.properties.map((property) => (
                <li key={property.id}>
                  <Link
                    href={`/properties/${property.id}`}
                    className="hover:bg-accent flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {property.marketingName ?? property.city ?? "Sans nom"}
                      </span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {property.city}
                      </span>
                    </span>
                    <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                      {property.reference}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Separator />

          <p className="text-muted-foreground text-xs">
            {contact.apimoId === null
              ? "Contact créé dans BSTAY PRO. Aucune synchronisation ne le modifie."
              : `Synchronisé depuis APIMO (réf. ${contact.apimoId}).`}
          </p>
        </div>
        </div>
      </div>
    </div>
  );
}
