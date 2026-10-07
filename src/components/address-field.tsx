"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import type { AddressSuggestion } from "@/app/api/geo/address/route";

/**
 * A street line that suggests full addresses as it is typed.
 *
 * Suggestions are a convenience laid over fields that stay editable: picking
 * one fills street, postcode, city and country in a single gesture, and typing
 * over any of them afterwards is expected rather than a correction. Nothing
 * here is required for the form to work — the service can be down, the address
 * can be absent from OpenStreetMap, and the client still fills the four boxes
 * by hand.
 *
 * It is not built on the shared Combobox: that one is handed its options and
 * searches within them, where these arrive from a server one keystroke at a
 * time. Bending it to fetch would have made it worse at its own job.
 */
/** Below this, a search matches half a continent and is not worth the trip. */
const MIN_QUERY = 3;

export function AddressField({
  id,
  value,
  onChange,
  onPick,
  disabled,
  placeholder,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  /** Called when a suggestion is taken, with every field it resolved. */
  onPick: (s: AddressSuggestion) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [items, setItems] = React.useState<AddressSuggestion[]>([]);
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(-1);
  // Set when a suggestion is taken, so the effect below does not immediately
  // search for the text it just wrote and reopen the list under the cursor.
  const justPicked = React.useRef(false);

  React.useEffect(() => {
    if (justPicked.current) {
      justPicked.current = false;
      return;
    }
    // A query too short to search leaves early without touching state: a
    // synchronous setState here would re-render the field on every keystroke
    // below the threshold. Clearing the list when the text shrinks is the
    // typing handler's job instead, which is where the event actually is.
    const q = value.trim();
    if (q.length < MIN_QUERY) return;

    // Both guards matter. The timer keeps a fast typist from sending a request
    // per character; the abort means that when one does overtake another, the
    // older answer cannot land last and overwrite the newer list.
    const abort = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/geo/address?q=${encodeURIComponent(q)}`,
          { signal: abort.signal }
        );
        if (!res.ok) return;
        const data = (await res.json()) as { suggestions?: AddressSuggestion[] };
        setItems(data.suggestions ?? []);
        setOpen((data.suggestions ?? []).length > 0);
        setActive(-1);
      } catch {
        // An aborted or failed lookup leaves the field exactly as it was.
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [value]);

  function take(s: AddressSuggestion) {
    justPicked.current = true;
    onPick(s);
    setOpen(false);
    setItems([]);
  }

  return (
    <div className="relative">
      <Input
        id={id}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        // The browser's own suggestions would sit on top of these.
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        onChange={(e) => {
          const next = e.target.value;
          onChange(next);
          if (next.trim().length < MIN_QUERY) {
            setItems([]);
            setOpen(false);
          }
        }}
        onBlur={() => {
          // Deferred: a click on a suggestion blurs the input first, and
          // closing the list immediately would remove what was being clicked.
          setTimeout(() => setOpen(false), 150);
        }}
        onKeyDown={(e) => {
          if (!open || items.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => (i + 1) % items.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
          } else if (e.key === "Enter" && active >= 0) {
            // Only with a row highlighted: otherwise Enter belongs to the form.
            e.preventDefault();
            take(items[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && items.length > 0 ? (
        <ul
          role="listbox"
          className="bg-popover text-popover-foreground border-border absolute z-50 mt-1 w-full overflow-hidden border shadow-md"
        >
          {items.map((s, i) => (
            <li key={`${s.label}-${i}`}>
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                className={`w-full px-3 py-2 text-left text-sm ${
                  i === active ? "bg-accent text-accent-foreground" : ""
                }`}
                onMouseEnter={() => setActive(i)}
                // mousedown, not click: the input's blur fires first and would
                // have closed the list before a click could land.
                onMouseDown={(e) => {
                  e.preventDefault();
                  take(s);
                }}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
