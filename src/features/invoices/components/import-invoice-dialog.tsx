"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { importInvoiceAction } from "@/features/invoices/actions/import-invoice";
import {
  INVOICE_FAMILY_LABEL,
  roundToCents,
} from "@/features/invoices/reference";
import type { InvoiceFamily } from "@/generated/prisma/enums";
import type {
  BillableContact,
  InvoiceableRental,
} from "@/features/invoices/services/invoice-service";
import { Money } from "@/features/rentals/components/money";

const DEFAULT_VAT_RATE = "20";

/**
 * Recording an invoice drawn up elsewhere.
 *
 * No lines: the detail is in the file being imported, and re-typing it would
 * create a second version of a document that already exists. What is asked for
 * is what the register needs — who, what for, how much — and the amount is
 * read off the document rather than computed.
 *
 * It lands as a draft like any other, so it takes its number at issue, from
 * the same series. The register reads as one sequence whatever produced each
 * document.
 */
export function ImportInvoiceDialog({
  family,
  contacts,
  rentals,
}: {
  family: InvoiceFamily;
  contacts: BillableContact[];
  rentals: InvoiceableRental[];
}) {
  const router = useRouter();
  const showVat = family === "FEE";
  const [open, setOpen] = React.useState(false);
  const [clientId, setClientId] = React.useState("");
  const [rentalId, setRentalId] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [dueOn, setDueOn] = React.useState("");
  const [vatRate, setVatRate] = React.useState(DEFAULT_VAT_RATE);
  const [totalHt, setTotalHt] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function reset() {
    setClientId("");
    setRentalId("");
    setDescription("");
    setDueOn("");
    setVatRate(DEFAULT_VAT_RATE);
    setTotalHt("");
    setNotes("");
    setFile(null);
  }

  const ht = Number(totalHt.replace(",", ".")) || 0;
  const rate = Number(vatRate.replace(",", ".")) || 0;
  const vat = roundToCents((ht * rate) / 100);

  const canSubmit = clientId !== "" && file !== null && ht > 0;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.set("family", family);
    formData.set("clientId", clientId);
    formData.set("rentalId", rentalId);
    formData.set("description", description);
    formData.set("dueOn", dueOn);
    formData.set("vatRate", String(rate));
    formData.set("totalHt", String(ht));
    formData.set("notes", notes);
    formData.set("file", file);

    startTransition(async () => {
      const result = await importInvoiceAction(formData);
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      toast.success("Facture importée en brouillon.");
      reset();
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <Upload aria-hidden="true" />
            Importer
          </Button>
        }
      />

      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>
              Importer — {INVOICE_FAMILY_LABEL[family].toLowerCase()}
            </DialogTitle>
            <DialogDescription>
              Pour un document édité ailleurs. Il entre en brouillon et recevra
              un numéro de la même série à l&apos;émission.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[65vh] space-y-4 overflow-y-auto py-4">
            <div className="space-y-2">
              <Label htmlFor="import-file">Fichier PDF *</Label>
              <Input
                id="import-file"
                type="file"
                accept="application/pdf"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                disabled={isPending}
              />
              <p className="text-muted-foreground text-xs">
                10 Mo maximum. C&apos;est ce document qui fait foi — rien ne
                sera généré par-dessus.
              </p>
            </div>


            <div className="space-y-2">
              <Label htmlFor="import-description">Description</Label>
              <Input
                id="import-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Objet de la facture"
                disabled={isPending}
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="import-client">Client *</Label>
              <Combobox
                id="import-client"
                value={clientId || null}
                onValueChange={setClientId}
                options={contacts.map((contact) => ({
                  value: contact.id,
                  label: [contact.firstName, contact.lastName]
                    .filter(Boolean)
                    .join(" "),
                  ...(contact.email ? { hint: contact.email } : {}),
                }))}
                placeholder="Rechercher un contact…"
                emptyLabel="Aucun contact ne correspond."
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="import-rental">Location (facultatif)</Label>
              <Combobox
                id="import-rental"
                value={rentalId || null}
                onValueChange={setRentalId}
                options={rentals.map((rental) => ({
                  value: rental.id,
                  label: `${rental.property}${rental.tenant ? ` · ${rental.tenant}` : ""}`,
                  hint: String(rental.reference),
                }))}
                placeholder="Rattacher à une réservation…"
                emptyLabel="Aucune location ne correspond."
                disabled={isPending}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="import-ht">
                  {showVat ? "Montant HT *" : "Montant *"}
                </Label>
                <Input
                  id="import-ht"
                  type="number"
                  min={0}
                  step="0.01"
                  value={totalHt}
                  onChange={(event) => setTotalHt(event.target.value)}
                  disabled={isPending}
                  className="tabular-nums"
                />
              </div>
              {showVat ? (
                <div className="space-y-2">
                  <Label htmlFor="import-vat">TVA (%)</Label>
                  <Input
                    id="import-vat"
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    value={vatRate}
                    onChange={(event) => setVatRate(event.target.value)}
                    disabled={isPending}
                    className="tabular-nums"
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="import-due">Échéance</Label>
                <Input
                  id="import-due"
                  type="date"
                  value={dueOn}
                  onChange={(event) => setDueOn(event.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>

            {showVat ? (
              <p className="text-muted-foreground text-sm tabular-nums">
                TVA <Money value={vat} /> · Total TTC{" "}
                <Money value={roundToCents(ht + vat)} />
              </p>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="import-notes">Observations</Label>
              <Input
                id="import-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Note interne"
                disabled={isPending}
                autoComplete="off"
              />
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
            <Button type="submit" disabled={isPending || !canSubmit}>
              {isPending ? "Import…" : "Importer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
