import { redirect } from "next/navigation";
import { ImportInvoiceDialog } from "@/features/invoices/components/import-invoice-dialog";
import { InvoicesList } from "@/features/invoices/components/invoices-list";
import { NewFundCallDialog } from "@/features/invoices/components/new-fund-call-dialog";
import {
  canManageInvoices,
  canReadAllInvoices,
  listBillableContacts,
  listInvoiceableRentals,
  listInvoices,
} from "@/features/invoices/services/invoice-service";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Avis de paiement — PROBSTAY" };

/**
 * The second register: what is asked of a tenant for a booking.
 *
 * Its own page rather than a filter on the invoices, because it is its own
 * series and its own register — and because nothing here is a facture, which
 * the wording has to keep saying.
 */
export default async function FundCallsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canReadAllInvoices(user)) redirect("/");
  const canCreate = canManageInvoices(user);

  const [fundCalls, contacts, rentals] = await Promise.all([
    listInvoices(user, "FUND_CALL"),
    canCreate ? listBillableContacts() : Promise.resolve([]),
    canCreate ? listInvoiceableRentals() : Promise.resolve([]),
  ]);

  const outstanding = fundCalls.filter((i) => i.status === "ISSUED").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="page-title">
            Avis de paiement
          </h2>
          <p className="text-muted-foreground text-sm">
            Acomptes, soldes et dépôts de garantie des locations. Série et
            registre distincts des factures.
            {outstanding > 0 ? ` ${outstanding} en attente.` : ""}
          </p>
        </div>
        {canCreate ? (
          <div className="flex flex-wrap gap-2">
            <ImportInvoiceDialog
              family="FUND_CALL"
              contacts={contacts}
              rentals={rentals}
            />
            <NewFundCallDialog rentals={rentals} />
          </div>
        ) : null}
      </div>

      <InvoicesList
        invoices={fundCalls}
        canManage={canCreate}
        family="FUND_CALL"
      />
    </div>
  );
}
