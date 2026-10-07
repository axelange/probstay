"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { COUNTRIES } from "@/lib/countries";

/**
 * The 250 countries as search options, built once for the module.
 *
 * The English name rides along as the hint, which the Combobox folds into the
 * text it matches on — so "Germany" finds Allemagne and "Deutschland" finds
 * nothing, which is the right trade for a form filled in by French staff and
 * English-speaking clients.
 */
const OPTIONS: ComboboxOption[] = COUNTRIES.map((c) => ({
  value: c.code,
  label: c.fr,
  hint: c.en === c.fr ? undefined : c.en,
}));

/** One country, stored as its ISO 3166-1 alpha-2 code. */
export function CountryField({
  id,
  value,
  onChange,
  placeholder = "Rechercher un pays…",
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <Combobox
      id={id}
      options={OPTIONS}
      value={value || null}
      onValueChange={onChange}
      placeholder={placeholder}
      emptyLabel="Aucun pays."
      disabled={disabled}
    />
  );
}

/**
 * Up to `max` nationalities, as country codes.
 *
 * One row per nationality held, plus a button to add another until the cap.
 * The cap is a prop and the column behind it is uncapped, so raising it is a
 * change here rather than a migration.
 *
 * A country already chosen is removed from the remaining rows' options: the
 * same nationality twice is not a thing, and letting it be picked only to
 * drop it silently on save would leave the form showing something the
 * database does not hold.
 */
export function NationalitiesField({
  value,
  onChange,
  max = 3,
  disabled,
}: {
  value: string[];
  onChange: (codes: string[]) => void;
  max?: number;
  disabled?: boolean;
}) {
  // The rows on screen are held here rather than derived from `value`, because
  // a row the user has opened but not yet answered is a real state and `value`
  // cannot represent it: an empty code is not a nationality, so it never
  // travels upward. Derived, the blank row vanished the moment another row was
  // touched, and the "add" button appeared to do nothing.
  const [rows, setRows] = React.useState<string[]>(
    value.length > 0 ? value : [""]
  );

  const commit = (next: string[]) => {
    setRows(next.length > 0 ? next : [""]);
    onChange(next.filter(Boolean));
  };

  const full = rows.filter(Boolean).length;

  return (
    <div className="space-y-2">
      {rows.map((code, i) => (
        <div key={i} className="flex items-center gap-2">
          <Combobox
            // A country already held is dropped from the other rows: the same
            // nationality twice is not a thing, and allowing the pick only to
            // discard it on save would leave the form showing what the
            // database does not hold.
            options={OPTIONS.filter(
              (o) => o.value === code || !rows.includes(o.value)
            )}
            value={code || null}
            onValueChange={(v) =>
              commit(rows.map((r, j) => (j === i ? v : r)))
            }
            placeholder={i === 0 ? "Rechercher un pays…" : "Autre nationalité…"}
            emptyLabel="Aucun pays."
            disabled={disabled}
            className="flex-1"
          />
          {rows.length > 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              aria-label="Retirer cette nationalité"
              onClick={() => commit(rows.filter((_, j) => j !== i))}
            >
              ×
            </Button>
          ) : null}
        </div>
      ))}
      {/* Offered only once every open row is answered, so the form cannot grow
          a column of blanks. */}
      {full === rows.length && rows.length < max ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => setRows([...rows, ""])}
        >
          Ajouter une nationalité
        </Button>
      ) : null}
    </div>
  );
}
