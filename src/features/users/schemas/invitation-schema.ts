import { z } from "zod";
import { Role } from "@/generated/prisma/enums";

export const STAFF_EMAIL_DOMAIN = "@b-stay.com";

/**
 * The same rules the database enforces, restated so the user gets a
 * message instead of a constraint violation.
 *
 * Email is lowercased rather than merely validated: it is the join key
 * to the Google identity at sign-in, and the table carries a
 * `email = lower(email)` CHECK. Doing it here means a capitalised
 * address is accepted and normalised instead of rejected.
 */
export const invitationSchema = z
  .object({
    email: z
      .email("Adresse e-mail invalide.")
      .trim()
      .toLowerCase()
      .max(255, "L'adresse e-mail est trop longue."),
    role: z.enum(Role),
    isExternal: z.boolean().default(false),
  })
  .refine(
    (value) => value.isExternal || value.email.endsWith(STAFF_EMAIL_DOMAIN),
    {
      // Mirrors the CHECK: isExternal OR email LIKE '%@b-stay.com'.
      path: ["email"],
      message: `Une invitation interne doit utiliser une adresse ${STAFF_EMAIL_DOMAIN}.`,
    }
  );

export type InvitationInput = z.infer<typeof invitationSchema>;
