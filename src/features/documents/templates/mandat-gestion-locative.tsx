import * as React from "react";
import {
  Document,
  Image,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";
import { BstayLogo } from "@/features/documents/templates/logo";
import {
  Cap,
  Footer,
  Section,
  SubHeading,
  h,
  ink,
  paper,
  grey,
  rule,
  cardBg,
  TITLE,
  GAP,
  LABEL_GAP,
  PAIR_GAP,
  LH,
  ORPHAN_GUARD,
  type AgencyIdentity,
} from "@/features/documents/templates/house-style";
import type { Bilingual } from "@/features/documents/concierge-packages";
import {
  MANDATE_ANNEXES,
  MANDATE_CERFA,
  MANDATE_FEES,
  MANDATE_PRICING,
  MANDATE_PETS,
  MANDATE_NEWSLETTER,
  MANDATE_PREAMBLE,
  MANDATE_REGISTER_NOTE,
  MANDATE_SERVICES,
  MANDATE_TITLE,
  MANDATE_UTILITIES,
  MANDATE_WITHDRAWAL,
  type MandateArticle,
  type MandateBlock,
  type MandateSlot,
} from "@/features/documents/mandate-clauses";
import type {
  MandateServiceKey,
  MandateUtilityKey,
} from "@/features/documents/schemas/mandate-schema";

/**
 * "Mandat de gestion locative – Location saisonnière / Seasonal Rental
 * Management Mandate" — what an owner signs to entrust a property to BSTAY.
 *
 * Same house system as the other documents: ink cover, Albertus for the
 * titles, the shared footer with its initials box. Like the commercial agent
 * agreement, and unlike the rental documents, the French leads: the mandate is
 * a French instrument entered in the register of mandates, and the English
 * follows each passage in italic, as the agency's draft sets it.
 */

/** A labelled line of one of the mandate's cards. */
export type MandateRow = {
  fr: string;
  /** Absent where both languages share the word — "Email". */
  en?: string;
  value: string;
  /** The value's own English, on the few free-text lines that have one. */
  valueEn?: string;
};

export type MandateData = {
  /** French with its English translation, or French alone. */
  bilingual: boolean;
  agency: AgencyIdentity;
  /** The number in the register of mandates, on the cover and on page 2. */
  mandateNumber: string;
  owner: {
    isCompany: boolean;
    /** The company's name, or the person's. */
    name: string;
    /** One line, for the withdrawal form. */
    address: string;
    rows: MandateRow[];
  };
  property: {
    /** The agency's own name for it, when it is one of ours. */
    label: string | null;
    address: string;
    rows: MandateRow[];
  };
  /** Section 3's description, paragraph by paragraph. */
  description: string[];
  /** The same in English, empty when there is none. */
  descriptionEn: string[];
  /** What the property is equipped with, in both languages. */
  equipment: { fr: string; en: string }[];
  legal: {
    ownershipStatus: string;
    ownershipStatusEn?: string;
    registrationNumber: string;
    /** Set when the line is a sentence rather than a number. */
    registrationNumberEn?: string;
    condominium: boolean;
  };
  /**
   * The declaration form's pages, as image sources — empty when the property
   * already has its registration number and Appendix 4 is not attached.
   */
  cerfaPages: string[];
  /**
   * Appendix 1's sheets, as image sources — empty until the pricing schedule
   * is handed over, and the appendix is then a page that announces it.
   */
  pricingPages: string[];
  /** The security deposit, formatted. */
  deposit: string;
  utilities: Record<MandateUtilityKey, boolean>;
  services: Record<MandateServiceKey, boolean>;
  /** No pool, no pool-maintenance line in 4.3 and no article 9.4.2. */
  hasPool: boolean;
  smoking: boolean;
  bailiff: boolean;
  pets: (typeof MANDATE_PETS)[number]["key"];
  /**
   * The mandate itself, with its placeholders filled. Passed in rather than
   * imported, as the other agreements' articles are: a revised clause is a
   * change to the data, never to this file.
   */
  articles: MandateArticle[];
  place: string;
  /** "19/11/2026". */
  signatureDate: string;
  /** Who signs for BSTAY. */
  signatory: { name: string; capacity: Bilingual };
};

/** The single gap the cover is built on, as the other covers. */
const COVER_GAP = 52;

const s = StyleSheet.create({
  // ---- Cover -------------------------------------------------------------
  coverFill: {
    height: "100%",
    paddingHorizontal: 50,
    paddingTop: COVER_GAP,
    paddingBottom: COVER_GAP,
  },
  coverOpen: { flexGrow: 1 },
  coverCentre: { alignItems: "center" },
  coverTitleCentred: { textAlign: "center" },

  // ---- Prose -------------------------------------------------------------
  block: { marginTop: GAP },
  bold: { fontWeight: 700 },
  // The clause the decree wants "en caractères très apparents": ruled off and
  // in bold. The English inside it stays light — the family has no bold
  // italic, and asking react-pdf for a cut it was never given crashes.
  box: {
    borderWidth: 0.75,
    borderColor: ink,
    padding: GAP,
    gap: PAIR_GAP,
  },
  boxPara: { fontSize: 10, color: ink, lineHeight: LH, fontWeight: 700 },
  lead: { fontSize: 10, color: grey, lineHeight: LH },

  // ---- Cards -------------------------------------------------------------
  rowValueEn: { fontStyle: "italic", color: grey },
  // Beside its label, a value takes the room that is left and wraps in it; the
  // label keeps its width. Without both, a long address is drawn across the
  // label and off the card.
  rowLabelInline: { flexShrink: 0 },
  rowValueInline: { flex: 1 },
  feesHead: { alignItems: "center", marginTop: GAP, marginBottom: GAP },
  feesTitle: {
    fontFamily: TITLE,
    fontWeight: 200,
    fontSize: 15,
    color: ink,
    textTransform: "uppercase",
  },
  feesDate: { fontSize: 10, color: grey, marginTop: 3, lineHeight: LH },
  feesBlock: { marginTop: GAP * 1.5 },
  feesTable: {
    marginTop: LABEL_GAP,
    borderTopWidth: 0.5,
    borderLeftWidth: 0.5,
    borderColor: rule,
  },
  feesRow: { flexDirection: "row" },
  feesRowHead: { backgroundColor: cardBg },
  feesCell: {
    flex: 3,
    fontSize: 10,
    color: ink,
    lineHeight: LH,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: rule,
  },
  feesCellFee: { flex: 2 },
  feesCellHead: { fontWeight: 500 },
  // In points, and a hair under A4 (595.28 × 841.89): an image as tall as the
  // page or sized in percent is measured as not fitting, cannot be broken
  // across two, and is pushed onto a sheet of its own behind an empty one.
  cerfaSheet: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 595,
    height: 841,
  },
  // A sheet of unknown shape: fitted whole inside the page, clear of the line
  // at the top that names it.
  pricingSheet: {
    position: "absolute",
    top: 28,
    left: 24,
    width: 547,
    height: 790,
    objectFit: "contain",
  },
  cerfaTag: {
    position: "absolute",
    top: 8,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 6.5,
    color: grey,
  },
  rowStacked: { gap: 2, marginBottom: LABEL_GAP },
  choiceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: GAP,
  },
  choiceLabel: { flex: 1, fontSize: 10, color: ink, lineHeight: LH },
  choiceOptions: { flexDirection: "row", gap: GAP * 1.5 },
  choiceOption: { flexDirection: "row", alignItems: "center", gap: 5 },
  choiceText: { fontSize: 9, color: ink, lineHeight: LH },

  // ---- Signatures --------------------------------------------------------
  signRow: { flexDirection: "row", gap: 24, marginTop: GAP * 2 },
  signCol: { flex: 1 },
  signBox: {
    height: 110,
    borderWidth: 0.5,
    borderColor: grey,
    marginBottom: PAIR_GAP,
  },
  signName: { fontSize: 10, color: ink, lineHeight: LH, marginTop: 2 },
  signLine: { fontSize: 9, color: grey, lineHeight: LH, marginTop: PAIR_GAP },
  blankLine: {
    borderBottomWidth: 0.5,
    borderBottomColor: grey,
    flex: 1,
    height: 12,
    marginLeft: LABEL_GAP,
  },
});

/** French with its English after a slash, or French alone. */
const both = (bi: boolean, fr: string, en?: string) =>
  bi && en ? `${fr} / ${en}` : fr;

/**
 * A French wording and its English, as every line of the mandate sets them:
 * the French first in the colour of the text around it, the English after a
 * slash in grey italic. An English that only repeats the French is left out.
 *
 * To be placed inside a `Text`. `both` is its plain-string twin, kept for the
 * cover band, whose white capitals have no grey to step down to.
 */
function Pair({ bi, fr, en }: { bi: boolean; fr: string; en?: string }) {
  return (
    <>
      {fr}
      {bi && en && en !== fr ? <Text style={s.rowValueEn}> / {en}</Text> : null}
    </>
  );
}

/**
 * A paragraph with the draft's `**bold**` runs.
 *
 * Bold only where `strong` is set — the French. The English is italic, and a
 * bold italic is a cut the family does not have, so its markers are dropped
 * and the words kept.
 */
function Rich({
  text,
  style,
  strong,
}: {
  text: string;
  style: React.ComponentProps<typeof View>["style"];
  strong: boolean;
}) {
  const parts = text.split("**");
  return (
    <Text style={style} orphans={3} widows={3}>
      {parts.map((part, i) =>
        i % 2 === 1 && strong ? (
          <Text key={i} style={s.bold}>
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </Text>
  );
}

/** One passage: its French paragraphs, then the same in English. */
function Passage({
  fr,
  en,
  bilingual,
  boxed,
}: {
  fr: readonly string[];
  en: readonly string[];
  bilingual: boolean;
  boxed?: boolean;
}) {
  const body = (
    <>
      <View style={h.proseGroup}>
        {fr.map((para, i) => (
          <Rich
            key={i}
            text={para}
            style={boxed ? s.boxPara : h.paraEn}
            strong
          />
        ))}
      </View>
      {bilingual ? (
        <View style={h.proseGroup}>
          {en.map((para, i) => (
            <Rich key={i} text={para} style={h.paraFr} strong={false} />
          ))}
        </View>
      ) : null}
    </>
  );
  return boxed ? (
    // Bound: a penalty clause broken across two pages is a clause somebody
    // can say they only saw half of.
    <View style={[s.box, s.block]} wrap={false}>
      {body}
    </View>
  ) : (
    <View style={[{ gap: PAIR_GAP }, s.block]}>{body}</View>
  );
}

/** A labelled line of a card: grey caps label, value beside it. */
function Row({
  row,
  bilingual,
  stacked,
}: {
  row: MandateRow;
  bilingual: boolean;
  /**
   * Set the value under its label rather than beside it.
   *
   * The inline row does not wrap: a long label beside a long value — the
   * registration number's, once it reads "CERFA fourni en annexe" in two
   * languages — is drawn over itself and off the card.
   */
  stacked?: boolean;
}) {
  const label = <Cap en={row.fr} fr={bilingual ? row.en : undefined} />;
  const value = (
    <Text style={stacked ? h.infoValue : [h.infoValue, s.rowValueInline]}>
      {row.value}
      {bilingual && row.valueEn ? (
        <Text style={s.rowValueEn}> / {row.valueEn}</Text>
      ) : null}
    </Text>
  );
  if (stacked) {
    return (
      <View style={s.rowStacked}>
        {label}
        {value}
      </View>
    );
  }
  return (
    <View style={h.infoRow}>
      <View style={[h.infoLabel, s.rowLabelInline]}>{label}</View>
      {value}
    </View>
  );
}

/** A box, ticked or not, with its caption. */
function Box({ checked, label }: { checked: boolean; label: React.ReactNode }) {
  return (
    <View style={s.choiceOption}>
      <View style={h.tickBox}>
        {checked ? <View style={h.tickMark} /> : null}
      </View>
      <Text style={s.choiceText}>{label}</Text>
    </View>
  );
}

/**
 * A line of section 4 and the two boxes that answer it.
 *
 * Both boxes are printed and one is ticked, as the draft lays them out: the
 * owner signs what was declared, and "not included" has to be as visible as
 * "included".
 */
function Choice({
  label,
  value,
  yes,
  no,
  bilingual,
}: {
  label: Bilingual;
  value: boolean;
  yes: Bilingual;
  no: Bilingual;
  bilingual: boolean;
}) {
  return (
    <Options
      bilingual={bilingual}
      label={label}
      options={[
        { ...yes, checked: value },
        { ...no, checked: !value },
      ]}
    />
  );
}

/** A line and its boxes, however many answers it has. */
function Options({
  label,
  options,
  bilingual,
}: {
  label: Bilingual;
  options: (Bilingual & { checked: boolean })[];
  bilingual: boolean;
}) {
  return (
    <View style={s.choiceRow}>
      <Text style={s.choiceLabel}>
        {label.fr}
        {bilingual && label.en !== label.fr ? (
          <Text style={s.rowValueEn}> / {label.en}</Text>
        ) : null}
      </Text>
      <View style={s.choiceOptions}>
        {options.map((o) => (
          <Box
            key={o.fr}
            checked={o.checked}
            label={<Pair bi={bilingual} fr={o.fr} en={o.en} />}
          />
        ))}
      </View>
    </View>
  );
}

const INCLUDED: Bilingual = { fr: "Inclus", en: "Included" };
const NOT_INCLUDED: Bilingual = { fr: "Non inclus", en: "Not included" };
const YES: Bilingual = { fr: "Oui", en: "Yes" };
const NO: Bilingual = { fr: "Non", en: "No" };

/** The parts of the mandate that are forms rather than prose. */
function Slot({ slot, data }: { slot: MandateSlot; data: MandateData }) {
  const bi = data.bilingual;
  const card = [h.card, s.block];

  switch (slot) {
    case "owner":
      return (
        <View style={card} wrap={false}>
          <Cap
            en={
              data.owner.isCompany
                ? "Le Propriétaire est une personne morale — Dénomination sociale"
                : "Le Propriétaire est une personne physique — Nom et prénom"
            }
            fr={
              bi
                ? data.owner.isCompany
                  ? "The Owner is a company — Company name"
                  : "The Owner is an individual — Full name"
                : undefined
            }
          />
          <Text style={h.name}>{data.owner.name}</Text>
          <View style={{ marginTop: GAP }}>
            {data.owner.rows.map((r, i) => (
              <Row key={i} row={r} bilingual={bi} />
            ))}
          </View>
        </View>
      );

    case "property":
      return (
        <View style={card} wrap={false}>
          {data.property.label ? (
            <>
              <Cap en="Désignation" fr={bi ? "Reference" : undefined} />
              <Text style={[h.name, { marginBottom: GAP }]}>
                {data.property.label}
              </Text>
            </>
          ) : null}
          {data.property.rows.map((r, i) => (
            <Row key={i} row={r} bilingual={bi} />
          ))}
        </View>
      );

    case "description":
      return (
        <View style={[h.proseGroup, s.block]}>
          {(data.description.length > 0
            ? data.description
            : ["[à compléter]"]
          ).map((para, i) => (
            <Text key={i} style={h.paraEn} orphans={3} widows={3}>
              {para}
            </Text>
          ))}
          {bi
            ? data.descriptionEn.map((para, i) => (
                <Text key={`en-${i}`} style={h.paraFr} orphans={3} widows={3}>
                  {para}
                </Text>
              ))
            : null}
        </View>
      );

    case "equipment": {
      // One sentence, as the draft sets it: items run on, separated by commas.
      const items = data.equipment;
      const sentence = (parts: string[]) =>
        parts.length > 0 ? `${parts.join(", ")}.` : "[à compléter]";
      return (
        <View style={[{ gap: PAIR_GAP }, s.block]}>
          <Text style={h.paraEn}>{sentence(items.map((i) => i.fr))}</Text>
          {bi && items.length > 0 ? (
            <Text style={h.paraFr}>{sentence(items.map((i) => i.en))}</Text>
          ) : null}
        </View>
      );
    }

    case "legalInfo":
      return (
        <View style={[...card, { gap: LABEL_GAP }]} wrap={false}>
          <View>
            <Row
              bilingual={bi}
              stacked
              row={{
                fr: "Qualité du propriétaire",
                en: "Property ownership status",
                value: data.legal.ownershipStatus,
                valueEn: data.legal.ownershipStatusEn,
              }}
            />
            <Row
              bilingual={bi}
              stacked
              row={{
                fr: "Numéro d’enregistrement du meublé de tourisme",
                en: "Registration number",
                value: data.legal.registrationNumber,
                valueEn: data.legal.registrationNumberEn,
              }}
            />
          </View>
          <Choice
            bilingual={bi}
            label={{
              fr: "Règlement de copropriété applicable",
              en: "Condominium rules applicable",
            }}
            value={data.legal.condominium}
            yes={YES}
            no={NO}
          />
        </View>
      );

    case "deposit":
      return (
        <View style={card} wrap={false}>
          <View style={s.choiceRow}>
            <Text style={s.choiceLabel}>
              Dépôt de garantie encaissé et conservé sur le compte séquestre du
              Mandataire
              {bi ? (
                <Text style={s.rowValueEn}>
                  {" "}
                  / Security deposit collected and held on the Agent’s escrow
                  account
                </Text>
              ) : null}
            </Text>
            <Text style={h.infoValue}>{data.deposit}</Text>
          </View>
        </View>
      );

    case "utilities":
      return (
        <View style={[...card, { gap: LABEL_GAP }]} wrap={false}>
          {MANDATE_UTILITIES.map((u) => (
            <Choice
              key={u.key}
              bilingual={bi}
              label={u}
              value={data.utilities[u.key]}
              yes={INCLUDED}
              no={NOT_INCLUDED}
            />
          ))}
        </View>
      );

    case "services":
      return (
        <View style={[...card, { gap: LABEL_GAP }]} wrap={false}>
          {MANDATE_SERVICES.filter(
            (sv) => sv.key !== "pool" || data.hasPool,
          ).map((sv) => (
            <Choice
              key={sv.key}
              bilingual={bi}
              label={sv}
              value={data.services[sv.key]}
              yes={INCLUDED}
              no={NOT_INCLUDED}
            />
          ))}
        </View>
      );

    case "specific":
      return (
        <View style={[...card, { gap: LABEL_GAP }]} wrap={false}>
          <Choice
            bilingual={bi}
            label={{ fr: "Bien fumeur", en: "Smoking property" }}
            value={data.smoking}
            yes={YES}
            no={NO}
          />
          <Choice
            bilingual={bi}
            label={{
              fr: "Huissier (commissaire de justice)",
              en: "Bailiff (judicial officer)",
            }}
            value={data.bailiff}
            yes={YES}
            no={NO}
          />
          <Options
            bilingual={bi}
            label={{ fr: "Animaux autorisés", en: "Pets allowed" }}
            options={MANDATE_PETS.map((p) => ({
              fr: p.fr,
              en: p.en,
              checked: p.key === data.pets,
            }))}
          />
        </View>
      );

    case "annexList":
      return (
        <View style={[...card, { gap: PAIR_GAP }]} wrap={false}>
          {/* The CERFA is listed only when it is attached. */}
          {MANDATE_ANNEXES.slice(
            0,
            data.cerfaPages.length > 0 ? undefined : 3,
          ).map((a, i) => (
            <Text key={i} style={h.paraEn}>
              {a.fr}
              {bi ? <Text style={s.rowValueEn}> / {a.en}</Text> : null}
            </Text>
          ))}
        </View>
      );
  }
}

/** A small caps heading inside a section. */
function Minor({
  fr,
  en,
  bilingual,
}: {
  fr: string;
  en: string;
  bilingual: boolean;
}) {
  return (
    // Same orphan rule as the numbered headings: it announces what follows.
    <View
      style={{ marginTop: GAP * 1.5 }}
      wrap={false}
      minPresenceAhead={ORPHAN_GUARD}
    >
      <Cap en={fr} fr={bilingual && en !== fr ? en : undefined} />
    </View>
  );
}

function Blocks({
  blocks,
  data,
}: {
  blocks: MandateBlock[];
  data: MandateData;
}) {
  const bi = data.bilingual;
  return (
    <>
      {blocks.map((blk, i) => {
        switch (blk.kind) {
          case "sub":
            return (
              <SubHeading
                key={i}
                en={blk.fr}
                fr={bi ? blk.en : undefined}
                first={i === 0}
              />
            );
          case "minor":
            return <Minor key={i} fr={blk.fr} en={blk.en} bilingual={bi} />;
          case "slot":
            return <Slot key={i} slot={blk.slot} data={data} />;
          case "p":
            return (
              <Passage
                key={i}
                fr={blk.fr}
                en={blk.en}
                bilingual={bi}
                boxed={blk.box}
              />
            );
        }
      })}
    </>
  );
}

/** A caption and a rule to write on, for the withdrawal form. */
function Blank({ label }: { label: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
      <Text style={h.paraEn}>{label} :</Text>
      <View style={s.blankLine} />
    </View>
  );
}

export function MandatGestionLocative({ data }: { data: MandateData }) {
  const { agency: a, bilingual: bi } = data;

  /**
   * A section marker. The number rides on the French title, which is the one
   * the clauses refer to; the English follows as its caption.
   */
  // The body of the mandate carries the shared footer whole: page count and
  // the box for initials.
  const footer = (
    <Footer a={a} reference={data.mandateNumber} frenchOnly={!bi} />
  );
  // The appendices keep the agency's lines and the mandate number only: they
  // are attachments, counted and initialled with the mandate they follow.
  const annexFooter = (
    <Footer
      a={a}
      reference={data.mandateNumber}
      frenchOnly={!bi}
      initials={false}
      pagination={false}
    />
  );

  const head = (label: string, en: string, first = false) => (
    <Section en={label} fr={bi ? en : undefined} first={first} stacked />
  );

  return (
    <Document
      title={`Mandat de gestion locative — ${data.owner.name}`}
      author={a.legalName}
    >
      <Page size="A4" style={[h.page, h.coverPage]}>
        <View style={[h.coverBand, s.coverFill]}>
          <View style={h.coverLogo}>
            <BstayLogo width={160} height={45.8} color={paper} />
          </View>

          <View style={s.coverOpen} />

          <View style={[h.coverHead, s.coverCentre, { marginTop: 0 }]}>
            <View
              style={[h.coverTitleWrap, s.coverCentre, { paddingRight: 0 }]}
            >
              <Text style={[h.coverTitle, s.coverTitleCentred]}>
                {MANDATE_TITLE.fr}
              </Text>
              {bi ? (
                <Text style={[h.coverSubtitle, s.coverTitleCentred]}>
                  {MANDATE_TITLE.en}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={h.coverRule} />

          <View style={[h.coverFoot, { justifyContent: "center" }]}>
            <Text style={[h.coverFootText, s.coverTitleCentred]}>
              {both(bi, "Mandat n°", "Mandate no.")} {data.mandateNumber} —{" "}
              {data.owner.name}
            </Text>
          </View>
        </View>
      </Page>

      <Page size="A4" style={h.page}>
        <Text style={s.lead}>{MANDATE_PREAMBLE}</Text>
        <View style={[h.card, s.block]} wrap={false}>
          <View style={h.infoRow}>
            <View style={h.infoLabel}>
              <Cap en="Mandat n°" fr={bi ? "Mandate no." : undefined} />
            </View>
            <Text style={h.infoValue}>
              {data.mandateNumber}
              {"  "}(
              <Pair
                bi={bi}
                fr={MANDATE_REGISTER_NOTE.fr}
                en={MANDATE_REGISTER_NOTE.en}
              />
              )
            </Text>
          </View>
        </View>

        {data.articles.map((article) => (
          <React.Fragment key={article.n}>
            {head(`${article.n} - ${article.title.fr}`, article.title.en)}
            <Blocks blocks={article.blocks} data={data} />
          </React.Fragment>
        ))}

        {/* Bound: the objection box, the place and date and the two boxes are
            what the owner signs, and travel together. */}
        <View wrap={false}>
          {head("10 - Signatures", "Signatures")}
          <Minor
            fr="Newsletter – Droit d’opposition"
            en="Newsletter – Right to object"
            bilingual={bi}
          />
          <View style={[h.tickRow, s.block, { alignItems: "flex-start" }]}>
            {/* Left empty: it is the owner's to tick, on signing. */}
            <View style={[h.tickBox, { marginTop: 1 }]} />
            <View style={{ flex: 1, gap: PAIR_GAP }}>
              <Text style={h.paraEn}>{MANDATE_NEWSLETTER.fr}</Text>
              {bi ? (
                <Text style={h.paraFr}>{MANDATE_NEWSLETTER.en}</Text>
              ) : null}
            </View>
          </View>

          <Text style={[h.paraEn, { marginTop: GAP * 2 }]}>
            <Pair bi={bi} fr="Fait à" en="Signed at" /> {data.place},{" "}
            <Pair bi={bi} fr="le" en="on" /> {data.signatureDate}
          </Text>

          <View style={s.signRow}>
            <View style={s.signCol}>
              <View style={s.signBox} />
              <Cap
                en="Pour le Propriétaire"
                fr={bi ? "For the Owner" : undefined}
              />
              <Text style={s.signName}>{data.owner.name}</Text>
              <Text style={s.signLine}>« Lu et approuvé »</Text>
            </View>
            <View style={s.signCol}>
              <View style={s.signBox} />
              <Cap
                en="Pour le Mandataire"
                fr={bi ? "For the Agent" : undefined}
              />
              <Text style={s.signName}>BSTAY — {data.signatory.name}</Text>
              <Text style={s.signLine}>
                <Pair
                  bi={bi}
                  fr={data.signatory.capacity.fr}
                  en={data.signatory.capacity.en}
                />
              </Text>
            </View>
          </View>
        </View>

        {footer}
      </Page>

      {/* Every appendix opens a page of its own, in order. The first is the
          pricing schedule: the sheets handed over with the form, or, until
          there are any, a page that announces it. */}
      {data.pricingPages.length > 0 ? (
        data.pricingPages.map((src, i) => (
          <Page key={i} size="A4">
            <Image src={src} style={s.pricingSheet} />
            <Text style={s.cerfaTag}>
              <Pair
                bi={bi}
                fr={MANDATE_PRICING.title.fr}
                en={MANDATE_PRICING.title.en}
              />
              {` · ${data.mandateNumber} · ${i + 1}/${data.pricingPages.length}`}
            </Text>
          </Page>
        ))
      ) : (
        <Page size="A4" style={h.page}>
          {head(MANDATE_PRICING.title.fr, MANDATE_PRICING.title.en, true)}
          <Passage
            fr={[MANDATE_PRICING.note.fr]}
            en={[MANDATE_PRICING.note.en]}
            bilingual={bi}
          />
          {annexFooter}
        </Page>
      )}

      <Page size="A4" style={h.page}>
        <View>
          {head(MANDATE_FEES.title.fr, MANDATE_FEES.title.en, true)}
          <View style={s.feesHead}>
            <Text style={s.feesTitle}>{MANDATE_FEES.heading}</Text>
            <Text style={s.feesDate}>{MANDATE_FEES.applicable}</Text>
          </View>
          {MANDATE_FEES.tables.map((table) => (
            <View key={table.title} style={s.feesBlock} wrap={false}>
              <Cap en={table.title} />
              <View style={s.feesTable}>
                <View style={[s.feesRow, s.feesRowHead]}>
                  <Text style={[s.feesCell, s.feesCellHead]}>
                    {table.columns[0]}
                  </Text>
                  <Text style={[s.feesCell, s.feesCellHead, s.feesCellFee]}>
                    {table.columns[1]}
                  </Text>
                </View>
                {table.rows.map((r) => (
                  <View key={r[0]} style={s.feesRow}>
                    <Text style={s.feesCell}>{r[0]}</Text>
                    <Text style={[s.feesCell, s.feesCellFee]}>{r[1]}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
          <View style={s.feesBlock}>
            <Cap en={MANDATE_FEES.legalTitle} />
            <View style={[h.proseGroup, { marginTop: LABEL_GAP }]}>
              {MANDATE_FEES.legal.map((para) => (
                <Text key={para} style={h.paraEn}>
                  {para}
                </Text>
              ))}
            </View>
          </View>
        </View>

        {/* The withdrawal form is detached and sent back, so it must not
            share a sheet with anything else. */}
        <View break>
          {head(MANDATE_WITHDRAWAL.title.fr, MANDATE_WITHDRAWAL.title.en, true)}
        </View>
        <Passage
          fr={MANDATE_WITHDRAWAL.intro.fr}
          en={MANDATE_WITHDRAWAL.intro.en}
          bilingual={bi}
        />
        <View style={[h.card, s.block]} wrap={false}>
          <Cap
            en={MANDATE_WITHDRAWAL.recipient.fr}
            fr={bi ? MANDATE_WITHDRAWAL.recipient.en : undefined}
          />
          <View style={{ marginTop: LABEL_GAP }}>
            {MANDATE_WITHDRAWAL.address.map((line, i) => (
              <Text key={i} style={h.paraEn}>
                {line}
              </Text>
            ))}
          </View>
        </View>
        <Passage
          fr={MANDATE_WITHDRAWAL.statement.fr}
          en={MANDATE_WITHDRAWAL.statement.en}
          bilingual={bi}
        />
        {/* Filled in where the mandate already knows the answer, so the owner
            has only a date and a signature to add. */}
        <View style={[h.card, s.block]} wrap={false}>
          <Row
            bilingual={bi}
            stacked
            row={{
              fr: "Adresse du bien",
              en: "Property address",
              value: data.property.address,
            }}
          />
          <Row
            bilingual={bi}
            stacked
            row={{
              fr: "Date de signature du mandat",
              en: "Date of signature of the mandate",
              value: data.signatureDate,
            }}
          />
          <Row
            bilingual={bi}
            stacked
            row={{
              fr: "Nom du Propriétaire",
              en: "Name of the Owner",
              value: data.owner.name,
            }}
          />
          <Row
            bilingual={bi}
            stacked
            row={{
              fr: "Adresse du Propriétaire",
              en: "Address of the Owner",
              value: data.owner.address,
            }}
          />
        </View>
        <View style={{ marginTop: GAP * 3, gap: GAP * 3 }}>
          <Blank label="Date" />
          <Blank
            label={
              <Pair
                bi={bi}
                fr="Signature du Propriétaire"
                en="Signature of the Owner"
              />
            }
          />
        </View>

        {annexFooter}
      </Page>

      {/* Appendix 4, when attached: the form itself, a sheet per page and
          nothing of ours over it but the line that says which appendix of
          which mandate it is. No footer — the form fills its own sheet. */}
      {data.cerfaPages.map((src, i) => (
        <Page key={src} size="A4">
          <Image src={src} style={s.cerfaSheet} />
          <Text style={s.cerfaTag}>
            <Pair
              bi={bi}
              fr={MANDATE_CERFA.title.fr}
              en={MANDATE_CERFA.title.en}
            />
            {` · ${data.mandateNumber} · ${i + 1}/${data.cerfaPages.length}`}
          </Text>
        </Page>
      ))}
    </Document>
  );
}
