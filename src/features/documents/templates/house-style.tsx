import * as React from "react";
import { View, Text, Image, StyleSheet } from "@react-pdf/renderer";

import { BstayLogo, BstayMonogram } from "@/features/documents/templates/logo";

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

// Palette. Two brand colours and nothing else: the ink the mark is drawn in,
// and the paper it sits on. The gold (#a8936c) and the navy (#041c2c) are
// retired — what used to be said with hue is now said with size, capitals and
// the weight of a rule.
//
// Between them sits a five-step grey ramp, and no hue at all. A hairline is
// the one place full ink would be wrong — at 0.5 pt it reads far heavier than
// the gold line it replaces, which is why rules take Gris 20 rather than the
// ink itself.
export const ink = "#111110";
// The second brand colour. Never painted on a document — see the page style
// below — but the ground the grey ramp is mixed against, which is why the
// greys are warm rather than neutral.
export const paper = "#f0ede8";

// The five greys, and the only greys. They are not chosen tones: each is the
// ink laid into the paper at the percentage it is named for, which is true to
// the hex — Gris 60 is #6a6966, and mixing 60 % of #111110 into #f0ede8 gives
// #6a6966 exactly. So the ramp cannot drift off the two brand colours, and a
// value that is not on it is a mistake rather than a variation.
export const grey80 = "#3e3d3b";
export const grey60 = "#6a6966";
export const grey40 = "#979592";
export const grey20 = "#c3c1bd";
export const grey10 = "#dad7d2";

// What each step is for. Named separately from the ramp so a document asks for
// a role and not for a number, and so re-pitching a role later is one line.
// Roles, re-pitched from the website. b-stay.com runs the pair the other way
// up — ink ground, paper type — with its own steps between them
// (--color-hairline #2e2c29, --color-faint #444240, --color-muted #888580),
// each a small lift off the ground rather than a mid grey. Inverted onto a
// printed sheet the same idea gives: a hairline that barely darkens the paper,
// a secondary grey that stays well clear of the ink, and the paper itself —
// not a grey — carrying the surfaces.
export const rule = grey20; // hairlines and borders
export const grey = grey60; // secondary copy
// The cards keep #f9f9f9, which is neither the paper nor a step on the grey
// ramp. Deliberately: a data card has to read as a panel on the sheet without
// becoming a colour of its own, and at four points off white it is the lightest
// thing that still holds an edge. The paper (#f0ede8) tried here was warm
// enough to read as a tint, which is a different claim than "this is a panel".
export const cardBg = "#f9f9f9";

// Two faces, and only two. Albertus Nova carries the title block; Archivo sets
// everything else, body and values alike.
//
// The old direction split those last two — Passenger Display on a party's name
// or a date, Familjen Grotesk on the prose — so a value was told apart by its
// shape. With one face left, that contrast is gone, and the values carry
// `fontWeight: 500` instead: still Archivo, half a step heavier than the copy
// around them, which is what now says "this is the answer, not the question".
export const TITLE = "Albertus Nova";
export const BODY = "Archivo";

// The masters' spacing scale, halved: 40 px between top-level blocks, 20 px
// inside a section, 14 px between a label and its value, 10 px between the
// two lines of a value pair.
export const BLOCK = 20;
export const GAP = 10;
export const LABEL_GAP = 7;
export const PAIR_GAP = 5;

/**
 * The same scale, tightened, for a page that has to hold one block more than
 * it comfortably fits.
 *
 * Only the parties page uses it, and only because article 2 opens on a marker
 * bound to its card: some 194 pt that cannot be split, against 187 pt left
 * once the tenant is set out. Seven points short of a page — hence a tighter
 * rhythm rather than a break that would leave both pages half empty.
 *
 * Deliberately the mildest scale that does the job with room to spare: it
 * buys about 35 pt where only 7 are needed, so a tenant with a few more lines
 * of identity than usual still fits. Tightening further would gain nothing a
 * reader could use and would cost the page its resemblance to the others.
 *
 * The block gap is the one that shows — it is what separates two numbered
 * articles — so it stays nearest its normal value. The small gaps do most of
 * the work instead, being used ten times over on this page against twice for
 * the block.
 */
export const TIGHT_BLOCK = 16;
export const TIGHT_GAP = 8;

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
export const h = StyleSheet.create({
  page: {
    paddingTop: 50,
    // The fixed footer's top edge is 99 pt off the bottom. Content stops 10 pt
    // (20 px) above it rather than against it, so a last line never sits on
    // the footer rule.
    paddingBottom: 109,
    paddingHorizontal: 50,
    fontFamily: BODY,
    fontWeight: 400,
    fontSize: 10,
    lineHeight: LH,
    color: ink,
    // No background. A commercial document is made to be printed, so the sheet
    // is the printer's white — a tinted ground would be ink the agency pays to
    // lay down over the whole page, and would not match the paper it lands on.
    // The warmth of the brand comes through the grey ramp instead, which is
    // itself mixed from #f0ede8 and so carries that cast into every rule and
    // card on the page.
  },

  // ---- Cover (page 1) -------------------------------------------------
  //
  // The one page in the document that is not set on a padded white sheet. It
  // is built from three full-bleed bands — an ink masthead, a hero, a row of
  // three frames — so the page has no padding of its own and each band carries
  // its own. Nothing else in the document works this way, and nothing else
  // should: a cover is a poster, the pages after it are a contract.
  // The ink is the page, not just the masthead band on it. Everything the
  // photographs do not cover — the strip under the bottom row, and the gutters
  // between the three frames — is the same ground, so the cover reads as one
  // dark sheet with pictures set into it rather than as bands laid on white.
  //
  // It is also the one page that is printed edge to edge, which the inside
  // pages deliberately are not: they carry a contract and are set on the white
  // of the sheet.
  coverPage: {
    backgroundColor: ink,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
  },

  coverBand: {
    // No background of its own — the page is already the ink.
    height: 286,
    paddingHorizontal: 50,
    paddingTop: 52,
  },
  coverLogo: { alignItems: "center" },
  coverHead: { marginTop: 56, flexDirection: "row", alignItems: "flex-end" },
  coverTitleWrap: { flex: 1, paddingRight: BLOCK },
  coverTitle: {
    fontFamily: TITLE,
    fontWeight: 200,
    fontSize: 20,
    color: paper,
    lineHeight: LH,
    textTransform: "uppercase",
  },
  // The French title is set in capitals here, not in the sentence case the
  // inside pages use for it, and told apart by colour rather than by case —
  // which is how the master draws it, and why the ink ground earns its keep.
  coverSubtitle: {
    fontFamily: TITLE,
    fontWeight: 200,
    fontSize: 17,
    color: grey40,
    lineHeight: LH,
    textTransform: "uppercase",
  },
  coverMeta: { flexShrink: 0, alignItems: "flex-end" },
  coverMetaLabel: {
    fontFamily: BODY,
    fontSize: 7,
    color: grey40,
    letterSpacing: 1.75,
    textTransform: "uppercase",
    lineHeight: LH,
    marginBottom: LABEL_GAP,
  },
  coverMetaValue: {
    fontFamily: BODY,
    fontWeight: 500,
    fontSize: 15,
    color: paper,
    lineHeight: LH,
  },
  // Gris 80 on the ink, which is the ramp's answer to the site's
  // --color-hairline (#2e2c29): a rule that lifts off the ground rather than
  // cutting across it.
  coverRule: { height: 0.5, backgroundColor: grey80, marginTop: 16 },
  coverFoot: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: 16,
  },
  coverFootText: {
    fontFamily: BODY,
    fontSize: 11,
    color: paper,
    lineHeight: LH,
    textTransform: "uppercase",
  },

  // The photographs, full bleed and butted to the band above them.
  coverHero: { width: "100%", height: 368, objectFit: "cover" },
  coverThumbRow: { flexDirection: "row", height: 146 },
  coverThumb: { flex: 1, height: 146, objectFit: "cover" },
  coverThumbGap: { width: 1.5 },

  // Masthead — first page only, in flow (no logo repeats on later pages).
  logoWrap: { alignItems: "center", marginBottom: 40 },
  logo: { width: 75, height: 82.5 },

  head: { flexDirection: "row", alignItems: "flex-end" },
  // The title takes what is left, the reference keeps what it needs.
  //
  // Without this the title sizes to its own content and the reference is
  // pushed off the right margin — which is what tightening the tracking did:
  // "Seasonal Rental Agreement" stopped wrapping onto two lines, grew wide
  // enough to fill the measure on one, and shoved SRA-0001240 past the edge of
  // the sheet. A title long enough to need two lines now takes them again,
  // against a reference that can no longer be displaced.
  headTitleWrap: { flex: 1, paddingRight: BLOCK },
  headTitle: {
    fontFamily: TITLE,
    fontWeight: 200,
    fontSize: 29,
    color: ink,
    lineHeight: LH,
    // Capitals, as the face is cut for and as the agency letters its titles,
    // and at the spacing the face was drawn with. Tracking is for the small
    // labels here; a title carries its own measure and anything added to it —
    // opened or closed — reads as a logotype rather than as a heading.
    textTransform: "uppercase",
  },
  headSub: { fontFamily: TITLE, fontWeight: 200, fontSize: 15, color: ink, lineHeight: LH },
  headMeta: { flexShrink: 0, alignItems: "flex-end" },
  // The site's signature device, and the counterweight to the tight title: a
  // very small uppercase label opened right up. .25em of 7 pt is 1.75 pt.
  headMetaLabel: {
    fontFamily: BODY,
    fontSize: 7,
    color: grey,
    letterSpacing: 1.75,
    textTransform: "uppercase",
    lineHeight: LH,
    marginBottom: LABEL_GAP + 0.5,
  },
  headMetaVal: { fontFamily: TITLE, fontWeight: 200, fontSize: 15, color: ink, lineHeight: LH },
  headRule: { height: 0.5, backgroundColor: rule, marginTop: GAP },

  // Section marker: ink label + grey-italic French + a full-width hairline.
  section: { marginTop: BLOCK },
  sectionRow: { flexDirection: "row" },
  // A section marker is set like the titles it ranks with: capitals, at the
  // face's own spacing. It is smaller than the copy it opens, which is what
  // keeps it a marker rather than a heading.
  sectionEn: {
    fontFamily: TITLE,
    fontWeight: 200,
    fontSize: 9,
    color: ink,
    textTransform: "uppercase",
    lineHeight: LH,
  },
  // No italic: the family is registered in Thin alone and has no sloped cut to
  // ask for. The French caption is told apart by colour instead, which is how
  // the cover separates the two languages.
  //
  // A point larger than the Archivo it replaces: Albertus is a lighter colour
  // on the page at the same size, and at 8 pt the marker went faint enough to
  // stop opening its section.
  sectionFr: {
    fontFamily: TITLE,
    fontWeight: 200,
    fontSize: 9,
    color: grey,
    textTransform: "uppercase",
    lineHeight: LH,
    marginLeft: GAP,
  },
  sectionRule: {
    height: 0.5,
    backgroundColor: rule,
    marginTop: GAP,
    marginBottom: GAP,
  },

  subHeading: {
    fontSize: 10,
    fontWeight: 500,
    color: ink,
    lineHeight: LH,
    marginTop: GAP,
  },
  // The section rule already carries the 20 px that follows a rule. A
  // sub-heading opening a section adds nothing on top, or the two margins
  // stack into 40 px where the master has 20.
  subHeadingFirst: {
    fontSize: 10,
    fontWeight: 500,
    color: ink,
    lineHeight: LH,
  },
  subHeadingFr: { fontWeight: 400, fontStyle: "italic" },

  // Tightened counterparts, for the parties page — see TIGHT_GAP.
  sectionTight: { marginTop: TIGHT_BLOCK },
  sectionRuleTight: {
    height: 0.5,
    backgroundColor: rule,
    marginTop: TIGHT_GAP,
    marginBottom: TIGHT_GAP,
  },
  subHeadingTight: {
    fontSize: 10,
    fontWeight: 500,
    color: ink,
    lineHeight: LH,
    marginTop: TIGHT_GAP,
  },
  cardTight: {
    backgroundColor: cardBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  // Bilingual prose: English in ink, the French translation grey and italic.
  paraEn: { fontSize: 10, color: ink, lineHeight: LH },
  paraFr: { fontSize: 10, color: grey, fontStyle: "italic", lineHeight: LH },
  proseGroup: { gap: PAIR_GAP },

  // A label running inline with its value, as the masters set identity rows.
  infoRow: { flexDirection: "row", alignItems: "baseline", marginTop: LABEL_GAP },
  infoLabel: { marginRight: 6 },
  infoValue: { fontSize: 10, color: ink, lineHeight: LH },

  // A box the tenant ticks by hand. Square, hairline, never pre-filled: which
  // mode applied is recorded on paper at signature, not in the app.
  tickRow: { flexDirection: "row", alignItems: "center", gap: LABEL_GAP },
  tickBox: {
    width: 11,
    height: 11,
    borderWidth: 0.5,
    borderColor: ink,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  // A filled square rather than a glyph: the bundled faces carry no check
  // mark, and a substitute font would not match the document.
  tickMark: { width: 6, height: 6, backgroundColor: ink },
  tickLabel: { flex: 1, fontSize: 10, color: ink, lineHeight: LH },
  tickLabelFr: { fontStyle: "italic" },

  // Cards — flat, square, no border.
  card: { backgroundColor: cardBg, paddingHorizontal: 12, paddingVertical: 9.5 },
  row: { flexDirection: "row", gap: GAP },

  // Grey caps label ("EN / fr")
  // 0.5, and the number is measured rather than chosen.
  //
  // react-pdf renders a letterspaced string by positioning every glyph itself,
  // and a text extractor infers a word break wherever the gap grows past what
  // it reads as a space. At the 0.8 this carried, "INCLUDED CHARGES" came out
  // of the finished PDF as "I NC LU DED CHA RGES": searching the contract for
  // it found nothing, and copying it produced nonsense. A contract that cannot
  // be searched is a contract nobody checks.
  //
  // Swept: every value up to 0.75 still extracts cleanly and 0.8 does not, so
  // the cliff sits in a 0.05 pt band. That is far too narrow to sit beside —
  // where it falls depends on the glyph widths of the particular label and on
  // the extractor doing the reading, so a longer label could break at a value
  // these four survive. 0.5 keeps most of the device with real room beneath.
  //
  // Anything added here must be re-tested, not reasoned about.
  cap: {
    letterSpacing: 0.5,
    fontSize: 8,
    color: grey,
    textTransform: "uppercase",
    lineHeight: LH,
  },
  capFr: { fontStyle: "italic" },

  name: {
    fontFamily: TITLE,
    fontWeight: 200,
    fontSize: 14,
    color: ink,
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
    borderTopColor: rule,
    paddingTop: GAP,
    height: 48.5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  // The mark, in the flow of the footer rather than on a layer of its own.
  //
  // It used to be positioned absolutely at the same `bottom: 48` as the footer,
  // which held only while the two boxes were the same height. They are not: the
  // footer grows upward with its content, so the day the right-hand column
  // gained a line the text rose and the mark stayed where it was, a dozen
  // points adrift. Anchoring two boxes to the same edge does not align their
  // opposite edges — putting the mark in the row does.
  //
  // The margin is the clearance the drawing does not provide: the monogram is
  // an octagon that runs to all four edges of its viewBox, so its ink ends
  // where its box ends and text set flush against it touches the outline.
  // The box is stated, not left to the row. Put in the flow without one, the
  // mark was handed whatever width the flex distribution left and came out
  // squashed into diagonal strokes — an Svg stretches to its container, and a
  // container with no width in a row has none of its own.
  // Reserves the mark's box in the row, the mark itself being drawn on the
  // layer below. Wider than the mark by one GAP, which is the clearance the
  // drawing does not provide: the monogram is an octagon running to all four
  // edges of its viewBox, so its ink ends where its box ends and text set
  // flush against it touches the outline.
  footMono: { width: 38 + GAP, height: 38 },
  // The layer. Both it and the footer are anchored to `bottom: 48`, which
  // aligns their bottoms and says nothing about their tops — and the top is
  // where the mark has to meet the first legal line. The footer used to take
  // whatever height its content wanted, so the day the right-hand column
  // gained a line the text rose and the mark stayed, a dozen points adrift.
  // Stating the height is what makes the two agree: 10 of padding over 38.5 of
  // content, which is the four agency lines at 8 pt, and the same 48.5 this
  // layer stands at.
  footMonoLayer: {
    position: "absolute",
    bottom: 48,
    left: 50,
    paddingTop: GAP + 0.5,
  },
  footLine: { fontSize: 8, color: grey, lineHeight: LH },
  footRight: { width: 170.5, alignItems: "flex-end" },
  // Reference and page on one line, not stacked.
  //
  // Stacked, they read as one cramped block — and the stack made this column
  // taller than the four legal lines opposite, which is what pushed the footer
  // upward and left the mark behind. One line answers both: which document,
  // then where in it, separated rather than piled.
  footIdentity: { flexDirection: "row", alignItems: "baseline" },
  // Its own element rather than a character glued to the reference: inside the
  // string the trailing space collapsed and the two ran together.
  footIdentitySep: { fontSize: 8, color: grey, marginHorizontal: 4, lineHeight: LH },
  // The reference carries the ink while the rest of the footer stays grey: it
  // is the one thing down here that identifies the document rather than the
  // agency, and it has to be findable at a glance on a loose page.
  footReference: {
    fontFamily: BODY,
    fontWeight: 500,
    fontSize: 8,
    color: ink,
    lineHeight: LH,
    textAlign: "right",
  },
  footPage: { fontSize: 8, color: grey, lineHeight: LH, textAlign: "right" },
  footInitialsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: GAP,
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
 * Section marker: ink label, French caption, full-width hairline. `first`
 * drops the leading block gap so a section opening a page sits flush on the
 * top margin, the way each frame in the masters starts.
 */
export function Section({
  en,
  fr,
  first,
  tight,
  children,
}: {
  en: string;
  fr?: string;
  first?: boolean;
  /** Use the tightened scale. Only the parties page does — see TIGHT_GAP. */
  tight?: boolean;
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
      style={first ? undefined : tight ? h.sectionTight : h.section}
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
      <View style={tight ? h.sectionRuleTight : h.sectionRule} />
      {children}
    </View>
  );
}

/**
 * A box with its bilingual label. All the options are printed and the one that
 * applies is ticked: the tenant should see what was declared on their behalf,
 * not just the single line someone chose, since their signature accepts it.
 */
export function Tick({
  en,
  fr,
  checked,
}: {
  en: string;
  fr: string;
  checked?: boolean;
}) {
  return (
    <View style={h.tickRow}>
      <View style={h.tickBox}>
        {checked ? <View style={h.tickMark} /> : null}
      </View>
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
  tight,
  breakable,
  children,
}: {
  en: string;
  fr?: string;
  first?: boolean;
  tight?: boolean;
  /**
   * Set when the block's height depends on the data — a list of billed
   * services, a list of charges — rather than on a fixed set of fields.
   *
   * react-pdf does not clip a `wrap={false}` block that outgrows the page. It
   * drops it, with a warning on the console and nothing on the paper: measured
   * here, a stay amount carrying thirty billed services printed its heading and
   * no figures at all. On a contract that is the price table silently missing,
   * which is worse than any page break could be — so a block that can grow is
   * allowed to break, and only the pieces that must stay together are bound.
   */
  breakable?: boolean;
  children: React.ReactNode;
}) {
  return (
    // Not breakable: `wrap={false}` already keeps the heading with its block,
    // and minPresenceAhead would additionally demand that much room *after*
    // the pair — pushing a block that fits perfectly well onto the next page.
    // Hence `guard={false}`: SubHeading carries one by default, and leaving it
    // on was sending "2 - The Property" to a page of its own.
    //
    // Breakable: nothing binds the heading any more, so it takes its guard
    // back — otherwise it is the heading that strands at the foot of a page.
    <View {...(breakable ? {} : { wrap: false })}>
      <SubHeading
        en={en}
        fr={fr}
        first={first}
        tight={tight}
        guard={breakable ?? false}
      />
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
  tight,
  guard = true,
}: {
  en: string;
  fr?: string;
  /** Set when this opens a section, so it does not add to the rule's gap. */
  first?: boolean;
  /** Use the tightened scale — see TIGHT_GAP. */
  tight?: boolean;
  /**
   * Clear when the caller already binds the heading to its block. The guard
   * then asks for room the pair does not need, and costs a page.
   */
  guard?: boolean;
}) {
  return (
    // Same orphan rule as a section marker: a sub-heading stranded at the foot
    // of a page separates a clause from its title.
    <View wrap={false} {...(guard ? { minPresenceAhead: ORPHAN_GUARD } : {})}>
      <Text
        style={
          first
            ? h.subHeadingFirst
            : tight
              ? h.subHeadingTight
              : h.subHeading
        }
      >
        {en}
        {fr ? <Text style={h.subHeadingFr}> / {fr}</Text> : null}
      </Text>
    </View>
  );
}

/**
 * Monogram · legal · page + initials, pinned to the bottom of every page.
 *
 * Two layers, because react-pdf 4.5.1 leaves no single arrangement that works:
 *
 *   • the page counter has to come from a `render` callback on the footer
 *     itself. A `Text` carrying its own `render` silently disappears whenever
 *     a lineHeight is inherited — and `h.page` sets one on every page, so
 *     every counter in this document would vanish, taking the siblings drawn
 *     before it along;
 *   • the mark cannot be inside that callback. A Svg built by a callback is
 *     never measured, so its viewBox is left unscaled: the mark is drawn at
 *     its own 75×92 pt and clipped to the 33×40 box, i.e. a fragment of a
 *     letter, which is what the footer showed.
 *
 * So the callback keeps everything textual and a spacer where the mark goes,
 * and the mark is drawn on a layer of its own, anchored the same way.
 *
 * `fixed` on both, so that if a page overflows the spill still carries a
 * footer.
 */
export function Footer({
  a,
  reference,
  templateVersion,
  initials = true,
}: {
  a: AgencyIdentity;
  /**
   * The agreement's own number, printed on every page.
   *
   * It used to appear on the cover alone, which left twelve of thirteen pages
   * carrying nothing but "Page 7/13". That matters here more than it would
   * elsewhere: the footer asks for initials on each page, and a page that has
   * been initialled but names no agreement proves nothing about which one it
   * belongs to — which is the whole purpose of initialling it. Photocopied,
   * scanned crooked or separated from the bundle, a page now still says what
   * it is part of.
   */
  reference?: string;
  /**
   * Which edition of the template produced this document.
   *
   * The number already exists: generate-document reads `template.version` and
   * writes it onto the generated_documents row, so the agency can say which
   * wording was in force. Until it is printed, only the agency can say it —
   * a tenant disputing a clause has no way to tell which terms applied. It is
   * passed in rather than taken from ContratData because that type is shared
   * with the live contract; wiring it is one argument at the call site in
   * generate-document, which already holds the value.
   */
  templateVersion?: number;
  /** Clear on the page that carries the signatures — see the note below. */
  initials?: boolean;
}) {
  return (
    <>
      <View style={h.footMonoLayer} fixed>
        {/* On its own layer, outside the footer's `render`. Inside it the mark
            drew at its viewBox scale and overflowed its box — react-pdf does
            not resolve an Svg's viewBox within a render callback, and no width
            on the element or its container changes that. */}
        {/* The same grey as the lines beside it. At full ink the mark was the
            heaviest thing on the page, outweighing the agreement above it — a
            footer signs the page, it does not announce it. */}
        <BstayMonogram width={38} height={38} color={grey} />
      </View>
      <View
        style={h.footer}
        fixed
        render={(props) => {
          // react-pdf passes totalPages to any render callback but only
          // declares it on Text's, so read it through the wider shape.
          const { pageNumber, totalPages } = props as typeof props & {
            totalPages?: number;
          };
          return (
            <>
              <View style={h.footMono} />
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
                {/* Identity before pagination: which agreement, then where in
                    it. A page number alone answers the less useful question. */}
                <View style={h.footIdentity}>
                  {reference ? (
                    <Text style={h.footReference}>
                      {reference}
                      {templateVersion !== undefined ? (
                        <Text style={h.footLine}> · v{templateVersion}</Text>
                      ) : null}
                    </Text>
                  ) : null}
                  {reference ? <Text style={h.footIdentitySep}>·</Text> : null}
                  <Text style={h.footPage}>
                    Page {pageNumber}/{totalPages}
                  </Text>
                </View>
                {/* Not on the signed page. Initials attest that a page was
                    read; the page carrying the signatures is attested by the
                    signatures themselves, and a box asking to initial what you
                    have just signed reads as a form nobody checked. */}
                {initials ? (
                  <View style={h.footInitialsRow}>
                    <Text style={h.footInitialsLabel}>Initials / Paraphes</Text>
                    <View style={h.footInitialsBox} />
                  </View>
                ) : null}
              </View>
            </>
          );
        }}
      />
    </>
  );
}

/**
 * A document's masthead: the vertical lockup, the bilingual title and the
 * reference, over a hairline.
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
        <BstayLogo width={170} height={50.7} />
      </View>
      <View style={h.head}>
        <View style={h.headTitleWrap}>
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
