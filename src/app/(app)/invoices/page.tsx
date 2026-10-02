import { redirect } from "next/navigation";
import { ImportInvoiceDialog } from "@/features/invoices/components/import-invoice-dialog";
import { InvoicesList } from "@/features/invoices/components/invoices-list";
import { NewInvoiceDialog } from "@/features/invoices/components/new-invoice-dialog";
import {
  canManageInvoices,
  canReadAllInvoices,
  listBillableContacts,
  listInvoiceableRentals,
  listInvoices,
} from "@/features/invoices/services/invoice-service";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Factures — PROBSTAY" };

export default async function InvoicesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Reading is either financial permission; issuing is MANAGE_INVOICES alone.
  // The navigation hides the page from anyone holding neither, but a hidden
  // link is not access control — this is.
  if (!canReadAllInvoices(user)) redirect("/");
  const canCreate = canManageInvoices(user);

  const [invoices, contacts, rentals] = await Promise.all([
    listInvoices(user, "FEE"),
    canCreate ? listBillableContacts() : Promise.resolve([]),
    canCreate ? listInvoiceableRentals() : Promise.resolve([]),
  ]);

  const outstanding = invoices.filter((i) => i.status === "ISSUED").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="page-title">
            Factures d&apos;honoraires
          </h2>
          <p className="text-muted-foreground text-sm">
            Conciergerie et co-agence — les honoraires de l&apos;agence, dans
            leur propre série.
            {outstanding > 0 ? ` ${outstanding} en attente de règlement.` : ""}
          </p>
        </div>
        {canCreate ? (
          <div className="flex flex-wrap gap-2">
            <ImportInvoiceDialog
              family="FEE"
              contacts={contacts}
              rentals={rentals}
            />
            <NewInvoiceDialog contacts={contacts} />
          </div>
        ) : null}
      </div>

      <InvoicesList invoices={invoices} canManage={canCreate} family="FEE" />
    </div>
  );
}
