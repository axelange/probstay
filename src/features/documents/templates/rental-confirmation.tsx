import * as React from "react";
import {
  Document,
  Page,
  View,
  Text,
  
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
// Two brand colours and the five-step grey ramp, as house-style states them.
// Restated here rather than imported because this template already keeps its
// own copy of the scale — see the note above; both must move together.


// Bundled PNGs. On the server read from disk (absolute path); in the browser
// served from /public. No node import so this also bundles for the preview.
// The marks are drawn as vector, not placed as PNGs — the lettering is
// hairline and a raster of it goes grey at these sizes. See ./logo.
import { BstayLogo } from "@/features/documents/templates/logo";
import {
  Cap,
  Footer,
  Section,
  h,
  ink,
  grey,
  cardBg,
  BLOCK,
  GAP,
  LABEL_GAP,
  PAIR_GAP,
  LH,
  TITLE,
} from "@/features/documents/templates/house-style";

// The frame's spacing scale, halved: 40 px gaps between top-level blocks, 20 px
// inside a section, 14 px between a label and its value, 10 px between the two
// lines of a value pair.

// The master's `leading: normal` measures 1.2 on every text node (a 58 px title
// occupies 70 px, a 16 px label 20 px). It has to be repeated on each text
// style rather than inherited from the page: inside a row, react-pdf measures a
// Text without the cascaded line height and collapses it onto the next line.

const s = StyleSheet.create({



  intro: { marginTop: BLOCK },
  introEn: { fontSize: 10, color: ink, lineHeight: LH },
  introFr: {
    fontSize: 10,
    color: grey,
    fontStyle: "italic",
    lineHeight: LH,
    marginTop: PAIR_GAP,
  },


  cardBordered: { borderWidth: 0.5, borderColor: grey, paddingHorizontal: 12, paddingVertical: 9.5 },


  detailVal: { fontSize: 10, color: ink, lineHeight: LH },
  detailMuted: { fontSize: 10, color: grey, lineHeight: LH, marginTop: PAIR_GAP },


  // Stay
  statCard: {
    backgroundColor: cardBg,
    paddingHorizontal: 12,
    paddingVertical: 9.5,
    alignItems: "center",
    flexShrink: 0,
  },
  // Albertus Thin, like every value on the agreement: the stay's figures are
  // what a reader comes to this page for, and setting them in the title face
  // is what tells them apart from the labels above them now that weight alone
  // no longer does it.
  statVal: {
    fontFamily: TITLE,
    fontWeight: 200,
    fontSize: 14,
    color: ink,
    lineHeight: LH,
    marginTop: LABEL_GAP,
    textAlign: "center",
  },

  // Services list — the label, then the items on a tighter gap of their own.
  svcList: { marginTop: LABEL_GAP, gap: PAIR_GAP },
  svcItem: { fontSize: 10, color: ink, lineHeight: LH },
  svcItemFr: { fontStyle: "italic", color: grey },

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
  finDesc: { fontSize: 10, color: ink, lineHeight: LH },
  finAmt: { fontSize: 12, color: ink, lineHeight: LH },
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
    color: ink,
    textTransform: "uppercase",
    lineHeight: LH,
  },
  finTotalAmt: { fontSize: 12, color: ink, lineHeight: LH },

  // Payments. The card's own heading is set at body size, not as a grey cap.
  payLabel: {
    fontSize: 10,
    color: ink,
    textTransform: "uppercase",
    lineHeight: LH,
  },
  payLabelFr: { color: grey, fontStyle: "italic" },
  payAmt: { fontSize: 12, color: ink, lineHeight: LH, marginTop: LABEL_GAP },
  payDue: { marginTop: LABEL_GAP },
  payDueVal: { fontSize: 10, color: ink, lineHeight: LH, marginTop: LABEL_GAP },
  note: { marginTop: GAP, gap: PAIR_GAP },


  // Signatures. The ruled boxes are 238 px tall in the master and sit 52 px
  // below the e-signature prose; the caption beneath each one is the master's
  // 19 px card padding, but centred rather than left/right aligned.
  signRow: { flexDirection: "row", gap: GAP, marginTop: 26 },
  signBox: { borderWidth: 0.5, borderColor: grey, height: 119 },
  signMeta: { alignItems: "center", marginTop: 9.5 },
  signName: {
    fontFamily: TITLE,
    fontWeight: 200,
    fontSize: 14,
    color: ink,
    lineHeight: LH,
    marginTop: LABEL_GAP,
    textAlign: "center",
  },
  signRep: {
    fontSize: 10,
    color: ink,
    lineHeight: LH,
    marginTop: LABEL_GAP,
    textAlign: "center",
  },

});


/** A bilingual prose block. `join` merges the sentences into one paragraph. */
// How few lines a paragraph may leave behind or carry over.
//
// Three. Below that a break reads as an accident: two lines of French stranded
// at the top of an otherwise empty page, which is what a confirmation did once
// its charge lists grew enough to push the cancellation clause over the edge.
//
// `orphans` is the floor for what stays, `widows` for what follows. When a
// paragraph cannot satisfy both it moves whole to the next page, which is the
// behaviour wanted — and it degrades properly where `wrap={false}` would not:
// a clause an agency has written long enough to outgrow a page still prints,
// broken, instead of vanishing.
const KEEP_LINES = 3;

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
      <View style={h.proseGroup}>
        {join ? (
          <Text style={h.paraEn} orphans={KEEP_LINES} widows={KEEP_LINES}>
            {en.join(" ")}
          </Text>
        ) : (
          en.map((p, i) => (
            <Text key={`e${i}`} style={h.paraEn} orphans={KEEP_LINES} widows={KEEP_LINES}>
              {p}
            </Text>
          ))
        )}
      </View>
      <View style={h.proseGroup}>
        {join ? (
          <Text style={h.paraFr} orphans={KEEP_LINES} widows={KEEP_LINES}>
            {fr.join(" ")}
          </Text>
        ) : (
          fr.map((p, i) => (
            <Text key={`f${i}`} style={h.paraFr} orphans={KEEP_LINES} widows={KEEP_LINES}>
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
      {/* "English / French", the form every other bilingual line in both
          documents takes. These cards used parentheses and an italic that
          carried no grey, so the same pair of languages was set two ways
          depending on which paper it landed on. */}
      {it.fr ? <Text style={s.svcItemFr}> / {it.fr}</Text> : null}
    </Text>
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
      <Page size="A4" style={h.page}>
        {/* Masthead (page 1, in flow) */}
        <View style={h.logoWrap}>
          <BstayLogo width={170} height={50.7} />
        </View>
        <View style={h.head}>
          {/* headTitleWrap, not a bare View: without it the title sizes to its
              own content and the reference is parked against it instead of at
              the end of the line. */}
          <View style={h.headTitleWrap}>
            <Text style={h.headTitle}>Rental Confirmation</Text>
            <Text style={h.headSub}>Confirmation de location</Text>
          </View>
          {data.reference ? (
            <View style={h.headMeta}>
              <Text style={h.headMetaLabel}>Référence</Text>
              <Text style={h.headMetaVal}>{data.reference}</Text>
            </View>
          ) : null}
        </View>
        <View style={h.headRule} />

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
        <View style={h.row} wrap={false}>
          <View style={[h.card, { flex: 1 }]}>
            <Cap en="Owner" fr="Propriétaire" />
            <Text style={h.name}>{data.owner.name}</Text>
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

          <View style={[h.card, { flex: 1 }]}>
            <Cap en="Tenant" fr="Locataire" italicFr={false} />
            <Text style={h.name}>{data.tenant.name}</Text>
            {data.tenant.details.length > 0 ? (
              <View style={{ marginTop: GAP }}>
                <Cap en="Informations" />
                {data.tenant.details.map((d, i) => (
                  // Label as a direct child: the row aligns on baselines and
                  // only a Text has one. See the note on the contract's
                  // InfoRow, which carried the same wrapper and the same
                  // floating value.
                  <View key={i} style={h.infoRow}>
                    <Cap en={d.label.en} fr={d.label.fr} />
                    <Text style={h.infoValue}>{d.value}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>

        <View
          style={[h.card, { marginTop: GAP, flexDirection: "row", justifyContent: "space-between" }]}
          wrap={false}
        >
          <View style={{ paddingRight: 12, flexShrink: 1 }}>
            <Cap en="Property" fr="Bien loué" italicFr={false} />
            <Text style={h.name}>{data.property.name}</Text>
            <View style={{ marginTop: GAP }}>
              <Cap en="Adress" fr="Adresse" italicFr={false} />
              <Text style={[s.detailVal, { marginTop: LABEL_GAP }]}>
                {data.property.address}
              </Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end", flexShrink: 0 }}>
            <Cap en="Security deposit" fr="Dépôt de garantie" italicFr={false} />
            <Text style={[h.name, { textAlign: "right" }]}>
              {data.property.securityDeposit ?? "—"}
            </Text>
          </View>
        </View>

        {/* Rental period & occupancy */}
        <Section en="Rental Period and Occupancy" fr="Durée et occupation" />
        {/* Three figures across, then the occupancy on a line of its own.
        
            It used to be the fourth card in this row, taking whatever width the
            other three left it. That holds only while the value is short. It is
            not a figure like the others: it reads "6 Guests / Occupants", and
            a booking with children says "6 Guests / Occupants — incl. 2
            children / dont 2 enfants". Squeezed into a quarter of the measure,
            it wrapped and knocked the row out of line.
        
            A short figure and a bilingual sentence are not the same kind of
            thing and do not belong in the same grid. The three dates and counts
            share the row evenly; the sentence gets the full width, where it
            fits on one line in either form. */}
        <View style={h.row} wrap={false}>
          {[
            { en: "Check-in", fr: "Arrivée", v: data.stay.checkIn },
            { en: "Check-out", fr: "Départ", v: data.stay.checkOut },
            { en: "Nights", fr: "Nuitées", v: data.stay.nights },
          ].map((c) => (
            <View key={c.en} style={[s.statCard, { flex: 1 }]}>
              <Cap en={c.en} fr={c.fr} />
              <Text style={s.statVal}>{c.v}</Text>
            </View>
          ))}
        </View>
        <View style={[s.statCard, { marginTop: GAP }]} wrap={false}>
          <Cap en="Occupancy" fr="Occupation" />
          <Text style={s.statVal}>{data.stay.occupancy}</Text>
        </View>

        <Footer a={a} reference={data.reference} />
      </Page>

      {/* Page 2 — services, money, cancellation */}
      <Page size="A4" style={h.page}>
        <Section first en="Services" fr="Prestations" />
        <View style={h.row} wrap={false}>
          <View style={[h.card, { flex: 1 }]}>
            <Cap en="Included in the rent" fr="Inclus dans le loyer" />
            <View style={s.svcList}>
              {data.services.included.map((it, i) => (
                <ServiceItem key={i} it={it} />
              ))}
            </View>
          </View>
          <View style={[h.card, { flex: 1 }]}>
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
            <View key={i} style={s.finRow} wrap={false}>
              <Text style={s.finDesc}>
                {r.label.en}
                {r.label.fr ? (
                  <Text style={{ color: grey, fontStyle: "italic" }}> / {r.label.fr}</Text>
                ) : null}
              </Text>
              <Text style={s.finAmt}>{r.amount}</Text>
            </View>
          ))}
          <View style={s.finTotal} wrap={false}>
            <Text style={s.finTotalLabel}>
              Total VAT included{" "}
              <Text style={[s.finTotalLabel, s.payLabelFr]}>/ Total TTC</Text>
            </Text>
            <Text style={s.finTotalAmt}>{data.financial.total}</Text>
          </View>
        </View>

        {/* Payment terms */}
        <Section en="Payment Terms" fr="Conditions de paiement" />
        <View style={h.row} wrap={false}>
          {data.payments.map((p, i) => (
            <View key={i} style={[h.card, { flex: 1 }]}>
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
          <Text style={h.paraEn}>
            Payment to the Owner is subject to prior receipt of the corresponding
            funds from the Tenant.
          </Text>
          <Text style={h.paraFr}>
            Le reversement au Propriétaire est subordonné à l&apos;encaissement
            préalable des fonds correspondants auprès du Locataire.
          </Text>
        </View>

        {/* Cancellation policy */}

        {/* Bound so it moves whole rather than breaking.
        
            It closes this page, so when the charge lists above run long there
            is room for the heading and three or four lines and no more, and
            the rest lands alone on an otherwise blank sheet. Seen on a real
            confirmation: the French paragraph cut after "En cas d'annulation
            par le", its last two lines occupying a page by themselves.
        
            Widow and orphan counts do not answer this on their own. They set
            how many lines may be left or carried, so they turn two stranded
            lines into four — the page is just as empty. Bound, the clause
            moves to the next page entire and this one simply ends earlier.
        
            Pinning it to the last page was tried and does not fit: measured,
            the signature block needs about 180 pt and the clause leaves 177,
            and no reduction of the boxes or their spacing closes that — the
            page ends up carrying the signatures alone. Where it is, the pages
            fill evenly.
        
            It carries the usual ceiling of a bound block: measured, it holds
            to about twenty paragraphs per language and starts losing its tail
            past that. The clause is one paragraph per language. */}
        <View wrap={false}>
          <Section en="Cancellation Policy" fr="Conditions d'annulation" />
          <Prose en={data.cancellation.en} fr={data.cancellation.fr} join />
        </View>

        <Footer a={a} reference={data.reference} />
      </Page>

      {/* Page 3 — framework, e-signature, signatures */}
      <Page size="A4" style={h.page}>
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

        <Footer a={a} reference={data.reference} />
      </Page>
    </Document>
  );
}
