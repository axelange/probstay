"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const LANGUAGES = ["FR", "EN"] as const;
type Language = (typeof LANGUAGES)[number];

/**
 * A free-text line kept in French and in English.
 *
 * One input, and a "FR | EN" switch facing the label that says which of the
 * two it is showing. French is the one a fiche opens on: it is the reference
 * the documents fall back to, and the only one most records will ever have.
 * The English is what the bilingual documents print beside it.
 *
 * Both values live in the parent's form state; this only chooses which one is
 * on screen, so switching language never loses what was typed in the other.
 */
export function BilingualField({
  id,
  label,
  fr,
  en,
  onChangeFr,
  onChangeEn,
  placeholder,
  disabled,
}: {
  id: string;
  label: string;
  fr: string;
  en: string;
  onChangeFr: (value: string) => void;
  onChangeEn: (value: string) => void;
  /** Shown for the French line only: the examples are French words. */
  placeholder?: string;
  disabled?: boolean;
}) {
  const [language, setLanguage] = React.useState<Language>("FR");
  const isFrench = language === "FR";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <div
          role="group"
          aria-label={`Langue du champ ${label}`}
          className="text-muted-foreground flex items-center gap-1 text-xs"
        >
          {LANGUAGES.map((l, i) => (
            <React.Fragment key={l}>
              {i > 0 ? <span aria-hidden>|</span> : null}
              {/* Not disabled with the input: reading the other language is
                  not an edit, and a read-only fiche still has two to show. */}
              <button
                type="button"
                onClick={() => setLanguage(l)}
                aria-pressed={language === l}
                className={cn(
                  "hover:text-foreground cursor-pointer rounded-sm px-0.5 transition-colors",
                  language === l && "text-foreground font-bold",
                )}
              >
                {l}
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>
      <Input
        id={id}
        lang={isFrench ? "fr" : "en"}
        placeholder={isFrench ? placeholder : "English"}
        value={isFrench ? fr : en}
        onChange={(e) =>
          isFrench ? onChangeFr(e.target.value) : onChangeEn(e.target.value)
        }
        disabled={disabled}
        autoComplete="off"
      />
    </div>
  );
}
