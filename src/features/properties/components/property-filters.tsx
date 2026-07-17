"use client";

import { CirclePlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

/**
 * The trigger Button is written inline in each `render` rather than
 * factored into a shared component. Base UI passes the trigger's own
 * props — onClick, aria-expanded, ref — through `render`, and a wrapper
 * that doesn't spread them silently swallows the lot: the button renders
 * and does nothing.
 */

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
        render={
          <Button variant="outline" size="sm" className="border-dashed">
            <CirclePlus aria-hidden="true" />
            {label}
            {selected.length > 0 ? (
              <>
                <Separator orientation="vertical" className="mx-0.5 h-4" />
                {/* Up to two are named; beyond that a count, since three
                    town names would push the row off a phone. */}
                {selected.length > 2 ? (
                  <Badge
                    variant="secondary"
                    className="rounded-sm px-1 font-normal"
                  >
                    {selected.length} sélectionnées
                  </Badge>
                ) : (
                  selected.map((value) => (
                    <Badge
                      key={value}
                      variant="secondary"
                      className="rounded-sm px-1 font-normal"
                    >
                      {value}
                    </Badge>
                  ))
                )}
              </>
            ) : null}
          </Button>
        }
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
        {selected.length > 0 ? (
          <>
            <Separator className="my-1" />
            <DropdownMenuCheckboxItem
              checked={false}
              onCheckedChange={() => onChange([])}
              className="justify-center text-xs"
            >
              Effacer
            </DropdownMenuCheckboxItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export type SingleOption = {
  value: string;
  /** Shown in the menu, where there's room to be explicit. */
  label: string;
  /** Shown on the trigger, where "8 couchages ou plus" would not fit. */
  badge?: string;
};

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
  const active = options.find((o) => o.value === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" className="border-dashed">
            <CirclePlus aria-hidden="true" />
            {label}
            {active ? (
              <>
                <Separator orientation="vertical" className="mx-0.5 h-4" />
                <Badge
                  variant="secondary"
                  className="rounded-sm px-1 font-normal"
                >
                  {active.badge ?? active.label}
                </Badge>
              </>
            ) : null}
          </Button>
        }
      />
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          <DropdownMenuRadioItem value="">Tous</DropdownMenuRadioItem>
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
