"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Stamp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { issueInvoiceAction } from "@/features/invoices/actions/issue-invoice";
import type { InvoiceListItem } from "@/features/invoices/services/invoice-service";

/** Today in Paris. `toISOString` would give UTC, which is yesterday at 00:30. */
const TODAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" });

/**
 * Validating the number.
 *
 * A deliberate second step rather than a button on the row: this is the moment
 * the invoice takes a number out of the series and stops being editable, and
 * it cannot be undone — a mistake afterwards is a cancellation, which stays
 * visible in the register for ever. The date is asked for because an invoice
 * is not always issued the day it is drafted.
 */
export function IssueInvoiceDialog({ invoice }: { invoice: InvoiceListItem }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [issuedOn, setIssuedOn] = React.useState(() =>
    TODAY.format(new Date())
  );
  const [isPending, startTransition] = React.useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await issueInvoiceAction({ id: invoice.id, issuedOn });
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      // The PDF may have failed while the invoice itself is perfectly valid —
      // said plainly rather than dressed as a failure, since the number is
      // spent either way.
      if (result.warning) toast.warning(result.warning);
      else toast.success(`Facture ${result.reference} émise.`);

      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Stamp aria-hidden="true" />
            Émettre
          </Button>
        }
      />

      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Émettre la facture</DialogTitle>
            <DialogDescription>
              Le prochain numéro de la série lui sera attribué. Elle ne pourra
              plus être modifiée ni supprimée — seulement annulée.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="issue-date">Date d&apos;émission</Label>
              <Input
                id="issue-date"
                type="date"
                value={issuedOn}
                onChange={(event) => setIssuedOn(event.target.value)}
                disabled={isPending}
              />
            </div>

            <div className="text-muted-foreground space-y-1 rounded-md border p-3 text-xs">
              <p>
                {invoice.clientName}
                {invoice.description ? ` — ${invoice.description}` : ""}
              </p>
              <p>
                {invoice.source === "UPLOADED"
                  ? "Le fichier importé sera conservé tel quel."
                  : "Le PDF sera généré à l'émission."}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isPending || issuedOn === ""}>
              {isPending ? "Émission…" : "Émettre"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
