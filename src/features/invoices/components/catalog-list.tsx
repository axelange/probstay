"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Pencil, Plus, Search } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createProductAction,
  setProductArchivedAction,
  updateProductAction,
} from "@/features/invoices/actions/manage-product";
import type { CatalogProduct } from "@/features/invoices/services/product-service";
import { Money } from "@/features/rentals/components/money";

/**
 * Le catalogue.
 *
 * What the agency bills often enough to be worth writing down once: a title, a
 * description and a price. An invoice line copies all three rather than
 * pointing at them, so repricing here decides what the *next* invoice carries
 * and leaves the ones already issued alone — which is what lets a catalogue
 * entry be corrected at all.
 */
export function CatalogList({
  products,
  canManage,
}: {
  products: CatalogProduct[];
  canManage: boolean;
}) {
  const [query, setQuery] = React.useState("");

  const fold = (value: string) => value.normalize("NFC").toLowerCase();
  const shown = products.filter(
    (product) =>
      query.trim() === "" ||
      fold(`${product.label} ${product.description ?? ""}`).includes(
        fold(query.trim())
      )
  );
  const active = shown.filter((product) => product.archivedAt === null);
  const archived = shown.filter((product) => product.archivedAt !== null);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Intitulé, description…"
            aria-label="Rechercher un produit"
            className="pl-8"
          />
        </div>
        {canManage ? <ProductDialog /> : null}
      </div>

      {active.length === 0 && archived.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-10 text-center text-sm">
          {products.length === 0
            ? "Le catalogue est vide. Ajoutez ce que vous facturez régulièrement."
            : "Aucun résultat."}
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {active.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              canManage={canManage}
            />
          ))}
        </ul>
      )}

      {archived.length > 0 ? (
        <details className="group">
          <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs">
            Retirés du catalogue
            <Badge variant="secondary" className="ml-2 font-normal">
              {archived.length}
            </Badge>
          </summary>
          <ul className="mt-2 divide-y rounded-lg border">
            {archived.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                canManage={canManage}
              />
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function ProductRow({
  product,
  canManage,
}: {
  product: CatalogProduct;
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const archived = product.archivedAt !== null;

  function toggleArchived() {
    startTransition(async () => {
      const result = await setProductArchivedAction({
        id: product.id,
        archived: !archived,
      });
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      toast.success(archived ? "Produit rétabli." : "Produit retiré.");
      router.refresh();
    });
  }

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm">
      <div className="min-w-0 flex-1">
        <p className={`truncate font-medium ${archived ? "text-muted-foreground" : ""}`}>
          {product.label}
        </p>
        {product.description ? (
          <p className="text-muted-foreground truncate text-xs">
            {product.description}
          </p>
        ) : null}
        <p className="text-muted-foreground text-xs">
          {product.role
            ? "Montant repris du dossier de réservation"
            : null}
          {product.role && product.notes ? " · " : null}
          {product.notes ? "Mentions attachées" : null}
          {(product.role || product.notes) && product.timesBilled > 0
            ? " · "
            : null}
          {product.timesBilled > 0
            ? `Facturé ${product.timesBilled} fois`
            : null}
        </p>
      </div>

      <span className="shrink-0 text-sm font-medium tabular-nums">
        {product.role ? (
          <span className="text-muted-foreground text-xs">Selon dossier</span>
        ) : (
          <Money value={product.unitPrice} />
        )}
      </span>

      {canManage ? (
        <div className="flex shrink-0 items-center gap-1">
          <ProductDialog product={product} />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleArchived}
            disabled={isPending}
          >
            {archived ? (
              <>
                <ArchiveRestore aria-hidden="true" />
                Rétablir
              </>
            ) : (
              <>
                <Archive aria-hidden="true" />
                Retirer
              </>
            )}
          </Button>
        </div>
      ) : null}
    </li>
  );
}

/** Creating a catalogue entry, or correcting one. */
function ProductDialog({ product }: { product?: CatalogProduct }) {
  const router = useRouter();
  const editing = product !== undefined;
  const [open, setOpen] = React.useState(false);
  const [label, setLabel] = React.useState(product?.label ?? "");
  const [description, setDescription] = React.useState(
    product?.description ?? ""
  );
  const [unitPrice, setUnitPrice] = React.useState(
    product ? String(product.unitPrice) : ""
  );
  const [notes, setNotes] = React.useState(product?.notes ?? "");
  const [isPending, startTransition] = React.useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const payload = {
      label,
      description,
      unitPrice: Number(unitPrice.replace(",", ".")) || 0,
      notes,
    };

    startTransition(async () => {
      const result = editing
        ? await updateProductAction({ ...payload, id: product.id })
        : await createProductAction(payload);

      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      toast.success(editing ? "Produit enregistré." : "Produit ajouté.");
      if (!editing) {
        setLabel("");
        setDescription("");
        setUnitPrice("");
        setNotes("");
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          editing ? (
            <Button variant="ghost" size="sm">
              <Pencil aria-hidden="true" />
              Modifier
            </Button>
          ) : (
            <Button size="sm">
              <Plus aria-hidden="true" />
              Ajouter un produit
            </Button>
          )
        }
      />

      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifier le produit" : "Ajouter un produit"}
            </DialogTitle>
            <DialogDescription>
              Les factures déjà émises ne changent pas : une ligne copie
              l&apos;intitulé et le prix facturés ce jour-là.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[65vh] space-y-4 overflow-y-auto py-4">
            <div className="space-y-2">
              <Label htmlFor="product-label">Intitulé *</Label>
              <Input
                id="product-label"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Ménage de fin de séjour"
                disabled={isPending}
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-description">Description</Label>
              <Input
                id="product-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Imprimée sous l'intitulé, sur la facture"
                disabled={isPending}
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-price">Prix unitaire HT *</Label>
              <Input
                id="product-price"
                type="number"
                min={0}
                step="0.01"
                value={unitPrice}
                onChange={(event) => setUnitPrice(event.target.value)}
                disabled={
                  isPending || (product !== undefined && product.role !== null)
                }
                className="tabular-nums"
              />
              {product?.role ? (
                <p className="text-muted-foreground text-xs">
                  Le montant vient du dossier de réservation, pas d&apos;ici.
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-notes">Mentions</Label>
              {/* Carried onto the document's observations when this product is
                  put on a line. Long on purpose: a security deposit travels
                  with a paragraph in each language. */}
              <textarea
                id="product-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Texte ajouté aux observations du document"
                disabled={isPending}
                rows={6}
                className="border-input bg-background focus-visible:ring-ring/50 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px] disabled:opacity-50"
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
            <Button
              type="submit"
              disabled={isPending || label.trim() === "" || unitPrice === ""}
            >
              {isPending ? "Enregistrement…" : editing ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
