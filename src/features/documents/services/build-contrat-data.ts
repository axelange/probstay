import "server-only";

import type { CurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { AGENCY } from "@/features/documents/agency";
import { documentReference } from "@/features/documents/reference";
import { currentTemplateClauses } from "@/features/documents/services/template-service";
import { resolveClause } from "@/features/documents/template-clauses";
import { idDocLabel } from "@/features/documents/identity";
import { descriptionParagraphs } from "@/features/properties/utils/description";
import type { ContratData } from "@/features/documents/templates/contrat-location-saisonniere";

const MONEY = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
type Dec = { toNumber(): number } | null;
const n = (v: Dec) => (v ? v.toNumber() : 0);
// fr-FR groups thousands with a narrow no-break space (U+202F) and precedes €
// with a no-break space (U+00A0); the bundled font renders U+202F as a slash-
// like glyph ("8⁄500"), so normalise both to a regular space.
const money = (v: number) => MONEY.format(v).replace(/[\u202f\u00a0]/g, " ");
const date = (d: Date) => DATE.format(d);
// The master prints dates numerically everywhere except the closing "Fait à …,
// le …", which stays long-form as one writes it by hand.
const SHORT_DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const shortDate = (d: Date) => SHORT_DATE.format(d);
const addDays = (d: Date, days: number) =>
  new Date(d.getTime() + days * 86_400_000);

/**
 * A due date that collapses to "à la signature" once it falls on or before the
 * signature — the same rule the owner's Confirmation uses, so a booking made
 * inside the notice period reads the same on both documents.
 */
const dueLine = (computed: Date, signature: Date): string =>
  computed.getTime() <= signature.getTime()
    ? "À la signature du contrat"
    : shortDate(computed);
const nights = (a: Date, b: Date) =>
  Math.max(1, Math.round((b.getTime() - a.getTime()) / 86_400_000));


const fullName = (c: { firstName: string | null; lastName: string } | null) =>
  c ? [c.firstName, c.lastName].filter(Boolean).join(" ") : "—";

/**
 * Assembles the data for a "Contrat de location saisonnière" from a rental —
 * property, owner, tenant (with a company's legal identity), dates, amounts —
 * so the document (and its live preview) is pre-filled, never typed by hand.
 * Returns null if the rental is missing or the user may not see it.
 */
export async function buildContratData(
  rentalId: string,
  user: CurrentUser
): Promise<ContratData | null> {
  const rental = await prisma.rental.findFirst({
    where: { id: rentalId, archivedAt: null },
    select: {
      reference: true,
      checkIn: true,
      checkOut: true,
      guests: true,
      netOwnerAmount: true,
      commissionAmount: true,
      touristTaxAmount: true,
      touristTaxRate: true,
      grossAmount: true,
      contractSignedAt: true,
      depositAmount: true,
      securityDepositAmount: true,
      tenantAgentId: true,
      owner: {
        select: {
          firstName: true,
          lastName: true,
          kind: true,
          email: true,
          phone: true,
          address: true,
          company: { select: { paraHotelRegime: true } },
        },
      },
      property: {
        select: {
          marketingName: true,
          address: true,
          addressMore: true,
          city: true,
          zipcode: true,
          areaValue: true,
          includedServices: true,
          descriptionFr: true,
          descriptionEn: true,
          rooms: true,
          // Cover photographs, best first. APIMO ranks them; the cover shows
          // one hero over three, and it is the only place the agreement
          // carries images, so four is all that is fetched.
          pictures: {
            orderBy: { rank: "asc" as const },
            take: 4,
            select: { url: true },
          },
          bedrooms: true,
          sleeps: true,
          agentId: true,
          owner: {
            select: {
              firstName: true,
              lastName: true,
              kind: true,
              email: true,
              phone: true,
              address: true,
              company: { select: { paraHotelRegime: true } },
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

  // Visibility: MANAGE_RENTALS sees all; an agent only their own rentals.
  const isManager = hasPermission(user, "MANAGE_RENTALS");
  const isAgent =
    user.role === "AGENT" &&
    (rental.property.agentId === user.id || rental.tenantAgentId === user.id);
  if (!isManager && !isAgent) return null;

  const p = rental.property;
  const tenant = rental.tenants[0]?.contact ?? null;
  const co = tenant?.company ?? null;

  // Loyer + billed (non-included) services + tourist tax → client total.
  const rent = n(rental.grossAmount);
  const billed = rental.services.filter((sv) => !sv.includedInStay);
  const billedTotal = billed.reduce((sum, sv) => sum + n(sv.amount), 0);

  // Frozen at contract signature; the live city rate only serves the
  // pre-signature preview.
  const stayNights = nights(rental.checkIn, rental.checkOut);
  const guests = rental.guests ?? 0;
  let taxRate: number | null;
  let touristTax: number;
  if (rental.touristTaxAmount !== null) {
    taxRate = n(rental.touristTaxRate);
    touristTax = n(rental.touristTaxAmount);
  } else {
    const taxRow = p.city
      ? await prisma.$queryRaw<{ amount: number }[]>`
          SELECT amount::float8 AS amount FROM tourist_taxes
          WHERE lower(city) = lower(${p.city}) LIMIT 1`
      : [];
    taxRate = taxRow[0]?.amount ?? null;
    touristTax =
      taxRate !== null && guests > 0 ? taxRate * guests * stayNights : 0;
  }

  const owner = rental.owner ?? p.owner;

  // Parahôtellerie VAT: the owner's net is VAT-inclusive (TTC), so the 10% is
  // the portion already inside it (net − net/1.1), not added on top. Only for a
  // company owner under that regime; every other amount stays HT. The total is
  // unchanged — the VAT already sits inside grossAmount — so the line is an
  // informational "dont TVA".
  const PARA_HOTEL_VAT = 0.1;
  const paraHotel =
    owner?.kind === "COMPANY" && owner.company?.paraHotelRegime === true;
  const netOwner = n(rental.netOwnerAmount);
  const vat = paraHotel
    ? Math.round((netOwner - netOwner / (1 + PARA_HOTEL_VAT)) * 100) / 100
    : 0;
  const showVat = vat > 0;

  const total = rent + billedTotal + touristTax;

  const bedrooms = p.bedrooms ?? 0;
  const sleeps = p.sleeps ?? 0;

  // The property's own rows. Areas are printed in m² only: the agency records
  // no imperial figure, and converting one would invent precision.
  const propertyDetails: {
    label: { en: string; fr?: string };
    value: string;
  }[] = [];
  if (p.areaValue)
    propertyDetails.push({
      label: { en: "Living area", fr: "Surface" },
      value: `${p.areaValue} m²`,
    });
  if (p.rooms)
    propertyDetails.push({
      label: { en: "Number of rooms, bedrooms", fr: "Nombre de pièces, chambres" },
      value: `${p.rooms} pièces${bedrooms ? `, ${bedrooms} chambres` : ""}`,
    });
  if (sleeps || guests)
    propertyDetails.push({
      label: { en: "Maximum occupancy", fr: "Capacité maximale" },
      value: `${sleeps || guests} personnes`,
    });

  const property = {
    name: p.marketingName ?? "Le bien loué",
    address:
      [p.address, p.addressMore].filter(Boolean).join(", ") ||
      "adresse communiquée au preneur",
    city: [p.city, p.zipcode].filter(Boolean).join(" ") || "—",
    kind: "logement meublé de tourisme",
    surface: p.areaValue ? `${p.areaValue} m²` : "surface indiquée au mandat",
    rooms: p.rooms
      ? `${p.rooms} pièces${bedrooms ? ` dont ${bedrooms} chambres` : ""}`
      : "plusieurs pièces",
    sleeps: `jusqu'à ${sleeps || guests || "—"} personnes`,
    photos: p.pictures.map((pic) => pic.url),
    details: propertyDetails,
    // What the stay includes, as the agency maintains it on the property.
    includedCharges: p.includedServices,
    // Blank lines separate paragraphs in the synced text; single newlines are
    // wrapping, not structure, so only blank lines split.
    description: {
      en: descriptionParagraphs(p.descriptionEn),
      fr: descriptionParagraphs(p.descriptionFr),
    },
  };
  const stay = {
    checkIn: shortDate(rental.checkIn),
    checkOut: shortDate(rental.checkOut),
    nights: `${stayNights} nuits`,
    guests: `${guests || "—"} personnes`,
    checkInTime: AGENCY.checkInTime,
    checkOutTime: AGENCY.checkOutTime,
  };
  // Échéances. Anchored on the signature, or today while it is unsigned and
  // the document is only a draft.
  const signature = rental.contractSignedAt ?? new Date();
  const depositAmount = n(rental.depositAmount);
  const securityDepositAmount = n(rental.securityDepositAmount);
  const balanceAmount = total - depositAmount;
  const pct = (part: number) =>
    total > 0 ? `${Math.round((part / total) * 100)} %` : "—";
  // The card surcharge the payment terms quote: 5 % of the total due.
  const surcharge = Math.round(total * 5) / 100;

  // The rental is the source of truth, and the two amounts are not alike.
  //
  // The acompte is genuinely optional — a client may settle the balance
  // directly — so when there is none the document carries no deposit line, no
  // due date and no share, rather than announcing a deadline to pay nothing.
  //
  // The security deposit is not optional: every rental carries one. Its
  // absence is a defect in the rental, not a variant of the document, so it is
  // always printed and `documentReadiness` refuses to call the paperwork
  // complete without it. Hiding the section would bury the very thing that
  // needs fixing.
  const hasDeposit = depositAmount > 0;

  const moneyBlock = {
    rent: money(rent),
    balance: money(balanceAmount),
    // Percentages describe a split, so they only exist when there is one.
    depositPercent: hasDeposit ? pct(depositAmount) : undefined,
    balancePercent: hasDeposit ? pct(balanceAmount) : undefined,
    depositDue: hasDeposit ? dueLine(addDays(signature, 7), signature) : undefined,
    balanceDue: dueLine(addDays(rental.checkIn, -60), signature),
    securityDepositDue: dueLine(addDays(rental.checkIn, -30), signature),
    surcharge: money(surcharge),
    // How the tourist tax was arrived at, as the master prints it beside the
    // amount: rate × guests × nights. Absent when the town has no rate on
    // file, rather than showing a formula that resolves to nothing.
    touristTaxBasis:
      taxRate !== null && guests > 0
        ? `${taxRate.toString().replace(".", ",")} × ${guests} pers × ${stayNights} nuits`
        : undefined,
    services: billed.map((sv) => ({
      label: sv.label,
      amount: money(n(sv.amount)),
    })),
    vat: showVat ? money(vat) : undefined,
    touristTax: taxRate !== null ? money(touristTax) : "—",
    total: money(total),
    securityDeposit: money(securityDepositAmount),
    deposit: hasDeposit ? money(depositAmount) : undefined,
  };

  // The articles name the property, the dates and the deposit inline, so the
  // template's wording is interpolated from the very values printed elsewhere
  // on the page — the article and the table can never disagree.
  const { clauses } = await currentTemplateClauses("SEASONAL_RENTAL_CONTRACT");
  const variables: Record<string, string | undefined> = {
    "property.name": property.name,
    "property.kind": property.kind,
    "property.address": property.address,
    "property.city": property.city,
    "property.surface": property.surface,
    "property.rooms": property.rooms,
    "property.sleeps": property.sleeps,
    "stay.checkIn": stay.checkIn,
    "stay.checkOut": stay.checkOut,
    "stay.nights": stay.nights,
    "stay.guests": stay.guests,
    "money.securityDeposit": moneyBlock.securityDeposit,
    "money.surcharge": moneyBlock.surcharge,
  };
  const clauseKeys = ([
    "preamble",
    "agent",
    "presentation",
    "rent",
    "chargesExcluded",
    "chargesNote",
    "bankDetails",
    "securityNotice",
    "bankFees",
    "financialSummary",
    "generalUse",
    "occupancy",
    "condition",
    "keysAccess",
    "liability",
    "additionalServices",
    "nonCircumvention",
    "cancellationTenant",
    "cancellationOwner",
    "forceMajeure",
    "dataProtection",
    "nonDiscrimination",
    "validity",
    "governingLaw",
    "signatures",
    "securityDeposit",
    "paymentTerms",
    "use",
    "equipment",
    "photographs",
    "article1",
    "article2",
    "article3",
    "article4",
    "article5",
    "article6",
  ] as string[]);
  const resolvedClauses = Object.fromEntries(
    clauseKeys.map((key) => [
      key,
      resolveClause("SEASONAL_RENTAL_CONTRACT", key, clauses, variables),
    ])
  );

  // The tenant's identity, as the master's card lists it. Rows with nothing
  // behind them are dropped rather than printed empty — a contract showing a
  // blank nationality reads as an oversight.
  const tenantDetails: {
    label: { en: string; fr?: string };
    value: string;
  }[] = [];
  if (tenant?.kind !== "COMPANY") {
    const birth = tenant?.birthDate
      ? [date(tenant.birthDate), tenant.birthPlace].filter(Boolean).join(", ")
      : null;
    if (birth)
      tenantDetails.push({ label: { en: "Born in", fr: "Né(e) le" }, value: birth });
    if (tenant?.nationality)
      tenantDetails.push({
        label: { en: "Nationality", fr: "Nationalité" },
        value: tenant.nationality,
      });
    if (tenant?.idDocType && tenant?.idDocNumber)
      tenantDetails.push({
        label: idDocLabel(tenant.idDocType),
        value: `n° ${tenant.idDocNumber}`,
      });
  }
  if (tenant?.address)
    tenantDetails.push({
      label: { en: "Permanent address", fr: "Adresse permanente" },
      value: tenant.address,
    });
  if (tenant?.email)
    tenantDetails.push({ label: { en: "Email", fr: "Courriel" }, value: tenant.email });
  if (tenant?.phone)
    tenantDetails.push({ label: { en: "Phone", fr: "Téléphone" }, value: tenant.phone });

  return {
    reference: documentReference("CONTRAT", rental.reference),
    clauses: resolvedClauses,
    place: p.city ?? AGENCY.address,
    date: date(new Date()),
    agency: { ...AGENCY },
    owner: {
      name: fullName(owner),
      detail: owner?.address
        ? `Propriétaire du bien, demeurant ${owner.address}.`
        : "Propriétaire du bien ci-après désigné.",
    },
    tenant:
      tenant?.kind === "COMPANY"
        ? {
            kind: "COMPANY",
            name: tenant.lastName,
            legalForm: co?.legalForm ?? undefined,
            registrationNumber: co?.registrationNumber ?? undefined,
            registeredOffice: co?.registeredOffice ?? undefined,
            representative:
              co && (co.repFirstName || co.repLastName)
                ? [co.repFirstName, co.repLastName].filter(Boolean).join(" ")
                : undefined,
            capacity: co?.repCapacity ?? undefined,
            details: tenantDetails,
          }
        : {
            kind: "INDIVIDUAL",
            name: fullName(tenant),
            birth:
              tenant?.birthDate && tenant?.birthPlace
                ? `${date(tenant.birthDate)} à ${tenant.birthPlace}`
                : tenant?.birthDate
                  ? date(tenant.birthDate)
                  : undefined,
            nationality: tenant?.nationality ?? undefined,
            address: tenant?.address ?? undefined,
            email: tenant?.email ?? undefined,
            phone: tenant?.phone ?? undefined,
            details: tenantDetails,
          },
    property,
    stay,
    money: moneyBlock,
  };
}
