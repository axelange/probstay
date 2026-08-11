"use client";

import * as React from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon, SearchIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A select you can type into.
 *
 * A plain select is fine for a handful of options; it stops working at the
 * agency's fifty-odd properties and five thousand contacts, where finding a
 * name means scrolling a list that is only ordered alphabetically if you
 * already know how the name was spelled.
 *
 * Built on Base UI's Combobox so the filtering, keyboard handling and the
 * listbox semantics come from the library rather than from us — the same
 * reason the Select wrapper exists next to it.
 */

export type ComboboxOption = {
  value: string;
  label: string;
  /** Shown greyed beside the label: a town, a reference, an email. */
  hint?: string;
};

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Rechercher…",
  emptyLabel = "Aucun résultat.",
  disabled,
  id,
  className,
}: {
  options: ComboboxOption[];
  value: string | null;
  onValueChange: (value: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}) {
  const selected = options.find((o) => o.value === value) ?? null;

  return (
    <ComboboxPrimitive.Root
      items={options}
      value={selected}
      onValueChange={(next: ComboboxOption | null) => {
        if (next) onValueChange(next.value);
      }}
      // The options carry a hint, so the text a search matches on is not the
      // label alone — a property is as often found by its town as its name.
      itemToStringLabel={(item: ComboboxOption) =>
        item.hint ? `${item.label} ${item.hint}` : item.label
      }
      disabled={disabled}
    >
      <div className={cn("relative", className)}>
        <SearchIcon
          aria-hidden="true"
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        />
        <ComboboxPrimitive.Input
          id={id}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "border-input bg-background flex h-9 w-full rounded-md border py-1 pr-9 pl-9 text-sm",
            "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        />
        <ComboboxPrimitive.Trigger
          disabled={disabled}
          aria-label="Ouvrir la liste"
          className="text-muted-foreground absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer disabled:cursor-not-allowed"
        >
          <ChevronDownIcon aria-hidden="true" className="size-4" />
        </ComboboxPrimitive.Trigger>
      </div>

      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Positioner sideOffset={4} className="z-50">
          <ComboboxPrimitive.Popup
            className={cn(
              "bg-popover text-popover-foreground max-h-72 w-[var(--anchor-width)] overflow-y-auto",
              "rounded-md border p-1 shadow-md"
            )}
          >
            <ComboboxPrimitive.Empty className="text-muted-foreground px-2 py-3 text-sm">
              {emptyLabel}
            </ComboboxPrimitive.Empty>
            <ComboboxPrimitive.List>
              {(item: ComboboxOption) => (
                <ComboboxPrimitive.Item
                  key={item.value}
                  value={item}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                    "data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                  )}
                >
                  <ComboboxPrimitive.ItemIndicator className="size-4 shrink-0">
                    <CheckIcon aria-hidden="true" className="size-4" />
                  </ComboboxPrimitive.ItemIndicator>
                  <span className="min-w-0 flex-1 truncate">
                    {item.label}
                    {item.hint ? (
                      <span className="text-muted-foreground ml-2 text-xs">
                        {item.hint}
                      </span>
                    ) : null}
                  </span>
                </ComboboxPrimitive.Item>
              )}
            </ComboboxPrimitive.List>
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </ComboboxPrimitive.Root>
  );
}
