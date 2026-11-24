import "server-only";

import { getAgency } from "@/features/documents/agency";
import { englishOf } from "@/features/documents/bilingual-text";
import type { Bilingual } from "@/features/documents/concierge-packages";
import {
  inProse,
  pdfSafe,
  typedEuros,
} from "@/features/documents/concierge-schedule";
import {
  MANDATE_ARTICLES,
  type MandateArticle,
} from "@/features/documents/mandate-clauses";
import type { MandateInput } from "@/features/documents/schemas/mandate-schema";
import type {
  MandateData,
  MandateRow,
} from "@/features/documents/templates/mandat-gestion-locative";
import { propertyTypeLabel } from "@/features/properties/utils/apimo-labels";
import { descriptionForContract } from "@/features/properties/utils/description";
import { canSeePropertyConfidential } from "@/features/properties/utils/property-access";
import type { CurrentUser } from "@/lib/auth";
import { birthPlaceLabel, nationalitiesLabel } from "@/lib/countries";
import { prisma } from "@/lib/prisma";

/**
 * What a value the agency has not supplied prints as.
 *
 * Not a blank: a mandate is entered in a register and a gap where the
 * registration number belongs is an oversight to be seen on the preview, not
 * discovered once it is signed. The other agreements print the same words.
 */
const MISSING = "[à compléter]";

const clean = (v: string | null | undefined) => {
  const t = pdfSafe(v ?? "").trim();
  return t.length > 0 ? t : null;
};

/** A date field's yyyy-mm-dd, read as that calendar day wherever this runs. */
function shortDay(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const d = typeof value === "string" ? new Date(`${value}T00:00:00Z`) : value;
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC" }).format(d);
}

const row = (
  fr: string,
  en: string | undefined,
  value: string | null | undefined,
  valueEn?: string | null,
): MandateRow => ({
  fr,
  en,
  value: clean(value) ?? MISSING,
  valueEn: englishOf(value, valueEn),
});

/** Street, complement, postcode and town, on one line. */
const oneLine = (...parts: (string | null | undefined)[]) =>
  parts.map(clean).filter(Boolean).join(", ");

/**
 * Fills the `{{tokens}}` of the clause text and hands back fresh articles.
 *
 * Copied rather than mutated: the clauses are module-level constants, and a
 * name written into them would turn up in the next owner's mandate.
 */
function fillArticles(
  values: Record<string, Bilingual>,
  hasPool: boolean,
): MandateArticle[] {
  const fill = (text: string, lang: "fr" | "en") =>
    text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
      return values[key]?.[lang] ?? MISSING;
    });
  return MANDATE_ARTICLES.map((a) => ({
    ...a,
    blocks: a.blocks
      // Dropped here rather than hidden in the template: a clause the mandate
      // does not carry should not reach the component that draws it.
      .filter(
        (blk) => !("onlyWhen" in blk) || blk.onlyWhen !== "pool" || hasPool,
      )
      .map((blk) =>
        blk.kind === "p"
          ? {
              ...blk,
              fr: blk.fr.map((t) => fill(t, "fr")),
              en: blk.en.map((t) => fill(t, "en")),
            }
          : blk,
      ),
  }));
}

/**
 * Assembles a rental management mandate from an owner, a property and what the
 * agency types.
 *
 * The database supplies the owner's identity and, when the property is one of
 * the agency's, its address and measurements. Everything section 4 states —
 * the deposit, what the rent includes, the conditions — is decided with the
 * owner and typed.
 */
export async function buildMandateData(
  input: MandateInput,
  user: CurrentUser,
): Promise<MandateData | null> {
  // The property is resolved first because, when it is one of ours, it decides
  // who the owner is — the same rule as the Property Management agreement, and
  // for the same reason: a request naming one property and a different contact
  // must not produce a mandate signed by the wrong party.
  const picked = input.propertyId
    ? await prisma.property.findUnique({
        where: { id: input.propertyId },
        select: {
          marketingName: true,
          address: true,
          zipcode: true,
          city: true,
          type: true,
          areaValue: true,
          rooms: true,
          bedrooms: true,
          descriptionFr: true,
          ownerId: true,
          agentId: true,
        },
      })
    : null;
  if (input.propertyId && !picked) return null;

  // Naming a property's owner is its confidential side: managers see every
  // owner, an agent only those of the properties assigned to them.
  if (picked && !canSeePropertyConfidential(user, picked)) return null;

  const ownerId = picked?.ownerId ?? input.contactId;
  if (!ownerId) return null;

  const [agency, contact] = await Promise.all([
    getAgency(),
    prisma.contact.findFirst({
      where: { id: ownerId, archivedAt: null },
      select: {
        firstName: true,
        lastName: true,
        kind: true,
        email: true,
        phone: true,
        birthDate: true,
        birthCity: true,
        birthCountry: true,
        nationalities: true,
        address: true,
        addressLine2: true,
        postalCode: true,
        city: true,
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
            repCapacityEn: true,
          },
        },
      },
    }),
  ]);
  if (!contact) return null;

  const co = contact.company;
  const isCompany = contact.kind === "COMPANY";
  const ownerName = isCompany
    ? (clean(contact.lastName) ?? MISSING)
    : (clean([contact.firstName, contact.lastName].filter(Boolean).join(" ")) ??
      MISSING);
  const ownerAddress = isCompany
    ? oneLine(
        co?.registeredOffice,
        co?.officeLine2,
        [co?.officePostalCode, co?.officeCity].filter(Boolean).join(" "),
      )
    : oneLine(
        contact.address,
        contact.addressLine2,
        [contact.postalCode, contact.city].filter(Boolean).join(" "),
      );

  // Section 1, row for row as the draft lists it for a company. The draft has
  // no individual variant; a person is identified as the rental agreement
  // identifies one.
  const ownerRows: MandateRow[] = isCompany
    ? [
        row("Forme sociale", "Legal form", co?.legalForm),
        row(
          "Numéro d’immatriculation",
          "Registration number",
          co?.registrationNumber,
        ),
        row("Siège social", "Registered office", ownerAddress),
        row(
          "Représentée par",
          "Represented by",
          [co?.repFirstName, co?.repLastName].filter(Boolean).join(" "),
        ),
        row("Qualité", "Capacity", co?.repCapacity, co?.repCapacityEn),
        row("Email", undefined, contact.email),
        row("Téléphone", "Phone", contact.phone),
      ]
    : [
        row("Date de naissance", "Date of birth", shortDay(contact.birthDate)),
        row(
          "Lieu de naissance",
          "Place of birth",
          birthPlaceLabel(contact.birthCity, contact.birthCountry),
        ),
        row(
          "Nationalité",
          "Nationality",
          nationalitiesLabel(contact.nationalities),
        ),
        row("Adresse", "Address", ownerAddress),
        row("Email", undefined, contact.email),
        row("Téléphone", "Phone", contact.phone),
      ];

  // Section 3. One of ours, or one described by hand for a property the agency
  // does not hold yet — which is the ordinary case for a mandate: it is what
  // brings the property in.
  const manual = input.manualProperty;
  const propertyAddress = picked
    ? oneLine(
        picked.address,
        [picked.zipcode, picked.city].filter(Boolean).join(" "),
      )
    : (clean(manual?.address) ?? "");
  const propertyRows: MandateRow[] = [
    row("Adresse du bien", "Property address", propertyAddress),
    row(
      "Type de bien",
      "Type of property",
      picked ? propertyTypeLabel(picked.type) : manual?.kind,
    ),
    row(
      "Surface habitable",
      "Living area",
      picked
        ? picked.areaValue
          ? `${picked.areaValue} m²`
          : null
        : manual?.surface,
    ),
    row(
      "Nombre de pièces",
      "Number of rooms",
      picked ? (picked.rooms?.toString() ?? null) : manual?.rooms,
    ),
    row(
      "Nombre de chambres",
      "Number of bedrooms",
      picked ? (picked.bedrooms?.toString() ?? null) : manual?.bedrooms,
    ),
  ];

  // Section 3's equipment. A property described by hand lists what was typed
  // for it, each item French with an optional English after " / ".
  const equipment = (manual?.equipment ?? [])
    .map((item) => {
      const at = item.indexOf(" / ");
      const fr = clean(at === -1 ? item : item.slice(0, at));
      const en = at === -1 ? null : clean(item.slice(at + 3));
      return fr ? { fr, en: en ?? undefined } : null;
    })
    .filter((item): item is { fr: string; en: string | undefined } => !!item);

  // What was typed wins. Left empty, a property of ours describes itself: its
  // own text, without the advertising notices a contract has no use for.
  const typed = input.description
    .split(/\n\s*\n/)
    .map((p) => clean(p.replace(/\s*\n\s*/g, " ")))
    .filter((p): p is string => p !== null);
  const description =
    typed.length > 0
      ? typed
      : descriptionForContract(picked?.descriptionFr).map(pdfSafe);

  const representative = clean(agency.representedBy) ?? "Valentine Claitte";
  const capacity = clean(agency.capacity) ?? "Présidente";
  // The agency record holds the office in French only. "Présidente" is the one
  // it holds today and the one the draft translates; anything else is printed
  // as it stands rather than guessed at.
  const capacityEn = /^présidente?$/i.test(capacity) ? "President" : capacity;

  const mandateNumber = clean(input.mandateNumber);
  const deposit = clean(input.deposit);

  return {
    bilingual: input.bilingual,
    // The footer's lines and nothing more: the record also holds the agency's
    // bank details, which this mandate does not print and the browser drawing
    // the preview has no reason to be sent.
    agency: {
      legalName: agency.legalName,
      address: agency.address,
      rcs: agency.rcs,
      cartePro: agency.cartePro,
      garantieFinanciere: agency.garantieFinanciere,
      rcp: agency.rcp,
      web: agency.web,
      phone: agency.phone,
    },
    mandateNumber: mandateNumber ?? MISSING,
    owner: {
      isCompany,
      name: ownerName,
      address: ownerAddress || MISSING,
      rows: ownerRows,
    },
    property: {
      label: clean(picked?.marketingName) ?? null,
      address: propertyAddress || MISSING,
      rows: propertyRows,
    },
    description,
    equipment,
    legal: {
      ownershipStatus: clean(input.ownershipStatus) ?? MISSING,
      registrationNumber: clean(input.registrationNumber) ?? MISSING,
      condominium: input.condominium,
    },
    deposit: deposit ? inProse(typedEuros(deposit)) : MISSING,
    utilities: input.utilities,
    services: input.services,
    hasPool: input.hasPool,
    nonSmoking: input.nonSmoking,
    bailiff: input.bailiff,
    articles: fillArticles(
      {
        agentRep: { fr: representative, en: representative },
        agentCapacity: { fr: capacity, en: capacityEn },
      },
      input.hasPool,
    ),
    place: clean(input.place) ?? MISSING,
    signatureDate: shortDay(input.signatureDate) ?? MISSING,
    signatory: {
      name: representative,
      capacity: { fr: capacity, en: capacityEn },
    },
  };
}
