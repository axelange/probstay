"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * A dropdown that reads as a filter rather than a menu: it says what is
 * currently selected, and highlights itself once it stops being "all",
 * so an active filter can't be missed and mistaken for missing data.
 */
function FilterTrigger({
  label,
  isActive,
}: {
  label: string;
  isActive: boolean;
}) {
  return (
    <Button
      variant="outline"
      className={isActive ? "border-primary/50 bg-primary/5" : undefined}
    >
      {label}
      <ChevronDown aria-hidden="true" className="opacity-50" />
    </Button>
  );
}

export function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const isActive = selected.length > 0;
  const text = !isActive
    ? label
    : selected.length === 1
      ? selected[0]
      : `${label} (${selected.length})`;

  function toggle(option: string) {
    onChange(
      selected.includes(option)
        ? selected.filter((s) => s !== option)
        : [...selected, option]
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<FilterTrigger label={text} isActive={isActive} />}
      />
      <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option}
            checked={selected.includes(option)}
            onCheckedChange={() => toggle(option)}
            // Without this the menu closes on every tick, which makes
            // picking three towns a chore.
            closeOnClick={false}
          >
            {option}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export type SingleOption = { value: string; label: string };

export function SingleSelectFilter({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: SingleOption[];
  /** Empty string means no filter. */
  value: string;
  onChange: (next: string) => void;
}) {
  const isActive = value !== "";
  const active = options.find((o) => o.value === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <FilterTrigger label={active?.label ?? label} isActive={isActive} />
        }
      />
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          <DropdownMenuRadioItem value="">{label} — tous</DropdownMenuRadioItem>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ActiveFilterCount({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="text-muted-foreground flex items-center gap-1 text-xs">
      <Check aria-hidden="true" className="size-3" />
      {count} filtre{count > 1 ? "s" : ""}
    </span>
  );
}
