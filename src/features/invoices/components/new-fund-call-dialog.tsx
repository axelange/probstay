"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { composeRequestsAction } from "@/features/invoices/actions/compose-requests";
import { createFundCallAction } from "@/features/invoices/actions/new-fund-call";
import type { ComposedRequest } from "@/features/invoices/services/compose-requests";
import type { InvoiceableRental } from "@/features/invoices/services/invoice-service";
import { Money } from "@/features/rentals/components/money";

/**
 * Opening a payment request: which booking, and which of its sums.
 *
 * The sums are read from the dossier the moment a booking is picked, and each
 * is shown broken down — a balance is the rent, the services billed on top and
 * the taxe de séjour, less the acompte once it is in. Choosing one writes the
 * whole composition, so the draft opens as the document it will be rather than
 * as an empty page an agent has to fill.
 */
export function NewFundCallDialog({
  rentals,
}: {
  rentals: InvoiceableRental[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [rentalId, setRentalId] = React.useState("");
  const [isPending, startTransition] = React.useTransition();

  // Composed for the selected booking, and only for it. The booking they
  // belong to travels with them, so figures fetched for one that has since
  // been changed are simply not shown.
  const [composed, setComposed] = React.useState<{
    rentalId: string;
    requests: ComposedRequest[];
  }>({ rentalId: "", requests: [] });

  React.useEffect(() => {
    if (rentalId === "") return;
    let current = true;
    void composeRequestsAction({ rentalId }).then((requests) => {
      if (current) setComposed({ rentalId, requests });
    });
    return () => {
      current = false;
    };
  }, [rentalId]);

  const requests = composed.rentalId === rentalId ? composed.requests : [];
  const loading = rentalId !== "" && composed.rentalId !== rentalId;

  function create(request: ComposedRequest) {
    startTransition(async () => {
      const result = await createFundCallAction({
        rentalId,
        head: request.head,
      });
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      setOpen(false);
      setRentalId("");
      router.push(`/payment-requests/${result.id}`);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setRentalId("");
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus aria-hidden="true" />
            Nouvel avis de paiement
          </Button>
        }
      />

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvel avis de paiement</DialogTitle>
          <DialogDescription>
            L&apos;objet et les lignes sont repris du dossier — réservation,
            bien, dates, et le détail des montants. Tout reste modifiable dans
            le brouillon.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto py-4">
          <div className="space-y-2">
            <Label htmlFor="fund-call-rental">Réservation *</Label>
            <Combobox
              id="fund-call-rental"
              value={rentalId || null}
              onValueChange={setRentalId}
              options={rentals.map((rental) => ({
                value: rental.id,
                label: `${rental.property}${rental.tenant ? ` · ${rental.tenant}` : ""}`,
                hint: String(rental.reference),
              }))}
              placeholder="Rechercher une réservation…"
              emptyLabel="Aucune réservation ne correspond."
              disabled={isPending}
            />
          </div>

          {loading ? (
            <p className="text-muted-foreground text-sm">Lecture du dossier…</p>
          ) : null}

          {rentalId !== "" && !loading && requests.length === 0 ? (
            <p className="text-muted-foreground rounded-md border border-dashed px-3 py-6 text-center text-sm">
              Aucun montant n&apos;est renseigné sur cette réservation.
            </p>
          ) : null}

          {requests.map((request) => (
            <button
              key={request.head}
              type="button"
              onClick={() => create(request)}
              disabled={isPending}
              className="hover:bg-accent w-full rounded-lg border p-3 text-left transition-colors disabled:opacity-50"
            >
              <span className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium">{request.shortLabel}</span>
                <span className="tabular-nums">
                  <Money value={request.total} />
                </span>
              </span>
              <span className="text-muted-foreground mt-1 block text-xs">
                {request.lines.map((line, index) => (
                  <span key={index} className="flex justify-between gap-3">
                    <span className="truncate">{line.label}</span>
                    <span className="shrink-0 tabular-nums">
                      <Money value={line.unitPrice} />
                    </span>
                  </span>
                ))}
              </span>
            </button>
          ))}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
