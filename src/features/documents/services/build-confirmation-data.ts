import "server-only";

import type { CurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { AGENCY } from "@/features/documents/agency";
import type {
  ConfirmationData,
  Bilingual,
} from "@/features/documents/templates/rental-confirmation";

const MONEY = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
// The house charte prints due dates numerically (DD/MM/YYYY).
const SHORT_DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

type Dec = { toNumber(): number } | null;
const n = (v: Dec) => (v ? v.toNumber() : 0);
const money = (v: number) => MONEY.format(v);
const shortDate = (d: Date) => SHORT_DATE.format(d);
const nights = (a: Date, b: Date) =>
  Math.max(1, Math.round((b.getTime() - a.getTime()) / 86_400_000));
const addDays = (d: Date, days: number) =>
  new Date(d.getTime() + days * 86_400_000);

const fullName = (c: { firstName: string | null; lastName: string } | null) =>
  c ? [c.firstName, c.lastName].filter(Boolean).join(" ") : "—";

/**
 * A payment line whose due date collapses to "à la signature" once it lands
 * on or before the contract signature. That single rule expresses the
 * agency's schedule: the balance falls 60 days before arrival and the
 * security deposit 30 days before, so for a last-minute booking both dates
 * are already in the past at signing and are simply due then — which is why,
 * under two months out, the tenant pays the whole balance at signature.
 */
function dueLine(computed: Date, signature: Date): string {
  return computed.getTime() <= signature.getTime()
    ? "À la signature du contrat"
    : shortDate(computed);
}

/**
 * Assembles the data for a "Rental Confirmation" (owner-facing house charte)
 * from a rental — parties, property, stay, services, the financial total and
 * the payment schedule (échéances) — so the document and its live preview are
 * pre-filled, never typed by hand. Returns null if the rental is missing or
 * the user may not see it.
 */
export async function buildConfirmationData(
  rentalId: string,
  user: CurrentUser
): Promise<ConfirmationData | null> {
  const rental = await prisma.rental.findFirst({
    where: { id: rentalId, archivedAt: null },
    select: {
      checkIn: true,
      checkOut: true,
      guests: true,
      contractSignedAt: true,
      grossAmount: true,
      netOwnerAmount: true,
      depositAmount: true,
      securityDepositAmount: true,
      touristTaxAmount: true,
      touristTaxRate: true,
      tenantAgentId: true,
      owner: {
        select: {
          firstName: true,
          lastName: true,
          kind: true,
          email: true,
          phone: true,
          company: {
            select: {
              repFirstName: true,
              repLastName: true,
              repCapacity: true,
              paraHotelRegime: true,
            },
          },
        },
      },
      property: {
        select: {
          marketingName: true,
          address: true,
          addressMore: true,
          city: true,
          zipcode: true,
          agentId: true,
          includedServices: true,
          owner: {
            select: {
              firstName: true,
              lastName: true,
              kind: true,
              email: true,
              phone: true,
              company: {
                select: {
                  repFirstName: true,
                  repLastName: true,
                  repCapacity: true,
                  paraHotelRegime: true,
                },
              },
            },
          },
        },
      },
      services: {
        select: { label: true, amount: true, includedInStay: true },
        orderBy: { createdAt: "asc" },
      },
      tenants: {
        where: { isPrimary: true },
        take: 1,
        select: {
          contact: {
            select: {
              firstName: true,
              lastName: true,
              kind: true,
              email: true,
              phone: true,
              address: true,
              birthDate: true,
              birthPlace: true,
              nationality: true,
              idDocType: true,
              idDocNumber: true,
              company: {
                select: {
                  legalForm: true,
                  registrationNumber: true,
                  registeredOffice: true,
                  repFirstName: true,
                  repLastName: true,
                  repCapacity: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!rental) return null;

  // Visibility mirrors the contract builder: MANAGE_RENTALS sees all; an agent
  // only their own rentals (property agent or tenant-side co-agent).
  const isManager = hasPermission(user, "MANAGE_RENTALS");
  const isAgent =
    user.role === "AGENT" &&
    (rental.property.agentId === user.id || rental.tenantAgentId === user.id);
  if (!isManager && !isAgent) return null;

  const p = rental.property;
  const tenant = rental.tenants[0]?.contact ?? null;
  const owner = rental.owner ?? p.owner;

  // ── Amounts ──────────────────────────────────────────────────────────────
  // THE OWNER'S DOCUMENT: it states what the owner EARNS from this rental — the
  // Net Propriétaire — and whether he earns it as acompte + solde or as a
  // single balance. Taxe de séjour and the caution are client charges and live
  // only on the tenant's Contrat, never here.
  const ownerEarnings = n(rental.netOwnerAmount);

  // The client total is computed only to derive the acompte fraction: if the
  // tenant pays a deposit that is X% of what they owe, the owner earns the same
  // fraction of his net upfront.
  const rent = n(rental.grossAmount);
  const billedTotal = rental.services
    .filter((sv) => !sv.includedInStay)
    .reduce((sum, sv) => sum + n(sv.amount), 0);
  const stayNights = nights(rental.checkIn, rental.checkOut);
  const guests = rental.guests ?? 0;
  let clientTax = 0;
  if (rental.touristTaxAmount !== null) {
    clientTax = n(rental.touristTaxAmount);
  } else if (p.city) {
    const taxRow = await prisma.$queryRaw<{ amount: number }[]>`
      SELECT amount::float8 AS amount FROM tourist_taxes
      WHERE lower(city) = lower(${p.city}) LIMIT 1`;
    const taxRate = taxRow[0]?.amount ?? null;
    clientTax = taxRate !== null && guests > 0 ? taxRate * guests * stayNights : 0;
  }
  const clientTotal = rent + billedTotal + clientTax;

  // Parahôtellerie VAT: the net is entered VAT-INCLUSIVE (TTC), so the 10% is
  // the portion already inside it (net − net/1.1), shown as an informational
  // "dont TVA" line — it never changes what the owner earns.
  const PARA_HOTEL_VAT = 0.1;
  const paraHotel =
    owner?.kind === "COMPANY" && owner.company?.paraHotelRegime === true;
  const vat = paraHotel
    ? Math.round((ownerEarnings - ownerEarnings / (1 + PARA_HOTEL_VAT)) * 100) / 100
    : 0;
  const showVat = vat > 0;

  // ── Payment schedule (only when the rental carries an acompte) ────────────
  // Anchor on the signature: contractSignedAt when signed, else today (the
  // confirmation is produced around signing, and the preview has no date yet).
  const signature = rental.contractSignedAt ?? new Date();
  const deposit = n(rental.depositAmount);
  const depositFraction = clientTotal > 0 ? deposit / clientTotal : 0;
  const ownerAcompte = Math.round(ownerEarnings * depositFraction * 100) / 100;

  const payments: ConfirmationData["payments"] = [];
  if (ownerAcompte > 0) {
    // Acompte + solde: the owner earns part upfront (7 days after signature),
    // the rest at the balance.
    payments.push({
      label: { en: "Deposit", fr: "Acompte" },
      amount: money(ownerAcompte),
      due: dueLine(addDays(signature, 7), signature),
    });
  }
  // Balance falls due 60 days before arrival; the whole net when no acompte.
  payments.push({
    label: { en: "Balance", fr: "Solde" },
    amount: money(ownerEarnings - ownerAcompte),
    due: dueLine(addDays(rental.checkIn, -60), signature),
  });

  // ── Services (informational — what the stay includes) ─────────────────────
  const included: Bilingual[] = [
    ...p.includedServices.map((label) => ({ en: label })),
    ...rental.services
      .filter((sv) => sv.includedInStay)
      .map((sv) => ({ en: sv.label })),
  ];
  // The "payable by the lessee" column is tenant-facing; the owner's document
  // omits it.
  const notIncluded: Bilingual[] = [];

  // ── Financial summary: what the owner earns ───────────────────────────────
  const financialRows: ConfirmationData["financial"]["rows"] = [
    { label: { en: "Owner net earnings", fr: "Net propriétaire" }, amount: money(ownerEarnings) },
  ];
  if (showVat) {
    financialRows.push({
      label: {
        en: "of which VAT 10% (para-hotel)",
        fr: "dont TVA 10 % (parahôtellerie)",
      },
      amount: money(vat),
    });
  }
  const total = ownerEarnings;

  // ── Parties ──────────────────────────────────────────────────────────────
  const ownerRep = (
    c: {
      kind: string;
      company: {
        repFirstName: string | null;
        repLastName: string | null;
        repCapacity: string | null;
      } | null;
    } | null
  ): string | undefined => {
    if (!c || c.kind !== "COMPANY" || !c.company) return undefined;
    const name = [c.company.repFirstName, c.company.repLastName]
      .filter(Boolean)
      .join(" ");
    if (!name) return undefined;
    return c.company.repCapacity ? `${name}, ${c.company.repCapacity}` : name;
  };
  const contactLine = (c: { email: string | null; phone: string | null } | null) =>
    c ? [c.email, c.phone].filter(Boolean).join(" — ") || undefined : undefined;

  const ownerName =
    owner?.kind === "COMPANY" ? owner.lastName : fullName(owner);

  // Tenant identity lines (individual: birth, address, ID; company: legal form,
  // registration, registered office, representative).
  const co = tenant?.company ?? null;
  const tenantLines: string[] = [];
  let tenantName = fullName(tenant);
  if (tenant?.kind === "COMPANY") {
    tenantName = tenant.lastName;
    if (co?.legalForm) tenantLines.push(co.legalForm);
    if (co?.registrationNumber)
      tenantLines.push(`Immatriculation n° ${co.registrationNumber}`);
    if (co?.registeredOffice) tenantLines.push(co.registeredOffice);
    const rep = co ? [co.repFirstName, co.repLastName].filter(Boolean).join(" ") : "";
    if (rep)
      tenantLines.push(
        co?.repCapacity
          ? `Représentée par ${rep}, ${co.repCapacity}`
          : `Représentée par ${rep}`
      );
  } else if (tenant) {
    if (tenant.birthDate)
      tenantLines.push(
        tenant.birthPlace
          ? `Né(e) le ${shortDate(tenant.birthDate)} à ${tenant.birthPlace}`
          : `Né(e) le ${shortDate(tenant.birthDate)}`
      );
    if (tenant.address) tenantLines.push(tenant.address);
    if (tenant.nationality) tenantLines.push(tenant.nationality);
    if (tenant.idDocType && tenant.idDocNumber)
      tenantLines.push(`${idDocLabel(tenant.idDocType)} n° ${tenant.idDocNumber}`);
    const contact = contactLine(tenant);
    if (contact) tenantLines.push(contact);
  }

  return {
    reference: `BS-${rentalId.slice(0, 8).toUpperCase()}`,
    agency: {
      legalName: AGENCY.legalName,
      address: AGENCY.address,
      rcs: AGENCY.rcs,
      cartePro: AGENCY.cartePro,
      garantieFinanciere: AGENCY.garantieFinanciere,
      rcp: AGENCY.rcp,
      web: AGENCY.web,
      phone: AGENCY.phone,
    },
    owner: {
      name: ownerName,
      representedBy: ownerRep(owner),
      contact: contactLine(owner),
    },
    tenant: { name: tenantName, lines: tenantLines },
    property: {
      name: p.marketingName ?? "Le bien loué",
      address:
        [p.address, p.addressMore, [p.city, p.zipcode].filter(Boolean).join(" ")]
          .filter(Boolean)
          .join(" — ") || "adresse communiquée au preneur",
      // The caution is a tenant charge; it is absent from the owner's document.
      securityDeposit: undefined,
    },
    stay: {
      checkIn: shortDate(rental.checkIn),
      checkOut: shortDate(rental.checkOut),
      duration: `${stayNights} nights / nuits`,
      occupancy: `${guests || "—"} guests / occupants`,
    },
    services: { included, notIncluded },
    financial: { rows: financialRows, total: money(total) },
    payments,
    // Static legal prose — the house charte's clauses, agency-wide.
    cancellation: CANCELLATION,
    framework: FRAMEWORK,
    esign: ESIGN,
    signature: {
      owner: {
        name: owner?.kind === "COMPANY" ? owner.lastName : fullName(owner),
        representedBy: ownerRep(owner),
      },
      agent: {
        name: AGENCY.name,
        representedBy: `${AGENCY.signatory}, ${AGENCY.signatoryTitle}`,
      },
    },
  };
}

function idDocLabel(type: string): string {
  switch (type) {
    case "PASSPORT":
      return "Passeport";
    case "ID_CARD":
      return "Carte d'identité";
    case "DRIVING_LICENSE":
      return "Permis de conduire";
    default:
      return "Pièce d'identité";
  }
}

const CANCELLATION: ConfirmationData["cancellation"] = {
  en: [
    "The booking shall become firm and binding upon signature of this Rental Confirmation and payment of the sums due by the Tenant.",
    "In the event of cancellation by the Tenant, for any reason whatsoever, no refund shall be made and the full rental amount shall remain payable to the Owner.",
    "In the event of cancellation by the Owner, all sums received shall be refunded to the Tenant.",
    "Force majeure events, as defined by applicable law, shall not give rise to any compensation by either Party.",
  ],
  fr: [
    "La réservation devient ferme et définitive dès signature de la présente Confirmation de location et paiement des sommes dues par le Locataire.",
    "En cas d'annulation par le Locataire, pour quelque cause que ce soit, aucun remboursement ne pourra être effectué et la totalité du loyer restera due au Propriétaire.",
    "En cas d'annulation par le Propriétaire, les sommes effectivement perçues seront restituées au Locataire.",
    "Les cas de force majeure, tels que définis par la réglementation en vigueur, ne donnent lieu à aucune indemnisation de part et d'autre.",
  ],
};

const FRAMEWORK: ConfirmationData["framework"] = {
  en: [
    "This Rental Confirmation constitutes a binding agreement between the Parties.",
    "It forms part of the overall contractual framework governing the rental and shall be read in conjunction with the applicable rental terms.",
  ],
  fr: [
    "La présente Confirmation de location constitue un accord ferme entre les Parties.",
    "Elle s'inscrit dans le cadre contractuel global régissant la location et doit être lue conjointement avec les conditions de location applicables.",
  ],
};

const ESIGN: ConfirmationData["esign"] = {
  en: [
    "The Parties agree that this document may be signed electronically and that such electronic signature shall have the same legal value as a handwritten signature.",
    "The date of signature shall correspond to the date of electronic validation.",
    "Each Party acknowledges having received a copy of this document.",
  ],
  fr: [
    "Les Parties conviennent que le présent document pourra être signé par voie électronique, laquelle aura la même valeur juridique qu'une signature manuscrite.",
    "La date de signature correspond à la date de validation électronique.",
    "Chaque Partie reconnaît avoir reçu un exemplaire du présent document.",
  ],
};
