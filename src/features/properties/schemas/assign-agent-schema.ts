import { z } from "zod";

export const assignAgentSchema = z.object({
  propertyId: z.uuid(),
  // null clears the assignment.
  agentId: z.uuid().nullable(),
});

export type AssignAgentInput = z.infer<typeof assignAgentSchema>;
