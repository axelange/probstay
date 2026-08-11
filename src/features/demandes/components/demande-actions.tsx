"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, RotateCcw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { convertDemande } from "@/features/demandes/actions/convert-demande";
import { setDemandeLost } from "@/features/demandes/actions/set-demande-outcome";
import { Combobox } from "@/components/ui/combobox";

type PropertyChoice = {
  id: string;
  marketingName: string | null;
  city: string | null;
};

function label(p: PropertyChoice) {
  return [p.marketingName ?? p.city ?? "Sans nom", p.city]
    .filter(Boolean)
    .join(" — ");
}

export function DemandeActions({
  demandeId,
  status,
  convertedRentalId,
  properties,
  defaultPropertyId,
  defaultCheckIn,
  defaultCheckOut,
}: {
  demandeId: string;
  status: "pending" | "converted" | "lost";
  convertedRentalId: string | null;
  /** Villas this user may convert onto — their own, or all for an admin. */
  properties: PropertyChoice[];
  /** The demande's own property, pre-selected when it is bookable. */
  defaultPropertyId: string;
  defaultCheckIn: string;
  defaultCheckOut: string;
}) {
  const router = useRouter();
  const [propertyId, setPropertyId] = React.useState(defaultPropertyId);
  const [checkIn, setCheckIn] = React.useState(defaultCheckIn);
  const [checkOut, setCheckOut] = React.useState(defaultCheckOut);
  const [isPending, startTransition] = React.useTransition();

  if (status === "converted") {
    return (
      <div className="space-y-2 rounded-lg border p-4 text-sm">
        <p className="font-medium">Demande convertie</p>
        {convertedRentalId ? (
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href={`/rentals/${convertedRentalId}`} />}
          >
            Voir la location
            <ArrowRight aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    );
  }

  function convert() {
    startTransition(async () => {
      const result = await convertDemande({
        demandeId,
        propertyId,
        checkIn,
        checkOut,
      });
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      toast.success("Demande convertie en location.");
      router.push(`/rentals/${result.rentalId}`);
    });
  }

  function setLost(lost: boolean) {
    startTransition(async () => {
      const result = await setDemandeLost(demandeId, lost);
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      toast.success(lost ? "Demande marquée perdue." : "Demande rouverte.");
      router.refresh();
    });
  }

  if (status === "lost") {
    return (
      <div className="space-y-3 rounded-lg border p-4 text-sm">
        <p className="text-muted-foreground">Demande perdue.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setLost(false)}
          disabled={isPending}
        >
          <RotateCcw aria-hidden="true" />
          Rouvrir
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-medium">Convertir en location</h3>
        <p className="text-muted-foreground text-xs">
          Choisissez le bien retenu et confirmez les dates. La location
          s&apos;ouvrira à l&apos;étape Informations.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="convert-villa">Bien retenu</Label>
        <p className="text-muted-foreground text-xs">
          N&apos;importe quel bien que vous gérez — pas seulement ceux de la
          demande.
        </p>
        <Combobox
          id="convert-villa"
          value={propertyId || null}
          onValueChange={setPropertyId}
          options={properties.map((p) => ({ value: p.id, label: label(p) }))}
          placeholder="Rechercher un bien…"
          emptyLabel="Aucun bien ne correspond."
          disabled={isPending}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="convert-in">Arrivée</Label>
          <Input
            id="convert-in"
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="convert-out">Départ</Label>
          <Input
            id="convert-out"
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            disabled={isPending}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t pt-4">
        <Button
          type="button"
          onClick={convert}
          disabled={isPending || !propertyId || !checkIn || !checkOut}
        >
          Convertir en location
          <ArrowRight aria-hidden="true" />
        </Button>
        <button
          type="button"
          onClick={() => setLost(true)}
          disabled={isPending}
          className="text-muted-foreground hover:text-destructive ml-auto inline-flex cursor-pointer items-center gap-1 text-xs"
        >
          <XCircle aria-hidden="true" className="size-3.5" />
          Marquer perdue
        </button>
      </div>
    </div>
  );
}
