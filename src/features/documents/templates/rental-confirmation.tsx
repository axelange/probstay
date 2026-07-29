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
 * house charte, bilingual EN/FR. Soft grey rounded cards on a warm ground, with
 * serif names and figures, structured label/value rows, a bordered total, side-
 * by-side payment cards, ruled signature boxes and a three-part footer (mono-
 * gram · legal · page + initials). Every value is passed in (assembled from the
 * rental); the same component renders the server file and the browser preview.
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

// Palette. Gold accents the title and section labels; body text is black,
// secondary text (labels, French) is grey; soft grey cards carry the data.
const ink = "#1a1613";
const gold = "#a1885d";
const taupe = "#8c8477";
const cardBg = "#f5f4f1";
const rule = "#e4ded2";
const border = "#d7d0c2";

const SERIF = "Passenger Display";
const SANS = "Familjen Grotesk";

// Bundled PNGs. On the server read from disk (absolute path); in the browser
// served from /public. No node import so this also bundles for the preview.
const asset = (name: string) =>
  typeof window === "undefined"
    ? `${process.cwd()}/public/img/${name}`
    : `/img/${name}`;
const LOGO = asset("Bstay-logo-horizontal.png");
const MONOGRAM = asset("LogoMonogramme.png");

const s = StyleSheet.create({
  page: {
    paddingTop: 42,
    paddingBottom: 84,
    paddingHorizontal: 52,
    fontFamily: SANS,
    fontWeight: 400,
    fontSize: 9,
    lineHeight: 1.5,
    color: ink,
  },

  // Masthead — page 1 only, in flow (no logo repeats on later pages).
  logoWrap: { alignItems: "center", marginTop: 6, marginBottom: 24 },
  logo: { width: 150 },

  head: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 1,
    borderBottomColor: gold,
    paddingBottom: 12,
  },
  headTitle: { fontFamily: SERIF, fontSize: 30, color: gold, lineHeight: 1 },
  headSub: { fontFamily: SERIF, fontSize: 15, color: ink, marginTop: 9 },
  headMeta: { alignItems: "flex-end", paddingBottom: 4 },
  headMetaLabel: { fontSize: 7, color: taupe, letterSpacing: 2, textTransform: "uppercase" },
  headMetaVal: { fontFamily: SERIF, fontSize: 17, color: ink, marginTop: 5 },

  intro: { marginTop: 20 },
  introEn: { fontSize: 9.5, color: ink, lineHeight: 1.5 },
  introFr: { fontSize: 9, color: taupe, fontStyle: "italic", marginTop: 5, lineHeight: 1.5 },

  // Section marker: gold label + grey-italic French + a full-width hairline.
  section: { marginTop: 21 },
  sectionRow: { flexDirection: "row", alignItems: "baseline" },
  sectionEn: { fontFamily: SANS, fontWeight: 500, fontSize: 9.5, color: gold, letterSpacing: 2, textTransform: "uppercase" },
  sectionFr: { fontSize: 8.5, color: taupe, letterSpacing: 1, textTransform: "uppercase", fontStyle: "italic", marginLeft: 11 },
  sectionRule: { height: 0.8, backgroundColor: rule, marginTop: 8, marginBottom: 12 },

  // Cards
  card: { backgroundColor: cardBg, borderRadius: 6, padding: 16 },
  cardBordered: { borderWidth: 0.8, borderColor: border, borderRadius: 6, padding: 16 },

  // Grey caps label ("EN / fr")
  cap: { fontSize: 7.5, color: taupe, letterSpacing: 1.3, textTransform: "uppercase" },
  capFr: { fontStyle: "italic" },

  name: { fontFamily: SERIF, fontSize: 16, color: ink, marginTop: 8 },
  detailVal: { fontSize: 9.5, color: ink },
  detailMuted: { fontSize: 9.5, color: taupe, marginTop: 4 },

  // Structured label/value row (tenant informations)
  infoRow: { flexDirection: "row", alignItems: "baseline", marginTop: 7 },
  infoLabel: { width: 132 },
  infoValue: { flex: 1, fontSize: 9.5, color: ink },

  // Stay
  statVal: { fontFamily: SERIF, fontSize: 15, color: ink, marginTop: 8, textAlign: "center" },

  // Services list
  svcItem: { fontSize: 9.5, color: ink, marginTop: 7 },

  // Financial
  finRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: cardBg, borderRadius: 6, paddingVertical: 13, paddingHorizontal: 16, marginBottom: 7 },
  finDesc: { fontSize: 9.5, color: ink },
  finAmt: { fontFamily: SERIF, fontSize: 13, color: ink },
  finTotal: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 0.8, borderColor: border, borderRadius: 6, paddingVertical: 15, paddingHorizontal: 16, marginTop: 3 },
  finTotalLabel: { fontSize: 8.5, color: ink, letterSpacing: 1.5, textTransform: "uppercase" },
  finTotalAmt: { fontFamily: SERIF, fontSize: 17, color: ink },

  // Payments
  payAmt: { fontFamily: SERIF, fontSize: 17, color: ink, marginTop: 8 },
  payDueVal: { fontSize: 9.5, color: ink, marginTop: 5 },
  note: { marginTop: 14 },

  // Prose (justified)
  paraEn: { fontSize: 9, color: ink, marginBottom: 6, lineHeight: 1.55, textAlign: "justify" },
  paraFr: { fontSize: 8.6, color: taupe, fontStyle: "italic", lineHeight: 1.55, textAlign: "justify" },

  // Signatures
  signBox: { borderWidth: 0.8, borderColor: border, borderRadius: 6, height: 78 },
  signMeta: { alignItems: "center", marginTop: 10 },
  signName: { fontFamily: SERIF, fontSize: 14, color: ink, marginTop: 6, textAlign: "center" },
  signRep: { fontSize: 9, color: ink, marginTop: 4, textAlign: "center" },

  // Footer (fixed): monogram · legal · page + initials
  footer: {
    position: "absolute",
    bottom: 28,
    left: 52,
    right: 52,
    borderTopWidth: 0.8,
    borderTopColor: rule,
    paddingTop: 11,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  footMono: { width: 40, marginRight: 14 },
  footLegal: { flex: 1 },
  footLine: { fontSize: 6.8, color: taupe, lineHeight: 1.55 },
  footStrong: { color: ink },
  footWeb: { color: gold },
  footRight: { height: 46, justifyContent: "space-between", alignItems: "flex-end" },
  footPage: { fontSize: 7, color: taupe },
  footInitialsRow: { flexDirection: "row", alignItems: "center" },
  footInitialsLabel: { fontSize: 6.5, color: taupe, letterSpacing: 1, textTransform: "uppercase", marginRight: 8 },
  footInitialsBox: { width: 58, height: 22, borderWidth: 0.7, borderColor: border, borderRadius: 3 },
});

/** Grey caps label rendered as "EN / fr" (French italic). */
function Cap({ en, fr }: { en: string; fr: string }) {
  return (
    <Text style={s.cap}>
      {en} <Text style={s.capFr}>/ {fr}</Text>
    </Text>
  );
}

/** Section marker: gold label, French caption, full-width hairline. */
function Section({ en, fr }: { en: string; fr: string }) {
  return (
    <View style={s.section} wrap={false} minPresenceAhead={90}>
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
  return (
    <View>
      {join ? (
        <Text style={s.paraEn}>{en.join(" ")}</Text>
      ) : (
        en.map((p, i) => (
          <Text key={`e${i}`} style={s.paraEn}>
            {p}
          </Text>
        ))
      )}
      <View style={{ marginTop: 6 }}>
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

/** Renders a service item as "English (french)". */
function ServiceItem({ it }: { it: Bilingual }) {
  return (
    <Text style={s.svcItem}>
      {it.en}
      {it.fr ? (
        <Text style={{ color: taupe, fontStyle: "italic" }}> ({it.fr})</Text>
      ) : null}
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
        {/* Masthead (page 1, in flow) */}
        <View style={s.logoWrap}>
          <Image src={LOGO} style={s.logo} />
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
        <View style={{ flexDirection: "row", gap: 12 }} wrap={false}>
          <View style={[s.card, { flex: 1 }]}>
            <Cap en="Owner" fr="Propriétaire" />
            <Text style={s.name}>{data.owner.name}</Text>
            {data.owner.representedBy ? (
              <>
                <View style={{ marginTop: 14, marginBottom: 6 }}>
                  <Cap en="Represented by" fr="Représenté par" />
                </View>
                <Text style={s.detailVal}>{data.owner.representedBy}</Text>
              </>
            ) : null}
            {data.owner.contact ? (
              <Text style={s.detailMuted}>{data.owner.contact}</Text>
            ) : null}
          </View>

          <View style={[s.card, { flex: 1 }]}>
            <Cap en="Tenant" fr="Locataire" />
            <Text style={s.name}>{data.tenant.name}</Text>
            {data.tenant.details.length > 0 ? (
              <>
                <View style={{ marginTop: 14, marginBottom: 2 }}>
                  <Cap en="Informations" fr="Informations" />
                </View>
                {data.tenant.details.map((d, i) => (
                  <View key={i} style={s.infoRow}>
                    <View style={s.infoLabel}>
                      <Cap en={d.label.en} fr={d.label.fr ?? d.label.en} />
                    </View>
                    <Text style={s.infoValue}>{d.value}</Text>
                  </View>
                ))}
              </>
            ) : null}
          </View>
        </View>

        <View style={[s.card, { marginTop: 12, flexDirection: "row" }]} wrap={false}>
          <View style={{ flex: 2, paddingRight: 16 }}>
            <Cap en="Property" fr="Bien loué" />
            <Text style={s.name}>{data.property.name}</Text>
            <View style={{ marginTop: 12, marginBottom: 4 }}>
              <Cap en="Address" fr="Adresse" />
            </View>
            <Text style={s.detailVal}>{data.property.address}</Text>
          </View>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Cap en="Security deposit" fr="Dépôt de garantie" />
            <Text style={[s.name, { fontSize: 15, marginTop: 6 }]}>
              {data.property.securityDeposit ?? "—"}
            </Text>
          </View>
        </View>

        {/* Rental period & occupancy */}
        <Section en="Rental Period and Occupancy" fr="Durée et occupation" />
        <View style={{ flexDirection: "row", gap: 12 }} wrap={false}>
          {[
            { en: "Check-in", fr: "Arrivée", v: data.stay.checkIn },
            { en: "Check-out", fr: "Départ", v: data.stay.checkOut },
            { en: "Nights", fr: "Nuitées", v: data.stay.nights },
            { en: "Occupancy", fr: "Occupation", v: data.stay.occupancy },
          ].map((c) => (
            <View key={c.en} style={[s.card, { flex: 1, alignItems: "center", paddingVertical: 15, paddingHorizontal: 8 }]}>
              <Cap en={c.en} fr={c.fr} />
              <Text style={s.statVal}>{c.v}</Text>
            </View>
          ))}
        </View>

        {/* Services */}
        <Section en="Services" fr="Prestations" />
        <View style={{ flexDirection: "row", gap: 12 }} wrap={false}>
          <View style={[s.card, { flex: 1 }]}>
            <Cap en="Included in the rent" fr="Inclus dans le loyer" />
            {data.services.included.map((it, i) => (
              <ServiceItem key={i} it={it} />
            ))}
          </View>
          <View style={[s.card, { flex: 1 }]}>
            <Cap en="Not included" fr="Non inclus" />
            {data.services.notIncluded.map((it, i) => (
              <ServiceItem key={i} it={it} />
            ))}
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
                  <Text style={{ color: taupe, fontStyle: "italic" }}> / {r.label.fr}</Text>
                ) : null}
              </Text>
              <Text style={s.finAmt}>{r.amount}</Text>
            </View>
          ))}
          <View style={s.finTotal}>
            <Text style={s.finTotalLabel}>
              Total VAT included <Text style={{ color: taupe, fontStyle: "italic" }}>/ Total TTC</Text>
            </Text>
            <Text style={s.finTotalAmt}>{data.financial.total}</Text>
          </View>
        </View>

        {/* Payment terms */}
        <Section en="Payment Terms" fr="Conditions de paiement" />
        <View style={{ flexDirection: "row", gap: 12 }} wrap={false}>
          {data.payments.map((p, i) => (
            <View key={i} style={[s.card, { flex: 1 }]}>
              <Cap en={p.label.en} fr={p.label.fr ?? p.label.en} />
              <Text style={s.payAmt}>{p.amount}</Text>
              <View style={{ marginTop: 12 }}>
                <Cap en="Due no later than" fr="À verser au plus tard le" />
              </View>
              <Text style={s.payDueVal}>{p.due}</Text>
            </View>
          ))}
        </View>
        <View style={s.note}>
          <Text style={s.paraEn}>
            Payment to the Owner is subject to prior receipt of the corresponding
            funds from the Tenant.
          </Text>
          <Text style={[s.paraFr, { marginTop: 4 }]}>
            Le reversement au Propriétaire est subordonné à l&apos;encaissement
            préalable des fonds correspondants auprès du Locataire.
          </Text>
        </View>

        {/* Cancellation policy */}
        <Section en="Cancellation Policy" fr="Conditions d'annulation" />
        <Prose en={data.cancellation.en} fr={data.cancellation.fr} join />

        {/* Contractual framework */}
        <Section en="Contractual Framework" fr="Cadre contractuel" />
        <Prose en={data.framework.en} fr={data.framework.fr} />

        {/* Electronic signature */}
        <Section en="Electronic Signature" fr="Signature électronique" />
        <Prose en={data.esign.en} fr={data.esign.fr} />

        <View style={{ flexDirection: "row", gap: 44, marginTop: 16 }} wrap={false}>
          <View style={{ flex: 1 }}>
            <View style={s.signBox} />
            <View style={s.signMeta}>
              <Cap en="The Owner" fr="le Propriétaire" />
              <Text style={s.signName}>{data.signature.owner.name}</Text>
              {data.signature.owner.representedBy ? (
                <>
                  <View style={{ marginTop: 6 }}>
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
              <View style={{ marginTop: 6 }}>
                <Cap en="Represented by" fr="Représenté par" />
              </View>
              <Text style={s.signRep}>{data.signature.agent.representedBy}</Text>
            </View>
          </View>
        </View>

        {/* Footer — repeats on every page */}
        <View style={s.footer} fixed>
          <Image src={MONOGRAM} style={s.footMono} />
          <View style={s.footLegal}>
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
          <View style={s.footRight}>
            <Text
              style={s.footPage}
              render={({ pageNumber, totalPages }) => `Page ${pageNumber}/${totalPages}`}
            />
            <View style={s.footInitialsRow}>
              <Text style={s.footInitialsLabel}>Initials / Paraphes</Text>
              <View style={s.footInitialsBox} />
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
