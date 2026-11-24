"use client";

import * as React from "react";

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
import {
  APIMO_SERVICES,
  SERVICE_CATEGORIES,
} from "@/features/properties/utils/apimo-services";

/**
 * Chooses the equipment of a property described by hand.
 *
 * A property of the agency's brings its equipment from APIMO. One that is not
 * on file yet gets the same list to tick from — APIMO's own, under the
 * categories b-stay.com shows it in — so what the mandate prints is worded,
 * and translated, exactly as it will be once the property is synced.
 *
 * Ticking is the edit: there is nothing to confirm, and the mandate behind the
 * dialog redraws as the list changes.
 */
export function MandateEquipmentDialog({
  selected,
  onChange,
}: {
  selected: number[];
  onChange: (selected: number[]) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const chosen = new Set(selected);

  const toggle = (id: number) =>
    onChange(
      chosen.has(id) ? selected.filter((s) => s !== id) : [...selected, id],
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" variant="outline" size="sm">
            {selected.length > 0
              ? `Modifier les équipements (${selected.length})`
              : "Choisir les équipements"}
          </Button>
        }
      />

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Équipements du bien</DialogTitle>
          <DialogDescription>
            La liste d&apos;APIMO. Chaque équipement coché s&apos;imprime à la
            section 3 du mandat, avec sa traduction.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-5 overflow-y-auto py-2 pr-1">
          {SERVICE_CATEGORIES.map((category) => {
            const items = APIMO_SERVICES.filter(
              (s) => s.category === category.id,
            );
            if (items.length === 0) return null;
            return (
              <fieldset key={category.id} className="space-y-2">
                <legend className="text-muted-foreground border-border w-full border-b pb-1 text-xs tracking-wider uppercase">
                  {category.label}
                </legend>
                <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
                  {items.map((item) => (
                    <label
                      key={item.id}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="size-4 shrink-0 cursor-pointer"
                        checked={chosen.has(item.id)}
                        onChange={() => toggle(item.id)}
                      />
                      <span>
                        {item.fr}
                        {item.en !== item.fr ? (
                          <span className="text-muted-foreground">
                            {" "}
                            / {item.en}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          })}
        </div>

        <DialogFooter>
          {selected.length > 0 ? (
            <Button type="button" variant="ghost" onClick={() => onChange([])}>
              Tout décocher
            </Button>
          ) : null}
          <Button type="button" onClick={() => setOpen(false)}>
            Terminé
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
