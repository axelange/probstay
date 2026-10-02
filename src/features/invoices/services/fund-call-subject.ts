import "server-only";

import { prisma } from "@/lib/prisma";

const DAY = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Europe/Paris",
});

export type FundCallSubject = {
  /** The tenant the request is addressed to, when the booking has one. */
  clientId: string | null;
  /**
   * What the document is about, over three lines: the booking and the
   * property, where it is, and the stay itself.
   *
   *   Réservation 1241 - Appartement l'Alizé
   *   12 chemin des Oliviers, 06250 Mougins
   *   Du 12/07/2026 au 19/07/2026 · 7 nuits · 4 personnes
   *
   * Written into the document when the draft is opened, and frozen with it at
   * issue. A client reading it months later should not have to look anything
   * up: which booking, which property, where, when, and for how many.
   */
  description: string;
};

/**
 * The subject of a payment request, read from the booking.
 *
 * Nothing else is derived here. What is being asked for is the lines, and
 * those are composed separately — see the note on the catalogue entries.
 */
export async function fundCallSubject(
  rentalId: string
): Promise<FundCallSubject | null> {
  const rental = await prisma.rental.findFirst({
    where: { id: rentalId, archivedAt: null },
    select: {
      reference: true,
      checkIn: true,
      checkOut: true,
      guests: true,
      children: true,
      property: {
        select: {
          marketingName: true,
          address: true,
          addressMore: true,
          zipcode: true,
          city: true,
        },
      },
      tenants: {
        select: { contactId: true },
        orderBy: { isPrimary: "desc" },
        take: 1,
      },
    },
  });
  if (!rental) return null;

  const p = rental.property;
  const property = p.marketingName ?? p.city ?? "Sans nom";

  // Composed as the contract composes it: street then town, and nothing
  // invented when the record is thin.
  const address = [
    [p.address, p.addressMore].filter(Boolean).join(", "),
    [p.zipcode, p.city].filter(Boolean).join(" "),
  ]
    .filter((part) => part !== "")
    .join(", ");

  const nights = Math.max(
    1,
    Math.round(
      (rental.checkOut.getTime() - rental.checkIn.getTime()) / 86_400_000
    )
  );

  // The headcount as the booking records it. Children are named separately
  // because the taxe de séjour exempts them, and a client checking the tax
  // against the count should find the two agreeing.
  const guests = rental.guests ?? 0;
  const party =
    guests > 0
      ? `${guests} personne${guests > 1 ? "s" : ""}` +
        (rental.children
          ? ` dont ${rental.children} enfant${rental.children > 1 ? "s" : ""}`
          : "")
      : null;

  const stay =
    `Du ${DAY.format(rental.checkIn)} au ${DAY.format(rental.checkOut)}` +
    ` · ${nights} nuit${nights > 1 ? "s" : ""}` +
    (party ? ` · ${party}` : "");

  return {
    clientId: rental.tenants[0]?.contactId ?? null,
    description: [
      `Réservation ${rental.reference} - ${property}`,
      address || null,
      stay,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}
