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
import type { ContactKind } from "@/generated/prisma/enums";
import { createRental } from "@/features/rentals/actions/create-rental";
import { Combobox } from "@/components/ui/combobox";

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


function tenantLabel(t: TenantCandidate): string {
  const name = [t.firstName, t.lastName].filter(Boolean).join(" ");
  return t.email ? `${name} — ${t.email}` : name;
}

const EMPTY_NEW = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  // Company block — only sent when the new tenant is a société.
  legalForm: "",
  registrationNumber: "",
  registeredOffice: "",
  repFirstName: "",
  repLastName: "",
  repCapacity: "",
  repBirthDate: "",
  repBirthPlace: "",
  repNationality: "",
};

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
  const [newTenantKind, setNewTenantKind] =
    React.useState<ContactKind>("INDIVIDUAL");
  const [checkIn, setCheckIn] = React.useState("");
  const [checkOut, setCheckOut] = React.useState("");
  const [guests, setGuests] = React.useState("");
  const [isPending, startTransition] = React.useTransition();

  function reset() {
    setPropertyId("");
    setTenantMode(tenants.length > 0 ? "existing" : "new");
    setTenantId("");
    setNewTenant(EMPTY_NEW);
    setNewTenantKind("INDIVIDUAL");
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
        : { mode: "new" as const, kind: newTenantKind, ...newTenant };

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
              {/* Searchable: fifty-odd properties is past the point where
                  scrolling an alphabetical list is finding something. */}
              <Combobox
                id="rental-villa"
                value={propertyId || null}
                onValueChange={setPropertyId}
                options={properties.map((p) => ({
                  value: p.id,
                  label: p.marketingName ?? p.city ?? "Sans nom",
                  ...(p.city ? { hint: p.city } : {}),
                }))}
                placeholder="Rechercher un bien…"
                emptyLabel="Aucun bien ne correspond."
                disabled={isPending}
              />
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
                <Combobox
                  value={tenantId || null}
                  onValueChange={setTenantId}
                  options={tenants.map((t) => ({
                    value: t.id,
                    label: tenantLabel(t),
                    ...(t.email ? { hint: t.email } : {}),
                  }))}
                  placeholder="Rechercher un contact…"
                  emptyLabel="Aucun contact ne correspond."
                  disabled={isPending}
                />
              ) : (
                <div className="space-y-3 rounded-md border p-3">
                  <div className="flex flex-wrap gap-4">
                    {(
                      [
                        ["INDIVIDUAL", "Particulier"],
                        ["COMPANY", "Société"],
                      ] as const
                    ).map(([k, label]) => (
                      <label
                        key={k}
                        className="flex cursor-pointer items-center gap-1.5 text-sm"
                      >
                        <input
                          type="radio"
                          name="new-tenant-kind"
                          className="size-4 cursor-pointer"
                          checked={newTenantKind === k}
                          onChange={() => setNewTenantKind(k)}
                          disabled={isPending}
                        />
                        {label}
                      </label>
                    ))}
                  </div>

                  {newTenantKind === "COMPANY" ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="nt-last">Dénomination sociale *</Label>
                        <Input
                          id="nt-last"
                          value={newTenant.lastName}
                          onChange={(e) => setNt("lastName", e.target.value)}
                          disabled={isPending}
                          autoComplete="off"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="nt-legalform">Forme juridique</Label>
                          <Input
                            id="nt-legalform"
                            placeholder="SARL, SAS, SCI…"
                            value={newTenant.legalForm}
                            onChange={(e) => setNt("legalForm", e.target.value)}
                            disabled={isPending}
                            autoComplete="off"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="nt-regnum">
                            N&apos;immatriculation
                          </Label>
                          <Input
                            id="nt-regnum"
                            placeholder="RCS, RCI, SIREN…"
                            value={newTenant.registrationNumber}
                            onChange={(e) =>
                              setNt("registrationNumber", e.target.value)
                            }
                            disabled={isPending}
                            autoComplete="off"
                            className="font-mono text-xs"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nt-office">Siège social</Label>
                        <Input
                          id="nt-office"
                          value={newTenant.registeredOffice}
                          onChange={(e) =>
                            setNt("registeredOffice", e.target.value)
                          }
                          disabled={isPending}
                          autoComplete="off"
                        />
                      </div>
                      <p className="text-muted-foreground text-xs">
                        Représentant légal
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="nt-repfirst">Prénom</Label>
                          <Input
                            id="nt-repfirst"
                            value={newTenant.repFirstName}
                            onChange={(e) =>
                              setNt("repFirstName", e.target.value)
                            }
                            disabled={isPending}
                            autoComplete="off"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="nt-replast">Nom</Label>
                          <Input
                            id="nt-replast"
                            value={newTenant.repLastName}
                            onChange={(e) =>
                              setNt("repLastName", e.target.value)
                            }
                            disabled={isPending}
                            autoComplete="off"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="nt-repcap">Qualité</Label>
                          <Input
                            id="nt-repcap"
                            placeholder="Gérant, Président…"
                            value={newTenant.repCapacity}
                            onChange={(e) =>
                              setNt("repCapacity", e.target.value)
                            }
                            disabled={isPending}
                            autoComplete="off"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="nt-repbirth">Naissance</Label>
                          <Input
                            id="nt-repbirth"
                            type="date"
                            value={newTenant.repBirthDate}
                            onChange={(e) =>
                              setNt("repBirthDate", e.target.value)
                            }
                            disabled={isPending}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="nt-repplace">Lieu de naissance</Label>
                          <Input
                            id="nt-repplace"
                            value={newTenant.repBirthPlace}
                            onChange={(e) =>
                              setNt("repBirthPlace", e.target.value)
                            }
                            disabled={isPending}
                            autoComplete="off"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="nt-repnat">Nationalité(s)</Label>
                          <Input
                            id="nt-repnat"
                            placeholder="Suisse / Russe"
                            value={newTenant.repNationality}
                            onChange={(e) =>
                              setNt("repNationality", e.target.value)
                            }
                            disabled={isPending}
                            autoComplete="off"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
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
                  )}
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
                    {newTenantKind === "COMPANY"
                      ? "Société créée comme cliente. Tout reste modifiable sur sa fiche."
                      : "Rattaché par e-mail à un contact existant s'il y en a un, sinon créé comme client."}
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
