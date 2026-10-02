"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateDraftAction } from "@/features/invoices/actions/draft-invoice";
import { composeRequestsAction } from "@/features/invoices/actions/compose-requests";
import {
  billingAddress,
  billingName,
} from "@/features/invoices/billing-identity";
import {
  buildInvoiceDocument,
  type InvoiceAgency,
} from "@/features/invoices/build-invoice-document";
import { InvoicePreviewLoader } from "@/features/invoices/components/invoice-preview-loader";
import { IssueInvoiceDialog } from "@/features/invoices/components/issue-invoice-dialog";
import { invoiceTotals } from "@/features/invoices/reference";
import type {
  BillableContact,
  InvoiceableRental,
  InvoiceListItem,
} from "@/features/invoices/services/invoice-service";
import type { ComposedRequest } from "@/features/invoices/services/compose-requests";
import { Money } from "@/features/rentals/components/money";

/** A date as an <input type="date"> wants it, in Paris. */
const DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" });

/**
 * How long the preview waits after a keystroke.
 *
 * Rendering a PDF is not free, and re-doing it on every character would make
 * typing stutter. Long enough to let a word be typed, short enough that the
 * page still feels like it is following along.
 */
const PREVIEW_DELAY = 400;

type DraftLine = {
  label: string;
  description: string;
  quantity: string;
  unitPrice: string;
  /** Where it came from, when it came from the catalogue. */
  productId: string;
};

const EMPTY_LINE: DraftLine = {
  label: "",
  description: "",
  quantity: "1",
  unitPrice: "",
  productId: "",
};

/** What the catalogue offers a line. */
export type CatalogOption = {
  id: string;
  label: string;
  description: string | null;
  unitPrice: number;
  /** Mentions carried onto the document's observations when it is used. */
  notes: string | null;
};

function contactLabel(contact: BillableContact): string {
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
  return contact.email ? `${name} — ${contact.email}` : name;
}

/**
 * Composing an invoice, with the document beside it.
 *
 * The form and the preview read the same values through the same builder the
 * server uses, so the page is not showing an impression of the invoice — it is
 * showing the invoice. That is the point of editing here rather than in a
 * dialog: the figures, the wording and the layout are checked together, before
 * a number is spent on them.
 *
 * Read-only once issued. The fields stay visible because they are still what
 * the document says, but nothing can be changed — the database refuses it too,
 * so this is the polite half of a rule enforced underneath.
 */
export function InvoiceEditor({
  invoice,
  agency,
  contacts,
  rentals,
  products,
  canManage,
}: {
  invoice: InvoiceListItem;
  agency: InvoiceAgency;
  contacts: BillableContact[];
  rentals: InvoiceableRental[];
  products: CatalogOption[];
  canManage: boolean;
}) {
  const router = useRouter();
  const editable = canManage && invoice.status === "DRAFT";
  // A fund call carries no VAT — see the note in build-invoice-document.
  const showVat = invoice.family === "FEE";

  const initial = React.useMemo(
    () => ({
      clientId: invoice.clientId,
      rentalId: invoice.rentalId ?? "",
      title: invoice.title ?? "",
      description: invoice.description ?? "",
      dueOn: invoice.dueOn ? DAY.format(invoice.dueOn) : "",
      vatRate: String(invoice.vatRate),
      notes: invoice.notes ?? "",
      lines:
        invoice.lines.length > 0
          ? invoice.lines.map((line) => ({
              label: line.label,
              description: line.description ?? "",
              quantity: String(line.quantity),
              unitPrice: String(line.unitPrice),
              productId: line.productId ?? "",
            }))
          : [{ ...EMPTY_LINE }],
    }),
    [invoice]
  );

  const [form, setForm] = React.useState(initial);
  const [isPending, startTransition] = React.useTransition();

  // A value key rather than object identity: every keystroke replaces the form
  // object, and what matters here is whether the content differs.
  const formKey = JSON.stringify(form);

  // What was last written to the database. Moved forward by a successful save
  // rather than read back from the props — the server round-trip returns the
  // same content, and resetting the form from it would fight the cursor.
  const [savedKey, setSavedKey] = React.useState(formKey);
  const dirty = formKey !== savedKey;

  function set<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    if (!editable) return;
    setForm((current) => ({ ...current, [field]: value }));
  }

  /**
   * Puts a line on the document, from wherever it came.
   *
   * A blank first line is replaced rather than added to: picking something on
   * an empty draft should fill it, not leave an empty row above it.
   */
  function addLine(
    label: string,
    unitPrice: number,
    description = "",
    productId = "",
    notes: string | null = null
  ) {
    if (!editable) return;
    setForm((current) => ({
      ...current,
      lines: [
        ...current.lines.filter((line) => line.label.trim() !== ""),
        {
          label,
          description,
          quantity: "1",
          unitPrice: String(unitPrice),
          productId,
        },
      ],
      // Mentions the catalogue attaches to this product, appended to what is
      // already there rather than replacing it — and only once, so adding the
      // line twice does not print the paragraph twice.
      notes:
        notes && !current.notes.includes(notes)
          ? [current.notes.trim(), notes].filter(Boolean).join("\n\n")
          : current.notes,
    }));
  }

  /**
   * Puts a whole composed request on the document: its lines, its heading and
   * the mentions its catalogue entry carries.
   *
   * Replaces the lines rather than appending to them. A request is a set that
   * adds up to what is being asked for, and mixing two of them would produce a
   * document whose total means nothing.
   */
  function applyRequest(request: ComposedRequest) {
    if (!editable) return;
    setForm((current) => ({
      ...current,
      title: request.title ?? current.title,
      lines: request.lines.map((line) => ({
        label: line.label,
        description: line.description ?? "",
        quantity: "1",
        unitPrice: String(line.unitPrice),
        productId: line.productId ?? "",
      })),
      notes:
        request.notes && !current.notes.includes(request.notes)
          ? [current.notes.trim(), request.notes].filter(Boolean).join("\n\n")
          : current.notes,
    }));
  }

  function setLine(index: number, field: keyof DraftLine, value: string) {
    if (!editable) return;
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line, i) =>
        i === index ? { ...line, [field]: value } : line
      ),
    }));
  }

  /**
   * The figures behind a form state. Empty inputs read as 0 rather than NaN,
   * so a total stays a number while a line is half typed.
   */
  function figuresOf(state: typeof form) {
    const lines = state.lines.map((line) => ({
      label: line.label.trim(),
      description: line.description.trim() || null,
      productId: line.productId || undefined,
      quantity: Number(line.quantity.replace(",", ".")) || 0,
      unitPrice: Number(line.unitPrice.replace(",", ".")) || 0,
    }));
    const vatRate = Number(state.vatRate.replace(",", ".")) || 0;
    return { lines, vatRate, totals: invoiceTotals(lines, vatRate) };
  }

  /**
   * What the document says for a given form state — built by the same function
   * the generator calls, so the preview cannot drift from the stored file.
   */
  function documentOf(state: typeof form) {
    const { lines, vatRate, totals } = figuresOf(state);
    const client = contacts.find((c) => c.id === state.clientId);

    return buildInvoiceDocument({
      family: invoice.family,
      reference: invoice.reference,
      title: state.title.trim() || null,
      description: state.description.trim() || null,
      issuedOn: invoice.issuedOn,
      dueOn: state.dueOn ? new Date(state.dueOn) : null,
      agency,
      client: {
        // Resolved live from the selected contact, exactly as the save path
        // will snapshot it. Falls back to what was stored for an invoice whose
        // client has since been archived out of the list.
        name: client ? billingName(client) : invoice.clientName,
        address: client ? billingAddress(client) : null,
      },
      lines: lines.filter((line) => line.label !== ""),
      vatRate,
      totalHt: totals.totalHt,
      vatAmount: totals.vatAmount,
      notes: state.notes.trim() || null,
    });
  }

  const { lines, vatRate, totals } = figuresOf(form);

  // What the selected booking can be called for. Fetched when the selection
  // changes rather than shipped with every rental: these figures are only ever
  // wanted for the one on the document.
  // The booking they belong to is kept beside them, so figures fetched for a
  // rental that has since been changed or cleared are simply not shown —
  // rather than being wiped by the effect, which would set state on every
  // render that has no rental to ask about.
  const [suggestions, setSuggestions] = React.useState<{
    rentalId: string;
    requests: ComposedRequest[];
  }>({ rentalId: "", requests: [] });

  React.useEffect(() => {
    if (!editable || form.rentalId === "") return;
    const rentalId = form.rentalId;
    let current = true;
    void composeRequestsAction({ rentalId }).then((requests) => {
      if (current) setSuggestions({ rentalId, requests });
    });
    return () => {
      current = false;
    };
  }, [editable, form.rentalId]);

  const rentalRequests =
    suggestions.rentalId === form.rentalId ? suggestions.requests : [];

  // The preview trails the form by a beat — see PREVIEW_DELAY. What is delayed
  // is the form state, not the built document: `form` is replaced on every
  // edit and left alone otherwise, so it is exactly the right thing to wait on.
  const [previewForm, setPreviewForm] = React.useState(form);
  React.useEffect(() => {
    const timer = setTimeout(() => setPreviewForm(form), PREVIEW_DELAY);
    return () => clearTimeout(timer);
  }, [form]);

  function save() {
    startTransition(async () => {
      const result = await updateDraftAction({
        id: invoice.id,
        family: invoice.family,
        title: form.title,
        clientId: form.clientId,
        rentalId: form.rentalId,
        description: form.description,
        dueOn: form.dueOn,
        vatRate,
        notes: form.notes,
        lines: lines.filter((line) => line.label !== ""),
      });

      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      // This is now what the database holds, so it becomes the point "modifié"
      // is measured against.
      setSavedKey(formKey);
      toast.success("Brouillon enregistré.");
      router.refresh();
    });
  }

  const usable = lines.filter((l) => l.label !== "" && l.quantity > 0);
  const canSave = editable && dirty && form.clientId !== "";

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <div className="space-y-4">
        {editable ? (
          <div className="bg-background sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b pb-3">
            <Button
              type="button"
              size="sm"
              onClick={save}
              disabled={!canSave || isPending}
            >
              {isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>

            {/* Issuing reads the saved draft, not the form, so unsaved changes
                would silently not be on the invoice that gets numbered. */}
            {dirty ? (
              <span className="text-muted-foreground text-xs">
                Modifications non enregistrées
              </span>
            ) : usable.length > 0 ? (
              <IssueInvoiceDialog invoice={invoice} />
            ) : (
              <span className="text-muted-foreground text-xs">
                Ajoutez une ligne pour pouvoir émettre
              </span>
            )}
          </div>
        ) : null}


        <div className="space-y-2">
          <Label htmlFor="invoice-title">Intitulé du document</Label>
          <Input
            id="invoice-title"
            value={form.title}
            onChange={(event) => set("title", event.target.value)}
            placeholder="Balance Payment Request / Demande de paiement du solde"
            disabled={!editable || isPending}
            autoComplete="off"
          />
          <p className="text-muted-foreground text-xs">
            Imprimé en tête, en deux langues séparées par « / ». Vide, le
            document reprend son intitulé générique.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="invoice-description">Description</Label>
          <Input
            id="invoice-description"
            value={form.description}
            onChange={(event) => set("description", event.target.value)}
            placeholder="Commission et prestations — séjour de juillet"
            disabled={!editable || isPending}
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="invoice-client">Client</Label>
          {editable ? (
            <Combobox
              id="invoice-client"
              value={form.clientId || null}
              onValueChange={(value) => set("clientId", value)}
              options={contacts.map((contact) => ({
                value: contact.id,
                label: contactLabel(contact),
                ...(contact.email ? { hint: contact.email } : {}),
              }))}
              placeholder="Rechercher un contact…"
              emptyLabel="Aucun contact ne correspond."
              disabled={isPending}
            />
          ) : (
            <p className="text-sm">{invoice.clientName}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="invoice-rental">Location (facultatif)</Label>
          {editable ? (
            <Combobox
              id="invoice-rental"
              value={form.rentalId || null}
              onValueChange={(value) => set("rentalId", value)}
              options={rentals.map((r) => ({
                value: r.id,
                label: `${r.property}${r.tenant ? ` · ${r.tenant}` : ""}`,
                hint: String(r.reference),
              }))}
              placeholder="Rattacher à une réservation…"
              emptyLabel="Aucune location ne correspond."
              disabled={isPending}
            />
          ) : (
            <p className="text-muted-foreground text-sm">
              {invoice.propertyName ?? "Aucune"}
            </p>
          )}
        </div>

        <div className={showVat ? "grid grid-cols-2 gap-3" : "space-y-2"}>
          <div className="space-y-2">
            <Label htmlFor="invoice-due">Échéance</Label>
            <Input
              id="invoice-due"
              type="date"
              value={form.dueOn}
              onChange={(event) => set("dueOn", event.target.value)}
              disabled={!editable || isPending}
            />
          </div>
          {showVat ? (
            <div className="space-y-2">
              <Label htmlFor="invoice-vat">TVA (%)</Label>
              <Input
                id="invoice-vat"
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={form.vatRate}
                onChange={(event) => set("vatRate", event.target.value)}
                disabled={!editable || isPending}
              />
            </div>
          ) : null}
        </div>

        <fieldset className="space-y-3">
          <legend className="mb-2 text-sm font-medium">Lignes</legend>
          {form.lines.map((line, index) => (
            <div key={index} className="space-y-1.5 rounded-md border p-2.5">
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <Label className="text-xs" htmlFor={`line-label-${index}`}>
                    Titre
                  </Label>
                  <Input
                    id={`line-label-${index}`}
                    value={line.label}
                    onChange={(event) =>
                      setLine(index, "label", event.target.value)
                    }
                    placeholder="Commission d'agence"
                    disabled={!editable || isPending}
                    autoComplete="off"
                  />
                </div>
                <div className="w-16 space-y-1">
                  <Label className="text-xs" htmlFor={`line-qty-${index}`}>
                    Qté
                  </Label>
                  <Input
                    id={`line-qty-${index}`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.quantity}
                    onChange={(event) =>
                      setLine(index, "quantity", event.target.value)
                    }
                    disabled={!editable || isPending}
                    className="tabular-nums"
                  />
                </div>
                <div className="w-28 space-y-1">
                  <Label className="text-xs" htmlFor={`line-price-${index}`}>
                    P.U. HT
                  </Label>
                  <Input
                    id={`line-price-${index}`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.unitPrice}
                    onChange={(event) =>
                      setLine(index, "unitPrice", event.target.value)
                    }
                    disabled={!editable || isPending}
                    className="tabular-nums"
                  />
                </div>
                {editable ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Supprimer la ligne"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        lines: current.lines.filter((_, i) => i !== index),
                      }))
                    }
                    disabled={isPending || form.lines.length === 1}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                ) : null}
              </div>

              <div className="space-y-1">
                <Label className="text-xs" htmlFor={`line-description-${index}`}>
                  Description (facultative)
                </Label>
                <Input
                  id={`line-description-${index}`}
                  value={line.description}
                  onChange={(event) =>
                    setLine(index, "description", event.target.value)
                  }
                  placeholder="Détail imprimé sous le titre"
                  disabled={!editable || isPending}
                  autoComplete="off"
                />
              </div>
            </div>
          ))}

          {editable ? (
            <div className="flex flex-wrap items-center gap-2">
              {/* Two ways in, because there are two cases: something the agency
                  bills regularly, and something it billed once. */}
              {products.length > 0 ? (
                <Combobox
                  value={null}
                  onValueChange={(productId) => {
                    const product = products.find((p) => p.id === productId);
                    if (!product) return;
                    // Copied, not referenced. The catalogue may be repriced
                    // tomorrow; this document must keep saying what was billed
                    // today.
                    addLine(
                      product.label,
                      product.unitPrice,
                      product.description ?? "",
                      product.id,
                      product.notes
                    );
                  }}
                  options={products.map((product) => ({
                    value: product.id,
                    label: product.label,
                    hint: `${product.unitPrice.toFixed(2)} €`,
                  }))}
                  placeholder="Ajouter un produit…"
                  emptyLabel="Aucun produit ne correspond."
                  disabled={isPending}
                />
              ) : null}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    lines: [...current.lines, { ...EMPTY_LINE }],
                  }))
                }
                disabled={isPending}
              >
                <Plus aria-hidden="true" />
                Ajouter un article ponctuel
              </Button>
            </div>
          ) : null}

          {/* What the selected booking can be called for, read from its
              dossier. Only here, and only once a particular rental is on the
              document — off a booking these three figures mean nothing. They
              write an ordinary line: nothing records which of the three it
              was, the line says it. */}
          {/* What the selected booking can be asked for, composed from its
              dossier. Only here, and only once a particular rental is on the
              document. A balance arrives as several lines — the rent, each
              service billed on top, the taxe de séjour, and the acompte
              deducted once it is in — because that is what the client needs to
              read. Every line is ordinary afterwards: renamable, repriceable,
              removable. */}
          {editable && rentalRequests.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-muted-foreground text-xs">
                Demandes de la réservation
              </p>
              <div className="flex flex-wrap gap-2">
                {rentalRequests.map((request) => (
                  <Button
                    key={request.head}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyRequest(request)}
                    disabled={isPending}
                  >
                    <Plus aria-hidden="true" />
                    {request.shortLabel}
                    <span className="text-muted-foreground tabular-nums">
                      {request.total.toFixed(2)} €
                    </span>
                    {request.lines.length > 1 ? (
                      <span className="text-muted-foreground">
                        · {request.lines.length} lignes
                      </span>
                    ) : null}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </fieldset>

        <div className="space-y-1 rounded-md border p-3 text-sm tabular-nums">
          {showVat ? (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total HT</span>
                <Money value={totals.totalHt} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  TVA {form.vatRate || 0} %
                </span>
                <Money value={totals.vatAmount} />
              </div>
            </>
          ) : null}
          <div className="flex justify-between border-t pt-1 font-medium">
            <span>{showVat ? "Total TTC" : "Somme appelée"}</span>
            <Money value={showVat ? totals.totalTtc : totals.totalHt} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="invoice-notes">Observations</Label>
          {/* Multi-line: the mentions a catalogue product carries run to a
              paragraph in each language, and they land here. */}
          <textarea
            id="invoice-notes"
            value={form.notes}
            onChange={(event) => set("notes", event.target.value)}
            placeholder="Mentions imprimées en bas de document"
            disabled={!editable || isPending}
            rows={6}
            className="border-input bg-background focus-visible:ring-ring/50 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px] disabled:opacity-50"
          />
        </div>
      </div>

      <div className="bg-muted/30 h-[82vh] overflow-hidden rounded-lg border lg:sticky lg:top-4">
        <InvoicePreviewLoader data={documentOf(previewForm)} />
      </div>
    </div>
  );
}
