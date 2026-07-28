import * as React from "react";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Svg,
  Path,
} from "@react-pdf/renderer";

/**
 * The data a "Contrat de location saisonnière" is rendered from. In the
 * real module this is assembled from the rental (property, owner, tenant —
 * including a company's legal identity — dates and amounts) merged with the
 * template's editable blocks. Here it is a flat, self-contained shape so the
 * sample renders on its own.
 */
export type ContratData = {
  reference: string;
  place: string;
  date: string;
  agency: {
    name: string;
    tagline: string;
    legalForm: string;
    capital: string;
    rcs: string;
    address: string;
    representedBy: string;
    capacity: string;
  };
  owner: { name: string; detail: string };
  tenant: {
    kind: "INDIVIDUAL" | "COMPANY";
    name: string;
    // Company identity
    legalForm?: string;
    registrationNumber?: string;
    registeredOffice?: string;
    representative?: string;
    capacity?: string;
    // Individual identity
    birth?: string;
    nationality?: string;
    address?: string;
    email?: string;
    phone?: string;
  };
  property: {
    name: string;
    address: string;
    city: string;
    kind: string;
    surface: string;
    rooms: string;
    sleeps: string;
  };
  stay: { checkIn: string; checkOut: string; nights: string; guests: string };
  money: {
    rent: string;
    services: { label: string; amount: string }[];
    touristTax: string;
    total: string;
    securityDeposit: string;
    deposit: string;
  };
};

const ink = "#24211c";
const soft = "#6f6658";
const faint = "#938a79";
const accent = "#9a7b3f";
const rule = "#ddd6c8";

const s = StyleSheet.create({
  page: {
    paddingTop: 52,
    paddingBottom: 60,
    paddingHorizontal: 58,
    fontFamily: "Neue Haas Grotesk",
    fontWeight: 400,
    fontSize: 9.6,
    lineHeight: 1.65,
    color: ink,
  },
  // Masthead
  mast: { alignItems: "center", marginBottom: 6 },
  agency: {
    fontSize: 8,
    fontWeight: 500,
    letterSpacing: 5,
    color: soft,
    textTransform: "uppercase",
  },
  tagline: {
    fontSize: 6.5,
    letterSpacing: 3,
    color: faint,
    textTransform: "uppercase",
    marginTop: 3,
  },
  title: {
    fontSize: 26,
    fontFamily: "Passenger Display",
    fontWeight: 400,
    color: ink,
    textAlign: "center",
    marginTop: 20,
  },
  ref: {
    fontSize: 7.5,
    fontWeight: 400,
    letterSpacing: 2.5,
    color: soft,
    textTransform: "uppercase",
    textAlign: "center",
    marginTop: 10,
  },
  // Section heading
  sectionLead: {
    fontSize: 7.5,
    fontWeight: 500,
    letterSpacing: 3.5,
    color: accent,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  partyLabel: {
    fontSize: 7,
    fontWeight: 500,
    letterSpacing: 2.5,
    color: accent,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  partyName: { fontSize: 11, fontWeight: 500, color: ink, marginBottom: 2 },
  para: { textAlign: "justify", marginBottom: 3 },
  between: {
    fontSize: 9.6,
    fontWeight: 400,
    fontStyle: "italic",
    color: soft,
    marginBottom: 10,
  },
  articleTitle: {
    fontSize: 10,
    fontWeight: 500,
    color: ink,
    marginBottom: 4,
  },
  articleNo: { color: accent },
  // Facts table
  factRow: {
    flexDirection: "row",
    borderTop: `0.6pt solid ${rule}`,
    paddingVertical: 4,
  },
  factKey: {
    width: "38%",
    fontSize: 7.5,
    fontWeight: 500,
    letterSpacing: 1.5,
    color: soft,
    textTransform: "uppercase",
  },
  factVal: { width: "62%", fontWeight: 400, color: ink },
  amount: { fontVariant: ["tabular-nums"] },
  totalRow: {
    flexDirection: "row",
    borderTop: `1pt solid ${accent}`,
    marginTop: 2,
    paddingTop: 5,
  },
  totalKey: {
    width: "38%",
    fontSize: 8.5,
    fontWeight: 700,
    letterSpacing: 1.5,
    color: ink,
    textTransform: "uppercase",
  },
  totalVal: { width: "62%", fontSize: 12, fontWeight: 500, color: ink },
  // Signatures
  signRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  signCol: { width: "44%" },
  signLabel: {
    fontSize: 7,
    fontWeight: 500,
    letterSpacing: 2,
    color: accent,
    textTransform: "uppercase",
  },
  signHint: { fontSize: 7.5, fontStyle: "italic", color: faint, marginTop: 2 },
  signLine: { borderBottom: `0.6pt solid ${rule}`, height: 46 },
  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 58,
    right: 58,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTop: `0.6pt solid ${rule}`,
    paddingTop: 6,
  },
  footNote: {
    fontSize: 6.5,
    fontWeight: 400,
    letterSpacing: 2,
    color: faint,
    textTransform: "uppercase",
  },
});

function Diamond() {
  return (
    <Svg width={7} height={7} viewBox="0 0 8 8">
      <Path d="M4 0 L8 4 L4 8 L0 4 Z" fill={accent} />
    </Svg>
  );
}

function Divider({ width = 150 }: { width?: number }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "center",
        width,
        marginTop: 12,
        marginBottom: 4,
      }}
    >
      <View style={{ flex: 1, height: 0.6, backgroundColor: rule }} />
      <View style={{ marginHorizontal: 8 }}>
        <Diamond />
      </View>
      <View style={{ flex: 1, height: 0.6, backgroundColor: rule }} />
    </View>
  );
}

function Section({
  lead,
  children,
  style,
}: {
  lead?: string;
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <View style={{ marginTop: 16, ...style }} wrap={false}>
      {lead ? <Text style={s.sectionLead}>{lead}</Text> : null}
      {children}
    </View>
  );
}

function Article({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginTop: 13 }} wrap={false}>
      <Text style={s.articleTitle}>
        <Text style={s.articleNo}>Article {n}</Text> — {title}
      </Text>
      <Text style={s.para}>{children}</Text>
    </View>
  );
}

function Fact({ k, v, amount }: { k: string; v: string; amount?: boolean }) {
  return (
    <View style={s.factRow}>
      <Text style={s.factKey}>{k}</Text>
      <Text style={[s.factVal, amount ? s.amount : {}]}>{v}</Text>
    </View>
  );
}

export function ContratLocationSaisonniere({ data }: { data: ContratData }) {
  const t = data.tenant;
  const indiv = [
    t.birth ? `né(e) le ${t.birth}` : null,
    t.nationality ? `de nationalité ${t.nationality}` : null,
    t.address ? `demeurant ${t.address}` : null,
  ].filter(Boolean);
  const preneur =
    t.kind === "COMPANY"
      ? `La société ${t.name}, ${t.legalForm ?? ""}, immatriculée sous le numéro ${
          t.registrationNumber ?? "—"
        }, dont le siège social est situé ${t.registeredOffice ?? "—"}, ` +
        `représentée par ${t.representative ?? "—"} en sa qualité de ${
          t.capacity ?? "—"
        }, dûment habilité(e) aux fins des présentes.`
      : indiv.length > 0
        ? `${indiv.join(", ")}.`.replace(/^./, (c) => c.toUpperCase())
        : "Agissant en son nom et pour son compte.";

  return (
    <Document
      title={`Contrat de location saisonnière — ${data.reference}`}
      author={data.agency.name}
    >
      <Page size="A4" style={s.page}>
        {/* Masthead */}
        <View style={s.mast}>
          <Text style={s.agency}>{data.agency.name}</Text>
          <Text style={s.tagline}>{data.agency.tagline}</Text>
        </View>
        <Text style={s.title}>Contrat de location saisonnière</Text>
        <Divider />
        <Text style={s.ref}>
          Réf. {data.reference}  ·  Établi à {data.place}, le {data.date}
        </Text>

        {/* Parties */}
        <Section lead="Entre les soussignés" style={{ marginTop: 26 }}>
          <View wrap={false} style={{ marginBottom: 12 }}>
            <Text style={s.partyLabel}>Le Bailleur</Text>
            <Text style={s.partyName}>{data.owner.name}</Text>
            <Text style={s.para}>
              {data.owner.detail} Représenté à la location par {data.agency.name},{" "}
              {data.agency.legalForm} au capital de {data.agency.capital},{" "}
              {data.agency.rcs}, dont le siège est situé {data.agency.address},
              agissant par {data.agency.representedBy}, {data.agency.capacity}.
            </Text>
          </View>

          <View wrap={false}>
            <Text style={s.partyLabel}>Le Preneur</Text>
            <Text style={s.partyName}>{t.name}</Text>
            <Text style={s.para}>{preneur}</Text>
          </View>

          <Text style={[s.between, { marginTop: 10 }]}>
            Il a été convenu et arrêté ce qui suit.
          </Text>
        </Section>

        {/* Articles */}
        <Article n={1} title="Objet et désignation du bien">
          Le Bailleur donne en location saisonnière au Preneur, qui accepte, le
          bien ci-après désigné : {data.property.name}, {data.property.kind} sis{" "}
          {data.property.address}, {data.property.city} — d&apos;une surface de{" "}
          {data.property.surface}, comprenant {data.property.rooms} et pouvant
          accueillir {data.property.sleeps}. La location est consentie à usage
          exclusif d&apos;habitation de loisirs, à l&apos;exclusion de toute
          activité professionnelle ou commerciale.
        </Article>

        <Article n={2} title="Durée de la location">
          La présente location est consentie pour la période courant du{" "}
          {data.stay.checkIn} au {data.stay.checkOut}, soit {data.stay.nights},
          sans que le Preneur puisse se prévaloir d&apos;un quelconque droit au
          maintien dans les lieux à l&apos;expiration de ce terme.
        </Article>

        <Article n={3} title="Capacité d'accueil">
          Le bien est loué pour un usage n&apos;excédant pas {data.stay.guests},
          conformément à sa capacité d&apos;accueil. Toute occupation excédant ce
          nombre autorise le Bailleur à résilier de plein droit la présente.
        </Article>

        {/* Financials */}
        <Section lead="Article 4 — Loyer, services et taxe de séjour">
          <View>
            <Fact k="Loyer de la location" v={data.money.rent} amount />
            {data.money.services.map((sv, i) => (
              <Fact key={i} k={sv.label} v={sv.amount} amount />
            ))}
            <Fact k="Taxe de séjour" v={data.money.touristTax} amount />
            <View style={s.totalRow}>
              <Text style={s.totalKey}>Total à la charge du preneur</Text>
              <Text style={[s.totalVal, s.amount]}>{data.money.total}</Text>
            </View>
          </View>
          <Text style={[s.para, { marginTop: 8 }]}>
            Le loyer s&apos;entend hors dépôt de garantie. Le règlement est
            exigible selon l&apos;échéancier annexé aux présentes.
          </Text>
        </Section>

        <Article n={5} title="Dépôt de garantie">
          À la remise des clés, le Preneur verse un dépôt de garantie de{" "}
          {data.money.securityDeposit}, destiné à couvrir les dégradations
          éventuelles. Il lui est restitué dans un délai maximal de trente jours
          suivant la fin du séjour, déduction faite le cas échéant des sommes
          dues. Le dépôt de garantie ne constitue en aucun cas un revenu locatif.
        </Article>

        <Article n={6} title="État des lieux et jouissance paisible">
          Un état des lieux contradictoire est établi à l&apos;entrée et à la
          sortie. Le Preneur jouit paisiblement du bien en bon père de famille et
          en préserve la destination, le mobilier et les équipements.
        </Article>

        {/* Signatures */}
        <Section style={{ marginTop: 22 }}>
          <Text style={s.para}>
            Fait à {data.place}, le {data.date}, en deux exemplaires originaux.
          </Text>
          <View style={s.signRow}>
            <View style={s.signCol}>
              <Text style={s.signLabel}>Le Bailleur</Text>
              <Text style={s.signHint}>Lu et approuvé</Text>
              <View style={s.signLine} />
            </View>
            <View style={s.signCol}>
              <Text style={s.signLabel}>Le Preneur</Text>
              <Text style={s.signHint}>Lu et approuvé</Text>
              <View style={s.signLine} />
            </View>
          </View>
        </Section>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footNote}>{data.agency.name}</Text>
          <Text
            style={s.footNote}
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
