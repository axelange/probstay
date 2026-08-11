"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, UserPlus, X } from "lucide-react";
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
import { createDemande } from "@/features/demandes/actions/create-demande";
import { findOrCreateProspect } from "@/features/demandes/actions/find-or-create-prospect";
import { Combobox } from "@/components/ui/combobox";

type PropertyOption = {
  id: string;
  marketingName: string | null;
  city: string | null;
};
type ClientOption = {
  id: string;
  firstName: string | null;
  lastName: string;
  email: string | null;
};

function propertyLabel(p: PropertyOption) {
  return [p.marketingName ?? p.city ?? "Sans nom", p.city]
    .filter(Boolean)
    .join(" — ");
}
function clientLabel(c: ClientOption) {
  return [c.firstName, c.lastName].filter(Boolean).join(" ");
}

export function CreateDemandeForm({
  properties,
  clients: initialClients,
}: {
  properties: PropertyOption[];
  clients: ClientOption[];
}) {
  const router = useRouter();

  const [mode, setMode] = React.useState<"PRECISE" | "WIDE">("PRECISE");
  const [clients, setClients] = React.useState(initialClients);
  const [clientId, setClientId] = React.useState("");
  const [newClient, setNewClient] = React.useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  } | null>(null);

  // Precise: exactly one property. Wide: a list.
  const [propertyId, setPropertyId] = React.useState("");
  const [propertyIds, setPropertyIds] = React.useState<string[]>([]);
  const [toAdd, setToAdd] = React.useState("");

  const [checkIn, setCheckIn] = React.useState("");
  const [checkOut, setCheckOut] = React.useState("");
  const [guests, setGuests] = React.useState("");
  const [budget, setBudget] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [isPending, startTransition] = React.useTransition();

  const available = properties.filter((p) => !propertyIds.includes(p.id));

  function saveNewClient() {
    if (!newClient?.lastName.trim()) return;
    startTransition(async () => {
      // New person → a prospect; email already on file → that contact is
      // reused, no duplicate.
      const result = await findOrCreateProspect(newClient);
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      const c = result.contact;
      const name = [c.firstName, c.lastName].filter(Boolean).join(" ");
      // The reused contact may already be in the list (a known prospect);
      // add it only if new to it.
      setClients((list) =>
        list.some((x) => x.id === c.id) ? list : [...list, c]
      );
      setClientId(c.id);
      setNewClient(null);
      toast.success(
        result.reused ? `Contact existant réutilisé : ${name}.` : `${name} ajouté.`
      );
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createDemande({
        mode,
        contactId: clientId,
        propertyIds: mode === "PRECISE" ? (propertyId ? [propertyId] : []) : propertyIds,
        checkIn,
        checkOut,
        guests,
        budget,
        notes,
      });
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      toast.success("Demande créée.");
      router.push(`/demandes/${result.id}`);
    });
  }

  const canSubmit =
    Boolean(clientId) &&
    (mode === "PRECISE"
      ? Boolean(propertyId) && Boolean(checkIn) && Boolean(checkOut)
      : propertyIds.length > 0);

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-medium">Type de demande</h3>
        <div className="bg-muted inline-flex rounded-lg p-1 text-sm">
          {(["PRECISE", "WIDE"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={[
                "cursor-pointer rounded-md px-3 py-1.5 transition-colors",
                mode === m
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {m === "PRECISE" ? "Précise" : "Large"}
            </button>
          ))}
        </div>
        <p className="text-muted-foreground text-xs">
          {mode === "PRECISE"
            ? "Un bien, des dates définies, un nombre de personnes."
            : "Plusieurs biens possibles, dates facultatives. Une prise de contact large."}
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium">Prospect *</h3>
          {newClient === null ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() =>
                setNewClient({ firstName: "", lastName: "", email: "", phone: "" })
              }
            >
              <UserPlus aria-hidden="true" />
              Nouveau prospect
            </Button>
          ) : null}
        </div>

        {newClient === null ? (
          <Combobox
            value={clientId || null}
            onValueChange={setClientId}
            options={clients.map((c) => ({
              value: c.id,
              label: clientLabel(c),
              ...(c.email ? { hint: c.email } : {}),
            }))}
            placeholder={
              clients.length === 0
                ? "Aucun prospect — créez-en un"
                : "Rechercher un prospect…"
            }
            emptyLabel="Aucun prospect ne correspond."
            disabled={isPending || clients.length === 0}
          />
        ) : (
          <div className="space-y-3 rounded-lg border p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Prénom"
                value={newClient.firstName}
                onChange={(e) => setNewClient({ ...newClient, firstName: e.target.value })}
                disabled={isPending}
              />
              <Input
                placeholder="Nom *"
                value={newClient.lastName}
                onChange={(e) => setNewClient({ ...newClient, lastName: e.target.value })}
                disabled={isPending}
              />
              <Input
                type="email"
                placeholder="E-mail"
                value={newClient.email}
                onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                disabled={isPending}
              />
              <Input
                type="tel"
                placeholder="Téléphone"
                value={newClient.phone}
                onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                disabled={isPending}
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={saveNewClient} disabled={isPending || !newClient.lastName.trim()}>
                Ajouter
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setNewClient(null)} disabled={isPending}>
                Annuler
              </Button>
            </div>
          </div>
        )}
        <p className="text-muted-foreground text-xs">
          Ses coordonnées (mail, téléphone) serviront à le recontacter.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">
          {mode === "PRECISE" ? "Bien *" : "Biens d'intérêt *"}
        </h3>

        {mode === "PRECISE" ? (
          <Combobox
            value={propertyId || null}
            onValueChange={setPropertyId}
            options={properties.map((p) => ({
              value: p.id,
              label: propertyLabel(p),
            }))}
            placeholder="Rechercher un bien…"
            emptyLabel="Aucun bien ne correspond."
            disabled={isPending}
          />
        ) : (
          <div className="space-y-2">
            {propertyIds.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {propertyIds.map((id) => {
                  const p = properties.find((x) => x.id === id);
                  return (
                    <Badge key={id} variant="secondary" className="gap-1 font-normal">
                      {p ? propertyLabel(p) : id}
                      <button
                        type="button"
                        aria-label="Retirer"
                        onClick={() => setPropertyIds((l) => l.filter((x) => x !== id))}
                        disabled={isPending}
                        className="hover:text-foreground -mr-0.5 cursor-pointer opacity-70"
                      >
                        <X aria-hidden="true" className="size-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            ) : null}
            <div className="flex gap-2">
              <Select
                value={toAdd}
                onValueChange={(v) => v !== null && setToAdd(v)}
                items={available.map((p) => ({ value: p.id, label: propertyLabel(p) }))}
                disabled={isPending || available.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Rechercher un bien à ajouter" />
                </SelectTrigger>
                <SelectContent>
                  {available.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {propertyLabel(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (toAdd) {
                    setPropertyIds((l) => [...l, toAdd]);
                    setToAdd("");
                  }
                }}
                disabled={isPending || !toAdd}
              >
                <Plus aria-hidden="true" />
                Ajouter
              </Button>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">
          Séjour {mode === "PRECISE" ? "" : "(facultatif)"}
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="checkIn">Arrivée {mode === "PRECISE" ? "*" : ""}</Label>
            <Input id="checkIn" type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} disabled={isPending} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="checkOut">Départ {mode === "PRECISE" ? "*" : ""}</Label>
            <Input id="checkOut" type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} disabled={isPending} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guests">Personnes</Label>
            <Input id="guests" type="number" min={1} max={50} value={guests} onChange={(e) => setGuests(e.target.value)} disabled={isPending} placeholder="Facultatif" />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="space-y-2 sm:max-w-xs">
          <Label htmlFor="budget">Budget</Label>
          <Input id="budget" type="number" min={0} step="0.01" value={budget} onChange={(e) => setBudget(e.target.value)} disabled={isPending} placeholder="Facultatif" />
          <p className="text-muted-foreground text-xs">
            Jamais le montant du séjour — un budget indicatif, facultatif.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notes internes</Label>
          <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} disabled={isPending} />
        </div>
      </section>

      <Button type="submit" disabled={isPending || !canSubmit}>
        {isPending ? "Création…" : "Créer la demande"}
      </Button>
    </form>
  );
}
