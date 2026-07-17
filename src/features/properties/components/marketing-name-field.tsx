"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateMarketingName } from "@/features/properties/actions/update-marketing-name";

export function MarketingNameField({
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
      const result = await updateMarketingName({
        propertyId,
        marketingName: value,
      });

      if (result.status === "error") {
        toast.error(result.message);
        return;
      }

      const next = result.marketingName ?? "";
      setSaved(next);
      setValue(next);
      toast.success("Nom marketing enregistré.");
    });
  }

  if (!canEdit) {
    return (
      <p className="text-sm">
        {initialValue ?? <span className="text-muted-foreground">—</span>}
      </p>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (isDirty) save();
      }}
      className="flex flex-col gap-2 sm:flex-row"
    >
      <Input
        id="marketing-name"
        name="marketingName"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Villa Alba"
        maxLength={120}
        disabled={isPending}
        aria-describedby="marketing-name-help"
        className="sm:max-w-xs"
      />
      <Button type="submit" disabled={!isDirty || isPending}>
        {isPending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}
