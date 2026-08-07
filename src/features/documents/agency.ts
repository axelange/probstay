import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * The agency's own record — what every document prints about BSTAY itself.
 *
 * This used to be a block of constants here, which meant the footer's address
 * could only be corrected by a deploy. It is now a single row, editable in
 * Paramètres by anyone holding MANAGE_AGENCY.
 *
 * There is exactly one row (`id = 1`, enforced by a CHECK), so this reads it
 * rather than searching for it. A document cannot be issued without it: the
 * footer's legal mentions and the professional licence number are not
 * optional, so a missing row is a fault to raise rather than a blank to print.
 */
export type AgencyRecord = Awaited<ReturnType<typeof getAgency>>;

export async function getAgency() {
  const agency = await prisma.agency.findUnique({ where: { id: 1 } });
  if (!agency) {
    throw new Error(
      "agency record missing: every document prints its legal mentions"
    );
  }
  return agency;
}
