import "server-only";

import { prisma } from "@/lib/prisma";

export type CityTaxRow = {
  city: string;
  amount: number | null;
  updatedByName: string | null;
};

/**
 * A tourist-tax row for every commune that holds a property — and only
 * those. The city list is drawn from the portfolio, not typed by hand:
 * you set a rate for a place you actually let, nowhere else. Cities with
 * no rate yet come back with a null amount.
 *
 * Matched case-insensitively, since property cities come from APIMO and
 * the rates are entered by an admin.
 */
export async function listCityTaxRates(): Promise<CityTaxRow[]> {
  return prisma.$queryRaw<CityTaxRow[]>`
    SELECT
      p.city AS city,
      t.amount::float8 AS amount,
      u."fullName" AS "updatedByName"
    FROM (
      SELECT DISTINCT city
      FROM properties
      WHERE city IS NOT NULL AND "archivedAt" IS NULL
    ) p
    LEFT JOIN tourist_taxes t ON lower(t.city) = lower(p.city)
    LEFT JOIN users u ON u.id = t."updatedById"
    ORDER BY p.city
  `;
}
