"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CityTaxRow } from "@/features/settings/services/tourist-tax-service";
import { upsertTouristTax } from "@/features/settings/actions/upsert-tourist-tax";

function TaxRow({
  city,
  amount,
  canEdit,
  onSaved,
}: {
  city: string;
  amount: number | null;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const [value, setValue] = React.useState(amount?.toString() ?? "");
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
    <li className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
      <span className="min-w-0 flex-1 truncate font-medium">{city}</span>

      {amount === null ? (
        <Badge
          variant="outline"
          className="shrink-0 border-amber-500/40 font-normal text-amber-600"
        >
          Taux manquant
        </Badge>
      ) : null}

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
        <span className="text-muted-foreground text-xs whitespace-nowrap">
          € / pers. / nuit
        </span>
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
  cities,
  canEdit,
}: {
  cities: CityTaxRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const refresh = React.useCallback(() => router.refresh(), [router]);

  if (cities.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center text-sm">
        Aucune ville — les communes apparaissent dès qu&apos;un bien y est
        rattaché.
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-lg border">
      {cities.map((row) => (
        <TaxRow
          key={row.city}
          city={row.city}
          amount={row.amount}
          canEdit={canEdit}
          onSaved={refresh}
        />
      ))}
    </ul>
  );
}
