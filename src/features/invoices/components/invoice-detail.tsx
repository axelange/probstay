import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAgency } from "@/features/documents/agency";
import { documentDownloadHref } from "@/features/documents/download";
import { InvoiceEditor } from "@/features/invoices/components/invoice-editor";
import {
  INVOICE_FAMILY_LABEL,
  INVOICE_SOURCE_LABEL,
  invoiceStatusLabel,
} from "@/features/invoices/reference";
import {
  canManageInvoices,
  canReadAllInvoices,
  getInvoice,
  listBillableContacts,
  listInvoiceableRentals,
} from "@/features/invoices/services/invoice-service";
import { listAvailableProducts } from "@/features/invoices/services/product-service";
import { getCurrentUser } from "@/lib/auth";
import type { InvoiceFamily } from "@/generated/prisma/enums";

/**
 * One document's page, whichever family it belongs to.
 *
 * The two registers are separate but the document is composed the same way, so
 * both routes render this. The family decides the wording and the way back;
 * everything else — the editor, the preview, the read-only state once issued —
 * is common ground.
 */
export async function InvoiceDetail({
  id,
  family,
}: {
  id: string;
  family: InvoiceFamily;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // No permission check of its own: `getInvoice` applies the visibility rule,
  // so an agent may open a document raised against a booking they handle and
  // nobody else's.
  const invoice = await getInvoice(id, user);
  if (!invoice) notFound();
  // Reached through the other register's route: the same document, filed in
  // the wrong place, so send it to its own.
  if (invoice.family !== family) {
    redirect(invoice.family === "FUND_CALL" ? `/payment-requests/${id}` : `/invoices/${id}`);
  }

  const canManage = canManageInvoices(user);
  const [agency, contacts, rentals, products] = await Promise.all([
    getAgency(),
    canManage ? listBillableContacts() : Promise.resolve([]),
    canManage ? listInvoiceableRentals() : Promise.resolve([]),
    canManage ? listAvailableProducts(user) : Promise.resolve([]),
  ]);

  const draft = invoice.status === "DRAFT";
  // An agent has no register to go back to: they came from the booking.
  const canReadRegister = canManage || canReadAllInvoices(user);
  const back = canReadRegister
    ? family === "FUND_CALL"
      ? "/payment-requests"
      : "/invoices"
    : invoice.rentalId
      ? `/rentals/${invoice.rentalId}`
      : "/";

  return (
    <div className="space-y-5">
      <div>
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href={back} />}
        >
          <ArrowLeft aria-hidden="true" />
          {canReadRegister
            ? family === "FUND_CALL"
              ? "Tous les avis de paiement"
              : "Toutes les factures"
            : "Retour à la location"}
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="page-title tabular-nums">
              {invoice.reference ?? "Brouillon"}
            </h2>
            <Badge
              variant={draft ? "outline" : "secondary"}
              className="font-normal"
            >
              {invoiceStatusLabel(invoice.status, invoice.family)}
            </Badge>
            {invoice.source === "UPLOADED" ? (
              <Badge variant="outline" className="font-normal">
                {INVOICE_SOURCE_LABEL.UPLOADED}
              </Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground text-sm">
            {draft
              ? `${INVOICE_FAMILY_LABEL[family]} — le numéro sera attribué à l'émission. Tout est modifiable jusque-là.`
              : `${INVOICE_FAMILY_LABEL[family]} — document émis, son contenu est définitif.`}
          </p>
        </div>

        {invoice.hasPdf ? (
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<a href={documentDownloadHref("invoice", invoice.id)} />}
          >
            <Download aria-hidden="true" />
            Télécharger
          </Button>
        ) : null}
      </div>

      {/* An imported document has no lines to compose and no template to
          render — the file that came with it is the document, and it is
          downloaded rather than previewed. */}
      {invoice.source === "UPLOADED" ? (
        <div className="text-muted-foreground rounded-lg border p-4 text-sm">
          <p>Document édité en dehors du logiciel. Le fichier importé fait foi.</p>
          <p className="mt-1">
            {invoice.clientName} · {invoice.description ?? "sans objet"}
          </p>
        </div>
      ) : (
        <InvoiceEditor
          invoice={invoice}
          agency={agency}
          contacts={contacts}
          rentals={rentals}
          products={products}
          canManage={canManage}
        />
      )}
    </div>
  );
}
