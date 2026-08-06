"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateMandatePreference } from "@/features/preferences/actions/update-mandate-preference";

const OPTIONS = [
  { value: "RENTALS", label: "Locations saisonnières" },
  { value: "SALES", label: "Ventes" },
  { value: "BOTH", label: "Les deux" },
];

/**
 * The mandates the Biens list opens on.
 *
 * Saves on change rather than behind a button: it is one choice that affects
 * only what this person sees, so a confirmation step would be ceremony. The
 * note beneath says what it does and — as importantly — what it does not,
 * since a preference that looked like a permission would be worrying.
 */
export function MandatePreferenceField({
  initialValue,
}: {
  initialValue: string;
}) {
  const router = useRouter();
  const [value, setValue] = React.useState(initialValue);
  const [isPending, startTransition] = React.useTransition();

  function save(next: string) {
    const previous = value;
    setValue(next);
    startTransition(async () => {
      const result = await updateMandatePreference({ mandatePreference: next });
      if (result.status === "error") {
        setValue(previous);
        toast.error(result.message);
        return;
      }
      toast.success("Préférence enregistrée.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Select
        value={value}
        onValueChange={(v) => v !== null && v !== value && save(v)}
        items={OPTIONS}
        disabled={isPending}
      >
        <SelectTrigger className="w-full sm:max-w-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-muted-foreground text-xs">
        Détermine le filtre « Mandat » à l&apos;ouverture de la page Biens. Le
        filtre reste visible et modifiable&nbsp;: rien ne vous est masqué.
      </p>
    </div>
  );
}
