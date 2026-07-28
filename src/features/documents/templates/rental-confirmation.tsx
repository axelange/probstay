import * as React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  type Styles,
} from "@react-pdf/renderer";

/**
 * "Rental Confirmation / Confirmation de location" — the agency's house
 * charte, bilingual EN/FR. Titles are gold, body text is black, secondary
 * text (French captions, labels) is grey and italic; numbered sections, boxed
 * parties/property, stay, services, financial and payment tables, then the
 * signature blocks. Every value is passed in (assembled from the rental),
 * never typed by hand; the same component renders the server file and the
 * live browser preview.
 */

/** An English label with its French counterpart (shown muted). */
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
    lines: string[]; // birth line, address, id document…
  };
  property: {
    name: string;
    address: string;
    securityDeposit?: string;
  };
  stay: {
    checkIn: string;
    checkOut: string;
    duration: string;
    occupancy: string;
  };
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

// Palette: gold is reserved for titles (and their rules); body text is black;
// secondary text (labels, French captions) is grey. No gold in the body, no
// filled header bands. Navy survives only in the printed logo.
const gold = "#a1885d"; // TITLES only (document, sections, boxes) + their rules
const ink = "#1a1613"; // black — primary body text, values, amounts
const taupe = "#8a8478"; // grey — secondary text, labels, French captions
const hair = "#e3dccf"; // hairline internal separators
const border = "#d3c8b2"; // slightly darker — box / frame outlines

const SERIF = "Passenger Display";
const SANS = "Familjen Grotesk";

// The logo is embedded from a bundled PNG. On the server react-pdf reads it
// from disk (absolute path); in the browser the same file is served from
// /public. No node:path import so this module also bundles for the client
// preview.
const LOGO =
  typeof window === "undefined"
    ? `${process.cwd()}/public/img/Bstay-logo-horizontal.png`
    : "/img/Bstay-logo-horizontal.png";

const s = StyleSheet.create({
  page: {
    paddingTop: 96,
    paddingBottom: 92,
    paddingHorizontal: 46,
    fontFamily: SANS,
    fontWeight: 400,
    fontSize: 9,
    lineHeight: 1.5,
    color: ink,
  },
  // Masthead (fixed, repeats on every page)
  logoWrap: { position: "absolute", top: 34, left: 0, right: 0, alignItems: "center" },
  logo: { width: 132 },

  title: {
    fontFamily: SERIF,
    fontSize: 21,
    color: gold,
    textAlign: "center",
    letterSpacing: 1.5,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 9.5,
    color: taupe,
    textAlign: "center",
    letterSpacing: 3,
    textTransform: "uppercase",
    marginTop: 6,
  },
  intro: { marginTop: 20, fontSize: 9 },
  introEn: { color: ink },
  introFr: { color: taupe, fontStyle: "italic", marginTop: 3 },

  // Section header: a gold serif (Passenger Display) numeral and title with a
  // muted French caption, underlined by a single gold rule — no filled badge.
  sectionHead: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 22,
    marginBottom: 11,
    paddingBottom: 5,
    borderBottomWidth: 0.7,
    borderBottomColor: gold,
  },
  sectionNum: { fontFamily: SERIF, fontSize: 12, color: gold, marginRight: 10 },
  sectionEn: { fontFamily: SERIF, fontSize: 12.5, color: gold, letterSpacing: 0.5 },
  sectionFr: { fontSize: 7.5, color: taupe, letterSpacing: 1.5, textTransform: "uppercase", marginLeft: 9 },

  // Boxes — hairline outline, black sans title on white over a hairline.
  box: { borderWidth: 0.5, borderColor: border },
  boxHeader: {
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: hair,
  },
  boxHeaderEn: { fontFamily: SANS, fontWeight: 500, fontSize: 9, color: ink, letterSpacing: 1.4, textTransform: "uppercase" },
  boxHeaderFr: {
    fontSize: 6.8,
    color: taupe,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginTop: 2,
  },
  boxBody: { padding: 12 },

  // Eyebrow labels: uppercase, letter-spaced, muted taupe.
  label: {
    fontSize: 6.8,
    color: taupe,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  labelFr: { color: taupe },
  value: { fontSize: 10, fontWeight: 400, color: ink },
  line: { fontSize: 9, color: ink, marginTop: 1.5 },

  // Stay: four columns
  statCol: { flex: 1, alignItems: "center", paddingVertical: 13, paddingHorizontal: 4 },
  statLabel: {
    fontSize: 6.8,
    color: taupe,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  statLabelFr: { color: taupe },
  statValue: { fontSize: 11, fontWeight: 400, color: ink },
  vDivider: { width: 0.5, backgroundColor: hair },

  // Services
  bullet: { flexDirection: "row", marginBottom: 4 },
  bulletDot: { width: 10, fontSize: 9, color: taupe },
  bulletText: { flex: 1, fontSize: 8.8 },

  // Financial table — no fills: grey header labels over a soft rule, hairline
  // rows, a slightly firmer soft rule above the total (no hard black lines).
  fRow: { flexDirection: "row", borderTopWidth: 0.5, borderTopColor: hair },
  fHeadRow: { flexDirection: "row", borderBottomWidth: 0.7, borderBottomColor: border },
  fHeadCell: { paddingVertical: 7, paddingHorizontal: 12, color: taupe, fontWeight: 500, fontSize: 7.5, letterSpacing: 1.4, textTransform: "uppercase" },
  fCell: { paddingVertical: 8, paddingHorizontal: 12, fontSize: 9.5, color: ink },
  fTotalRow: { flexDirection: "row", borderTopWidth: 0.8, borderTopColor: border },
  fTotalCell: { paddingVertical: 9, paddingHorizontal: 12, color: ink, fontWeight: 500, fontSize: 9.5, letterSpacing: 1, textTransform: "uppercase" },

  // Payment terms
  pRow: { flexDirection: "row", borderWidth: 0.5, borderColor: border, borderTopWidth: 0 },
  pRowFirst: { borderTopWidth: 0.5 },
  pCellLabel: { flex: 1.5, paddingVertical: 11, paddingHorizontal: 12, justifyContent: "center" },
  pCellAmount: { flex: 1, paddingVertical: 11, paddingHorizontal: 12, alignItems: "center", justifyContent: "center", borderLeftWidth: 0.5, borderLeftColor: hair },
  pCellDue: { flex: 1.5, paddingVertical: 11, paddingHorizontal: 12, alignItems: "center", justifyContent: "center", borderLeftWidth: 0.5, borderLeftColor: hair },
  pAmount: { fontSize: 12, fontWeight: 500, color: ink },
  pDue: { fontSize: 8.5, color: ink, textAlign: "center" },

  // Legal prose paragraphs
  paraEn: { fontSize: 9, color: ink, marginBottom: 6 },
  paraFr: { fontSize: 8.8, color: taupe, fontStyle: "italic", marginBottom: 5 },

  // Signatures
  signRow: { flexDirection: "row", marginTop: 26 },
  signBox: { flex: 1, borderWidth: 0.5, borderColor: border, minHeight: 128, padding: 14, alignItems: "center" },
  signTitle: { fontSize: 9.5, marginBottom: 8, color: ink },
  signTitleFr: { color: taupe, fontStyle: "italic" },
  // Only the roman italic (400) face is registered — no medium italic.
  signName: { fontWeight: 400, fontStyle: "italic", fontSize: 10, color: ink, marginBottom: 3 },
  signRep: { fontSize: 8.5, color: ink },
  signRepFr: { color: taupe },

  // Footer (fixed)
  footer: {
    position: "absolute",
    bottom: 26,
    left: 46,
    right: 46,
    alignItems: "center",
  },
  footLine: { fontSize: 7.2, color: taupe, textAlign: "center", lineHeight: 1.45 },
  footStrong: { fontWeight: 500, color: ink },
  footWeb: { fontWeight: 500, color: gold },
  pageMark: {
    position: "absolute",
    bottom: 26,
    right: 46,
    flexDirection: "row",
    fontSize: 7.5,
    color: taupe,
  },
});

/** Inline English + gold French, e.g. "Name / Nom". */
type St = Styles[string];
type TextStyle = St | St[];

function Bi({
  en,
  fr,
  style,
  frStyle,
}: {
  en: string;
  fr?: string;
  style?: TextStyle;
  frStyle?: TextStyle;
}) {
  return (
    <Text style={style}>
      {en}
      {fr ? <Text style={frStyle}> / {fr}</Text> : null}
    </Text>
  );
}

function SectionHead({ n, en, fr }: { n: number; en: string; fr: string }) {
  return (
    <View style={s.sectionHead} wrap={false}>
      <Text style={s.sectionNum}>{String(n).padStart(2, "0")}</Text>
      <Text style={s.sectionEn}>{en}</Text>
      <Text style={s.sectionFr}>{fr}</Text>
    </View>
  );
}

function BoxHeader({ en, fr }: { en: string; fr: string }) {
  return (
    <View style={s.boxHeader}>
      <Text style={s.boxHeaderEn}>{en}</Text>
      <Text style={s.boxHeaderFr}>{fr}</Text>
    </View>
  );
}

export function RentalConfirmation({ data }: { data: ConfirmationData }) {
  const a = data.agency;
  return (
    <Document
      title={`Confirmation de location${data.reference ? ` — ${data.reference}` : ""}`}
      author={a.legalName}
    >
      <Page size="A4" style={s.page}>
        {/* Masthead — repeats on every page */}
        <View style={s.logoWrap} fixed>
          <Image src={LOGO} style={s.logo} />
        </View>

        {/* Title (page 1 only, in flow) */}
        <Text style={s.title}>RENTAL CONFIRMATION</Text>
        <Text style={s.subtitle}>CONFIRMATION DE LOCATION</Text>

        <View style={s.intro}>
          <Text style={s.introEn}>
            Pursuant to the Seasonal Rental Mandate signed between the Owner and
            the Agent, we are pleased to confirm the seasonal rental described
            below.
          </Text>
          <Text style={s.introFr}>
            En application du Mandat de location saisonnière signé entre le
            Propriétaire et BSTAY, nous avons le plaisir de confirmer la
            location saisonnière décrite ci-dessous.
          </Text>
        </View>

        {/* 1 — Parties & property */}
        <SectionHead n={1} en="PARTIES & PROPERTY" fr="PARTIES & BIEN" />
        <View style={{ flexDirection: "row", gap: 10 }} wrap={false}>
          <View style={[s.box, { flex: 1 }]}>
            <BoxHeader en="OWNER" fr="PROPRIÉTAIRE" />
            <View style={s.boxBody}>
              <Bi en="Name" fr="Nom" style={s.label} frStyle={s.labelFr} />
              <Text style={s.value}>{data.owner.name}</Text>
              {data.owner.representedBy ? (
                <>
                  <Bi
                    en="Represented by"
                    fr="Représentée par"
                    style={[s.label, { marginTop: 11 }]}
                    frStyle={s.labelFr}
                  />
                  <Text style={s.line}>{data.owner.representedBy}</Text>
                </>
              ) : null}
              {data.owner.contact ? (
                <Text style={[s.line, { marginTop: 3 }]}>{data.owner.contact}</Text>
              ) : null}
            </View>
          </View>

          <View style={[s.box, { flex: 1 }]}>
            <BoxHeader en="TENANT" fr="LOCATAIRE" />
            <View style={s.boxBody}>
              <Bi en="Name" fr="Nom" style={s.label} frStyle={s.labelFr} />
              <Text style={s.value}>{data.tenant.name}</Text>
              {data.tenant.lines.map((l, i) => (
                <Text key={i} style={s.line}>
                  {l}
                </Text>
              ))}
            </View>
          </View>
        </View>

        <View style={[s.box, { marginTop: 10 }]} wrap={false}>
          <BoxHeader en="PROPERTY" fr="BIEN LOUÉ" />
          <View style={[s.boxBody, { flexDirection: "row" }]}>
            <View style={{ flex: 1.5 }}>
              <Bi en="Name" fr="Nom" style={s.label} frStyle={s.labelFr} />
              <Text style={s.value}>{data.property.name}</Text>
              <Bi
                en="Address"
                fr="Adresse"
                style={[s.label, { marginTop: 11 }]}
                frStyle={s.labelFr}
              />
              <Text style={s.line}>{data.property.address}</Text>
            </View>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Bi
                en="Security deposit"
                fr="Dépôt de garantie"
                style={[s.label, { fontStyle: "italic" }]}
                frStyle={s.labelFr}
              />
              <Text style={[s.value, { marginTop: 1 }]}>
                {data.property.securityDeposit ?? "—"}
              </Text>
            </View>
          </View>
        </View>

        {/* 2 — Rental period & occupancy */}
        <SectionHead
          n={2}
          en="RENTAL PERIOD AND OCCUPANCY"
          fr="DURÉE ET OCCUPATION"
        />
        <View style={s.box} wrap={false}>
          <BoxHeader en="DETAILS OF THE STAY" fr="DÉTAILS DU SÉJOUR" />
          <View style={{ flexDirection: "row" }}>
            {[
              { en: "Check-in", fr: "Arrivée", v: data.stay.checkIn },
              { en: "Check-out", fr: "Départ", v: data.stay.checkOut },
              { en: "Duration", fr: "Durée", v: data.stay.duration },
              { en: "Occupancy", fr: "Occupation", v: data.stay.occupancy },
            ].map((c, i) => (
              <React.Fragment key={c.en}>
                {i > 0 ? <View style={s.vDivider} /> : null}
                <View style={s.statCol}>
                  <Bi en={c.en} fr={c.fr} style={s.statLabel} frStyle={s.statLabelFr} />
                  <Text style={s.statValue}>{c.v}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* 3 — Services */}
        <SectionHead n={3} en="SERVICES" fr="PRESTATIONS" />
        <View style={{ flexDirection: "row", gap: 10 }} wrap={false}>
          <View style={[s.box, { flex: 1 }]}>
            <BoxHeader en="INCLUDED IN THE RENT" fr="INCLUS DANS LE LOYER" />
            <View style={s.boxBody}>
              {data.services.included.map((it, i) => (
                <View key={i} style={s.bullet}>
                  <Text style={s.bulletDot}>•</Text>
                  <Text style={s.bulletText}>
                    {it.en}
                    {it.fr ? <Text style={{ color: taupe, fontStyle: "italic" }}> ({it.fr})</Text> : null}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          <View style={[s.box, { flex: 1 }]}>
            <BoxHeader
              en="NOT INCLUDED (PAYABLE BY THE LESSEE)"
              fr="NON INCLUS (À LA CHARGE DU LOCATAIRE)"
            />
            <View style={s.boxBody}>
              {data.services.notIncluded.map((it, i) => (
                <View key={i} style={s.bullet}>
                  <Text style={s.bulletDot}>•</Text>
                  <Text style={s.bulletText}>
                    {it.en}
                    {it.fr ? <Text style={{ color: taupe, fontStyle: "italic" }}> ({it.fr})</Text> : null}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* 4 — Financial summary */}
        <SectionHead n={4} en="FINANCIAL SUMMARY" fr="RÉCAPITULATIF FINANCIER" />
        <View style={s.box} wrap={false}>
          <View style={s.fHeadRow}>
            <Text style={[s.fHeadCell, { flex: 2 }]}>DESCRIPTION</Text>
            <Text style={[s.fHeadCell, { flex: 1, textAlign: "right" }]}>
              AMOUNT / MONTANT
            </Text>
          </View>
          {data.financial.rows.map((r, i) => (
            <View key={i} style={s.fRow}>
              <View style={{ flex: 2 }}>
                <Bi
                  en={r.label.en}
                  fr={r.label.fr}
                  style={s.fCell}
                  frStyle={{ color: taupe, fontStyle: "italic" }}
                />
              </View>
              <Text style={[s.fCell, { flex: 1, textAlign: "right" }]}>
                {r.amount}
              </Text>
            </View>
          ))}
          <View style={s.fTotalRow}>
            <Text style={[s.fTotalCell, { flex: 2 }]}>
              TOTAL / TOTAL TTC
            </Text>
            <Text style={[s.fTotalCell, { flex: 1, textAlign: "right" }]}>
              {data.financial.total}
            </Text>
          </View>
        </View>

        {/* 5 — Payment terms */}
        <SectionHead n={5} en="PAYMENT TERMS" fr="CONDITIONS DE PAIEMENT" />
        <View wrap={false}>
          {data.payments.map((p, i) => (
            <View key={i} style={[s.pRow, i === 0 ? s.pRowFirst : {}]}>
              <View style={s.pCellLabel}>
                <Bi
                  en={p.label.en}
                  fr={p.label.fr}
                  style={{ fontSize: 9 }}
                  frStyle={{ color: taupe, fontStyle: "italic" }}
                />
              </View>
              <View style={s.pCellAmount}>
                <Text style={s.pAmount}>{p.amount}</Text>
              </View>
              <View style={s.pCellDue}>
                <Text style={s.pDue}>
                  Due no later than{"\n"}
                  <Text style={{ color: taupe, fontStyle: "italic" }}>À verser au plus tard le :</Text>
                  {"\n"}
                  {p.due}
                </Text>
              </View>
            </View>
          ))}
        </View>
        <View style={{ marginTop: 8 }}>
          <Text style={s.paraEn}>
            Payment to the Owner is subject to prior receipt of the corresponding
            funds from the Tenant.
          </Text>
          <Text style={s.paraFr}>
            Le reversement au Propriétaire est subordonné à l&apos;encaissement
            préalable des fonds correspondants auprès du Locataire.
          </Text>
        </View>

        {/* 6 — Cancellation policy */}
        <SectionHead n={6} en="CANCELLATION POLICY" fr="CONDITIONS D'ANNULATION" />
        <View>
          {data.cancellation.en.map((p, i) => (
            <Text key={`e${i}`} style={s.paraEn}>
              {p}
            </Text>
          ))}
          <View style={{ marginTop: 4 }}>
            {data.cancellation.fr.map((p, i) => (
              <Text key={`f${i}`} style={s.paraFr}>
                {p}
              </Text>
            ))}
          </View>
        </View>

        {/* 7 — Contractual framework */}
        <SectionHead n={7} en="CONTRACTUAL AND FRAMEWORK" fr="CADRE CONTRACTUEL" />
        <View>
          {data.framework.en.map((p, i) => (
            <Text key={`e${i}`} style={s.paraEn}>
              {p}
            </Text>
          ))}
          <View style={{ marginTop: 4 }}>
            {data.framework.fr.map((p, i) => (
              <Text key={`f${i}`} style={s.paraFr}>
                {p}
              </Text>
            ))}
          </View>
        </View>

        {/* 8 — Electronic signature */}
        <SectionHead n={8} en="ELECTRONIC SIGNATURE" fr="SIGNATURE ÉLECTRONIQUE" />
        <View>
          {data.esign.en.map((p, i) => (
            <Text key={`e${i}`} style={s.paraEn}>
              {p}
            </Text>
          ))}
          <View style={{ marginTop: 4 }}>
            {data.esign.fr.map((p, i) => (
              <Text key={`f${i}`} style={s.paraFr}>
                {p}
              </Text>
            ))}
          </View>
        </View>

        <View style={s.signRow} wrap={false}>
          <View style={[s.signBox, { marginRight: 10 }]}>
            <Text style={s.signTitle}>
              The Owner <Text style={s.signTitleFr}>/ Le Propriétaire</Text>
            </Text>
            <Text style={s.signName}>{data.signature.owner.name}</Text>
            {data.signature.owner.representedBy ? (
              <Text style={s.signRep}>
                <Text style={s.signRepFr}>représentée par / </Text>
                represented by
              </Text>
            ) : null}
            {data.signature.owner.representedBy ? (
              <Text style={[s.signRep, { marginTop: 2 }]}>
                {data.signature.owner.representedBy}
              </Text>
            ) : null}
          </View>
          <View style={s.signBox}>
            <Text style={s.signTitle}>
              The Agent <Text style={s.signTitleFr}>/ le Mandataire</Text>
            </Text>
            <Text style={s.signName}>{data.signature.agent.name}</Text>
            <Text style={[s.signRep, { marginTop: 2 }]}>
              {data.signature.agent.representedBy}
            </Text>
          </View>
        </View>

        {/* Footer — repeats on every page */}
        <View style={s.footer} fixed>
          <Text style={s.footLine}>
            <Text style={s.footStrong}>{a.legalName} — </Text>
            {a.address}
          </Text>
          <Text style={s.footLine}>
            {a.rcs} — {a.cartePro}
          </Text>
          <Text style={s.footLine}>
            {a.garantieFinanciere} — {a.rcp}
          </Text>
          <Text style={s.footLine}>
            <Text style={s.footWeb}>{a.web}</Text> — {a.phone}
          </Text>
        </View>
        <View style={s.pageMark} fixed>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber}/${totalPages}`} />
          <Text style={{ color: ink, marginLeft: 12 }}>Paraphes</Text>
        </View>
      </Page>
    </Document>
  );
}
