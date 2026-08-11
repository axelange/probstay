"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateRentalNotes } from "@/features/rentals/actions/update-rental-notes";

/**
 * The booking's internal notes.
 *
 * Multi-line, because what an agent writes here is rarely one line: an owner's
 * preference, a key handover, what was agreed on the phone.
 */
export function RentalNotesField({
  rentalId,
  initial,
  canManage,
}: {
  rentalId: string;
  initial: string;
  canManage: boolean;
}) {
  const [value, setValue] = React.useState(initial);
  const [saved, setSaved] = React.useState(initial);
  const [isPending, startTransition] = React.useTransition();

  const isDirty = value.trim() !== saved;

  function save() {
    startTransition(async () => {
      const result = await updateRentalNotes({ rentalId, notes: value });
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      const next = value.trim();
      setValue(next);
      setSaved(next);
      toast.success("Notes enregistrées.");
    });
  }

  if (!canManage) {
    return value ? (
      <p className="text-sm whitespace-pre-wrap">{value}</p>
    ) : (
      <p className="text-muted-foreground text-sm">Aucune note.</p>
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
      <textarea
        id="rental-notes"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={isPending}
        rows={4}
        placeholder="Ce qui doit suivre la location d'un bout à l'autre…"
        className="border-input bg-background focus-visible:ring-ring/50 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px] disabled:opacity-50"
      />
      {isDirty ? (
        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() => setValue(saved)}
          >
            Annuler
          </Button>
        </div>
      ) : null}
    </form>
  );
}
