import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * A property as shown in the list.
 *
 * Deliberately a narrow projection rather than the whole row. Confidential
 * fields (internal notes, owner, commission) are not selected at all, so
 * they can't leak into the client bundle by accident — the Agent
 * restriction is a column-level rule, and RLS only works row by row, so
 * this is where it has to be enforced.
 */
export type PropertyListItem = Awaited<
  ReturnType<typeof listProperties>
>[number];

export async function listProperties() {
  return prisma.property.findMany({
    // Business objects are archived, never deleted.
    where: { archivedAt: null },
    select: {
      id: true,
      reference: true,
      city: true,
      zipcode: true,
      district: true,
      type: true,
      rooms: true,
      bedrooms: true,
      sleeps: true,
      areaValue: true,
      priceValue: true,
      priceMax: true,
      priceCurrency: true,
      pricePeriod: true,
      agent: { select: { id: true, fullName: true } },
      pictures: {
        // Lowest rank wins, rather than matching rank = 1: three of the
        // 52 have no rank-1 picture and would otherwise render as
        // photo-less despite having photos.
        // Only one thumbnail is shown, so fetching all 961 rows to use
        // 52 of them would be pointless work.
        orderBy: { rank: "asc" },
        take: 1,
        select: { url: true },
      },
    },
    orderBy: [{ city: "asc" }, { reference: "asc" }],
  });
}

export async function countProperties() {
  return prisma.property.count({ where: { archivedAt: null } });
}
