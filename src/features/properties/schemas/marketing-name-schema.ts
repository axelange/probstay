import { z } from "zod";

/**
 * Never trust the form. The same rules the database enforces, stated
 * here so the user gets a message rather than a constraint violation.
 */
export const marketingNameSchema = z.object({
  propertyId: z.uuid(),
  marketingName: z
    .string()
    .trim()
    // Empty clears the name rather than storing "", which would collide
    // with every other empty one under the unique index.
    .max(120, "Le nom marketing ne peut pas dépasser 120 caractères."),
});

export type MarketingNameInput = z.infer<typeof marketingNameSchema>;
