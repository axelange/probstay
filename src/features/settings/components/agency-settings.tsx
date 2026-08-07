"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateAgency } from "@/features/settings/actions/update-agency";
import type { AgencyInput } from "@/features/settings/schemas/agency-schema";

/**
 * The agency's own record.
 *
 * One form, saved whole: these values are read together on every document, and
 * saving a new address without the matching RCS would print a contradiction.
 * The groups follow where each value appears on the page — masthead, footer,
 * parties clause, transfer details — so a correction can be found from the
 * document rather than from the column name.
 */

type Field = {
  name: keyof AgencyInput;
  label: string;
  hint?: string;
  wide?: boolean;
};

const GROUPS: { title: string; note: string; fields: Field[] }[] = [
  {
    title: "Identité",
    note: "En-tête des documents.",
    fields: [
      { name: "name", label: "Nom commercial", hint: "B·STAY" },
      { name: "tagline", label: "Signature", hint: "Locations d'exception" },
    ],
  },
  {
    title: "Mentions légales",
    note: "Bas de page de chaque document, et clause des parties.",
    fields: [
      { name: "legalName", label: "Raison sociale", hint: "SAS BSTAY" },
      { name: "legalForm", label: "Forme juridique", hint: "SAS" },
      { name: "capital", label: "Capital social", hint: "50 000 €" },
      { name: "address", label: "Siège social", wide: true },
      { name: "rcs", label: "RCS" },
      { name: "cartePro", label: "Carte professionnelle" },
      { name: "garantieFinanciere", label: "Garantie financière", wide: true },
      { name: "rcp", label: "RCP", wide: true },
      { name: "web", label: "Site" },
      { name: "phone", label: "Téléphone" },
    ],
  },
  {
    title: "Représentation",
    note: "Qui signe pour l'agence, et à quel titre.",
    fields: [
      { name: "representedBy", label: "Représentée par" },
      { name: "capacity", label: "En qualité de", hint: "Présidente" },
    ],
  },
  {
    title: "Coordonnées bancaires",
    note: "Imprimées sur le contrat, à côté de l'avertissement qui indique au locataire qu'un changement d'IBAN reçu par courriel est une fraude. Elles ne se modifient qu'ici.",
    fields: [
      { name: "bankName", label: "Banque" },
      { name: "bankAccountName", label: "Titulaire du compte" },
      { name: "bankIban", label: "IBAN", wide: true },
      { name: "bankBic", label: "BIC" },
    ],
  },
];

export function AgencySettings({
  agency,
  canEdit,
}: {
  agency: AgencyInput;
  canEdit: boolean;
}) {
  const [values, setValues] = React.useState(agency);
  const [saved, setSaved] = React.useState(agency);
  const [isPending, startTransition] = React.useTransition();

  const isDirty = (Object.keys(saved) as (keyof AgencyInput)[]).some(
    (key) => values[key].trim() !== saved[key]
  );

  function save() {
    startTransition(async () => {
      const result = await updateAgency(values);
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      const trimmed = Object.fromEntries(
        Object.entries(values).map(([key, value]) => [key, value.trim()])
      ) as AgencyInput;
      setValues(trimmed);
      setSaved(trimmed);
      toast.success("Informations de l'agence enregistrées.");
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (isDirty) save();
      }}
      className="space-y-6"
    >
      {GROUPS.map((group) => (
        <fieldset key={group.title} className="space-y-3">
          <legend className="sr-only">{group.title}</legend>
          <div className="space-y-1">
            <h4 className="text-sm font-medium">{group.title}</h4>
            <p className="text-muted-foreground text-xs">{group.note}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {group.fields.map((field) => (
              <div
                key={field.name}
                className={`space-y-1.5 ${field.wide ? "sm:col-span-2" : ""}`}
              >
                <Label htmlFor={`agency-${field.name}`} className="text-xs">
                  {field.label}
                </Label>
                <Input
                  id={`agency-${field.name}`}
                  value={values[field.name]}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [field.name]: event.target.value,
                    }))
                  }
                  disabled={!canEdit || isPending}
                  {...(field.hint ? { placeholder: field.hint } : {})}
                />
              </div>
            ))}
          </div>
        </fieldset>
      ))}

      {canEdit ? (
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={!isDirty || isPending}>
            {isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
          {isDirty ? (
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={() => setValues(saved)}
            >
              Annuler
            </Button>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
