import { Mail, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ContactListItem } from "@/features/contacts/services/contact-service";
import {
  CONTACT_TYPES,
  contactTypeLabel,
} from "@/features/contacts/components/contact-type-labels";
import { specialtyLabels } from "@/features/contacts/components/contact-specialty-labels";

/**
 * Rows rather than a `<table>`, matching the properties and users lists.
 *
 * A Server Component: nothing here is interactive, so shipping it to the
 * browser would buy nothing.
 */
export function ContactsList({ contacts }: { contacts: ContactListItem[] }) {
  if (contacts.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm">
        Aucun contact.
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-lg border">
      {contacts.map((contact) => {
        const name =
          [contact.firstName, contact.lastName].filter(Boolean).join(" ") ||
          "Sans nom";

        // Kept in enum order so the badges don't reshuffle between rows.
        const types = CONTACT_TYPES.filter((t) => contact.types.includes(t));
        const trades = specialtyLabels(
          contact.specialties,
          contact.otherSpecialty
        );

        return (
          <li key={contact.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm">
            <div className="min-w-0 flex-1">
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="truncate font-medium">{name}</span>
                {/* The trade sits with the name, not among the type
                    badges: "Plombier" is what you scan for when you need
                    one, while "Prestataire" only says how they relate
                    to us. */}
                {trades.length > 0 ? (
                  <span className="text-muted-foreground truncate text-xs">
                    {trades.join(" · ")}
                  </span>
                ) : null}
              </span>

              <span className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                {contact.email ? (
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <Mail aria-hidden="true" className="size-3 shrink-0" />
                    <span className="truncate">{contact.email}</span>
                  </span>
                ) : null}

                {contact.phone ? (
                  <span className="inline-flex items-center gap-1">
                    <Phone aria-hidden="true" className="size-3 shrink-0" />
                    <span className="tabular-nums">{contact.phone}</span>
                  </span>
                ) : null}

                {/* Missing contact details are stated rather than left
                    blank: for an owner it is a gap someone has to close,
                    not a neutral absence. */}
                {!contact.email && !contact.phone ? (
                  <span>Aucune coordonnée</span>
                ) : null}
              </span>
            </div>

            {contact._count.properties > 0 ? (
              <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                {contact._count.properties === 1
                  ? "1 bien"
                  : `${contact._count.properties} biens`}
              </span>
            ) : null}

            <div className="flex shrink-0 flex-wrap gap-1">
              {types.map((type) => (
                <Badge key={type} variant="secondary" className="font-normal">
                  {contactTypeLabel(type)}
                </Badge>
              ))}
              {/* Origin matters: an APIMO-sourced contact is overwritten
                  by the next sync, a BSTAY one is not. */}
              {contact.apimoId === null ? (
                <Badge variant="outline" className="font-normal">
                  BSTAY
                </Badge>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
