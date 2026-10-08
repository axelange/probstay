import "server-only";

import { getAgency } from "@/features/documents/agency";
import {
  ARTICLES,
  isList,
  isSlot,
  type Article,
} from "@/features/documents/concierge-clauses";
import { apimoImageWidth } from "@/features/properties/utils/apimo-image";
import {
  servicesFor,
  TIERS,
  type Bilingual,
  type ConciergeTier,
} from "@/features/documents/concierge-packages";
import {
  euros,
  parseAmount,
  pdfSafe,
  quarterlyInstalments,
} from "@/features/documents/concierge-schedule";
import type { ConciergeData } from "@/features/documents/templates/contrat-conciergerie";
import { canSeePropertyConfidential } from "@/features/properties/utils/property-access";
import type { CurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Fills the clause text's `{{tokens}}` and hands back a fresh set of articles.
 *
 * Deep-copied rather than mutated: ARTICLES is a module-level constant, and a
 * substitution written into it would leak one client's fee into the next
 * contract drawn on the same server process.
 *
 * A token with nothing behind it prints as "[à compléter]" rather than
 * silently vanishing — a blank where a figure belongs reads as an oversight on
 * a contract, which is what it is.
 */
function fillArticles(
  values: Record<string, string | Bilingual>,
  tier: ConciergeTier,
): Article[] {
  // A value may be bilingual, and one is: the package's own name. Filled from
  // a single string, the English half of every clause read "Within the
  // Essentiel package" — ten times over, since {{tier}} carries the headings
  // of 4.1 and 4.2 as well. A figure or a date is the same in both languages
  // and stays a plain string.
  const fill = (t: string, lang: "en" | "fr") =>
    t.replace(/\{\{(\w+)\}\}/g, (_, k: string) => {
      const v = values[k];
      return (typeof v === "string" ? v : v?.[lang]) || "[à compléter]";
    });
  const bi = (x: { en: string; fr: string }) => ({
    en: fill(x.en, "en"),
    fr: fill(x.fr, "fr"),
  });

  return ARTICLES.map((a) => ({
    ...a,
    title: bi(a.title),
    // Clauses that do not belong to this package are dropped here rather than
    // hidden in the template: a sentence the contract never shows should not
    // reach the component that draws it.
    blocks: a.blocks
      .filter(
        (blk) =>
          isSlot(blk) ||
          isList(blk) ||
          !blk.onlyFor ||
          blk.onlyFor.includes(tier),
      )
      .map((blk) => {
        if (isSlot(blk)) return blk;
        if (isList(blk)) {
          return {
            ...blk,
            sub: blk.sub ? bi(blk.sub) : undefined,
            intro: blk.intro ? bi(blk.intro) : undefined,
            items: blk.items.map(bi),
          };
        }
        return {
          ...blk,
          sub: blk.sub ? bi(blk.sub) : undefined,
          text: bi(blk.text),
        };
      }),
  }));
}

/** What the preview hands over: everything the agent chose or typed. */
export type ConciergeInput = {
  contactId: string;
  tier: ConciergeTier;
  bilingual: boolean;
  /** As typed — every package is priced after the agent's visit. */
  fee: string;
  /** yyyy-mm-dd, the day the agreement takes effect. */
  startDate: string;
  /** Article 5.2: what BSTAY may commit without asking, per intervention. */
  threshold: string;
  /** Article 5.3: the ceiling for emergency measures. */
  emergency: string;
  fund: { amount: string; threshold: string } | null;
  /** A property of the agency's, or one described by hand. */
  propertyId?: string | null;
  manualProperty?: {
    label: string;
    address: string;
    kind: string;
    surface: string;
    rooms: string;
  } | null;
  place: string;
};

/** The cover's hero and its three thumbnails, at the sizes they print. */
const COVER_HERO_WIDTH = 1440;
const COVER_THUMB_WIDTH = 400;

const clean = (v: string | null | undefined) => {
  const t = (v ?? "").trim();
  return t.length > 0 ? t : null;
};

/** "12/03/2026", the short form the instalment rows use. */
function shortDate(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR").format(d);
}

/** "12 mars 2026", the form the other documents print. */
function frenchDate(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/**
 * Assembles a concierge agreement from a contact, a package and a few typed
 * figures.
 *
 * Unlike the rental documents, almost nothing here is derived: the fee is set
 * after a visit, the fund is negotiated, and the residence may not be one the
 * agency manages at all. What the database supplies is the client's identity
 * and, when it is one of ours, the property — the rest is the agent's.
 */
export async function buildConciergeData(
  input: ConciergeInput,
  user: CurrentUser,
): Promise<ConciergeData | null> {
  // The residence is resolved first, because when it is one of ours it decides
  // who the client is: an agreement to look after a property is signed by the
  // person who owns it. Settled here rather than in the form — the form can
  // show whatever it likes, but a request naming one property and a different
  // contact must not produce a contract binding the wrong party.
  const picked = input.propertyId
    ? await prisma.property.findUnique({
        where: { id: input.propertyId },
        select: {
          marketingName: true,
          city: true,
          address: true,
          zipcode: true,
          rooms: true,
          bedrooms: true,
          ownerId: true,
          agentId: true,
          // Four: a hero and a row of three, as the Seasonal Agreement's cover
          // takes them. The same widths too — the hero is printed at roughly
          // four times the thumbnails' size, and asking APIMO for a 1440 px
          // thumbnail would weigh the file down for nothing.
          pictures: {
            select: { url: true },
            orderBy: { rank: "asc" },
            take: 4,
          },
        },
      })
    : null;

  // Naming a property's owner is naming the property's confidential side, and
  // the agency already has a rule for that: managers see every owner, an agent
  // only the owners of the properties assigned to them. Without this check the
  // "the property decides the client" rule would become a way to read any
  // owner's name — ask for a contract on their villa and the contract answers.
  if (picked && !canSeePropertyConfidential(user, picked)) {
    return null;
  }

  // The owner wins over the contact the form sent. Falls back to it only when
  // the property has no owner on file, which leaves the agent a way through
  // rather than an error they cannot act on.
  const clientId = picked?.ownerId ?? input.contactId;

  const [agency, contact] = await Promise.all([
    getAgency(),
    prisma.contact.findFirst({
      where: { id: clientId, archivedAt: null },
      select: {
        firstName: true,
        lastName: true,
        kind: true,
        address: true,
        addressLine2: true,
        postalCode: true,
        city: true,
        country: true,
        company: {
          select: {
            legalForm: true,
            registrationNumber: true,
            registeredOffice: true,
            officeLine2: true,
            officePostalCode: true,
            officeCity: true,
            repFirstName: true,
            repLastName: true,
            repCapacity: true,
          },
        },
      },
    }),
  ]);
  if (!contact) return null;

  const co = contact.company;
  const isCompany = contact.kind === "COMPANY";

  // A company contracts under its name alone; an individual under both names.
  const name = isCompany
    ? (clean(contact.lastName) ?? "—")
    : [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim() ||
      "—";

  // The registered office for a company, the home address for a person — the
  // same distinction the contact model already draws.
  const address = isCompany
    ? [
        co?.registeredOffice,
        co?.officeLine2,
        [co?.officePostalCode, co?.officeCity].filter(Boolean).join(" "),
      ]
        .map(clean)
        .filter(Boolean)
        .join(", ")
    : [
        contact.address,
        contact.addressLine2,
        [contact.postalCode, contact.city].filter(Boolean).join(" "),
      ]
        .map(clean)
        .filter(Boolean)
        .join(", ");

  const representedBy = isCompany
    ? clean([co?.repFirstName, co?.repLastName].filter(Boolean).join(" "))
    : null;

  // The residence: one of ours, or one described by hand for a client whose
  // property the agency does not hold. Either way the contract names it —
  // the paper contract this replaces never did, which is its worst defect.
  let property: ConciergeData["property"] = null;
  if (picked) {
    const p = picked;
    property = {
      label: clean(p.marketingName) ?? clean(p.city) ?? "—",
      address:
        [clean(p.address), [p.zipcode, p.city].filter(Boolean).join(" ")]
          .filter(Boolean)
          .join(", ") || undefined,
      photos: p.pictures.map((pic, i) =>
        apimoImageWidth(
          pic.url,
          i === 0 ? COVER_HERO_WIDTH : COVER_THUMB_WIDTH,
        ),
      ),
      details: [
        ...(p.rooms
          ? [{ label: { en: "Rooms", fr: "Pièces" }, value: String(p.rooms) }]
          : []),
        ...(p.bedrooms
          ? [
              {
                label: { en: "Bedrooms", fr: "Chambres" },
                value: String(p.bedrooms),
              },
            ]
          : []),
      ],
    };
  } else if (input.manualProperty && clean(input.manualProperty.label)) {
    const m = input.manualProperty;
    property = {
      label: m.label.trim(),
      address: clean(m.address) ?? undefined,
      details: [
        ...(clean(m.kind)
          ? [{ label: { en: "Type", fr: "Nature" }, value: m.kind.trim() }]
          : []),
        ...(clean(m.surface)
          ? [
              {
                label: { en: "Living area", fr: "Surface" },
                value: m.surface.trim(),
              },
            ]
          : []),
        ...(clean(m.rooms)
          ? [{ label: { en: "Rooms", fr: "Pièces" }, value: m.rooms.trim() }]
          : []),
      ],
    };
  }

  // A start date that cannot be read falls back to today rather than throwing:
  // the preview is a form being filled in, and an empty date field should show
  // a document, not an error.
  const parsed = new Date(input.startDate);
  const start = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const monthly = parseAmount(input.fee);

  return {
    place: input.place,
    date: frenchDate(new Date()),
    bilingual: input.bilingual,
    agency: {
      ...agency,
      name: agency.legalName,
      legalForm: agency.legalForm ?? "SAS",
      representedBy: agency.representedBy ?? "",
      capacity: agency.capacity ?? "",
    },
    client: {
      name,
      isCompany,
      address: address || undefined,
      legalForm: clean(co?.legalForm) ?? undefined,
      registrationNumber: clean(co?.registrationNumber) ?? undefined,
      representedBy: representedBy ?? undefined,
      capacity: clean(co?.repCapacity) ?? undefined,
    },
    property,
    tier: input.tier,
    tierName: TIERS[input.tier].name,
    articles: fillArticles(
      {
        tier: TIERS[input.tier].name,
        startDate: frenchDate(start),
        fee: monthly === null ? "" : euros(monthly),
        threshold: pdfSafe(input.threshold),
        emergency: pdfSafe(input.emergency),
        provision: input.fund ? pdfSafe(input.fund.amount) : "",
        // The agency's own address for data-protection requests. Taken from the
        // agency record so it cannot drift from the footer.
        gdprEmail: agency.web
          ? `contact@${agency.web.replace(/^www\./, "")}`
          : "",
      },
      input.tier,
    ),
    startDate: frenchDate(start),
    monthlyFee: monthly === null ? "—" : `${euros(monthly)} HT / mois`,
    instalments:
      monthly === null
        ? []
        : quarterlyInstalments(start, monthly).map((i) => ({
            quarter: i.quarter,
            invoicedOn: shortDate(i.invoicedOn),
            // "HT" on every line. The article's own wording says the fee is
            // net of VAT, but a column of figures is read on its own, and a
            // quarterly total that might be gross is a question nobody should
            // have to go back up the page to answer.
            amount: `${euros(i.amount)} HT`,
          })),
    fund: input.fund
      ? {
          amount: pdfSafe(input.fund.amount),
          threshold: pdfSafe(input.fund.threshold),
        }
      : null,
    services: servicesFor(input.tier),
  };
}
