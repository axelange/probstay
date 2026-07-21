"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createContact } from "@/features/contacts/actions/create-contact";
import { createRental } from "@/features/rentals/actions/create-rental";
import {
  checkOverlaps,
  type OverlapSummary,
} from "@/features/rentals/actions/check-overlaps";

type PropertyOption = {
  id: string;
  marketingName: string | null;
  city: string | null;
  reference: number | null;
};

type TenantOption = {
  id: string;
  firstName: string | null;
  lastName: string;
  email: string | null;
};

const NO_TENANT = "";

export function CreateRentalForm({
  properties,
  tenants: initialTenants,
}: {
  properties: PropertyOption[];
  tenants: TenantOption[];
}) {
  const router = useRouter();

  const [propertyId, setPropertyId] = React.useState("");
  const [checkIn, setCheckIn] = React.useState("");
  const [checkOut, setCheckOut] = React.useState("");
  const [grossAmount, setGrossAmount] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const [tenants, setTenants] = React.useState(initialTenants);
  const [tenantId, setTenantId] = React.useState(NO_TENANT);

  const [newTenant, setNewTenant] = React.useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  } | null>(null);

  // Kept with the stay it was computed for, so a slow answer for an
  // earlier set of dates can never be shown against the current one —
  // and so nothing has to be cleared synchronously inside the effect.
  const [overlapResult, setOverlapResult] = React.useState<{
    key: string;
    data: OverlapSummary;
  } | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const stayKey = `${propertyId}|${checkIn}|${checkOut}`;
  const stayIsComplete = Boolean(propertyId && checkIn && checkOut);

  // Overlaps are advisory, so this runs quietly once the three fields
  // that define a stay are known.
  React.useEffect(() => {
    if (!stayIsComplete) return;
    let cancelled = false;
    checkOverlaps(propertyId, checkIn, checkOut).then((data) => {
      if (!cancelled) setOverlapResult({ key: stayKey, data });
    });
    return () => {
      cancelled = true;
    };
  }, [stayIsComplete, stayKey, propertyId, checkIn, checkOut]);

  const overlaps =
    stayIsComplete && overlapResult?.key === stayKey ? overlapResult.data : null;

  function propertyLabel(p: PropertyOption) {
    return [p.marketingName ?? p.city ?? "Sans nom", p.city]
      .filter(Boolean)
      .join(" — ");
  }

  function tenantLabel(t: TenantOption) {
    return [t.firstName, t.lastName].filter(Boolean).join(" ");
  }

  function saveNewTenant() {
    if (!newTenant?.lastName.trim()) return;

    startTransition(async () => {
      const result = await createContact({
        ...newTenant,
        // A tenant is a CLIENT: the join table's trigger rejects
        // anything else.
        types: ["CLIENT"],
        specialties: [],
        acceptDuplicatePhone: true,
      });

      if (result.status === "duplicate-phone") {
        toast.error(result.message);
        return;
      }
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }

      const created: TenantOption = {
        id: result.id,
        firstName: newTenant.firstName || null,
        lastName: newTenant.lastName,
        email: newTenant.email || null,
      };
      setTenants((list) => [...list, created]);
      setTenantId(created.id);
      setNewTenant(null);
      toast.success(`${result.name} ajouté comme client.`);
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();

    startTransition(async () => {
      const result = await createRental({
        propertyId,
        checkIn,
        checkOut,
        grossAmount,
        tenantIds: tenantId ? [tenantId] : [],
        notes,
      });

      if (result.status === "error") {
        toast.error(result.message);
        return;
      }

      toast.success("Location créée.");
      router.push(`/rentals/${result.id}`);
    });
  }

  const canSubmit =
    Boolean(propertyId) &&
    Boolean(checkIn) &&
    Boolean(checkOut) &&
    Boolean(tenantId);

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-medium">Séjour</h3>

        <div className="space-y-2">
          <Label htmlFor="property">Bien *</Label>
          <Select
            value={propertyId}
            onValueChange={(v) => v !== null && setPropertyId(v)}
            disabled={isPending}
          >
            <SelectTrigger id="property" className="w-full">
              <SelectValue placeholder="Choisir un bien" />
            </SelectTrigger>
            <SelectContent>
              {properties.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {propertyLabel(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="checkIn">Arrivée *</Label>
            <Input
              id="checkIn"
              type="date"
              required
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="checkOut">Départ *</Label>
            <Input
              id="checkOut"
              type="date"
              required
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              disabled={isPending}
            />
          </div>
        </div>

        {/* Advisory. Overlapping enquiries are normal — mandates are not
            exclusive — so this informs rather than blocks. Only a second
            owner confirmation is actually refused, and that is the
            database's job. */}
        {overlaps && overlaps.total > 0 ? (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2.5 text-sm">
            <p className="flex items-center gap-2 font-medium">
              <TriangleAlert
                aria-hidden="true"
                className="size-4 shrink-0 text-amber-600"
              />
              {overlaps.total === 1
                ? "1 autre réservation sur ces dates"
                : `${overlaps.total} autres réservations sur ces dates`}
              {overlaps.confirmed > 0 ? (
                <Badge variant="outline" className="font-normal">
                  dont {overlaps.confirmed} confirmée
                  {overlaps.confirmed > 1 ? "s" : ""}
                </Badge>
              ) : null}
            </p>
            <ul className="text-muted-foreground mt-1.5 space-y-0.5 text-xs">
              {overlaps.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium">Locataire *</h3>
          {newTenant === null ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() =>
                setNewTenant({ firstName: "", lastName: "", email: "", phone: "" })
              }
            >
              <UserPlus aria-hidden="true" />
              Nouveau client
            </Button>
          ) : null}
        </div>

        {newTenant === null ? (
          <Select
            value={tenantId}
            onValueChange={(v) => v !== null && setTenantId(v)}
            disabled={isPending || tenants.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  tenants.length === 0
                    ? "Aucun client — créez-en un"
                    : "Choisir un client"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {tenants.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {tenantLabel(t)}
                  {t.email ? ` — ${t.email}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          /* Created without leaving the booking: a tenant is usually
             discovered while taking the call. */
          <div className="space-y-3 rounded-lg border p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tenantFirstName">Prénom</Label>
                <Input
                  id="tenantFirstName"
                  value={newTenant.firstName}
                  onChange={(e) =>
                    setNewTenant({ ...newTenant, firstName: e.target.value })
                  }
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenantLastName">Nom *</Label>
                <Input
                  id="tenantLastName"
                  value={newTenant.lastName}
                  onChange={(e) =>
                    setNewTenant({ ...newTenant, lastName: e.target.value })
                  }
                  disabled={isPending}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tenantEmail">E-mail</Label>
                <Input
                  id="tenantEmail"
                  type="email"
                  value={newTenant.email}
                  onChange={(e) =>
                    setNewTenant({ ...newTenant, email: e.target.value })
                  }
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenantPhone">Téléphone</Label>
                <Input
                  id="tenantPhone"
                  type="tel"
                  value={newTenant.phone}
                  onChange={(e) =>
                    setNewTenant({ ...newTenant, phone: e.target.value })
                  }
                  disabled={isPending}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={saveNewTenant}
                disabled={isPending || !newTenant.lastName.trim()}
              >
                Ajouter le client
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setNewTenant(null)}
                disabled={isPending}
              >
                Annuler
              </Button>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Montant et notes</h3>

        <div className="space-y-2 sm:max-w-xs">
          <Label htmlFor="grossAmount">Montant du séjour</Label>
          <Input
            id="grossAmount"
            type="number"
            min={0}
            step="0.01"
            value={grossAmount}
            onChange={(e) => setGrossAmount(e.target.value)}
            disabled={isPending}
            placeholder="Facultatif"
          />
          <p className="text-muted-foreground text-xs">
            Facultatif à ce stade. Acompte, caution et paiements se règlent
            en finalisation.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes internes</Label>
          <Input
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isPending}
          />
        </div>
      </section>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending || !canSubmit}>
          {isPending ? "Création…" : "Créer la location"}
        </Button>
      </div>
    </form>
  );
}
