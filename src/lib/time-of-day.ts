import { z } from "zod";

/**
 * An hour of the day, stored as the text the documents print ("16h00").
 *
 * Not a time column: these are a printed line, never compared or added, and a
 * time-of-day type would drag a time zone into a value that has none. What is
 * stored is normalised so two properties don't print the hour two ways.
 *
 * "16h00", "16:00", "16h" and "16" all mean the same hour to whoever is typing
 * it, so all four are accepted and written back as "16h00"; "9h5" is "09h05".
 *
 * Minutes need a separator. Without that rule "99" parsed as 09h09 — two digits
 * with nothing between them are an hour, or they are a typo, and a typo that
 * turns into a plausible time is the one nobody catches before signature.
 */
const PATTERN = /^([01]?\d|2[0-3])(?:\s*[h:]\s*([0-5]?\d)?)?$/;

export function normaliseTimeOfDay(value: string): string | null {
  const match = PATTERN.exec(value.trim());
  if (!match) return null;
  const [, hours = "0", minutes = "0"] = match;
  return `${hours.padStart(2, "0")}h${minutes.padStart(2, "0")}`;
}

/** Required: the property's own hours, which every one of them has. */
export const timeOfDay = z
  .string()
  .trim()
  .transform((value) => normaliseTimeOfDay(value))
  .refine((value): value is string => value !== null, "Heure invalide.");

/**
 * Optional override: blank means "as the property", not midnight.
 *
 * Blank and invalid are kept apart on purpose. Folding a typo into null would
 * silently drop the agent's late check-out back to the property's hour, and
 * the contract would print an agreement nobody made.
 */
export const optionalTimeOfDay = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z
    .union([z.literal(""), timeOfDay])
    .transform((value) => (value === "" ? null : value))
    .optional()
);
