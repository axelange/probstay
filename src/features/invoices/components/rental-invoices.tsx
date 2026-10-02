import Link from "next/link";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { documentDownloadHref } from "@/features/documents/download";
import {
  INVOICE_FAMILY_SHORT,
  invoiceStatusLabel,
} from "@/features/invoices/reference";
import type { InvoiceListItem } from "@/features/invoices/services/invoice-service";
import { Money } from "@/features/rentals/components/money";
import { formatDate } from "@/features/rentals/components/rental-labels";

/**
 * What has been billed on this booking, on the booking's own page.
 *
 * Read-only, and deliberately so: raising and issuing belong to whoever holds
 * MANAGE_INVOICES, in the registers. What an agent needs here is the answer to
 * "has the balance been asked for, and has it been paid" — the question they
 * are the one being asked when the client rings.
 */
export function RentalInvoices({ invoices }: { invoices: InvoiceListItem[] }) {
  if (invoices.length === 0) return null;

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium">Facturation</h3>
      <ul className="divide-y rounded-lg border">
        {invoices.map((invoice) => (
          <li
            key={invoice.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5 text-sm"
          >
            <FileText
              aria-hidden="true"
              className="text-muted-foreground size-4 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium tabular-nums">
                {invoice.reference ?? "Brouillon"}
                <span className="text-muted-foreground font-normal">
                  {" · "}
                  {INVOICE_FAMILY_SHORT[invoice.family]}
                </span>
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {invoice.description?.split("\n")[0] ?? invoice.clientName}
                {invoice.issuedOn ? ` · ${formatDate(invoice.issuedOn)}` : ""}
              </p>
            </div>

            <span className="shrink-0 text-xs tabular-nums">
              <Money value={invoice.totalTtc} />
            </span>

            <Badge
              variant={invoice.status === "PAID" ? "secondary" : "outline"}
              className="shrink-0 font-normal"
            >
              {invoiceStatusLabel(invoice.status, invoice.family)}
            </Badge>

            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                nativeButton={false}
                render={
                  <Link
                    href={
                      invoice.family === "FUND_CALL"
                        ? `/payment-requests/${invoice.id}`
                        : `/invoices/${invoice.id}`
                    }
                  />
                }
              >
                Ouvrir
              </Button>
              {invoice.hasPdf ? (
                <Button
                  variant="ghost"
                  size="sm"
                  nativeButton={false}
                  render={
                    <a href={documentDownloadHref("invoice", invoice.id)} />
                  }
                >
                  PDF
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
