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
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";

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

export type NumberRange = { min: number | null; max: number | null };

export const EMPTY_RANGE: NumberRange = { min: null, max: null };

export function isRangeActive(range: NumberRange) {
  return range.min !== null || range.max !== null;
}

function formatRangeBadge(range: NumberRange, unit: string) {
  const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);
  if (range.min !== null && range.max !== null) {
    return `${fmt(range.min)} – ${fmt(range.max)} ${unit}`;
  }
  if (range.min !== null) return `≥ ${fmt(range.min)} ${unit}`;
  return `≤ ${fmt(range.max as number)} ${unit}`;
}

/**
 * A min/max pair.
 *
 * In a Popover, not a DropdownMenu: a menu owns the keyboard — arrow
 * navigation and typeahead — so typing a number into an input inside one
 * fights it. A popover is just a container.
 */
export function RangeFilter({
  label,
  unit,
  value,
  onChange,
  placeholderMin,
  placeholderMax,
}: {
  label: string;
  unit: string;
  value: NumberRange;
  onChange: (next: NumberRange) => void;
  placeholderMin?: string;
  placeholderMax?: string;
}) {
  const active = isRangeActive(value);

  // "" clears that bound rather than becoming 0, which would filter
  // everything out the moment someone deletes what they typed.
  function parse(raw: string): number | null {
    if (raw.trim() === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  return (
    <Popover>
      <PopoverTrigger
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
                  {formatRangeBadge(value, unit)}
                </Badge>
              </>
            ) : null}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-72 space-y-3">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            aria-label={`${label} minimum`}
            placeholder={placeholderMin ?? "Min"}
            value={value.min ?? ""}
            onChange={(e) => onChange({ ...value, min: parse(e.target.value) })}
          />
          <span aria-hidden="true" className="text-muted-foreground">
            –
          </span>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            aria-label={`${label} maximum`}
            placeholder={placeholderMax ?? "Max"}
            value={value.max ?? ""}
            onChange={(e) => onChange({ ...value, max: parse(e.target.value) })}
          />
        </div>

        {active ? (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => onChange(EMPTY_RANGE)}
          >
            Effacer
          </Button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

const ALL = "all";

/**
 * A segmented control for a filter with few, permanent options — the
 * whole choice is visible without opening anything, and picking a
 * different one is a single click rather than three.
 *
 * Only worth it at this size. Eight towns belong in a dropdown.
 */
export function SegmentedFilter({
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
  return (
    <ToggleGroup
      aria-label={label}
      variant="outline"
      size="sm"
      spacing={0}
      value={[value === "" ? ALL : value]}
      onValueChange={(next) => {
        // Pressing the active item deselects it, giving []. That reads
        // as "no filter", same as choosing Tous — rather than leaving
        // nothing selected and no filter obviously applied.
        const picked = next[0];
        onChange(!picked || picked === ALL ? "" : picked);
      }}
      className="w-fit rounded-lg border p-0.5"
    >
      <ToggleGroupItem value={ALL} className="rounded-md px-3">
        Tous
      </ToggleGroupItem>
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          className="rounded-md px-3"
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
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
