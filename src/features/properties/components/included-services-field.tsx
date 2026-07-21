"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateIncludedServices } from "@/features/properties/actions/update-included-services";

export function IncludedServicesField({
  propertyId,
  initial,
  canEdit,
}: {
  propertyId: string;
  initial: string[];
  canEdit: boolean;
}) {
  const [services, setServices] = React.useState(initial);
  const [draft, setDraft] = React.useState("");
  const [isPending, startTransition] = React.useTransition();

  function persist(next: string[]) {
    const previous = services;
    setServices(next);
    startTransition(async () => {
      const result = await updateIncludedServices({ propertyId, services: next });
      if (result.status === "error") {
        setServices(previous);
        toast.error(result.message);
        return;
      }
      setServices(result.services);
    });
  }

  function add() {
    const value = draft.trim();
    if (!value) return;
    // A duplicate is a no-op rather than an error — the set dedupes.
    if (services.some((s) => s.toLowerCase() === value.toLowerCase())) {
      setDraft("");
      return;
    }
    persist([...services, value]);
    setDraft("");
  }

  function remove(service: string) {
    persist(services.filter((s) => s !== service));
  }

  if (!canEdit) {
    if (services.length === 0) {
      return <span className="text-muted-foreground text-sm">—</span>;
    }
    return (
      <div className="flex flex-wrap gap-1.5">
        {services.map((s) => (
          <Badge key={s} variant="secondary" className="font-normal">
            {s}
          </Badge>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {services.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {services.map((s) => (
            <Badge key={s} variant="secondary" className="gap-1 font-normal">
              {s}
              <button
                type="button"
                aria-label={`Retirer ${s}`}
                onClick={() => remove(s)}
                disabled={isPending}
                className="hover:text-foreground -mr-0.5 cursor-pointer opacity-70"
              >
                <X aria-hidden="true" className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          Aucun service inclus renseigné.
        </p>
      )}

      <div className="flex gap-2 sm:max-w-sm">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Ménage, conciergerie, chef…"
          disabled={isPending}
        />
        <Button
          type="button"
          variant="outline"
          onClick={add}
          disabled={isPending || draft.trim() === ""}
        >
          <Plus aria-hidden="true" />
          Ajouter
        </Button>
      </div>
    </div>
  );
}
