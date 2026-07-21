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
import { assignDemandeAgent } from "@/features/demandes/actions/assign-demande-agent";

const UNASSIGNED = "unassigned";

export function AssignAgentField({
  demandeId,
  initialAgentId,
  agents,
  spansMultipleAgents,
}: {
  demandeId: string;
  initialAgentId: string | null;
  agents: { id: string; fullName: string }[];
  /** True when no single agent manages every property — assignment is
   *  the only way an agent gets to see this demande. */
  spansMultipleAgents: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = React.useState(initialAgentId ?? UNASSIGNED);
  const [isPending, startTransition] = React.useTransition();

  function change(next: string | null) {
    if (next === null) return;
    const previous = value;
    setValue(next);
    startTransition(async () => {
      const result = await assignDemandeAgent({
        demandeId,
        agentId: next === UNASSIGNED ? null : next,
      });
      if (result.status === "error") {
        setValue(previous);
        toast.error(result.message);
        return;
      }
      toast.success("Agent assigné.");
      router.refresh();
    });
  }

  const items = [
    { value: UNASSIGNED, label: "Non assigné" },
    ...agents.map((a) => ({ value: a.id, label: a.fullName })),
  ];

  return (
    <div className="space-y-2">
      <Select value={value} onValueChange={change} items={items} disabled={isPending}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((i) => (
            <SelectItem key={i.value} value={i.value}>
              {i.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {spansMultipleAgents && value === UNASSIGNED ? (
        <p className="text-xs text-amber-600">
          Plusieurs agents gèrent ces biens — assignez la demande pour
          qu&apos;un agent puisse la voir.
        </p>
      ) : null}
    </div>
  );
}
