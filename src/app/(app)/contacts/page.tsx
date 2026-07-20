import { redirect } from "next/navigation";
import { ContactsList } from "@/features/contacts/components/contacts-list";
import { CreateContactDialog } from "@/features/contacts/components/create-contact-dialog";
import { listContacts } from "@/features/contacts/services/contact-service";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata = { title: "Contacts — BSTAY PRO" };

export default async function ContactsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // No permission gate on the page itself: Agents are meant to reach
  // Contacts, they simply see fewer of them. The narrowing happens in
  // listContacts, which mirrors the RLS policies — an Agent with no
  // clients and no assigned properties gets an empty list, not a 404.
  const contacts = await listContacts(user);
  const canCreate = hasPermission(user, "MANAGE_CONTACTS");

  const owners = contacts.filter((c) => c.types.includes("OWNER")).length;
  const missingDetails = contacts.filter((c) => !c.email && !c.phone).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">Contacts</h2>
          <p className="text-muted-foreground text-sm">
            {contacts.length === 1
              ? "1 contact"
              : `${contacts.length} contacts`}
            {owners > 0 ? `, dont ${owners} propriétaires` : ""}.
            {/* Surfaced rather than buried: an owner with no way to reach
                them is a gap someone has to close, and it is invisible
                in a list of 46. */}
            {missingDetails > 0
              ? ` ${missingDetails} sans aucune coordonnée.`
              : ""}
          </p>
        </div>

        {canCreate ? <CreateContactDialog /> : null}
      </div>

      <ContactsList contacts={contacts} />
    </div>
  );
}
