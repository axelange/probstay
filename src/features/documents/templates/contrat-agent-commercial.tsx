import * as React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { BstayLogo } from "@/features/documents/templates/logo";
import {
  Footer,
  Section,
  SubHeading,
  h,
  ink,
  paper,
  grey,
  rule,
  cardBg,
  GAP,
  PAIR_GAP,
  LH,
  ORPHAN_GUARD,
  type AgencyIdentity,
} from "@/features/documents/templates/house-style";
import {
  isAgentTable,
  type AgentArticle,
  type AgentBlock,
  type AgentTableBlock,
  type AgentTextBlock,
} from "@/features/documents/agent-clauses";
import type { Bilingual } from "@/features/documents/concierge-packages";

/**
 * "Contrat d'agent commercial / Commercial Agent Agreement" — the mandate
 * BSTAY gives a self-employed sales agent.
 *
 * Same house system as the other documents: ink cover, Albertus for the
 * titles, the shared footer. It differs from them in the order of the
 * languages. Everywhere else English leads and the French follows as a
 * courtesy; here the French is the contract and says so in its first clause,
 * with the English "en italique à la suite du texte français de chaque
 * article". So each article is set whole in French, then whole in English —
 * not paragraph against paragraph, which would make the binding text something
 * the reader has to pick out line by line.
 */

export type AgentContractData = {
  /** French with its English translation, or French alone. */
  bilingual: boolean;
  agency: AgencyIdentity;
  /** "Rolands MASLOVSKIS", as the parties, the cover and the signature print. */
  agentName: string;
  /** The day the mandate takes effect, for the cover. */
  effectiveDate: Bilingual;
  /** Empty on a contract set in French alone. */
  languageClause: AgentBlock[];
  parties: AgentBlock[];
  /**
   * The agreement itself, with its placeholders filled.
   *
   * Passed in rather than imported, as the Property Management agreement's
   * articles are: a revised clause is a change to the data, never to this file.
   */
  articles: AgentArticle[];
  signatureClause: AgentBlock[];
  /** Who signs for BSTAY. */
  signatory: { name: string; capacity: Bilingual };
  /** "19/11/2026", printed under both signatures. */
  signatureDate: string;
  annexTitle: Bilingual;
  annex: AgentBlock[];
};

/** The single gap the cover is built on, as the Property Management cover. */
const COVER_GAP = 52;

const s = StyleSheet.create({
  // ---- Cover -------------------------------------------------------------
  //
  // The Property Management cover without its photograph: this contract is
  // about a person and not a residence, so the ink keeps the page and the
  // title sits at its foot.
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
  // Bold where the source is: the sentence that says which version binds, and
  // the word that opens the preamble.
  lead: { fontWeight: 700 },
  strong: { fontSize: 10, fontWeight: 500, color: ink, lineHeight: LH },
  // The English sub-headings and bold lines take the translation's own voice,
  // grey and sloped, and no weight: the family has no medium italic, and
  // asking react-pdf for a cut it was never given crashes the render.
  translated: {
    fontSize: 10,
    color: grey,
    fontStyle: "italic",
    lineHeight: LH,
  },

  // ---- Tables ------------------------------------------------------------
  table: { borderTopWidth: 0.5, borderTopColor: rule },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: rule,
  },
  tableHead: { backgroundColor: cardBg },
  tableCell: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: PAIR_GAP,
    fontSize: 8,
    color: ink,
    lineHeight: LH,
  },
  tableHeadCell: { color: grey },

  // ---- Signatures --------------------------------------------------------
  signRow: { flexDirection: "row", gap: 24, marginTop: 26 },
  signCol: { flex: 1 },
  signBox: {
    height: 110,
    borderWidth: 0.5,
    borderColor: rule,
    marginBottom: PAIR_GAP,
  },
  signLabel: {
    fontSize: 7,
    color: grey,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  signName: { fontSize: 10, color: ink, lineHeight: LH, marginTop: 2 },
  signLine: { fontSize: 9, color: grey, lineHeight: LH, marginTop: PAIR_GAP },
});

/** One of the source's tables, printed once for both languages. */
function Table({
  table,
  bilingual,
  first,
}: {
  table: AgentTableBlock;
  bilingual: boolean;
  first: boolean;
}) {
  const text = (c: { fr: string; bi: string }) => (bilingual ? c.bi : c.fr);
  return (
    // Bound: the largest of them is four rows, and a scale of rates split
    // across a page is a scale somebody reads half of.
    <View style={[s.table, first ? {} : s.block]} wrap={false}>
      <View style={[s.tableRow, s.tableHead]}>
        {table.head.map((c, i) => (
          <Text key={i} style={[s.tableCell, s.tableHeadCell]}>
            {text(c)}
          </Text>
        ))}
      </View>
      {table.rows.map((row, r) => (
        <View key={r} style={s.tableRow}>
          {row.map((c, i) => (
            <Text key={i} style={s.tableCell}>
              {text(c)}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

/** A paragraph, sub-heading or bold line, in one of the two languages. */
function TextBlock({
  block,
  lang,
  first,
}: {
  block: AgentTextBlock;
  lang: "fr" | "en";
  first: boolean;
}) {
  const fr = lang === "fr";
  const top = first ? {} : s.block;

  if (block.kind === "sub") {
    return fr ? (
      <SubHeading en={block.fr} first={first} />
    ) : (
      // Same orphan rule as the French heading it translates.
      <View wrap={false} minPresenceAhead={ORPHAN_GUARD}>
        <Text style={[s.translated, top]}>{block.en}</Text>
      </View>
    );
  }

  if (block.kind === "strong") {
    return (
      <View wrap={false} minPresenceAhead={ORPHAN_GUARD}>
        <Text style={[fr ? s.strong : s.translated, top]}>{block[lang]}</Text>
      </View>
    );
  }

  return (
    <Text style={[fr ? h.paraEn : h.paraFr, top]}>
      {block.lead ? (
        <Text style={fr ? s.lead : undefined}>{block.lead[lang]} </Text>
      ) : null}
      {block[lang]}
    </Text>
  );
}

/**
 * A run of blocks: all of it in French, then all of it again in English.
 *
 * The tables belong to the French pass alone. Their cells already carry both
 * languages, and the source's habit of repeating each one under the
 * translation would print the same six columns twice on the same page.
 */
function Blocks({
  blocks,
  bilingual,
}: {
  blocks: AgentBlock[];
  bilingual: boolean;
}) {
  return (
    <>
      {blocks.map((blk, i) => {
        if (isAgentTable(blk)) {
          // Already drawn, bound to the heading above it.
          const prev = blocks[i - 1];
          if (prev && !isAgentTable(prev) && prev.kind === "sub") return null;
          return (
            <Table key={i} table={blk} bilingual={bilingual} first={i === 0} />
          );
        }
        const next = blocks[i + 1];
        if (blk.kind === "sub" && next && isAgentTable(next)) {
          return (
            // A heading and the table it introduces, indivisible. The orphan
            // guard cannot do this: it keeps the heading whenever some room
            // follows, and the table, which does not break, then left for the
            // next page without it — "5.1 Les trois phases" over half a page
            // of nothing.
            <View key={i} wrap={false}>
              <TextBlock block={blk} lang="fr" first={i === 0} />
              <Table table={next} bilingual={bilingual} first={false} />
            </View>
          );
        }
        return <TextBlock key={i} block={blk} lang="fr" first={i === 0} />;
      })}
      {bilingual
        ? blocks.map((blk, i) =>
            isAgentTable(blk) ? null : (
              <TextBlock key={i} block={blk} lang="en" first={false} />
            ),
          )
        : null}
    </>
  );
}

/** The closing block: the place and date, and the two signatures. */
function Signatures({ data }: { data: AgentContractData }) {
  const bi = data.bilingual;
  const date = `Date : ${data.signatureDate}`;
  return (
    // Bound, so the heading, the closing sentence and the two boxes travel
    // together: a signature box on a page of its own, under no heading, is the
    // one page of a contract that must not look like an afterthought. Safe to
    // bind — some 260 pt against a text column of 742.
    <View wrap={false}>
      <Section
        en="Signatures des deux parties"
        fr={bi ? "Signatures of both parties" : undefined}
        stacked
      />
      <Blocks blocks={data.signatureClause} bilingual={bi} />
      <View style={s.signRow}>
        <View style={s.signCol}>
          <View style={s.signBox} />
          <Text style={s.signLabel}>
            {bi ? "Pour BSTAY / For BSTAY" : "Pour BSTAY"}
          </Text>
          <Text style={s.signName}>{data.signatory.name}</Text>
          <Text style={s.signLine}>
            {bi
              ? `${data.signatory.capacity.fr} / ${data.signatory.capacity.en}`
              : data.signatory.capacity.fr}
          </Text>
          <Text style={s.signLine}>{date}</Text>
        </View>
        <View style={s.signCol}>
          <View style={s.signBox} />
          <Text style={s.signLabel}>
            {bi ? "L’Agent / The Agent" : "L’Agent"}
          </Text>
          <Text style={s.signName}>{data.agentName}</Text>
          <Text style={s.signLine}>{date}</Text>
        </View>
      </View>
    </View>
  );
}

export function ContratAgentCommercial({ data }: { data: AgentContractData }) {
  const { agency: a, bilingual: bi } = data;

  /**
   * A section marker. The number rides on the French title, which is the one
   * the clauses refer to; the English follows as its caption.
   */
  const head = (n: number | null, title: Bilingual, first = false) => (
    <Section
      en={n === null ? title.fr : `${n} - ${title.fr}`}
      fr={bi ? title.en : undefined}
      first={first}
      stacked
    />
  );

  return (
    <Document
      title={`Contrat d’agent commercial — ${data.agentName}`}
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
                Contrat d’agent commercial
              </Text>
              {bi ? (
                <Text style={[h.coverSubtitle, s.coverTitleCentred]}>
                  Commercial Agent Agreement
                </Text>
              ) : null}
            </View>
          </View>

          <View style={h.coverRule} />

          <View style={[h.coverFoot, { justifyContent: "center" }]}>
            <Text style={[h.coverFootText, s.coverTitleCentred]}>
              {data.agentName} — Prise d’effet le {data.effectiveDate.fr}
            </Text>
          </View>
        </View>
      </Page>

      <Page size="A4" style={h.page}>
        {data.languageClause.length > 0 ? (
          <>
            {head(
              null,
              { fr: "Clause linguistique", en: "Language clause" },
              true,
            )}
            <Blocks blocks={data.languageClause} bilingual={bi} />
          </>
        ) : null}

        {head(
          null,
          { fr: "Les parties", en: "The parties" },
          data.languageClause.length === 0,
        )}
        <Blocks blocks={data.parties} bilingual={bi} />

        {data.articles.map((article) => (
          <React.Fragment key={article.n}>
            {head(article.n, article.title)}
            <Blocks blocks={article.blocks} bilingual={bi} />
          </React.Fragment>
        ))}

        <Signatures data={data} />

        {/* The annex opens its own page: it is signed with the contract but
            read apart from it, each time a commission is worked out. */}
        <View break>{head(null, data.annexTitle, true)}</View>
        <Blocks blocks={data.annex} bilingual={bi} />

        {/* Initials on every page, the annex included — it "fait partie
            intégrante du contrat", and it comes after the signatures, so the
            signed page is not the last and cannot be singled out by position
            the way the other documents do. */}
        <Footer a={a} />
      </Page>
    </Document>
  );
}
