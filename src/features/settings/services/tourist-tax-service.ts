import "server-only";

import { prisma } from "@/lib/prisma";

export type TouristTaxRow = Awaited<
  ReturnType<typeof listTouristTaxes>
>[number];

function toNumber(value: { toNumber(): number }): number {
  return value.toNumber();
}

/** Every tourist-tax rate, with who last changed it. */
export async function listTouristTaxes() {
  const rows = await prisma.touristTax.findMany({
    select: {
      id: true,
      city: true,
      amount: true,
      updatedAt: true,
      updatedBy: { select: { fullName: true } },
    },
    orderBy: { city: "asc" },
  });
  return rows.map((r) => ({ ...r, amount: toNumber(r.amount) }));
}

/**
 * Cities that hold properties but have no tourist-tax rate.
 *
 * Surfaced in Settings so the gap is visible: a rate missing here means a
 * rental in that commune cannot show its tourist tax. Matched
 * case-insensitively, since property cities come from APIMO and the rates
 * are typed by hand.
 */
export async function listCitiesWithoutTax(): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ city: string }[]>`
    SELECT DISTINCT p.city
    FROM properties p
    WHERE p.city IS NOT NULL
      AND p."archivedAt" IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM tourist_taxes t
        WHERE lower(t.city) = lower(p.city)
      )
    ORDER BY p.city
  `;
  return rows.map((r) => r.city);
}
