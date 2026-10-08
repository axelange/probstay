import * as React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Svg,
  Defs,
  LinearGradient,
  Stop,
  Rect,
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
  cardBg,
  grey,
  GAP,
  LABEL_GAP,
  PAIR_GAP,
  LH,
  type AgencyIdentity,
} from "@/features/documents/templates/house-style";
import {
  isList,
  isSlot,
  type Article,
} from "@/features/documents/concierge-clauses";
import type {
  Bilingual,
  ConciergeTier,
  Inclusion,
} from "@/features/documents/concierge-packages";

/**
 * "Private Concierge & Estate Management Agreement / Contrat de conciergerie
 * privée" — the owner's subscription to one of the three packages.
 *
 * Same house system as the Seasonal Rental Agreement and the Confirmation:
 * ink cover, Albertus for the titles, the shared footer. It differs from them
 * in one structural way, which is the point of the document — where the old
 * paper contract set out four broad undertakings by BSTAY, this one prints the
 * schedule of services the package actually covers. An enumerated perimeter is
 * provable; an intention is not.
 *
 * It can be set bilingually, English over French as the other documents are,
 * or in French alone. French alone drops the language clause with it: an
 * article saying which of two versions prevails has nothing to say when there
 * is one.
 */

export type ConciergeServiceGroup = {
  title: Bilingual;
  lines: { label: Bilingual; inclusion: Inclusion }[];
};

export type ConciergeData = {
  /**
   * No reference, for now.
   *
   * The other two documents draw theirs from a series when they are generated
   * and filed. This one is only ever previewed, so there is no series to draw
   * from and nothing a number would refer to — printing "APERÇU" where the
   * others print an identifier would look like a reference that happens to be
   * wrong. The cover's meta block and the footer's identity line are therefore
   * absent rather than empty, and come back together the day the agreement is
   * generated: `Footer` already prints a reference when it is handed one.
   */
  place: string;
  date: string;
  /** English over French, as the other documents are set. */
  bilingual: boolean;
  agency: AgencyIdentity & {
    name: string;
    legalForm: string;
    representedBy: string;
    capacity: string;
  };
  client: {
    name: string;
    /**
     * Whether the Owner is a legal entity.
     *
     * Decides the whole party sentence, not a word of it: a company has a
     * registered office and not a residence, is identified by its entry on the
     * register, and signs through an officer whose office has to be named for
     * the signature to bind it.
     */
    isCompany: boolean;
    /** Registered office or home address, as the parties block prints it. */
    address?: string;
    /** "SAS", "SCI" — omitted from the sentence when the name carries it. */
    legalForm?: string;
    /** The SIREN or equivalent, as entered. */
    registrationNumber?: string;
    representedBy?: string;
    /**
     * The office held in the company — Président, Directeur général, Gérant.
     *
     * Not "Propriétaire", which is the party's role under this contract and no
     * evidence of a power to sign for it. A signature given without an office
     * is one the company can later disown.
     */
    capacity?: string;
  };
  /**
   * The residence under management.
   *
   * The paper contract this replaces never named one — it managed "the Owner's
   * property" and left it at that, which for an estate-management agreement is
   * the one thing that cannot be left out. Null only while a draft is being
   * assembled; a contract is not complete without it.
   */
  property: {
    label: string;
    address?: string;
    /** Label-and-value pairs, as the Seasonal Agreement's property card sets
     *  them. A bare list of values gave every row the same caption, and
     *  "Detail: 4 rooms" over "Detail: 2 bedrooms" says less than the values
     *  alone would. */
    details?: { label: Bilingual; value: string }[];
    /**
     * Only ever set for a property of the agency's own.
     *
     * A residence described by hand has none — the agent is typing a client's
     * house, not opening a file on it — so the cover keeps the plain ink it had
     * before rather than leaving a hole where a photograph was expected.
     */
    photos?: string[];
  } | null;
  tier: ConciergeTier;
  tierName: Bilingual;
  /**
   * The agreed monthly fee, as typed.
   *
   * Every package is priced "from": the figure is set after the agent has
   * visited and seen what the property asks for. A catalogue price would be
   * wrong on every contract, so none is printed.
   */
  /**
   * The agreement itself, article by article, with its placeholders filled.
   *
   * Passed in rather than imported: the template renders whatever it is given,
   * so a revised set of clauses is a change to the data and never to this file.
   */
  articles: Article[];
  /** The day the agreement takes effect, as it prints. */
  startDate: string;
  /** The agreed fee, per month, excluding VAT — set after the agent's visit. */
  monthlyFee: string;
  /**
   * What will actually be charged, quarter by quarter, over the initial term.
   *
   * On calendar quarters — see concierge-schedule. Empty until a fee has been
   * entered, and the summary is then absent rather than a column of zeroes.
   */
  instalments: {
    quarter: Bilingual;
    /** The day the invoice is issued — payable fifteen days later, per 7.4. */
    invoicedOn: string;
    /** Already carrying "HT": every figure in this article is net of VAT. */
    amount: string;
  }[];
  fund: { amount: string; threshold: string } | null;
  services: ConciergeServiceGroup[];
};

/** The single gap the cover is built on — see `coverFill`. */
const COVER_GAP = 52;

const s = StyleSheet.create({
  // ---- Cover -------------------------------------------------------------
  //
  // The band runs the whole page here, where the Seasonal Agreement's stops at
  // 286 pt and hands the rest to a grid of photographs. This contract has no
  // photographs to show — it is sold for a residence the agency may never have
  // let — so the band keeps the page to itself and the foot line drops to the
  // bottom of it. Left at 286 pt, two thirds of the cover was unexplained ink.
  // One rhythm for the whole cover: the same gap above the lockup, between
  // the lockup and the photograph, between the photograph and the title, and
  // below the title. The shared cover styles set 52, 56 and 16 at those four
  // places, which reads as four different intentions rather than one.
  //
  // No horizontal padding on the band, so the photograph runs the full width.
  // The lockup and the title carry their own inset instead.
  coverFill: {
    height: "100%",
    paddingHorizontal: 0,
    paddingTop: COVER_GAP,
    paddingBottom: COVER_GAP,
  },
  coverInset: { paddingHorizontal: 50 },
  // Centred, like the lockup above it. The Seasonal Agreement ranges its title
  // left and sets a reference against the right margin; this cover has one
  // column and nothing to balance, so left-ranged text sat off to one side of
  // a centred mark and a full-width photograph.
  coverCentre: { alignItems: "center" },
  coverTitleCentred: { textAlign: "center" },
  // Takes the height the lockup and the title block leave it, and the whole
  // width of the page.
  coverPhoto: {
    flexGrow: 1,
    marginTop: COVER_GAP,
    marginBottom: COVER_GAP,
  },
  coverPhotoClip: { flexGrow: 1, overflow: "hidden" },
  coverPhotoImage: { width: "100%", height: "100%", objectFit: "cover" },
  // 36 pt — the client banner's `h-12`, to the point — plus a point of
  // overhang at each end.
  //
  // The overhang is not padding, and it is four points rather than one.
  //
  // Laid flush, a hairline of untouched photograph showed along the join — 39
  // against 17 in a dark sky, brighter still where the picture is. It is a
  // rasteriser artefact and not a fault in the page: measured at 150 dpi it
  // peaks at 39, at 300 and 600 it is gone, which is a pixel grid landing
  // astride the seam. A reader's viewer does the same at some zoom levels.
  //
  // Four points of fully opaque ink past the edge means the boundary pixel is
  // solidly ink however it is sampled. The parent clips, so the overhang
  // costs nothing but the ramp it adds.
  coverFade: { position: "absolute", left: -4, right: -4, height: 40 },

  // ---- Parties -----------------------------------------------------------
  party: { marginTop: GAP },
  partyName: { fontSize: 10, color: ink, fontWeight: 500, lineHeight: LH },
  partyLine: { fontSize: 9, color: grey, lineHeight: LH, marginTop: PAIR_GAP },
  partyJoin: {
    marginTop: GAP,
    fontSize: 9,
    color: grey,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // ---- The schedule of services -----------------------------------------
  //
  // One card per category, on the grey the other documents give their cards.
  // Left to run as plain lines the schedule read as one long list that the
  // headings only interrupted; boxed, each category is a thing the eye can
  // take in whole, which is how a client checks what they are buying.
  //
  // The card is free to break across a page, which was asked for and is also
  // the safer of the two: a bound block taller than a page is dropped by
  // react-pdf rather than moved, so binding would trade a cut box for a
  // category that silently disappears the day it grows.
  //
  // The heading is still bound to its first line, so a category never
  // announces itself at the foot of a page and begins overleaf.
  group: { marginTop: GAP },
  groupTitle: {
    fontSize: 8,
    color: ink,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: PAIR_GAP,
  },
  // A service: one block, no marker beside it.
  line: { marginTop: LABEL_GAP },
  // A numbered obligation: a marker and a body side by side. Its own style,
  // not the service line's. They shared one until the service lost its dash,
  // and dropping `flexDirection: "row"` for the service piled every
  // obligation's number on top of its text — a style shared by two things
  // that are no longer the same thing.
  listRow: { flexDirection: "row", marginTop: LABEL_GAP },
  // Not a bullet glyph: a rule reads as a list without adding a character the
  // French and English halves would each have to carry.
  // Wide enough for "6.8". `width` alone would leave the number against the
  // text: a fixed-width Text in a row sizes itself but does not reserve the
  // gap after it. The margin does.
  lineMark: {
    width: 22,
    marginRight: 6,
    fontSize: 9.5,
    color: grey,
    lineHeight: LH,
  },
  lineBody: { flex: 1 },
  lineEn: { fontSize: 9.5, color: ink, lineHeight: LH },
  lineFr: { fontSize: 9.5, color: grey, fontStyle: "italic", lineHeight: LH },

  // ---- Money -------------------------------------------------------------
  feeCard: {
    backgroundColor: cardBg,
    paddingHorizontal: 12,
    paddingVertical: 9.5,
    marginTop: GAP,
  },
  feeRow: { flexDirection: "row", justifyContent: "space-between" },
  feeLabel: { fontSize: 9.5, color: ink, lineHeight: LH },
  feeValue: { fontSize: 10, color: ink, fontWeight: 500, lineHeight: LH },
  instalmentNote: { fontSize: 8, color: grey, lineHeight: LH, marginTop: 1 },

  // ---- The jurisdiction clause -------------------------------------------
  //
  // Capitals, bold and ruled, because the law asks it to be "très apparente"
  // to bind between businesses. The box is doing legal work, not decoration.
  veryVisible: {
    marginTop: GAP,
    borderWidth: 0.5,
    borderColor: "#111110",
    paddingHorizontal: 12,
    paddingVertical: 9.5,
  },
  veryVisibleText: {
    fontSize: 9,
    color: ink,
    fontWeight: 700,
    lineHeight: LH,
  },

  // ---- Signatures --------------------------------------------------------
  signRow: { flexDirection: "row", gap: 24, marginTop: 26 },
  signCol: { flex: 1 },
  signBox: {
    height: 110,
    borderWidth: 0.5,
    borderColor: "#c3c1bd",
    marginBottom: PAIR_GAP,
  },
  signLabel: {
    fontSize: 7,
    color: grey,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  signName: { fontSize: 10, color: ink, lineHeight: LH, marginTop: 2 },
});

/**
 * A label set beside its value, as the Seasonal Agreement's cards set them.
 *
 * Copied rather than shared, and with its note: the label is a direct child of
 * the row and not wrapped in a View, because the row aligns on baselines and
 * only a Text has one. Wrapped, the 7 pt label and the 10 pt value line up on
 * an edge of a box instead, and the value floats a point above its own name.
 */
function InfoRow({
  label,
  value,
}: {
  label: { en: string; fr?: string };
  value: string;
}) {
  return (
    <View style={h.infoRow}>
      <View style={h.infoLabel}>
        <Cap en={label.en} fr={label.fr} />
      </View>
      <Text style={h.infoValue}>{value}</Text>
    </View>
  );
}

/**
 * One line of the schedule.
 *
 * No bullet, and no qualifier beneath. The dash was furniture — the grey card
 * already says where a list begins and ends — and the qualifiers repeated in
 * small type what the labels now say for themselves: "sur demande" is part of
 * the service, not a footnote to it.
 */
function ServiceLine({
  label,
  bilingual,
}: {
  label: Bilingual;
  bilingual: boolean;
}) {
  return (
    // Bound: a service and its translation must not be split by a page.
    <View style={s.line} wrap={false}>
      <Text style={s.lineEn}>{bilingual ? label.en : label.fr}</Text>
      {bilingual ? <Text style={s.lineFr}>{label.fr}</Text> : null}
    </View>
  );
}

/**
 * The ink fade along an edge of the cover photograph.
 *
 * The same one the client page's banner carries — `h-12 bg-gradient-to-b
 * from-transparent to-[#111110]` — at the same size: its 3rem is 36 pt. There
 * it closes the foot of the banner; here it closes both edges, since the
 * photograph has ink above it as well as below.
 *
 * Drawn as SVG because react-pdf has no CSS gradient: a View takes a flat
 * colour only, and stacking translucent bands to fake one shows its steps at
 * print resolution. Measured at 150 dpi, the ramp is smooth.
 */
function CoverFade({ edge }: { edge: "top" | "bottom" }) {
  return (
    <Svg
      style={[s.coverFade, edge === "top" ? { top: -4 } : { bottom: -4 }]}
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
    >
      <Defs>
        {/* x2 is 0.0001 and not 0, which is a workaround for a bug in the
            renderer rather than a choice. @react-pdf/render reads the gradient
            as:

              let x2 = gradient.props.x2 || 1;

            and a zero is falsy, so an explicit x2={0} — the way to say "do not
            travel sideways" — is replaced by 1. The fade then ran from corner
            to corner: measured 41 to 83 across the width and 58 to 140 down
            the height, a diagonal.

            Percentages do not help; "0%" multiplied by the bounding box gives
            NaN. A value small enough to be invisible and large enough to be
            truthy is what is left. */}
        <LinearGradient id={`fade-${edge}`} x1={0} y1={0} x2={0.0001} y2={1}>
          {/* Three stops, not two. The band runs 4 pt past the photograph at
              its opaque end and stays fully opaque for the first 15 % of its
              length, so the picture's own edge — a row of pixels the rasteriser
              blends with the ground, measured at 51 against the image's 116 —
              falls under solid ink rather than under a gradient already 10 %
              transparent there. Two partial coverages do not add up to one,
              which is what left a hairline. */}
          {edge === "top" ? (
            <>
              <Stop offset="0" stopColor={ink} stopOpacity={1} />
              <Stop offset="0.15" stopColor={ink} stopOpacity={1} />
              <Stop offset="1" stopColor={ink} stopOpacity={0} />
            </>
          ) : (
            <>
              <Stop offset="0" stopColor={ink} stopOpacity={0} />
              <Stop offset="0.85" stopColor={ink} stopOpacity={1} />
              <Stop offset="1" stopColor={ink} stopOpacity={1} />
            </>
          )}
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="1" height="1" fill={`url(#fade-${edge})`} />
    </Svg>
  );
}

/** Article 1: the two parties, each in prose. */
function Parties({
  agency: a,
  ownerEn,
  ownerFr,
  bilingual: bi,
}: {
  agency: ConciergeData["agency"];
  ownerEn: string;
  ownerFr: string;
  bilingual: boolean;
}) {
  const agentEn = `${a.legalName}, a ${a.legalForm} registered with the ${a.rcs}, with its registered office at ${a.address}, holder of ${a.cartePro}, holding a CEGC financial guarantee (${a.garantieFinanciere}) and Generali professional civil liability insurance (${a.rcp}), represented by ${a.representedBy}, ${a.capacity}, hereinafter "BSTAY".`;
  const agentFr = `${a.legalName}, ${a.legalForm} immatriculée au ${a.rcs}, dont le siège social est situé ${a.address}, titulaire de la ${a.cartePro}, ${a.garantieFinanciere}, ${a.rcp}, représentée par ${a.representedBy}, ${a.capacity}, ci-après « BSTAY ».`;

  return (
    <>
      <SubHeading
        first
        en={bi ? "1.1 The Agent" : "1.1 Le Mandataire"}
        fr={bi ? "Le Mandataire" : undefined}
      />
      <View style={{ marginTop: GAP }}>
        <Text style={h.paraEn}>{bi ? agentEn : agentFr}</Text>
        {bi ? (
          <Text style={[h.paraFr, { marginTop: PAIR_GAP }]}>{agentFr}</Text>
        ) : null}
      </View>

      <SubHeading
        en={bi ? "1.2 The Owner" : "1.2 Le Propriétaire"}
        fr={bi ? "Le Propriétaire" : undefined}
      />
      <View style={{ marginTop: GAP }}>
        <Text style={h.paraEn}>{bi ? ownerEn : ownerFr}</Text>
        {bi ? (
          <Text style={[h.paraFr, { marginTop: PAIR_GAP }]}>{ownerFr}</Text>
        ) : null}
      </View>
    </>
  );
}

/** Article 2.1: the residence, in the card the Seasonal Agreement uses. */
function PropertyCard({
  property,
  bilingual: bi,
}: {
  property: ConciergeData["property"];
  bilingual: boolean;
}) {
  return (
    <View style={[h.card, { marginTop: GAP }]} wrap={false}>
      <View style={{ flexDirection: "row", gap: GAP }}>
        <View style={{ flexShrink: 1 }}>
          <Cap
            en={bi ? "Designation" : "Désignation"}
            fr={bi ? "Désignation" : undefined}
          />
          <Text style={h.name}>{property?.label ?? "—"}</Text>
        </View>
        {property?.address ? (
          <View
            style={{
              flex: 1,
              alignItems: "flex-end",
              justifyContent: "center",
            }}
          >
            <Cap
              en={bi ? "Address" : "Adresse"}
              fr={bi ? "Adresse" : undefined}
            />
            <Text
              style={[
                h.infoValue,
                { marginTop: LABEL_GAP, textAlign: "right" },
              ]}
            >
              {property.address}
            </Text>
          </View>
        ) : null}
      </View>
      {(property?.details ?? []).length > 0 ? (
        <View style={{ marginTop: GAP }}>
          {(property?.details ?? []).map((d, i) => (
            <InfoRow
              key={i}
              label={
                bi ? { en: d.label.en, fr: d.label.fr } : { en: d.label.fr }
              }
              value={d.value}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Article 4.1: the schedule of services, one grey card per category. */
function Services({
  groups,
  bilingual: bi,
}: {
  groups: ConciergeData["services"];
  bilingual: boolean;
}) {
  return (
    <>
      {groups.map((g, i) => (
        <View key={i} style={[h.card, s.group]}>
          {/* The heading travels with its first service, so a category never
              announces itself at the foot of a page and begins overleaf. Bound
              to one line and not to the group: a block taller than a page is
              dropped by react-pdf rather than moved. */}
          <View wrap={false}>
            <Text style={s.groupTitle}>{bi ? g.title.en : g.title.fr}</Text>
            {g.lines[0] ? (
              <ServiceLine label={g.lines[0].label} bilingual={bi} />
            ) : null}
          </View>
          {g.lines.slice(1).map((l, j) => (
            <ServiceLine key={j} label={l.label} bilingual={bi} />
          ))}
        </View>
      ))}
    </>
  );
}

/** Article 7.1: what will actually be charged, quarter by quarter. */
function Instalments({
  data,
  bilingual: bi,
}: {
  data: ConciergeData;
  bilingual: boolean;
}) {
  if (data.instalments.length === 0) return null;
  return (
    <View style={[s.feeCard, { marginTop: GAP }]}>
      {data.instalments.map((it, i) => (
        <View
          key={i}
          style={i > 0 ? [s.feeRow, { marginTop: LABEL_GAP }] : s.feeRow}
        >
          <View>
            <Text style={s.feeLabel}>{bi ? it.quarter.en : it.quarter.fr}</Text>
            {/* The issue date, and nothing else. The period it covers was
                there to show the pro rata; the amount shows it on its own,
                and article 7.1 says why. "Invoiced on" rather than "due on":
                7.4 gives fifteen days to pay, so a schedule claiming the
                money is due on the day of issue denied the Owner the term
                the same contract grants two articles later. */}
            <Text style={s.instalmentNote}>
              {bi ? `invoiced ${it.invoicedOn}` : `facturé le ${it.invoicedOn}`}
            </Text>
          </View>
          <Text style={s.feeValue}>{it.amount}</Text>
        </View>
      ))}
    </View>
  );
}

/** The closing block: how it is signed, and by whom. */
function Signatures({
  data,
  bilingual: bi,
}: {
  data: ConciergeData;
  bilingual: boolean;
}) {
  const a = data.agency;
  return (
    // Bound, so the heading, the electronic-signature wording and the two
    // boxes always travel together. They happen to land on the last page as
    // the contract stands; left free they would split the day an article grows
    // by a paragraph, and a signature box on a page of its own, under no
    // heading, is the one page of a contract that must not look like an
    // afterthought.
    //
    // Safe to bind: the block runs to roughly 400 pt against a text column of
    // 742, so it cannot be the kind react-pdf drops for being taller than a
    // page. Checked on all three packages, in both languages.
    <View wrap={false}>
      <Section
        en={bi ? "Signatures" : "Signatures"}
        fr={bi ? "Signatures" : undefined}
      />
      <Text style={[h.paraEn, { marginTop: GAP }]}>
        {bi
          ? "This agreement is concluded by electronic signature in accordance with articles 1366 and 1367 of the Civil Code and Regulation (EU) no. 910/2014 (eIDAS). The Parties acknowledge that such a signature has the same legal value as a handwritten signature, and that the signed, time-stamped file kept by the signature provider constitutes the original."
          : "Le présent contrat est conclu par voie de signature électronique conformément aux articles 1366 et 1367 du Code civil et au Règlement (UE) n° 910/2014 (eIDAS). Les Parties reconnaissent que cette signature a la même valeur juridique qu'une signature manuscrite et que le fichier signé, horodaté et conservé par le prestataire de signature, constitue l'original."}
      </Text>
      {bi ? (
        <Text style={[h.paraFr, { marginTop: PAIR_GAP }]}>
          {
            "Le présent contrat est conclu par voie de signature électronique conformément aux articles 1366 et 1367 du Code civil et au Règlement (UE) n° 910/2014 (eIDAS). Les Parties reconnaissent que cette signature a la même valeur juridique qu'une signature manuscrite et que le fichier signé, horodaté et conservé par le prestataire de signature, constitue l'original."
          }
        </Text>
      ) : null}
      <Text style={[h.paraEn, { marginTop: GAP }]}>
        {bi
          ? `Executed at ${data.place} on ${data.date}, in one electronic counterpart.`
          : `Fait à ${data.place}, le ${data.date}, en un exemplaire électronique.`}
      </Text>

      <View style={s.signRow}>
        <View style={s.signCol}>
          <View style={s.signBox} />
          <Text style={s.signLabel}>
            {bi ? "The Owner / Le Propriétaire" : "Le Propriétaire"}
          </Text>
          <Text style={s.signName}>{data.client.name}</Text>
          {data.client.representedBy ? (
            <Text style={s.partyLine}>{data.client.representedBy}</Text>
          ) : null}
          {/* The wording the source asks the Owner to write out by hand before
              signing — it is what turns a signature into a mandate. */}
          <Text style={s.partyLine}>
            {bi
              ? "Signature preceded by: « Lu et approuvé, bon pour mandat »"
              : "Signature précédée de la mention « Lu et approuvé, bon pour mandat »"}
          </Text>
        </View>
        <View style={s.signCol}>
          <View style={s.signBox} />
          <Text style={s.signLabel}>
            {bi ? "For BSTAY / Pour BSTAY" : "Pour BSTAY"}
          </Text>
          <Text style={s.signName}>{a.legalName}</Text>
          <Text style={s.partyLine}>
            {a.representedBy}, {a.capacity}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function ContratConciergerie({ data }: { data: ConciergeData }) {
  const { agency: a, bilingual: bi } = data;
  const photos = data.property?.photos ?? [];

  /**
   * The Owner's party line, in each language.
   *
   * Built here rather than inline because it is a sentence that grows or
   * shrinks with what is known — a company has a registered office and a
   * representative, a private individual usually has neither — and a sentence
   * assembled out of three nested ternaries in the middle of a page is a
   * sentence nobody will check.
   */
  const c = data.client;
  // "SAS TOPH 06, SAS immatriculée…" — the form is already in the name, as it
  // is for most of the agency's owners, so it is not repeated. Matched on a
  // word boundary: an "SCI" guard must not swallow a company called "Scierie".
  const formInName =
    !!c.legalForm &&
    new RegExp(
      `^${c.legalForm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      "i",
    ).test(c.name.trim());
  const form = c.legalForm && !formInName ? c.legalForm : null;
  const ownerEn = c.isCompany
    ? [
        c.name,
        form ? `a ${form}` : null,
        // No register is named. "The Trade and Companies Register" is the
        // French one, and the agency's owners include Monegasque, Swiss and
        // Luxembourg companies for which it would simply be untrue. Naming the
        // right register per country would need a field the records do not
        // have: of eight companies on file, seven have no country of
        // incorporation at all, so the branch would fall here anyway. The
        // number identifies the entity; the register is the reader's to infer
        // from the registered office below.
        c.registrationNumber
          ? `registered under number ${c.registrationNumber}`
          : null,
        c.address ? `with its registered office at ${c.address}` : null,
        c.representedBy
          ? `represented by ${c.representedBy}${c.capacity ? `, ${c.capacity}` : ""}`
          : null,
        'hereinafter the "Owner"',
      ]
        .filter(Boolean)
        .join(", ") + "."
    : [c.name, c.address ? `of ${c.address}` : null, 'hereinafter the "Owner"']
        .filter(Boolean)
        .join(", ") + ".";
  // Feminine throughout on the company branch: the implied noun is "société".
  const ownerFr = c.isCompany
    ? [
        c.name,
        form ? `${form}` : null,
        c.registrationNumber
          ? `immatriculée sous le numéro ${c.registrationNumber}`
          : null,
        c.address ? `dont le siège social est situé ${c.address}` : null,
        c.representedBy
          ? `représentée par ${c.representedBy}${c.capacity ? `, ${c.capacity}` : ""}`
          : null,
        "ci-après dénommée « le Propriétaire »",
      ]
        .filter(Boolean)
        .join(", ") + "."
    : [
        c.name,
        c.address ? `demeurant ${c.address}` : null,
        "ci-après dénommé(e) « le Propriétaire »",
      ]
        .filter(Boolean)
        .join(", ") + ".";
  const T = (b: Bilingual) => (bi ? b.en : b.fr);

  /**
   * A section heading, in the form the other two documents set them.
   *
   * Three details are theirs, not ours: the separator is a hyphen with spaces
   * and not an em dash, the wording is sentence case and not title case, and
   * the article number rides on the English half alone — repeating it in the
   * French reads as two articles where there is one.
   *
   * On a French-only contract the number moves onto the French title, since
   * there is no English half to carry it and the clauses refer to the articles
   * by number.
   */
  /**
   * The French half of a sub-heading, with its number.
   *
   * The data carries the number on the English string only — "2.1 Designation"
   * against "Désignation" — which is right for the bilingual setting, where
   * repeating it would read as two clauses. On a French-only contract there is
   * no English half to carry it, and the sub-headings lost their numbers
   * entirely; article 10.5 refers to "l'article 6.4" by number, so they are
   * not decoration.
   */
  const subFr = (sub: Bilingual) => {
    const num = /^(\d+(?:\.\d+)*)\s/.exec(sub.en);
    return num && !sub.fr.startsWith(num[1]) ? `${num[1]} ${sub.fr}` : sub.fr;
  };

  const head = (n: number | null, en: string, fr: string, first = false) => {
    const num = (t: string) => (n === null ? t : `${n} - ${t}`);
    return bi ? (
      <Section en={num(en)} fr={fr} first={first} />
    ) : (
      <Section en={num(fr)} first={first} />
    );
  };

  return (
    <Document
      title={`Contrat de Property Management — ${data.client.name}`}
      author={a.legalName}
    >
      <Page size="A4" style={[h.page, h.coverPage]}>
        {/* Lockup, photograph, then the title and what the agreement is
            about. The Seasonal Agreement puts its photographs under the band
            and leads with its title; this one has a single picture and sets it
            between the two, so the cover reads downward as one column rather
            than as a header with a gallery beneath. */}
        <View style={[h.coverBand, s.coverFill]}>
          <View style={[h.coverLogo, s.coverInset]}>
            <BstayLogo width={160} height={47.7} color={paper} />
          </View>

          {/* One photograph, taking whatever height the title leaves it. A
              fixed height would crop differently on a cover whose title runs
              to one line and on one where it runs to two. With no photograph —
              a residence described by hand — the same box holds the ink open
              and the title keeps its place at the foot. */}
          <View style={s.coverPhoto}>
            {photos[0] ? (
              <>
                {/* The clip is on this box alone, not on the box the fades
                    live in. Clipping them too cut them off exactly at the
                    photograph's edge — the one place they had to be solid —
                    and the hairline came back whatever their overhang. */}
                <View style={s.coverPhotoClip}>
                  <Image src={photos[0]} style={s.coverPhotoImage} />
                </View>
                {/* The intake banner's own fade, mirrored onto both edges:
                    `h-12 bg-gradient-to-b from-transparent to-[#111110]`. Its
                    3rem is 36 pt, which is the height used here. */}
                <CoverFade edge="top" />
                <CoverFade edge="bottom" />
              </>
            ) : null}
          </View>

          {/* `marginTop: 0` overrides the shared head's 56: the gap above the
              title is the photograph's bottom margin, and two of them would
              put the title out of step with the other three. */}
          <View
            style={[h.coverHead, s.coverInset, s.coverCentre, { marginTop: 0 }]}
          >
            <View style={[h.coverTitleWrap, s.coverCentre]}>
              <Text style={[h.coverTitle, s.coverTitleCentred]}>
                {bi
                  ? "Property Management Contract"
                  : "Contrat de Property Management"}
              </Text>
              {bi ? (
                <Text style={[h.coverSubtitle, s.coverTitleCentred]}>
                  Contrat de Property Management
                </Text>
              ) : null}
            </View>
          </View>

          <View style={[h.coverRule, s.coverInset]} />

          {/* One line, and the only one: the package, the residence, the
              Owner. The date left with it — a cover carries what the agreement
              is about, and when it was signed is said where it is signed, at
              the foot of the signature page. */}
          <View
            style={[h.coverFoot, s.coverInset, { justifyContent: "center" }]}
          >
            <Text style={[h.coverFootText, s.coverTitleCentred]}>
              {/* "Essential Package" in English, "Forfait Essentiel" in
                  French: the noun leads in one language and follows in the
                  other, and "Package Essential" is neither. */}
              {bi
                ? `${data.tierName.en} Package`
                : `Forfait ${data.tierName.fr}`}{" "}
              — {data.property?.label ?? "—"} — {data.client.name}
            </Text>
          </View>
        </View>
      </Page>

      <Page size="A4" style={h.page}>
        {data.articles.map((article, ai) => (
          <React.Fragment key={ai}>
            {/* An article that carries on from the one above prints no heading:
                17.3 stands apart because the law asks it to, not because it is
                a different article. */}
            {article.continued
              ? null
              : head(article.n, article.title.en, article.title.fr, ai === 0)}

            {article.blocks.map((blk, bi2) => {
              if (isSlot(blk)) {
                return (
                  <React.Fragment key={bi2}>
                    {blk.slot === "parties" ? (
                      <Parties
                        agency={a}
                        ownerEn={ownerEn}
                        ownerFr={ownerFr}
                        bilingual={bi}
                      />
                    ) : null}
                    {blk.slot === "property" ? (
                      <PropertyCard property={data.property} bilingual={bi} />
                    ) : null}
                    {blk.slot === "services" ? (
                      <Services groups={data.services} bilingual={bi} />
                    ) : null}
                    {blk.slot === "fees" ? (
                      <Instalments data={data} bilingual={bi} />
                    ) : null}
                  </React.Fragment>
                );
              }

              if (isList(blk)) {
                return (
                  <View key={bi2}>
                    {blk.sub ? (
                      <SubHeading
                        en={bi ? blk.sub.en : subFr(blk.sub)}
                        fr={bi ? blk.sub.fr : undefined}
                      />
                    ) : null}
                    {blk.intro ? (
                      <Text style={[h.paraEn, { marginTop: GAP }]}>
                        {T(blk.intro)}
                      </Text>
                    ) : null}
                    {blk.items.map((it, ii) => (
                      // Bound: an undertaking split across a page is an
                      // undertaking somebody reads half of.
                      <View key={ii} style={s.listRow} wrap={false}>
                        {/* Numbered against the article, not from one:
                            article 10.5 refers to "l'article 6.4", which is
                            the fourth of these. No full stop after it — the
                            number is a label, not a sentence. */}
                        <Text style={s.lineMark}>
                          {article.n}.{ii + 1}
                        </Text>
                        <View style={s.lineBody}>
                          <Text style={s.lineEn}>{bi ? it.en : it.fr}</Text>
                          {bi ? <Text style={s.lineFr}>{it.fr}</Text> : null}
                        </View>
                      </View>
                    ))}
                  </View>
                );
              }

              return (
                <React.Fragment key={bi2}>
                  {blk.sub ? (
                    <SubHeading
                      en={bi ? blk.sub.en : subFr(blk.sub)}
                      fr={bi ? blk.sub.fr : undefined}
                    />
                  ) : null}
                  <View
                    style={blk.veryVisible ? s.veryVisible : { marginTop: GAP }}
                  >
                    <Text
                      style={blk.veryVisible ? s.veryVisibleText : h.paraEn}
                    >
                      {bi ? blk.text.en : blk.text.fr}
                    </Text>
                    {bi ? (
                      <Text
                        style={
                          blk.veryVisible
                            ? [s.veryVisibleText, { marginTop: PAIR_GAP }]
                            : [h.paraFr, { marginTop: PAIR_GAP }]
                        }
                      >
                        {blk.text.fr}
                      </Text>
                    ) : null}
                  </View>
                </React.Fragment>
              );
            })}
          </React.Fragment>
        ))}

        <Signatures data={data} bilingual={bi} />

        <Footer a={a} initials="except-last" />
      </Page>
    </Document>
  );
}
