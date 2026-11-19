import "server-only";

import { getContactDetail } from "@/features/contacts/services/contact-service";
import { getAgency } from "@/features/documents/agency";
import {
  AGENT_ANNEX,
  AGENT_ANNEX_TITLE,
  AGENT_ARTICLES,
  AGENT_BSTAY_SIGNATORY,
  AGENT_LANGUAGE_CLAUSE,
  AGENT_LANGUAGE_MENTION,
  AGENT_PARTIES,
  AGENT_RSAC_REFERENCE_PENDING,
  AGENT_RSAC_STATUS,
  AGENT_SIGNATURE_CLAUSE,
  isAgentTable,
  type AgentBlock,
} from "@/features/documents/agent-clauses";
import type { Bilingual } from "@/features/documents/concierge-packages";
import { pdfSafe } from "@/features/documents/concierge-schedule";
import {
  AGENT_PHASE_LABELS,
  type AgentContractInput,
} from "@/features/documents/schemas/agent-contract-schema";
import type { AgentContractData } from "@/features/documents/templates/contrat-agent-commercial";
import type { CurrentUser } from "@/lib/auth";
import { countryName } from "@/lib/countries";

/**
 * What a value the agency has not supplied prints as.
 *
 * Not a blank: a gap where a date of birth belongs reads as an oversight on a
 * contract, which is what it is. The Property Management agreement prints the
 * same words for the same reason.
 */
const MISSING = "[à compléter]";

type Values = Record<string, string | Bilingual>;

const clean = (v: string | null | undefined) => {
  const t = pdfSafe(v ?? "").trim();
  return t.length > 0 ? t : null;
};

const fillText = (text: string, values: Values, lang: "fr" | "en") =>
  text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const v = values[key];
    return (typeof v === "string" ? v : v?.[lang]) ?? MISSING;
  });

/**
 * Fills the clause text's `{{tokens}}` and hands back fresh blocks.
 *
 * Copied rather than mutated: the clauses are module-level constants, and a
 * name written into them would turn up in the next agent's contract.
 */
function fillBlocks(
  blocks: AgentBlock[],
  values: Values,
  registered: boolean,
): AgentBlock[] {
  return blocks
    .filter(
      (blk) =>
        isAgentTable(blk) ||
        !blk.onlyWhen ||
        blk.onlyWhen === (registered ? "rsacRegistered" : "rsacPending"),
    )
    .map((blk) =>
      isAgentTable(blk)
        ? blk
        : {
            ...blk,
            fr: fillText(blk.fr, values, "fr"),
            en: fillText(blk.en, values, "en"),
          },
    );
}

/** A date field's yyyy-mm-dd, read as that calendar day wherever this runs. */
function parseDay(value: string): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

const format = (d: Date, locale: string, long: boolean) =>
  new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    ...(long ? { day: "numeric", month: "long", year: "numeric" } : {}),
  }).format(d);

/** "01/11/2026", the form the parties and the annex print. */
const shortDate = (d: Date | null) => (d ? format(d, "fr-FR", false) : MISSING);

/** "1er novembre 2026" / "1 November 2026", the form the articles print. */
function longDate(d: Date | null): Bilingual {
  if (!d) return { fr: MISSING, en: MISSING };
  const fr = format(d, "fr-FR", true);
  return {
    // The first of the month is an ordinal in French, and only the first.
    fr: d.getUTCDate() === 1 ? fr.replace(/^1 /, "1er ") : fr,
    en: format(d, "en-GB", true),
  };
}

/**
 * The progression revenue the agent starts from, in each language's form:
 * "50 000 €" and "EUR 50,000", as the source writes its amounts.
 *
 * Anything that is not a plain figure prints as typed rather than being
 * guessed at — an amount misread on a contract is worse than one left raw.
 */
function revenue(typed: string): Bilingual {
  const raw = clean(typed) ?? "0";
  const digits = raw.replace(/[\s€]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(digits)) return { fr: raw, en: raw };
  const n = Number(digits);
  const opts = { maximumFractionDigits: 2 };
  return {
    fr: `${pdfSafe(new Intl.NumberFormat("fr-FR", opts).format(n))} €`,
    en: `EUR ${new Intl.NumberFormat("en-GB", opts).format(n)}`,
  };
}

/** Who the agent is, before it is put into sentences. */
type Identity = {
  firstName: string | null;
  lastName: string | null;
  birthDate: Date | null;
  birthCity: string | null;
  birthCountry: string | null;
  address: string | null;
  email: string | null;
};

/**
 * The agent, from a contact on file or from what was typed.
 *
 * The contact is read through the contacts' own visibility rule: naming a
 * contact here prints their date of birth and home address, so a contract
 * must not be a way round the rule that decides who may open their record.
 */
async function resolveIdentity(
  input: AgentContractInput,
  user: CurrentUser,
): Promise<Identity | null> {
  if (input.manualAgent) {
    const m = input.manualAgent;
    return {
      firstName: clean(m.firstName),
      lastName: clean(m.lastName),
      birthDate: parseDay(m.birthDate),
      birthCity: clean(m.birthCity),
      birthCountry: clean(m.birthCountry),
      address: clean(m.address),
      email: clean(m.email),
    };
  }
  if (!input.contactId) return null;
  const c = await getContactDetail(input.contactId, user);
  if (!c) return null;
  return {
    firstName: clean(c.firstName),
    lastName: clean(c.lastName),
    birthDate: c.birthDate,
    birthCity: clean(c.birthCity),
    birthCountry: clean(c.birthCountry),
    address: clean(
      [
        c.address,
        c.addressLine2,
        [c.postalCode, c.city].filter(Boolean).join(" "),
      ]
        .map(clean)
        .filter(Boolean)
        .join(", "),
    ),
    email: clean(c.email),
  };
}

/** "Saldus (Lettonie)" / "Saldus, Latvia", as the source sets a birthplace. */
function birthPlace(id: Identity): Bilingual {
  const fr = countryName(id.birthCountry, "fr");
  const en = countryName(id.birthCountry, "en");
  if (!id.birthCity) return { fr: fr ?? MISSING, en: en ?? MISSING };
  return {
    fr: fr ? `${id.birthCity} (${fr})` : id.birthCity,
    en: en ? `${id.birthCity}, ${en}` : id.birthCity,
  };
}

/**
 * The address as each sentence takes it.
 *
 * French runs straight on from "domicilié" — "domicilié 6 allée…" and
 * "domicilié chez Mme…" are both how it is written. English needs "at" before
 * a street and "c/o" where the French says "chez".
 */
function residence(address: string | null): Bilingual {
  if (!address) return { fr: MISSING, en: MISSING };
  return {
    fr: address,
    en: /^chez\s/i.test(address)
      ? address.replace(/^chez\s/i, "c/o ")
      : `at ${address}`,
  };
}

/**
 * Assembles a commercial agent agreement from an agent and a few parameters.
 *
 * Nothing here is computed from the agency's activity: the contract is signed
 * before the agent has sold anything. The database supplies the agent's civil
 * identity when they are a contact; the dates, the starting phase and the
 * register number are the agency's to state.
 */
export async function buildAgentContractData(
  input: AgentContractInput,
  user: CurrentUser,
): Promise<AgentContractData | null> {
  const [agency, identity] = await Promise.all([
    getAgency(),
    resolveIdentity(input, user),
  ]);
  if (!identity) return null;

  // "Rolands MASLOVSKIS": the surname in capitals, as the source sets it and
  // as French deeds do, so it cannot be mistaken for a given name.
  const agentName =
    [identity.firstName, identity.lastName?.toUpperCase()]
      .filter(Boolean)
      .join(" ") || MISSING;

  const woman = input.civility === "MRS";
  const rsac = clean(input.rsac);
  const effective = parseDay(input.effectiveDate);
  const signed = parseDay(input.signatureDate);

  const values: Values = {
    civility: woman ? { fr: "Mme", en: "Ms" } : { fr: "M.", en: "Mr" },
    agentName,
    born: woman ? "née" : "né",
    domiciled: woman ? "domiciliée" : "domicilié",
    birthDate: shortDate(identity.birthDate),
    birthPlace: birthPlace(identity),
    address: residence(identity.address),
    email: identity.email ?? MISSING,
    rsacStatus: rsac
      ? {
          fr: fillText(
            AGENT_RSAC_STATUS.registered.fr,
            { registered: woman ? "immatriculée" : "immatriculé", rsac },
            "fr",
          ),
          en: fillText(AGENT_RSAC_STATUS.registered.en, { rsac }, "en"),
        }
      : AGENT_RSAC_STATUS.pending,
    rsacReference: rsac ?? AGENT_RSAC_REFERENCE_PENDING,
    effectiveDate: longDate(effective),
    effectiveDateShort: shortDate(effective),
    signatureDate: longDate(signed),
    signatureDateShort: shortDate(signed),
    initialPhase: AGENT_PHASE_LABELS[input.initialPhase],
    initialRevenue: revenue(input.initialRevenue),
    place: clean(input.place) ?? MISSING,
    languageMention: input.bilingual ? AGENT_LANGUAGE_MENTION : "",
  };

  const fill = (blocks: AgentBlock[]) => fillBlocks(blocks, values, !!rsac);

  return {
    bilingual: input.bilingual,
    // The footer's lines and nothing more: the record also holds the agency's
    // bank details, which this contract does not print and the browser
    // drawing the preview has no reason to be sent.
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
    agentName,
    effectiveDate: longDate(effective),
    // A contract in French alone has one version, and nothing to rank.
    languageClause: input.bilingual ? fill(AGENT_LANGUAGE_CLAUSE) : [],
    parties: fill(AGENT_PARTIES),
    articles: AGENT_ARTICLES.map((a) => ({ ...a, blocks: fill(a.blocks) })),
    signatureClause: fill(AGENT_SIGNATURE_CLAUSE),
    signatory: AGENT_BSTAY_SIGNATORY,
    signatureDate: shortDate(signed),
    annexTitle: AGENT_ANNEX_TITLE,
    annex: fill(AGENT_ANNEX),
  };
}
