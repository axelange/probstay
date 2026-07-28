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
 * house charte, bilingual EN/FR. An editorial "register" composition: no boxes,
 * hairline-separated rows, serif names and figures, a letterhead title with the
 * reference, small-caps section labels trailed by a rule, and ruled signature
 * lines. Every value is passed in (assembled from the rental), never typed by
 * hand; the same component renders the server file and the browser preview.
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

// Warm, restrained palette. Gold is an accent (title, section labels, marks);
// body text is black; secondary text (French, captions) is grey and italic.
const ink = "#1a1613";
const gold = "#a1885d";
const taupe = "#8c8477";
const hair = "#e0d8c9";

const SERIF = "Passenger Display";
const SANS = "Familjen Grotesk";

// The logo is embedded from a bundled PNG. On the server react-pdf reads it
// from disk (absolute path); in the browser the same file is served from
// /public. No node:path import so this module also bundles for the client.
const LOGO =
  typeof window === "undefined"
    ? `${process.cwd()}/public/img/Bstay-logo-horizontal.png`
    : "/img/Bstay-logo-horizontal.png";

const s = StyleSheet.create({
  page: {
    paddingTop: 96,
    paddingBottom: 66,
    paddingHorizontal: 54,
    fontFamily: SANS,
    fontWeight: 400,
    fontSize: 9,
    lineHeight: 1.55,
    color: ink,
  },

  // Fixed slim logo, centred, repeats on every page.
  logoWrap: { position: "absolute", top: 34, left: 0, right: 0, alignItems: "center" },
  logo: { width: 100 },

  // Letterhead title block (page 1) — big serif title left, reference right,
  // over a firm rule.
  head: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 1,
    borderBottomColor: ink,
    paddingBottom: 12,
  },
  headTitle: { fontFamily: SERIF, fontSize: 27, color: ink, letterSpacing: 0.5, lineHeight: 1 },
  headSub: { fontFamily: SERIF, fontSize: 12.5, color: gold, marginTop: 8 },
  headMeta: { alignItems: "flex-end", paddingBottom: 3 },
  headMetaLabel: { fontSize: 6.5, color: taupe, letterSpacing: 2.5, textTransform: "uppercase" },
  headMetaVal: { fontFamily: SERIF, fontSize: 12, color: ink, marginTop: 3 },

  intro: { marginTop: 16 },
  introEn: { fontSize: 9, color: ink },
  introFr: { fontSize: 8.6, color: taupe, fontStyle: "italic", marginTop: 3 },

  // Section: small-caps gold label + French caption + a trailing hairline.
  section: { flexDirection: "row", alignItems: "center", marginTop: 26, marginBottom: 13 },
  sectionLabel: { fontFamily: SANS, fontWeight: 500, fontSize: 8.5, color: gold, letterSpacing: 2.5, textTransform: "uppercase" },
  sectionLabelFr: { fontSize: 6.8, color: taupe, letterSpacing: 1.5, textTransform: "uppercase", marginLeft: 8, fontStyle: "italic" },
  sectionRule: { flex: 1, height: 0.7, backgroundColor: hair, marginLeft: 14 },

  // Register fields
  fieldLabel: { fontSize: 6.6, color: taupe, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 },
  serifValue: { fontFamily: SERIF, fontSize: 14, color: ink },
  detail: { fontSize: 9, color: ink, marginTop: 2 },
  detailMuted: { fontSize: 9, color: taupe, marginTop: 2 },
  frItalic: { color: taupe, fontStyle: "italic" },

  // Two columns with a hairline spine.
  twoCol: { flexDirection: "row" },
  colLeft: { flex: 1, paddingRight: 24 },
  colRight: { flex: 1, paddingLeft: 24, borderLeftWidth: 0.6, borderLeftColor: hair },

  // Property row
  propRow: { flexDirection: "row", marginTop: 20, paddingTop: 16, borderTopWidth: 0.6, borderTopColor: hair },

  // Stay: four airy columns
  stayRow: { flexDirection: "row" },
  stayCol: { flex: 1, paddingRight: 12 },
  stayVal: { fontFamily: SERIF, fontSize: 14, color: ink },

  // Services list
  svcItem: { flexDirection: "row", marginBottom: 5 },
  svcMark: { width: 11, fontSize: 9, color: gold },
  svcText: { flex: 1, fontSize: 8.8, color: ink },

  // Financial: description left, serif amount right, hairline between rows.
  finRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", paddingVertical: 8, borderTopWidth: 0.5, borderTopColor: hair },
  finDesc: { fontSize: 9.5, color: ink, flex: 3 },
  finAmt: { fontFamily: SERIF, fontSize: 12, color: ink, textAlign: "right", flex: 1 },
  finTotalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", paddingTop: 10, marginTop: 2, borderTopWidth: 1, borderTopColor: ink },
  finTotalLabel: { fontSize: 8.5, color: ink, letterSpacing: 2, textTransform: "uppercase", flex: 3 },
  finTotalAmt: { fontFamily: SERIF, fontSize: 16, color: ink, textAlign: "right", flex: 1 },

  // Payments
  payRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderTopWidth: 0.5, borderTopColor: hair },
  payLabel: { flex: 1.4, fontSize: 9.5, color: ink },
  payAmt: { flex: 1, fontFamily: SERIF, fontSize: 14, color: ink },
  payDue: { flex: 1.7, alignItems: "flex-end" },
  payDueCap: { fontSize: 6.5, color: taupe, letterSpacing: 1, textTransform: "uppercase", fontStyle: "italic" },
  payDueVal: { fontSize: 9, color: ink, marginTop: 2 },
  note: { marginTop: 12 },

  // Prose
  paraEn: { fontSize: 8.8, color: ink, marginBottom: 5, lineHeight: 1.5 },
  paraFr: { fontSize: 8.4, color: taupe, fontStyle: "italic", marginBottom: 4, lineHeight: 1.5 },

  // Signatures — a ruled line to sign on, role below.
  signRow: { flexDirection: "row", gap: 44, marginTop: 34 },
  signCol: { flex: 1 },
  signLine: { borderBottomWidth: 0.7, borderBottomColor: ink, height: 46 },
  signRole: { fontSize: 6.8, color: taupe, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 7 },
  signName: { fontFamily: SERIF, fontSize: 12, color: ink, marginTop: 3 },
  signRep: { fontSize: 8, color: taupe, marginTop: 1 },

  // Footer (fixed)
  footer: { position: "absolute", bottom: 30, left: 54, right: 54, alignItems: "center", borderTopWidth: 0.6, borderTopColor: hair, paddingTop: 9 },
  footLine: { fontSize: 7, color: taupe, textAlign: "center", lineHeight: 1.5 },
  footStrong: { color: ink },
  footWeb: { color: gold },
  pageMark: { position: "absolute", bottom: 30, right: 54, fontSize: 7, color: taupe },
});

/** A section marker: gold label, French caption, trailing hairline. */
function Section({ en, fr }: { en: string; fr: string }) {
  return (
    <View style={s.section} wrap={false}>
      <Text style={s.sectionLabel}>{en}</Text>
      <Text style={s.sectionLabelFr}>{fr}</Text>
      <View style={s.sectionRule} />
    </View>
  );
}

/** English + grey-italic French, inline: "English / français". */
function Label({ en, fr }: { en: string; fr: string }) {
  return (
    <Text style={s.fieldLabel}>
      {en} <Text style={{ fontStyle: "italic" }}>/ {fr}</Text>
    </Text>
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
        {/* Fixed logo — repeats on every page */}
        <View style={s.logoWrap} fixed>
          <Image src={LOGO} style={s.logo} />
        </View>

        {/* Letterhead title (page 1, in flow) */}
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

        {/* Parties & property */}
        <Section en="Parties & Property" fr="Parties & bien" />
        <View style={s.twoCol} wrap={false}>
          <View style={s.colLeft}>
            <Label en="Owner" fr="Propriétaire" />
            <Text style={s.serifValue}>{data.owner.name}</Text>
            {data.owner.representedBy ? (
              <>
                <View style={{ marginTop: 11 }}>
                  <Label en="Represented by" fr="Représentée par" />
                </View>
                <Text style={s.detail}>{data.owner.representedBy}</Text>
              </>
            ) : null}
            {data.owner.contact ? (
              <Text style={s.detailMuted}>{data.owner.contact}</Text>
            ) : null}
          </View>
          <View style={s.colRight}>
            <Label en="Tenant" fr="Locataire" />
            <Text style={s.serifValue}>{data.tenant.name}</Text>
            {data.tenant.lines.map((l, i) => (
              <Text key={i} style={s.detail}>
                {l}
              </Text>
            ))}
          </View>
        </View>

        <View style={s.propRow} wrap={false}>
          <View style={{ flex: 2, paddingRight: 24 }}>
            <Label en="Property" fr="Bien loué" />
            <Text style={s.serifValue}>{data.property.name}</Text>
            <Text style={s.detailMuted}>{data.property.address}</Text>
          </View>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Label en="Security deposit" fr="Dépôt de garantie" />
            <Text style={[s.serifValue, { fontSize: 12 }]}>
              {data.property.securityDeposit ?? "—"}
            </Text>
          </View>
        </View>

        {/* Rental period & occupancy */}
        <Section en="Rental Period & Occupancy" fr="Durée et occupation" />
        <View style={s.stayRow} wrap={false}>
          {[
            { en: "Check-in", fr: "Arrivée", v: data.stay.checkIn },
            { en: "Check-out", fr: "Départ", v: data.stay.checkOut },
            { en: "Duration", fr: "Durée", v: data.stay.duration },
            { en: "Occupancy", fr: "Occupation", v: data.stay.occupancy },
          ].map((c) => (
            <View key={c.en} style={s.stayCol}>
              <Label en={c.en} fr={c.fr} />
              <Text style={s.stayVal}>{c.v}</Text>
            </View>
          ))}
        </View>

        {/* Services */}
        <Section en="Services" fr="Prestations" />
        <View style={s.twoCol} wrap={false}>
          <View style={s.colLeft}>
            <Label en="Included in the rent" fr="Inclus dans le loyer" />
            <View style={{ marginTop: 5 }}>
              {data.services.included.map((it, i) => (
                <View key={i} style={s.svcItem}>
                  <Text style={s.svcMark}>—</Text>
                  <Text style={s.svcText}>
                    {it.en}
                    {it.fr ? <Text style={s.frItalic}> ({it.fr})</Text> : null}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          <View style={s.colRight}>
            <Label en="Not included" fr="Non inclus, à la charge du locataire" />
            <View style={{ marginTop: 5 }}>
              {data.services.notIncluded.map((it, i) => (
                <View key={i} style={s.svcItem}>
                  <Text style={s.svcMark}>—</Text>
                  <Text style={s.svcText}>
                    {it.en}
                    {it.fr ? <Text style={s.frItalic}> ({it.fr})</Text> : null}
                  </Text>
                </View>
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
                {r.label.fr ? <Text style={s.frItalic}> / {r.label.fr}</Text> : null}
              </Text>
              <Text style={s.finAmt}>{r.amount}</Text>
            </View>
          ))}
          <View style={s.finTotalRow}>
            <Text style={s.finTotalLabel}>Total TTC</Text>
            <Text style={s.finTotalAmt}>{data.financial.total}</Text>
          </View>
        </View>

        {/* Payment terms */}
        <Section en="Payment Terms" fr="Conditions de paiement" />
        <View wrap={false}>
          {data.payments.map((p, i) => (
            <View key={i} style={s.payRow}>
              <Text style={s.payLabel}>
                {p.label.en}
                {p.label.fr ? <Text style={s.frItalic}> / {p.label.fr}</Text> : null}
              </Text>
              <Text style={s.payAmt}>{p.amount}</Text>
              <View style={s.payDue}>
                <Text style={s.payDueCap}>Due no later than / à verser au plus tard le</Text>
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

        {/* Contractual framework */}
        <Section en="Contractual Framework" fr="Cadre contractuel" />
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

        {/* Electronic signature */}
        <Section en="Electronic Signature" fr="Signature électronique" />
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
          <View style={s.signCol}>
            <View style={s.signLine} />
            <Text style={s.signRole}>The Owner / le Propriétaire</Text>
            <Text style={s.signName}>{data.signature.owner.name}</Text>
            {data.signature.owner.representedBy ? (
              <Text style={s.signRep}>
                représentée par {data.signature.owner.representedBy}
              </Text>
            ) : null}
          </View>
          <View style={s.signCol}>
            <View style={s.signLine} />
            <Text style={s.signRole}>The Agent / le Mandataire</Text>
            <Text style={s.signName}>{data.signature.agent.name}</Text>
            <Text style={s.signRep}>{data.signature.agent.representedBy}</Text>
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
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
