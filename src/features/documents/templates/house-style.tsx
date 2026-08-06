import * as React from "react";
import { View, Text, Image, StyleSheet } from "@react-pdf/renderer";

/**
 * The house document system, shared by every document the agency issues.
 *
 * Both documents come from the same Figma masters, drawn on a 1190 × 1684 px
 * frame — A4 at 144 dpi — so every measurement is the Figma value halved:
 * 1 px = 0.5 pt. The 100 px frame padding is the 50 pt page margin, and the
 * 990 px content column is 495 pt, exactly A4 (595.28 pt) less both margins.
 *
 * This module holds what the masters share: the palette, the spacing scale,
 * the page frame, the section marker, the grey caps label and the footer. A
 * document that needs to look like the others should import from here rather
 * than restate the values, so a change to the house style is one edit.
 */

// Palette. Gold carries titles, section markers and every hairline; the navy
// appears only under a document's title. Body copy is black, secondary copy
// grey, and data cards sit on a near-white ground with no border, no radius.
export const black = "#000000";
export const gold = "#a8936c";
export const navy = "#041c2c";
export const grey = "#6f6f6f";
export const cardBg = "#f9f9f9";

export const SERIF = "Passenger Display";
export const SANS = "Familjen Grotesk";

// The masters' spacing scale, halved: 40 px between top-level blocks, 20 px
// inside a section, 14 px between a label and its value, 10 px between the
// two lines of a value pair.
export const BLOCK = 20;
export const GAP = 10;
export const LABEL_GAP = 7;
export const PAIR_GAP = 5;

/**
 * The masters' `leading: normal` measures 1.2 on every text node (a 58 px
 * title occupies 70 px, a 16 px label 20 px). It has to be repeated on each
 * text style rather than inherited from the page: inside a row, react-pdf
 * measures a Text without the cascaded line height and collapses it onto the
 * next line.
 */
export const LH = 1.2;

/**
 * Room a heading needs below it to stay on the page, in points.
 *
 * Roughly the heading itself plus five lines of the clause it introduces — so
 * a title never sits alone at the foot of a page with its text overleaf. It is
 * a floor, not a guarantee: where the block that follows has a known height,
 * bind it with `TitledBlock` or `Section`'s children instead. Set
 * on both the section marker and the sub-heading; react-pdf moves the element
 * to the next page when less than this remains.
 */
export const ORPHAN_GUARD = 90;

/**
 * Bundled images. On the server read from disk (absolute path); in the browser
 * served from /public. No node import, so this also bundles for the preview.
 */
export const asset = (name: string) =>
  typeof window === "undefined"
    ? `${process.cwd()}/public/img/${name}`
    : `/img/${name}`;

export const LOGO_VERTICAL = asset("LogoVertical.png");
export const MONOGRAM = asset("LogoMonogramme.png");

export const h = StyleSheet.create({
  page: {
    paddingTop: 50,
    // The fixed footer's top edge is 99 pt off the bottom. Content stops 10 pt
    // (20 px) above it rather than against it, so a last line never sits on
    // the gold rule.
    paddingBottom: 109,
    paddingHorizontal: 50,
    fontFamily: SANS,
    fontWeight: 400,
    fontSize: 10,
    lineHeight: LH,
    color: black,
  },

  // Masthead — first page only, in flow (no logo repeats on later pages).
  logoWrap: { alignItems: "center", marginBottom: 40 },
  logo: { width: 75, height: 82.5 },

  head: { flexDirection: "row", alignItems: "flex-end" },
  headTitle: { fontFamily: SERIF, fontSize: 29, color: gold, lineHeight: LH },
  headSub: { fontFamily: SERIF, fontSize: 15, color: navy, lineHeight: LH },
  headMeta: { flex: 1, alignItems: "flex-end" },
  headMetaLabel: {
    fontSize: 7.5,
    color: grey,
    letterSpacing: 0.75,
    textTransform: "uppercase",
    lineHeight: LH,
    marginBottom: LABEL_GAP + 0.5,
  },
  headMetaVal: { fontFamily: SERIF, fontSize: 15, color: navy, lineHeight: LH },
  headRule: { height: 0.5, backgroundColor: gold, marginTop: GAP },

  // Section marker: gold label + grey-italic French + a full-width hairline.
  section: { marginTop: BLOCK },
  sectionRow: { flexDirection: "row" },
  sectionEn: {
    fontSize: 10,
    color: gold,
    letterSpacing: 1,
    textTransform: "uppercase",
    lineHeight: LH,
  },
  sectionFr: {
    fontSize: 10,
    color: grey,
    fontStyle: "italic",
    letterSpacing: 1,
    textTransform: "uppercase",
    lineHeight: LH,
    marginLeft: GAP,
  },
  sectionRule: {
    height: 0.5,
    backgroundColor: gold,
    marginTop: GAP,
    marginBottom: GAP,
  },

  subHeading: {
    fontSize: 10,
    fontWeight: 500,
    color: black,
    lineHeight: LH,
    marginTop: GAP,
  },
  // The section rule already carries the 20 px that follows a gold line. A
  // sub-heading opening a section adds nothing on top, or the two margins
  // stack into 40 px where the master has 20.
  subHeadingFirst: {
    fontSize: 10,
    fontWeight: 500,
    color: black,
    lineHeight: LH,
  },
  subHeadingFr: { fontWeight: 400, fontStyle: "italic" },

  // Bilingual prose: English in black, the French translation grey and italic.
  paraEn: { fontSize: 10, color: black, lineHeight: LH },
  paraFr: { fontSize: 10, color: grey, fontStyle: "italic", lineHeight: LH },
  proseGroup: { gap: PAIR_GAP },

  // A label running inline with its value, as the masters set identity rows.
  infoRow: { flexDirection: "row", alignItems: "baseline", marginTop: LABEL_GAP },
  infoLabel: { marginRight: 6 },
  infoValue: { fontSize: 10, color: black, lineHeight: LH },

  // A box the tenant ticks by hand. Square, hairline, never pre-filled: which
  // mode applied is recorded on paper at signature, not in the app.
  tickRow: { flexDirection: "row", alignItems: "center", gap: LABEL_GAP },
  tickBox: { width: 11, height: 11, borderWidth: 0.5, borderColor: black, flexShrink: 0 },
  tickLabel: { flex: 1, fontSize: 10, color: black, lineHeight: LH },
  tickLabelFr: { fontStyle: "italic" },

  // Cards — flat, square, no border.
  card: { backgroundColor: cardBg, paddingHorizontal: 12, paddingVertical: 9.5 },
  row: { flexDirection: "row", gap: GAP },

  // Grey caps label ("EN / fr")
  cap: {
    fontSize: 8,
    color: grey,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    lineHeight: LH,
  },
  capFr: { fontStyle: "italic" },

  name: {
    fontFamily: SERIF,
    fontSize: 14,
    color: black,
    lineHeight: LH,
    marginTop: LABEL_GAP,
  },

  // Footer (fixed): monogram · legal · page + initials. It sits 743 pt down
  // the page in the masters, i.e. 48 pt off the bottom edge.
  footer: {
    position: "absolute",
    bottom: 48,
    left: 50,
    right: 50,
    borderTopWidth: 0.5,
    borderTopColor: gold,
    paddingTop: GAP,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  footMono: { width: 33, height: 40 },
  footLine: { fontSize: 8, color: grey, lineHeight: LH },
  footRight: { width: 170.5, alignItems: "flex-end" },
  footPage: { fontSize: 8, color: grey, lineHeight: LH, textAlign: "right" },
  footInitialsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 12,
  },
  footInitialsLabel: {
    fontSize: 7,
    color: grey,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    lineHeight: LH,
    marginRight: LABEL_GAP,
  },
  footInitialsBox: { width: 59.5, height: 18, borderWidth: 0.5, borderColor: grey },
});

/** The agency identity printed in every footer. */
export type AgencyIdentity = {
  legalName: string;
  address: string;
  rcs: string;
  cartePro: string;
  garantieFinanciere: string;
  rcp: string;
  web: string;
  phone: string;
};

/**
 * Grey caps label rendered as "EN / fr". The masters set the French half in
 * italic on most labels but leave it upright on a few, so the caller says
 * which rather than the component guessing.
 */
export function Cap({
  en,
  fr,
  italicFr = true,
}: {
  en: string;
  fr?: string;
  italicFr?: boolean;
}) {
  if (!fr) return <Text style={h.cap}>{en}</Text>;
  return (
    <Text style={h.cap}>
      {en} / <Text style={italicFr ? [h.cap, h.capFr] : h.cap}>{fr}</Text>
    </Text>
  );
}

/**
 * Section marker: gold label, French caption, full-width hairline. `first`
 * drops the leading block gap so a section opening a page sits flush on the
 * top margin, the way each frame in the masters starts.
 */
export function Section({
  en,
  fr,
  first,
  children,
}: {
  en: string;
  fr?: string;
  first?: boolean;
  /**
   * The section's opening block, when it has a bounded height. Passing it here
   * makes the marker and that block indivisible, which the guard alone cannot
   * do — it keeps the marker whenever *some* room follows, without knowing how
   * much the block needs. Omit for a section that opens on long prose.
   */
  children?: React.ReactNode;
}) {
  return (
    <View
      style={first ? undefined : h.section}
      wrap={false}
      // A heading alone at the foot of a page is not a heading — it announces
      // something the reader has to turn over to find. The guard applies only
      // to a bare marker: once an opening block is bound in, `wrap={false}`
      // already keeps them together, and asking for room *after* the pair as
      // well would push a section that fits onto the next page.
      {...(children ? {} : { minPresenceAhead: ORPHAN_GUARD })}
    >
      <View style={h.sectionRow}>
        <Text style={h.sectionEn}>{en}</Text>
        {fr ? <Text style={h.sectionFr}>{fr}</Text> : null}
      </View>
      <View style={h.sectionRule} />
      {children}
    </View>
  );
}

/** An unticked box with its bilingual label, as the master draws them. */
export function Tick({ en, fr }: { en: string; fr: string }) {
  return (
    <View style={h.tickRow}>
      <View style={h.tickBox} />
      <Text style={h.tickLabel}>
        {en} <Text style={h.tickLabelFr}>/ {fr}</Text>
      </Text>
    </View>
  );
}

/**
 * A sub-heading bound to the block it introduces, so the two cannot be split
 * across a page.
 *
 * `minPresenceAhead` alone is a guess: it keeps the heading only when some
 * room follows, but cannot know how much the block actually needs — which is
 * how "Security deposit amount" ended a page while its table began the next.
 * For content of bounded height (a card, a short money table) the honest fix
 * is to make the pair indivisible.
 *
 * Only for blocks that comfortably fit a page. Long prose should still break,
 * so it keeps the sub-heading and the guard instead.
 */
export function TitledBlock({
  en,
  fr,
  first,
  children,
}: {
  en: string;
  fr?: string;
  first?: boolean;
  children: React.ReactNode;
}) {
  return (
    // No guard: `wrap={false}` already keeps the heading with its block, and
    // minPresenceAhead would additionally demand that much room *after* the
    // pair — pushing a block that fits perfectly well onto the next page.
    <View wrap={false}>
      <SubHeading en={en} fr={fr} first={first} />
      {children}
    </View>
  );
}

/**
 * A numbered sub-heading inside a section ("1.1 The Agent / Le Mandataire").
 *
 * The master sets these in SemiBold, which the licensed family does not
 * include — Medium is the heaviest face bundled. The French half stays at
 * regular weight because only the 400 italic exists, and asking react-pdf for
 * a medium italic it was never given crashes the render.
 */
export function SubHeading({
  en,
  fr,
  first,
}: {
  en: string;
  fr?: string;
  /** Set when this opens a section, so it does not add to the rule's gap. */
  first?: boolean;
}) {
  return (
    // Same orphan rule as a section marker: a sub-heading stranded at the foot
    // of a page separates a clause from its title.
    <View wrap={false} minPresenceAhead={ORPHAN_GUARD}>
      <Text style={first ? h.subHeadingFirst : h.subHeading}>
        {en}
        {fr ? <Text style={h.subHeadingFr}> / {fr}</Text> : null}
      </Text>
    </View>
  );
}

/**
 * Monogram · legal · page + initials, pinned to the bottom of every page.
 *
 * The page counter has to be resolved on the footer itself: a `render`
 * callback on a nested Text makes react-pdf drop every sibling that precedes
 * it, which silently swallows the monogram and the legal block. `fixed` is
 * kept so that if a page ever overflows, the spill still carries a footer.
 */
export function Footer({ a }: { a: AgencyIdentity }) {
  return (
    <View
      style={h.footer}
      fixed
      render={(props) => {
        // react-pdf passes totalPages to any render callback but only declares
        // it on Text's, so read it through the wider shape.
        const { pageNumber, totalPages } = props as typeof props & {
          totalPages?: number;
        };
        return (
          <>
            <Image src={MONOGRAM} style={h.footMono} />
            <View>
              <Text style={h.footLine}>
                {a.legalName} — {a.address}
              </Text>
              <Text style={h.footLine}>
                {a.rcs} — {a.cartePro}
              </Text>
              <Text style={h.footLine}>
                {a.garantieFinanciere} — {a.rcp}
              </Text>
              <Text style={h.footLine}>
                {a.web} — {a.phone}
              </Text>
            </View>
            <View style={h.footRight}>
              <Text style={h.footPage}>
                Page {pageNumber}/{totalPages}
              </Text>
              <View style={h.footInitialsRow}>
                <Text style={h.footInitialsLabel}>Initials / Paraphes</Text>
                <View style={h.footInitialsBox} />
              </View>
            </View>
          </>
        );
      }}
    />
  );
}

/**
 * A document's masthead: the vertical lockup, the bilingual title and the
 * reference, over a gold rule.
 */
export function Masthead({
  titleEn,
  titleFr,
  reference,
}: {
  titleEn: string;
  titleFr: string;
  reference?: string;
}) {
  return (
    <>
      <View style={h.logoWrap}>
        <Image src={LOGO_VERTICAL} style={h.logo} />
      </View>
      <View style={h.head}>
        <View>
          <Text style={h.headTitle}>{titleEn}</Text>
          <Text style={h.headSub}>{titleFr}</Text>
        </View>
        {reference ? (
          <View style={h.headMeta}>
            <Text style={h.headMetaLabel}>Référence</Text>
            <Text style={h.headMetaVal}>{reference}</Text>
          </View>
        ) : null}
      </View>
      <View style={h.headRule} />
    </>
  );
}
