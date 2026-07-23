"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createRental } from "@/features/rentals/actions/create-rental";

export type BookableProperty = {
  id: string;
  marketingName: string | null;
  city: string | null;
  reference: number | null;
};

export type TenantCandidate = {
  id: string;
  firstName: string | null;
  lastName: string;
  email: string | null;
  types: string[];
};

function villaLabel(p: BookableProperty): string {
  return [p.marketingName ?? p.city ?? "Sans nom", p.city]
    .filter(Boolean)
    .join(" — ");
}

function tenantLabel(t: TenantCandidate): string {
  const name = [t.firstName, t.lastName].filter(Boolean).join(" ");
  return t.email ? `${name} — ${t.email}` : name;
}

const EMPTY_NEW = { firstName: "", lastName: "", email: "", phone: "" };

export function CreateRentalDialog({
  properties,
  tenants,
}: {
  properties: BookableProperty[];
  tenants: TenantCandidate[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [propertyId, setPropertyId] = React.useState("");
  // No contact yet on file is the very case this exists for, so an empty
  // candidate list starts on the "new tenant" tab.
  const [tenantMode, setTenantMode] = React.useState<"existing" | "new">(
    tenants.length > 0 ? "existing" : "new"
  );
  const [tenantId, setTenantId] = React.useState("");
  const [newTenant, setNewTenant] = React.useState(EMPTY_NEW);
  const [checkIn, setCheckIn] = React.useState("");
  const [checkOut, setCheckOut] = React.useState("");
  const [guests, setGuests] = React.useState("");
  const [isPending, startTransition] = React.useTransition();

  function reset() {
    setPropertyId("");
    setTenantMode(tenants.length > 0 ? "existing" : "new");
    setTenantId("");
    setNewTenant(EMPTY_NEW);
    setCheckIn("");
    setCheckOut("");
    setGuests("");
  }

  function setNt(field: keyof typeof EMPTY_NEW, value: string) {
    setNewTenant((n) => ({ ...n, [field]: value }));
  }

  const tenantOk =
    tenantMode === "existing"
      ? tenantId !== ""
      : newTenant.lastName.trim() !== "";
  const canSubmit =
    propertyId !== "" && tenantOk && checkIn !== "" && checkOut !== "";

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const tenant =
      tenantMode === "existing"
        ? { mode: "existing" as const, contactId: tenantId }
        : { mode: "new" as const, ...newTenant };

    startTransition(async () => {
      const result = await createRental({
        propertyId,
        tenant,
        checkIn,
        checkOut,
        guests,
      });
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      toast.success("Location créée.");
      reset();
      setOpen(false);
      router.push(`/rentals/${result.rentalId}`);
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
          <Button size="sm">
            <Plus aria-hidden="true" />
            Nouvelle location
          </Button>
        }
      />

      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Nouvelle location</DialogTitle>
            <DialogDescription>
              Crée une réservation au statut Informations, sans passer par une
              demande. Le locataire devient client.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] space-y-4 overflow-y-auto py-4">
            <div className="space-y-2">
              <Label htmlFor="rental-villa">Bien</Label>
              {/* items lets Base UI resolve the selected label without
                  opening the popup. */}
              <Select
                value={propertyId}
                onValueChange={(v) => v !== null && setPropertyId(v)}
                items={properties.map((p) => ({
                  value: p.id,
                  label: villaLabel(p),
                }))}
                disabled={isPending}
              >
                <SelectTrigger id="rental-villa" className="w-full">
                  <SelectValue placeholder="Choisir un bien" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {villaLabel(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <fieldset className="space-y-3">
              <legend className="mb-2 text-sm font-medium">Locataire</legend>
              <div className="flex flex-wrap gap-4">
                {(
                  [
                    ["existing", "Contact existant"],
                    ["new", "Nouveau contact"],
                  ] as const
                ).map(([mode, label]) => (
                  <label
                    key={mode}
                    className="flex cursor-pointer items-center gap-1.5 text-sm"
                  >
                    <input
                      type="radio"
                      name="tenant-mode"
                      className="size-4 cursor-pointer"
                      checked={tenantMode === mode}
                      onChange={() => setTenantMode(mode)}
                      disabled={isPending || (mode === "existing" && tenants.length === 0)}
                    />
                    {label}
                  </label>
                ))}
              </div>

              {tenantMode === "existing" ? (
                <Select
                  value={tenantId}
                  onValueChange={(v) => v !== null && setTenantId(v)}
                  items={tenants.map((t) => ({
                    value: t.id,
                    label: tenantLabel(t),
                  }))}
                  disabled={isPending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choisir un contact" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {tenantLabel(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="space-y-3 rounded-md border p-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="nt-first">Prénom</Label>
                      <Input
                        id="nt-first"
                        value={newTenant.firstName}
                        onChange={(e) => setNt("firstName", e.target.value)}
                        disabled={isPending}
                        autoComplete="off"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nt-last">Nom *</Label>
                      <Input
                        id="nt-last"
                        value={newTenant.lastName}
                        onChange={(e) => setNt("lastName", e.target.value)}
                        disabled={isPending}
                        autoComplete="off"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nt-email">E-mail</Label>
                    <Input
                      id="nt-email"
                      type="email"
                      value={newTenant.email}
                      onChange={(e) => setNt("email", e.target.value)}
                      disabled={isPending}
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nt-phone">Téléphone</Label>
                    <Input
                      id="nt-phone"
                      type="tel"
                      value={newTenant.phone}
                      onChange={(e) => setNt("phone", e.target.value)}
                      disabled={isPending}
                      autoComplete="off"
                    />
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Rattaché par e-mail à un contact existant s&apos;il y en a
                    un, sinon créé comme client.
                  </p>
                </div>
              )}
            </fieldset>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="rental-checkin">Arrivée</Label>
                <Input
                  id="rental-checkin"
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rental-checkout">Départ</Label>
                <Input
                  id="rental-checkout"
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rental-guests">Personnes</Label>
                <Input
                  id="rental-guests"
                  type="number"
                  min={1}
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                  disabled={isPending}
                />
              </div>
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
              {isPending ? "Création…" : "Créer la location"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
