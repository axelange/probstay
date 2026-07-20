"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignAgent } from "@/features/properties/actions/assign-agent";

// Base UI's Select reserves "" for the placeholder state, so the
// unassigned option needs its own sentinel value.
const UNASSIGNED = "unassigned";

export function AgentAssignField({
  propertyId,
  initialAgentId,
  agents,
  canEdit,
  fallback,
}: {
  propertyId: string;
  initialAgentId: string | null;
  agents: { id: string; fullName: string }[];
  canEdit: boolean;
  /** Static "Agent" display, shown while this control is disabled. */
  fallback: React.ReactNode;
}) {
  const [value, setValue] = React.useState(initialAgentId ?? UNASSIGNED);
  const [isPending, startTransition] = React.useTransition();

  if (!canEdit) {
    return <>{fallback}</>;
  }

  function handleChange(next: string | null) {
    if (next === null) return;
    const previous = value;
    setValue(next);

    startTransition(async () => {
      const result = await assignAgent({
        propertyId,
        agentId: next === UNASSIGNED ? null : next,
      });

      if (result.status === "error") {
        setValue(previous);
        toast.error(result.message);
        return;
      }

      toast.success("Agent mis à jour.");
    });
  }

  return (
    <Select value={value} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger size="sm" className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED}>Non assigné</SelectItem>
        {agents.map((agent) => (
          <SelectItem key={agent.id} value={agent.id}>
            {agent.fullName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
