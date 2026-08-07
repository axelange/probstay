"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateCheckTimes } from "@/features/properties/actions/update-check-times";

/**
 * The hours this property turns over.
 *
 * Both are saved together: a villa moved to a later arrival almost always
 * moves its departure too, and a contract quoting one new hour beside one old
 * one would be wrong in a way nobody would spot.
 */
export function CheckTimesField({
  propertyId,
  checkInTime,
  checkOutTime,
  canEdit,
}: {
  propertyId: string;
  checkInTime: string;
  checkOutTime: string;
  canEdit: boolean;
}) {
  // Both columns are NOT NULL with a default, so these are always strings in
  // a healthy build. They arrive undefined when the running server holds a
  // Prisma client generated before the migration — the column simply isn't in
  // its SELECT. Coerced rather than trusted: an empty field the agent can fix
  // is a better failure than a page that won't render.
  const initial = {
    checkInTime: checkInTime ?? "",
    checkOutTime: checkOutTime ?? "",
  };
  const [values, setValues] = React.useState(initial);
  const [saved, setSaved] = React.useState(initial);
  const [isPending, startTransition] = React.useTransition();

  const isDirty =
    values.checkInTime.trim() !== saved.checkInTime ||
    values.checkOutTime.trim() !== saved.checkOutTime;

  function save() {
    startTransition(async () => {
      const result = await updateCheckTimes({ propertyId, ...values });
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      // Echo back what was stored rather than what was typed: "16" is saved as
      // "16h00", and the field should show the form the contract will print.
      const next = {
        checkInTime: result.checkInTime,
        checkOutTime: result.checkOutTime,
      };
      setValues(next);
      setSaved(next);
      toast.success("Horaires enregistrés.");
    });
  }

  if (!canEdit) {
    return (
      <p className="text-sm tabular-nums">
        Arrivée à partir de {saved.checkInTime || "—"} — départ avant{" "}
        {saved.checkOutTime || "—"}
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
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="check-in-time" className="text-xs">
            Arrivée à partir de
          </Label>
          <Input
            id="check-in-time"
            value={values.checkInTime}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                checkInTime: event.target.value,
              }))
            }
            disabled={isPending}
            placeholder="16h00"
            className="w-28 tabular-nums"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="check-out-time" className="text-xs">
            Départ avant
          </Label>
          <Input
            id="check-out-time"
            value={values.checkOutTime}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                checkOutTime: event.target.value,
              }))
            }
            disabled={isPending}
            placeholder="10h00"
            className="w-28 tabular-nums"
          />
        </div>
        <Button type="submit" disabled={!isDirty || isPending}>
          {isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        Repris tel quel sur le contrat de location de ce bien.
      </p>
    </form>
  );
}
