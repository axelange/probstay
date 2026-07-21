"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TouristTaxRow } from "@/features/settings/services/tourist-tax-service";
import { upsertTouristTax } from "@/features/settings/actions/upsert-tourist-tax";

function TaxRow({
  city,
  amount,
  canEdit,
  onSaved,
}: {
  city: string;
  amount: number;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const [value, setValue] = React.useState(amount.toString());
  const [isPending, startTransition] = React.useTransition();
  const dirty = value.trim() !== "" && Number(value) !== amount;

  function save() {
    startTransition(async () => {
      const result = await upsertTouristTax({ city, amount: value });
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      toast.success(`${city} enregistré.`);
      onSaved();
    });
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3 text-sm">
      <span className="min-w-0 flex-1 truncate font-medium">{city}</span>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          step="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={isPending || !canEdit}
          aria-label={`Taxe de séjour ${city}`}
          className="w-28 text-right tabular-nums"
        />
        <span className="text-muted-foreground text-xs">€ / pers. / nuit</span>
        {canEdit ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={save}
            disabled={!dirty || isPending}
          >
            {isPending ? "…" : "Enregistrer"}
          </Button>
        ) : null}
      </div>
    </li>
  );
}

export function TouristTaxSettings({
  taxes,
  citiesWithoutTax,
  canEdit,
}: {
  taxes: TouristTaxRow[];
  citiesWithoutTax: string[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const refresh = React.useCallback(() => router.refresh(), [router]);

  const [newCity, setNewCity] = React.useState("");
  const [newAmount, setNewAmount] = React.useState("");
  const [adding, setAdding] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  function add() {
    startTransition(async () => {
      const result = await upsertTouristTax({ city: newCity, amount: newAmount });
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      toast.success(`${newCity} ajouté.`);
      setAdding(false);
      setNewCity("");
      setNewAmount("");
      refresh();
    });
  }

  return (
    <div className="space-y-6">
      <ul className="divide-y rounded-lg border">
        {taxes.map((tax) => (
          <TaxRow
            key={tax.id}
            city={tax.city}
            amount={tax.amount}
            canEdit={canEdit}
            onSaved={refresh}
          />
        ))}
        {taxes.length === 0 ? (
          <li className="text-muted-foreground px-4 py-6 text-center text-sm">
            Aucune taxe de séjour définie.
          </li>
        ) : null}
      </ul>

      {/* The gap made visible: property cities with no rate yet. One click
          fills the form so the admin only types the amount. */}
      {citiesWithoutTax.length > 0 && canEdit ? (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs">
            Villes de vos biens sans taux — une location dans ces communes ne
            pourra pas afficher sa taxe :
          </p>
          <div className="flex flex-wrap gap-2">
            {citiesWithoutTax.map((city) => (
              <Button
                key={city}
                type="button"
                variant="outline"
                size="sm"
                className="border-dashed"
                disabled={isPending}
                onClick={() => {
                  setAdding(true);
                  setNewCity(city);
                  setNewAmount("");
                }}
              >
                <Plus aria-hidden="true" />
                {city}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {canEdit && adding ? (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border p-3">
          <div className="space-y-2">
            <Label htmlFor="new-city">Ville</Label>
            <Input
              id="new-city"
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              disabled={isPending}
              className="w-48"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-amount">€ / pers. / nuit</Label>
            <Input
              id="new-amount"
              type="number"
              min={0}
              step="0.01"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              disabled={isPending}
              className="w-32 text-right tabular-nums"
            />
          </div>
          <Button
            type="button"
            size="sm"
            onClick={add}
            disabled={isPending || !newCity.trim() || newAmount.trim() === ""}
          >
            Ajouter
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setAdding(false)}
            disabled={isPending}
          >
            Annuler
          </Button>
        </div>
      ) : canEdit ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setAdding(true);
            setNewCity("");
            setNewAmount("");
          }}
        >
          <Plus aria-hidden="true" />
          Ajouter une ville
        </Button>
      ) : null}
    </div>
  );
}
