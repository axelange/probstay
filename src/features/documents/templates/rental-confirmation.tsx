import * as React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

/**
 * "Rental Confirmation / Confirmation de location" — the agency's owner-facing
 * house charte, bilingual EN/FR. Laid out from the Figma master (frame
 * "A4 - Rental Confirmation", node 7:3): the vertical monogram centred at the
 * top, a gold display title over its French caption, gold hairlines under each
 * section marker, flat #f9f9f9 data cards with square corners, and a fixed
 * three-part footer (monogram · legal · page + initials).
 *
 * The Figma frame is 1190 × 1684 px — A4 at 144 dpi — so every measurement
 * below is the Figma value halved: 1 px = 0.5 pt. The 100 px frame padding is
 * the 50 pt page margin, and the 990 px content column is 495 pt, exactly
 * A4 (595.28 pt) minus both margins.
 *
 * Every value is passed in (assembled from the rental); the same component
 * renders the server file and the browser preview.
 */

/** An English label with its French counterpart. */
export type Bilingual = { en: string; fr?: string };

export type ConfirmationData = {
  reference?: string;
  agency: {
    legalName: string;
    address: string;
    rcs: string;
    cartePro: string;
    garantieFinanciere: string;
    rcp: string;
    web: string;
    phone: string;
  };
  owner: {
    name: string;
    representedBy?: string;
    contact?: string; // "email — phone"
  };
  tenant: {
    name: string;
    details: { label: Bilingual; value: string }[];
  };
  property: {
    name: string;
    address: string;
    securityDeposit?: string;
  };
  stay: {
    checkIn: string;
    checkOut: string;
    nights: string;
    occupancy: string;
  };
  /** Opening paragraph, from the template's clauses. */
  intro: { en: string[]; fr: string[] };
  services: {
    included: Bilingual[];
    notIncluded: Bilingual[];
  };
  financial: {
    rows: { label: Bilingual; amount: string }[];
    total: string;
  };
  payments: { label: Bilingual; amount: string; due: string }[];
  cancellation: { en: string[]; fr: string[] };
  framework: { en: string[]; fr: string[] };
  esign: { en: string[]; fr: string[] };
  signature: {
    owner: { name: string; representedBy?: string };
    agent: { name: string; representedBy: string };
  };
};

// Palette, straight from the Figma frame. Gold carries the title, the section
// markers and every hairline; the navy is used once, for the French caption
// under the title. Body copy is pure black, secondary copy grey, and the data
// cards sit on a near-white ground with no border and no radius.
const black = "#000000";
const gold = "#a8936c";
const navy = "#041c2c";
const grey = "#6f6f6f";
const cardBg = "#f9f9f9";

const SERIF = "Passenger Display";
const SANS = "Familjen Grotesk";

// Bundled PNGs. On the server read from disk (absolute path); in the browser
// served from /public. No node import so this also bundles for the preview.
const asset = (name: string) =>
  typeof window === "undefined"
    ? `${process.cwd()}/public/img/${name}`
    : `/img/${name}`;
const LOGO_VERTICAL = asset("LogoVertical.png");
const MONOGRAM = asset("LogoMonogramme.png");

// The frame's spacing scale, halved: 40 px gaps between top-level blocks, 20 px
// inside a section, 14 px between a label and its value, 10 px between the two
// lines of a value pair.
const BLOCK = 20;
const GAP = 10;
const LABEL_GAP = 7;
const PAIR_GAP = 5;

// The master's `leading: normal` measures 1.2 on every text node (a 58 px title
// occupies 70 px, a 16 px label 20 px). It has to be repeated on each text
// style rather than inherited from the page: inside a row, react-pdf measures a
// Text without the cascaded line height and collapses it onto the next line.
const LH = 1.2;

const s = StyleSheet.create({
  page: {
    paddingTop: 50,
    paddingBottom: 99, // meets the fixed footer's top edge, 99 pt off the bottom
    paddingHorizontal: 50,
    fontFamily: SANS,
    fontWeight: 400,
    fontSize: 10,
    lineHeight: 1.2,
    color: black,
  },

  // Masthead — page 1 only, in flow (no logo repeats on later pages).
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

  intro: { marginTop: BLOCK },
  introEn: { fontSize: 10, color: black, lineHeight: LH },
  introFr: {
    fontSize: 10,
    color: grey,
    fontStyle: "italic",
    lineHeight: LH,
    marginTop: PAIR_GAP,
  },

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
  sectionRule: { height: 0.5, backgroundColor: gold, marginTop: GAP, marginBottom: GAP },
  headRule: { height: 0.5, backgroundColor: gold, marginTop: GAP },

  // Cards — flat, square, no border.
  card: { backgroundColor: cardBg, paddingHorizontal: 12, paddingVertical: 9.5 },
  cardBordered: { borderWidth: 0.5, borderColor: grey, paddingHorizontal: 12, paddingVertical: 9.5 },
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
  detailVal: { fontSize: 10, color: black, lineHeight: LH },
  detailMuted: { fontSize: 10, color: grey, lineHeight: LH, marginTop: PAIR_GAP },

  // Structured label/value row (tenant informations) — the label runs inline
  // with its value rather than in a fixed column, as drawn.
  infoRow: { flexDirection: "row", alignItems: "baseline", marginTop: LABEL_GAP },
  infoLabel: { marginRight: 6 },
  infoValue: { fontSize: 10, color: black, lineHeight: LH },

  // Stay
  statCard: {
    backgroundColor: cardBg,
    paddingHorizontal: 12,
    paddingVertical: 9.5,
    alignItems: "center",
    flexShrink: 0,
  },
  statVal: {
    fontFamily: SERIF,
    fontSize: 14,
    color: black,
    lineHeight: LH,
    marginTop: LABEL_GAP,
    textAlign: "center",
  },

  // Services list — the label, then the items on a tighter gap of their own.
  svcList: { marginTop: LABEL_GAP, gap: PAIR_GAP },
  svcItem: { fontSize: 10, color: black, lineHeight: LH },
  svcItemFr: { fontStyle: "italic" },

  // Financial. Rows are near-touching (4 px in the master) and the amounts stay
  // in the sans at 24 px — the serif is reserved for page 1's figures.
  finRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: cardBg,
    paddingHorizontal: 12,
    paddingVertical: 9.5,
    marginBottom: 2,
  },
  finDesc: { fontSize: 10, color: black, lineHeight: LH },
  finAmt: { fontSize: 12, color: black, lineHeight: LH },
  // The total is the one boxed row: a grey hairline, no fill, even padding.
  finTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: grey,
    padding: 12,
    marginTop: 2,
  },
  finTotalLabel: {
    fontSize: 10,
    color: black,
    textTransform: "uppercase",
    lineHeight: LH,
  },
  finTotalAmt: { fontSize: 12, color: black, lineHeight: LH },

  // Payments. The card's own heading is set at body size, not as a grey cap.
  payLabel: {
    fontSize: 10,
    color: black,
    textTransform: "uppercase",
    lineHeight: LH,
  },
  payLabelFr: { color: grey, fontStyle: "italic" },
  payAmt: { fontSize: 12, color: black, lineHeight: LH, marginTop: LABEL_GAP },
  payDue: { marginTop: LABEL_GAP },
  payDueVal: { fontSize: 10, color: black, lineHeight: LH, marginTop: LABEL_GAP },
  note: { marginTop: GAP, gap: PAIR_GAP },

  // Prose (justified)
  paraEn: { fontSize: 10, color: black, lineHeight: LH },
  paraFr: { fontSize: 10, color: grey, fontStyle: "italic", lineHeight: LH },
  proseGroup: { gap: PAIR_GAP },

  // Signatures. The ruled boxes are 238 px tall in the master and sit 52 px
  // below the e-signature prose; the caption beneath each one is the master's
  // 19 px card padding, but centred rather than left/right aligned.
  signRow: { flexDirection: "row", gap: GAP, marginTop: 26 },
  signBox: { borderWidth: 0.5, borderColor: grey, height: 119 },
  signMeta: { alignItems: "center", marginTop: 9.5 },
  signName: {
    fontFamily: SERIF,
    fontSize: 14,
    color: black,
    lineHeight: LH,
    marginTop: LABEL_GAP,
    textAlign: "center",
  },
  signRep: {
    fontSize: 10,
    color: black,
    lineHeight: LH,
    marginTop: LABEL_GAP,
    textAlign: "center",
  },

  // Footer (fixed): monogram · legal · page + initials, under a gold hairline.
  // It sits 743 pt down the page in the master, i.e. 48 pt off the bottom edge.
  // Kept as one flat row — nesting the row inside a wrapper stops react-pdf
  // resolving the `render` page number and drops its siblings.
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

/**
 * Grey caps label rendered as "EN / fr". The master sets the French half in
 * italic on the party and stay cards but leaves it upright on the property
 * card and the tenant heading, so the caller says which.
 */
function Cap({
  en,
  fr,
  italicFr = true,
}: {
  en: string;
  fr?: string;
  italicFr?: boolean;
}) {
  if (!fr) return <Text style={s.cap}>{en}</Text>;
  return (
    <Text style={s.cap}>
      {en} / <Text style={italicFr ? [s.cap, s.capFr] : s.cap}>{fr}</Text>
    </Text>
  );
}

/**
 * Section marker: gold label, French caption, full-width hairline. `first`
 * drops the leading block gap so a section opening a page sits flush on the
 * top margin, the way each frame in the master starts.
 */
function Section({
  en,
  fr,
  first,
}: {
  en: string;
  fr: string;
  first?: boolean;
}) {
  return (
    <View style={first ? undefined : s.section} wrap={false}>
      <View style={s.sectionRow}>
        <Text style={s.sectionEn}>{en}</Text>
        <Text style={s.sectionFr}>{fr}</Text>
      </View>
      <View style={s.sectionRule} />
    </View>
  );
}

/** A bilingual prose block. `join` merges the sentences into one paragraph. */
function Prose({
  en,
  fr,
  join,
}: {
  en: string[];
  fr: string[];
  join?: boolean;
}) {
  // Each language is its own group, paragraphs 10 px apart. The master sets the
  // two groups 14 px apart when they are lists, but only 10 px when the block
  // collapses to a single paragraph per language.
  return (
    <View style={{ gap: join ? PAIR_GAP : LABEL_GAP }}>
      <View style={s.proseGroup}>
        {join ? (
          <Text style={s.paraEn}>{en.join(" ")}</Text>
        ) : (
          en.map((p, i) => (
            <Text key={`e${i}`} style={s.paraEn}>
              {p}
            </Text>
          ))
        )}
      </View>
      <View style={s.proseGroup}>
        {join ? (
          <Text style={s.paraFr}>{fr.join(" ")}</Text>
        ) : (
          fr.map((p, i) => (
            <Text key={`f${i}`} style={s.paraFr}>
              {p}
            </Text>
          ))
        )}
      </View>
    </View>
  );
}

/**
 * Renders a service item as "English (french)" — the French half in italic but
 * still black, the way the master sets the parenthetical inside a service line.
 */
function ServiceItem({ it }: { it: Bilingual }) {
  return (
    <Text style={s.svcItem}>
      {it.en}
      {it.fr ? <Text style={s.svcItemFr}> ({it.fr})</Text> : null}
    </Text>
  );
}

/**
 * Monogram · legal · page + initials, pinned to the bottom of every page.
 *
 * The page counter has to be resolved on the footer itself: a `render` callback
 * on a nested Text makes react-pdf drop every sibling that precedes it, which
 * silently swallowed the monogram and the legal block. `fixed` is kept so that
 * if a page ever overflows, the spill still carries a footer.
 */
function Footer({ a }: { a: ConfirmationData["agency"] }) {
  return (
    <View
      style={s.footer}
      fixed
      render={(props) => {
        // react-pdf passes totalPages to any render callback but only declares
        // it on Text's, so read it through the wider shape.
        const { pageNumber, totalPages } = props as typeof props & {
          totalPages?: number;
        };
        return (
          <>
            <Image src={MONOGRAM} style={s.footMono} />
            <View>
              <Text style={s.footLine}>
                {a.legalName} — {a.address}
              </Text>
              <Text style={s.footLine}>
                {a.rcs} — {a.cartePro}
              </Text>
              <Text style={s.footLine}>
                {a.garantieFinanciere} — {a.rcp}
              </Text>
              <Text style={s.footLine}>
                {a.web} — {a.phone}
              </Text>
            </View>
            <View style={s.footRight}>
              <Text style={s.footPage}>
                Page {pageNumber}/{totalPages}
              </Text>
              <View style={s.footInitialsRow}>
                <Text style={s.footInitialsLabel}>Initials / Paraphes</Text>
                <View style={s.footInitialsBox} />
              </View>
            </View>
          </>
        );
      }}
    />
  );
}

/**
 * Three fixed pages, one per frame in the master, rather than a single flowing
 * page: the document numbers itself "Page 1/3" and each frame starts on its own
 * top margin. Content that outgrows its frame still spills onto an extra
 * physical page rather than being clipped.
 */
export function RentalConfirmation({ data }: { data: ConfirmationData }) {
  const a = data.agency;
  return (
    <Document
      title={`Confirmation de location${data.reference ? ` — ${data.reference}` : ""}`}
      author={a.legalName}
    >
      {/* Page 1 — masthead, parties & property, stay */}
      <Page size="A4" style={s.page}>
        {/* Masthead (page 1, in flow) */}
        <View style={s.logoWrap}>
          <Image src={LOGO_VERTICAL} style={s.logo} />
        </View>
        <View style={s.head}>
          <View>
            <Text style={s.headTitle}>Rental Confirmation</Text>
            <Text style={s.headSub}>Confirmation de location</Text>
          </View>
          {data.reference ? (
            <View style={s.headMeta}>
              <Text style={s.headMetaLabel}>Référence</Text>
              <Text style={s.headMetaVal}>{data.reference}</Text>
            </View>
          ) : null}
        </View>
        <View style={s.headRule} />

        <View style={s.intro}>
          {data.intro.en.map((p, i) => (
            <Text key={`ie${i}`} style={s.introEn}>
              {p}
            </Text>
          ))}
          {data.intro.fr.map((p, i) => (
            <Text key={`if${i}`} style={s.introFr}>
              {p}
            </Text>
          ))}
        </View>

        {/* Parties & property */}
        <Section en="Parties & Property" fr="Parties & bien" />
        <View style={s.row} wrap={false}>
          <View style={[s.card, { flex: 1 }]}>
            <Cap en="Owner" fr="Propriétaire" />
            <Text style={s.name}>{data.owner.name}</Text>
            {data.owner.representedBy ? (
              <View style={{ marginTop: GAP }}>
                <Cap en="Represented by" fr="Représenté par" />
                <Text style={[s.detailVal, { marginTop: LABEL_GAP }]}>
                  {data.owner.representedBy}
                </Text>
                {data.owner.contact ? (
                  <Text style={s.detailMuted}>{data.owner.contact}</Text>
                ) : null}
              </View>
            ) : data.owner.contact ? (
              <Text style={[s.detailMuted, { marginTop: GAP }]}>
                {data.owner.contact}
              </Text>
            ) : null}
          </View>

          <View style={[s.card, { flex: 1 }]}>
            <Cap en="Tenant" fr="Locataire" italicFr={false} />
            <Text style={s.name}>{data.tenant.name}</Text>
            {data.tenant.details.length > 0 ? (
              <View style={{ marginTop: GAP }}>
                <Cap en="Informations" />
                {data.tenant.details.map((d, i) => (
                  <View key={i} style={s.infoRow}>
                    <View style={s.infoLabel}>
                      <Cap en={d.label.en} fr={d.label.fr} />
                    </View>
                    <Text style={s.infoValue}>{d.value}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>

        <View
          style={[s.card, { marginTop: GAP, flexDirection: "row", justifyContent: "space-between" }]}
          wrap={false}
        >
          <View style={{ paddingRight: 12, flexShrink: 1 }}>
            <Cap en="Property" fr="Bien loué" italicFr={false} />
            <Text style={s.name}>{data.property.name}</Text>
            <View style={{ marginTop: GAP }}>
              <Cap en="Adress" fr="Adresse" italicFr={false} />
              <Text style={[s.detailVal, { marginTop: LABEL_GAP }]}>
                {data.property.address}
              </Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end", flexShrink: 0 }}>
            <Cap en="Security deposit" fr="Dépôt de garantie" italicFr={false} />
            <Text style={[s.name, { textAlign: "right" }]}>
              {data.property.securityDeposit ?? "—"}
            </Text>
          </View>
        </View>

        {/* Rental period & occupancy */}
        <Section en="Rental Period and Occupancy" fr="Durée et occupation" />
        <View style={s.row} wrap={false}>
          {[
            { en: "Check-in", fr: "Arrivée", v: data.stay.checkIn },
            { en: "Check-out", fr: "Départ", v: data.stay.checkOut },
            { en: "Nights", fr: "Nuitées", v: data.stay.nights },
          ].map((c) => (
            <View key={c.en} style={s.statCard}>
              <Cap en={c.en} fr={c.fr} />
              <Text style={s.statVal}>{c.v}</Text>
            </View>
          ))}
          {/* Occupancy takes the remaining width, as in the master — where the
              longest value ("4 Guests / Occupants") squeezes the card's own
              padding from 24 px down to 18 px, i.e. 9 pt here. */}
          <View style={[s.statCard, { flex: 1, flexShrink: 1, paddingHorizontal: 9 }]}>
            <Cap en="Occupancy" fr="Occupation" />
            <Text style={s.statVal}>{data.stay.occupancy}</Text>
          </View>
        </View>

        <Footer a={a} />
      </Page>

      {/* Page 2 — services, money, cancellation */}
      <Page size="A4" style={s.page}>
        <Section first en="Services" fr="Prestations" />
        <View style={s.row} wrap={false}>
          <View style={[s.card, { flex: 1 }]}>
            <Cap en="Included in the rent" fr="Inclus dans le loyer" />
            <View style={s.svcList}>
              {data.services.included.map((it, i) => (
                <ServiceItem key={i} it={it} />
              ))}
            </View>
          </View>
          <View style={[s.card, { flex: 1 }]}>
            <Cap en="Not included" fr="Non inclus" italicFr={false} />
            <View style={s.svcList}>
              {data.services.notIncluded.map((it, i) => (
                <ServiceItem key={i} it={it} />
              ))}
            </View>
          </View>
        </View>

        {/* Financial summary */}
        <Section en="Financial Summary" fr="Récapitulatif financier" />
        <View wrap={false}>
          {data.financial.rows.map((r, i) => (
            <View key={i} style={s.finRow}>
              <Text style={s.finDesc}>
                {r.label.en}
                {r.label.fr ? (
                  <Text style={{ color: grey, fontStyle: "italic" }}> / {r.label.fr}</Text>
                ) : null}
              </Text>
              <Text style={s.finAmt}>{r.amount}</Text>
            </View>
          ))}
          <View style={s.finTotal}>
            <Text style={s.finTotalLabel}>
              Total VAT included{" "}
              <Text style={[s.finTotalLabel, s.payLabelFr]}>/ Total TTC</Text>
            </Text>
            <Text style={s.finTotalAmt}>{data.financial.total}</Text>
          </View>
        </View>

        {/* Payment terms */}
        <Section en="Payment Terms" fr="Conditions de paiement" />
        <View style={s.row} wrap={false}>
          {data.payments.map((p, i) => (
            <View key={i} style={[s.card, { flex: 1 }]}>
              <Text style={s.payLabel}>
                {p.label.en}
                {p.label.fr ? (
                  <Text style={[s.payLabel, s.payLabelFr]}> / {p.label.fr}</Text>
                ) : null}
              </Text>
              <Text style={s.payAmt}>{p.amount}</Text>
              <View style={s.payDue}>
                <Cap en="Due no later than" fr="À verser au plus tard le" />
                <Text style={s.payDueVal}>{p.due}</Text>
              </View>
            </View>
          ))}
        </View>
        <View style={s.note}>
          <Text style={s.paraEn}>
            Payment to the Owner is subject to prior receipt of the corresponding
            funds from the Tenant.
          </Text>
          <Text style={s.paraFr}>
            Le reversement au Propriétaire est subordonné à l&apos;encaissement
            préalable des fonds correspondants auprès du Locataire.
          </Text>
        </View>

        {/* Cancellation policy */}
        <Section en="Cancellation Policy" fr="Conditions d'annulation" />
        <Prose en={data.cancellation.en} fr={data.cancellation.fr} join />

        <Footer a={a} />
      </Page>

      {/* Page 3 — framework, e-signature, signatures */}
      <Page size="A4" style={s.page}>
        <Section first en="Contractual Framework" fr="Cadre contractuel" />
        <Prose en={data.framework.en} fr={data.framework.fr} />

        {/* Electronic signature */}
        <Section en="Electronic Signature" fr="Signature électronique" />
        <Prose en={data.esign.en} fr={data.esign.fr} />

        <View style={s.signRow} wrap={false}>
          <View style={{ flex: 1 }}>
            <View style={s.signBox} />
            <View style={s.signMeta}>
              <Cap en="The Owner" fr="le Propriétaire" />
              <Text style={s.signName}>{data.signature.owner.name}</Text>
              {data.signature.owner.representedBy ? (
                <>
                  <View style={{ marginTop: LABEL_GAP }}>
                    <Cap en="Represented by" fr="Représenté par" />
                  </View>
                  <Text style={s.signRep}>
                    {data.signature.owner.representedBy}
                  </Text>
                </>
              ) : null}
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <View style={s.signBox} />
            <View style={s.signMeta}>
              <Cap en="The Agent" fr="le Mandataire" />
              <Text style={s.signName}>{data.signature.agent.name}</Text>
              <View style={{ marginTop: LABEL_GAP }}>
                <Cap en="Represented by" fr="Représenté par" />
              </View>
              <Text style={s.signRep}>{data.signature.agent.representedBy}</Text>
            </View>
          </View>
        </View>

        <Footer a={a} />
      </Page>
    </Document>
  );
}
