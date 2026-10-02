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
import { createDraftAction } from "@/features/invoices/actions/draft-invoice";
import type { BillableContact } from "@/features/invoices/services/invoice-service";

const DEFAULT_VAT_RATE = 20;

function contactLabel(contact: BillableContact): string {
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
  return contact.email ? `${name} — ${contact.email}` : name;
}

/**
 * Opening a draft: who is billed, and what for.
 *
 * Deliberately only those two. Everything else — the lines, the wording, the
 * dates — is composed on the draft's own page, where the document is visible
 * beside the form. Asking for it all in a dialog first would mean writing an
 * invoice blind and only then seeing what it looks like.
 */
export function NewInvoiceDialog({
  contacts,
}: {
  contacts: BillableContact[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [clientId, setClientId] = React.useState("");
  const [isPending, startTransition] = React.useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createDraftAction({
        family: "FEE",
        clientId,
        rentalId: "",
        description: "",
        dueOn: "",
        vatRate: DEFAULT_VAT_RATE,
        notes: "",
        lines: [],
      });

      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      setOpen(false);
      setClientId("");
      // Straight to the draft, which is where an invoice is actually written.
      router.push(`/invoices/${result.id}`);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setClientId("");
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus aria-hidden="true" />
            Nouvelle facture
          </Button>
        }
      />

      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Nouvelle facture</DialogTitle>
            <DialogDescription>
              Un brouillon est ouvert, sans numéro. Vous écrirez son objet et
              ses lignes avec l&apos;aperçu du document sous les yeux.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-invoice-client">Client *</Label>
              <Combobox
                id="new-invoice-client"
                value={clientId || null}
                onValueChange={setClientId}
                options={contacts.map((contact) => ({
                  value: contact.id,
                  label: contactLabel(contact),
                  ...(contact.email ? { hint: contact.email } : {}),
                }))}
                placeholder="Rechercher un contact…"
                emptyLabel="Aucun contact ne correspond."
                disabled={isPending}
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
            <Button type="submit" disabled={isPending || clientId === ""}>
              {isPending ? "Création…" : "Ouvrir le brouillon"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
