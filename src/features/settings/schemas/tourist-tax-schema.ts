import { z } from "zod";

/**
 * A tourist-tax rate: a commune and its euros-per-person-per-night.
 *
 * Keyed on the city, so saving an existing one updates it and a new one
 * creates it — the same upsert whether the admin is revising Cannes or
 * adding Ramatuelle.
 */
export const touristTaxSchema = z.object({
  city: z
    .string()
    .trim()
    .min(1, "La ville est obligatoire.")
    .max(120, "Nom de ville trop long."),
  amount: z.coerce
    .number("Montant invalide.")
    .min(0, "Le montant ne peut pas être négatif.")
    .max(1000, "Montant invraisemblable."),
});

export type TouristTaxInput = z.infer<typeof touristTaxSchema>;
