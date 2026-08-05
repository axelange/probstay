"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateDefaultSecurityDeposit } from "@/features/properties/actions/update-default-security-deposit";

/**
 * The security deposit this property is normally let with.
 *
 * The hint below the field is the important part: agents need to know that
 * editing it will not revise rentals already created from this property, so
 * that a correction here is not mistaken for fixing an existing contract.
 */
export function DefaultSecurityDepositField({
  propertyId,
  initialValue,
  canEdit,
}: {
  propertyId: string;
  initialValue: string | null;
  canEdit: boolean;
}) {
  const [value, setValue] = React.useState(initialValue ?? "");
  const [saved, setSaved] = React.useState(initialValue ?? "");
  const [isPending, startTransition] = React.useTransition();

  const isDirty = value.trim() !== saved;

  function save() {
    startTransition(async () => {
      const result = await updateDefaultSecurityDeposit({
        propertyId,
        amount: value,
      });
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      const next = result.amount ?? "";
      setSaved(next);
      setValue(next);
      toast.success("Caution par défaut enregistrée.");
    });
  }

  if (!canEdit) {
    return (
      <p className="text-sm tabular-nums">
        {initialValue ? (
          `${initialValue} €`
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </p>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (isDirty) save();
      }}
      className="space-y-2"
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="default-security-deposit"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={isPending}
          placeholder="3000"
          className="tabular-nums sm:max-w-40"
        />
        <Button type="submit" disabled={!isDirty || isPending}>
          {isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        Reprise automatiquement sur les nouvelles locations de ce bien. Les
        locations déjà créées conservent leur montant.
      </p>
    </form>
  );
}
