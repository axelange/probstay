import * as React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import {
  Cap,
  Footer,
  Masthead,
  Section,
  SubHeading,
  Tick,
  h,
  black,
  cardBg,
  grey,
  GAP,
  LABEL_GAP,
  PAIR_GAP,
  LH,
  SERIF,
  type AgencyIdentity,
} from "@/features/documents/templates/house-style";

/**
 * "Seasonal Rental Agreement / Contrat de location Saisonnière" — the
 * tenant's document, laid out from the Figma master (frame
 * "A4 - Seasonal Rental Agreement - Page 1", node 33:1179).
 *
 * It shares the house system with the owner's Confirmation — same palette,
 * spacing scale, section markers and footer (see house-style) — and opens on
 * a cover: the vertical lockup, the bilingual title, a hero photograph of the
 * property over three smaller ones, and the property and tenant named beneath.
 * The agreement itself follows.
 *
 * Every value is passed in (assembled from the rental); the same component
 * renders the server file and the browser preview.
 */
export type ContratData = {
  reference: string;
  place: string;
  date: string;
  agency: AgencyIdentity & {
    bankName: string;
    bankAccountName: string;
    bankIban: string;
    bankBic: string;
    name: string;
    tagline: string;
    legalForm: string;
    capital: string;
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
    /** Labelled identity rows, as printed in the tenant card on page 2. */
    details: { label: { en: string; fr?: string }; value: string }[];
  };
  property: {
    name: string;
    address: string;
    city: string;
    kind: string;
    surface: string;
    rooms: string;
    sleeps: string;
    /**
     * Cover photographs, best first. The master shows one large and three
     * small; fewer is handled, and none drops the cover's gallery entirely
     * rather than printing empty frames.
     */
    photos: string[];
    /** What the stay includes, from the property's own list. */
    includedCharges: string[];
    /** Labelled rows under the property card: area, rooms, occupancy. */
    details: { label: { en: string; fr?: string }; value: string }[];
    /**
     * The property's own description, paragraph by paragraph. Unlike the
     * clauses this is not agency-wide text: it describes this villa, and comes
     * from the property record. `en` is usually empty — the APIMO sync stores
     * the French comment only — so the renderer promotes French to the primary
     * voice rather than printing a translation of nothing.
     */
    description: { en: string[]; fr: string[] };
  };
  stay: {
    checkIn: string;
    checkOut: string;
    nights: string;
    guests: string;
    /** Agency-standard arrival and departure times, not per-rental. */
    checkInTime: string;
    checkOutTime: string;
  };
  /**
   * Clause wording from the template, variables already filled. Bilingual:
   * page 2 prints both languages side by side, the articles print French.
   */
  clauses: Record<string, { en: string[]; fr: string[] }>;
  money: {
    rent: string;
    balance: string;
    balanceDue: string;
    surcharge: string;
    touristTaxBasis: string | undefined;
    /**
     * Absent whenever the rental carries no such amount. The document then
     * omits the section rather than announcing a deadline to pay nothing —
     * the rental is the source of truth, not the layout.
     */
    deposit: string | undefined;
    depositPercent: string | undefined;
    depositDue: string | undefined;
    balancePercent: string | undefined;
    securityDeposit: string;
    securityDepositDue: string;
    services: { label: string; amount: string }[];
    vat?: string;
    touristTax: string;
    total: string;
  };
};

const s = StyleSheet.create({
  // Cover gallery. The master gives the block 813 px — 553 px of hero over a
  // 250 px band of three — on the 10 px gap that separates every cover element.
  gallery: { marginTop: 0, gap: PAIR_GAP },
  hero: { width: "100%", height: 276.5, objectFit: "cover" },
  thumbRow: { flexDirection: "row", gap: PAIR_GAP, height: 125 },
  thumb: { flex: 1, height: "100%", objectFit: "cover" },

  coverCard: {
    backgroundColor: cardBg,
    paddingHorizontal: 12,
    paddingVertical: 9.5,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: PAIR_GAP,
  },

  itemFr: { fontStyle: "italic", color: grey },

  // Parties
  partyLabel: { marginTop: GAP },
  partyName: { fontFamily: SERIF, fontSize: 14, color: black, lineHeight: LH, marginTop: LABEL_GAP },
  partyDetail: { fontSize: 10, color: black, lineHeight: LH, marginTop: PAIR_GAP },
  lead: { fontSize: 10, color: grey, fontStyle: "italic", lineHeight: LH, marginTop: GAP },

  // Articles
  article: { marginTop: GAP },
  articleTitle: {
    fontSize: 10,
    color: black,
    lineHeight: LH,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: LABEL_GAP,
  },
  para: { fontSize: 10, color: black, lineHeight: LH, marginBottom: PAIR_GAP },

  // Money
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
  finTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: grey,
    padding: 12,
    marginTop: 2,
  },
  finTotalLabel: { fontSize: 10, color: black, textTransform: "uppercase", lineHeight: LH },
  finTotalAmt: { fontSize: 12, color: black, lineHeight: LH },

  // Signatures
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
});

/**
 * A numbered article. Its wording comes from the template's clauses, with the
 * rental's values already interpolated — the number and title stay here,
 * since they are the document's structure rather than its text.
 */
function Article({
  n,
  title,
  paragraphs,
}: {
  n: number;
  title: string;
  paragraphs: string[];
}) {
  return (
    <View style={s.article} wrap={false}>
      <Text style={s.articleTitle}>
        Article {n} — {title}
      </Text>
      {paragraphs.map((p, i) => (
        <Text key={i} style={s.para}>
          {p}
        </Text>
      ))}
    </View>
  );
}

/**
 * A bilingual clause: English in black, the French translation grey and
 * italic beneath, each language's paragraphs on the tighter gap.
 */
function Prose({ clause }: { clause?: { en: string[]; fr: string[] } }) {
  if (!clause) return null;
  return (
    <View style={{ gap: PAIR_GAP }}>
      <View style={h.proseGroup}>
        {clause.en.map((para, i) => (
          <Text key={`e${i}`} style={h.paraEn}>
            {para}
          </Text>
        ))}
      </View>
      <View style={h.proseGroup}>
        {clause.fr.map((para, i) => (
          <Text key={`f${i}`} style={h.paraFr}>
            {para}
          </Text>
        ))}
      </View>
    </View>
  );
}

/**
 * The property's description. When no English text exists — the usual case,
 * since the sync stores the French comment only — the French is printed as the
 * primary voice instead of greyed out as a translation of nothing.
 */
function Description({ description }: { description: { en: string[]; fr: string[] } }) {
  const hasEn = description.en.length > 0;
  if (!hasEn) {
    return (
      <View style={h.proseGroup}>
        {description.fr.map((para, i) => (
          <Text key={i} style={h.paraEn}>
            {para}
          </Text>
        ))}
      </View>
    );
  }
  return <Prose clause={description} />;
}

/** A grey caps label running inline with its value, as the master sets them. */
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
 * An instalment: its caption and amount on one line, the bilingual due
 * wording and the date beneath. Used for the deposit, the balance and the
 * security deposit, which the master lays out identically.
 */
function Instalment({
  capEn,
  capFr,
  amount,
  dueEn,
  dueFr,
  dueDate,
}: {
  capEn: string;
  capFr: string;
  amount: string;
  dueEn: string;
  dueFr: string;
  dueDate: string;
}) {
  return (
    <View style={[h.card, { marginTop: PAIR_GAP }]} wrap={false}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Cap en={capEn} fr={capFr} />
        <Text style={h.infoValue}>{amount}</Text>
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: GAP,
          marginTop: GAP,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={h.paraEn}>{dueEn}</Text>
          <Text style={h.paraFr}>{dueFr}</Text>
        </View>
        <Text style={[h.infoValue, { textAlign: "right" }]}>{dueDate}</Text>
      </View>
    </View>
  );
}

/** One line of a financial table: label left, amount right. */
function MoneyRow({
  en,
  fr,
  note,
  amount,
}: {
  en: string;
  fr?: string;
  note?: string;
  amount: string;
}) {
  return (
    <View style={s.finRow}>
      <Text style={s.finDesc}>
        {en}
        {fr ? <Text style={s.itemFr}> / {fr}</Text> : null}
        {note ? ` ${note}` : null}
      </Text>
      <Text style={s.finAmt}>{amount}</Text>
    </View>
  );
}

/** The bordered total closing a financial table. */
function MoneyTotal({
  en,
  fr,
  amount,
}: {
  en: string;
  fr?: string;
  amount: string;
}) {
  return (
    <View style={s.finTotal}>
      <Text style={s.finTotalLabel}>
        {en}
        {fr ? <Text style={s.itemFr}> / {fr}</Text> : null}
      </Text>
      <Text style={s.finTotalAmt}>{amount}</Text>
    </View>
  );
}

/** The cover's gallery: one hero over up to three smaller frames. */
function Gallery({ photos }: { photos: string[] }) {
  if (photos.length === 0) return null;
  const [hero, ...rest] = photos;
  const thumbs = rest.slice(0, 3);
  return (
    <View style={s.gallery}>
      <Image src={hero} style={s.hero} />
      {thumbs.length > 0 ? (
        <View style={s.thumbRow}>
          {thumbs.map((p, i) => (
            <Image key={i} src={p} style={s.thumb} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function ContratLocationSaisonniere({ data }: { data: ContratData }) {
  const a = data.agency;
  const t = data.tenant;
  return (
    <Document
      title={`Contrat de location saisonnière — ${data.reference}`}
      author={a.legalName}
    >
      {/* Page 1 — the cover */}
      <Page size="A4" style={h.page}>
        <Masthead
          titleEn="Seasonal Rental Agreement"
          titleFr="Contrat de location Saisonnière"
          reference={data.reference}
        />

        <View style={{ marginTop: 20 }}>
          <Gallery photos={data.property.photos} />

          <View style={s.coverCard}>
            <View>
              <Cap en="Property" fr="Bien loué" />
              <Text style={h.name}>{data.property.name}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Cap en="Tenant" fr="Locataire" />
              <Text style={[h.name, { textAlign: "right" }]}>{t.name}</Text>
            </View>
          </View>
        </View>

        <Footer a={a} />
      </Page>

      {/* Page 2 — the parties and the property */}
      <Page size="A4" style={h.page}>
        <Prose clause={data.clauses.preamble} />

        <View style={h.section}>
          <Section first en="1 - Parties" />
        </View>

        <SubHeading en="1.1 The Agent" fr="Le Mandataire" />
        <View style={{ marginTop: PAIR_GAP }}>
          <Prose clause={data.clauses.agent} />
        </View>

        <SubHeading en="1.2 The Tenant" fr="Le Locataire" />
        <View style={[h.card, { marginTop: PAIR_GAP }]} wrap={false}>
          <Cap en="Full name" fr="Nom complet" />
          <Text style={h.name}>{t.name}</Text>
          <View style={{ marginTop: GAP }}>
            {t.details.map((d, i) => (
              <InfoRow key={i} label={d.label} value={d.value} />
            ))}
          </View>
        </View>

        <Section en="2 - The Property" fr="Le bien" />
        <SubHeading en="2.1 Property informations" fr="Informations du bien" />
        <View style={[h.card, { marginTop: PAIR_GAP }]} wrap={false}>
          <View style={{ flexDirection: "row", gap: GAP }}>
            <View style={{ flexShrink: 1 }}>
              <Cap en="Type & reference" fr="Type & référence" />
              <Text style={h.name}>{data.property.name}</Text>
            </View>
            <View style={{ flex: 1, alignItems: "flex-end", justifyContent: "center" }}>
              <Cap en="Property address" fr="Adresse de la propriété" />
              <Text style={[h.infoValue, { marginTop: LABEL_GAP, textAlign: "right" }]}>
                {data.property.address}
              </Text>
            </View>
          </View>
          <View style={{ marginTop: GAP }}>
            {data.property.details.map((d, i) => (
              <InfoRow key={i} label={d.label} value={d.value} />
            ))}
          </View>
        </View>

        <Footer a={a} />
      </Page>

      {/* Page 3 — the property described */}
      <Page size="A4" style={h.page}>
        <SubHeading en="2.2 Property description" fr="Description du bien" />
        <View style={{ marginTop: PAIR_GAP }}>
          <Description description={data.property.description} />
        </View>

        <SubHeading en="2.3 Use of the property" fr="Destination des lieux" />
        <View style={{ marginTop: PAIR_GAP }}>
          <Prose clause={data.clauses.use} />
        </View>

        <SubHeading en="2.4 Standard of equipment" fr="Standing de l'équipement" />
        <View style={{ marginTop: PAIR_GAP }}>
          <Prose clause={data.clauses.equipment} />
        </View>

        <SubHeading en="2.5 Photographs" fr="Photographies" />
        <View style={{ marginTop: PAIR_GAP }}>
          <Prose clause={data.clauses.photographs} />
        </View>

        <Footer a={a} />
      </Page>

      {/* Page 4 — how the property was presented, and the terms */}
      <Page size="A4" style={h.page}>
        <Section first en="3 - Property presentation" fr="Présentation du bien" />
        <Prose clause={data.clauses.presentation} />

        <View style={[h.card, { marginTop: GAP }]} wrap={false}>
          <Cap
            en="The tenant acknowledges that the property has been"
            fr="Le locataire reconnaît que le bien a été"
          />
          {/* Left unticked: which mode applied is settled on paper at
              signature, and the app records nothing about it. */}
          <View style={{ marginTop: GAP, gap: LABEL_GAP }}>
            <Tick
              en="Visited in person by the Tenant"
              fr="Visité en personne par le Locataire"
            />
            <Tick
              en="Visited by a third party on behalf of the Tenant"
              fr="Visité par un tiers agissant pour le compte du Locataire"
            />
            <Tick
              en="Presented remotely (including through the marketing materials and photographs)"
              fr="Présenté à distance (notamment via les supports de commercialisation et photographies)"
            />
          </View>
        </View>

        <Section en="4 - Rental terms" fr="Conditions de location" />
        <SubHeading en="4.1 Duration" fr="Durée" />
        <View style={[h.card, { marginTop: PAIR_GAP }]} wrap={false}>
          <Cap en="Rental period" fr="Période de location" />
          <View style={{ marginTop: PAIR_GAP }}>
            <View style={{ flexDirection: "row", gap: GAP }}>
              <InfoRow label={{ en: "From", fr: "Du" }} value={data.stay.checkIn} />
              <InfoRow
                label={{ en: "Check-in from", fr: "À partir de" }}
                value={data.stay.checkInTime}
              />
            </View>
            <View style={{ flexDirection: "row", gap: GAP }}>
              <InfoRow label={{ en: "To", fr: "Au" }} value={data.stay.checkOut} />
              <InfoRow
                label={{ en: "Check-out no later than", fr: "Départ au plus tard à" }}
                value={data.stay.checkOutTime}
              />
            </View>
            <InfoRow
              label={{ en: "Number of nights", fr: "Nuitées" }}
              value={data.stay.nights}
            />
            <InfoRow
              label={{ en: "Number of guests", fr: "Nombre d'occupants" }}
              value={data.stay.guests}
            />
          </View>
        </View>

        <SubHeading en="4.2 Rent" fr="Loyer" />
        <View style={[h.card, { marginTop: PAIR_GAP }]} wrap={false}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Cap en="Total rent price" fr="Prix total du séjour" />
            <Text style={h.infoValue}>{data.money.rent}</Text>
          </View>
          <View style={{ marginTop: GAP }}>
            <Prose clause={data.clauses.rent} />
          </View>
        </View>

        {data.money.deposit ? (
          <Instalment
            capEn="Deposit (upon signing)"
            capFr={`Acompte à la signature${data.money.depositPercent ? ` — (${data.money.depositPercent})` : ""}`}
            amount={data.money.deposit}
            dueEn="Due upon signature of this agreement and no later than"
            dueFr="Dû à la signature du présent contrat, soit au plus tard le"
            dueDate={data.money.depositDue ?? "—"}
          />
        ) : null}
        <Instalment
          capEn="Balance"
          capFr={`Solde${data.money.balancePercent ? ` — (${data.money.balancePercent})` : ""}`}
          amount={data.money.balance}
          dueEn="Payable no later than 60 days before the arrival date, i.e. no later than"
          dueFr="Payable au plus tard 60 jours avant la date d'arrivée, soit au plus tard le"
          dueDate={data.money.balanceDue}
        />

        <SubHeading en="4.3 Charges" />
        <View style={[h.row, { marginTop: PAIR_GAP }]} wrap={false}>
          {/* Only when the property actually lists them; a heading over an
              empty card reads as an omission rather than "nothing included". */}
          {data.property.includedCharges.length > 0 ? (
            <View style={[h.card, { flex: 1 }]}>
              <Cap en="Included charges" fr="Charges incluses" />
              <View style={{ marginTop: LABEL_GAP, gap: PAIR_GAP }}>
                {data.property.includedCharges.map((c, i) => (
                  <Text key={i} style={h.paraEn}>
                    {c}
                  </Text>
                ))}
              </View>
            </View>
          ) : null}
          <View style={[h.card, { flex: 1 }]}>
            <Cap en="Excluded charges" fr="Charges non incluses" italicFr={false} />
            <View style={{ marginTop: LABEL_GAP, gap: PAIR_GAP }}>
              {(data.clauses.chargesExcluded?.en ?? []).map((item, i) => (
                <Text key={i} style={h.paraEn}>
                  {item}
                  {data.clauses.chargesExcluded?.fr[i] ? (
                    <Text style={s.itemFr}>
                      {" "}
                      / {data.clauses.chargesExcluded.fr[i]}
                    </Text>
                  ) : null}
                </Text>
              ))}
            </View>
          </View>
        </View>
        <View style={{ marginTop: GAP }}>
          <Prose clause={data.clauses.chargesNote} />
        </View>

        {/* Always printed: every rental carries a security deposit, so a
            missing one is a defect to surface, not a variant to hide. */}
        <SubHeading en="4.4 Security deposit" fr="Dépôt de garantie" />
        <Instalment
          capEn="Security deposit"
          capFr="Dépôt de garantie"
          amount={data.money.securityDeposit}
          dueEn="Payable no later than thirty (30) days before the arrival date, i.e. no later than"
          dueFr="À verser au plus tard trente (30) jours avant la date d'arrivée, soit au plus tard le"
          dueDate={data.money.securityDepositDue}
        />
        <View style={{ marginTop: GAP }}>
          <Prose clause={data.clauses.securityDeposit} />
        </View>

        <SubHeading en="4.5 Payment terms" fr="Modalités de paiement" />
        <View style={{ marginTop: PAIR_GAP }}>
          <Prose clause={data.clauses.paymentTerms} />
        </View>

        <SubHeading en="Bank details" fr="Informations bancaires" />
        <View style={{ marginTop: PAIR_GAP }}>
          <Prose clause={data.clauses.bankDetails} />
        </View>
        <View style={[h.card, { marginTop: GAP }]} wrap={false}>
          <Cap en="Transfer details" fr="Détails de virement" />
          <View style={{ marginTop: PAIR_GAP }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: GAP }}>
              <InfoRow label={{ en: "Bank", fr: "Banque" }} value={a.bankName} />
              <InfoRow
                label={{ en: "Account name", fr: "Nom du bénéficiaire" }}
                value={a.bankAccountName}
              />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: GAP }}>
              <InfoRow label={{ en: "IBAN" }} value={a.bankIban} />
              <InfoRow label={{ en: "BIC" }} value={a.bankBic} />
            </View>
          </View>
        </View>

        <SubHeading en="Important security notice" fr="Avis de sécurité important" />
        <View style={{ marginTop: PAIR_GAP }}>
          <Prose clause={data.clauses.securityNotice} />
        </View>

        <SubHeading en="Bank fees" fr="Frais bancaires" />
        <View style={{ marginTop: PAIR_GAP }}>
          <Prose clause={data.clauses.bankFees} />
        </View>

        <SubHeading en="4.6 Financial summary" fr="Récapitulatif financier" />
        <View style={{ marginTop: PAIR_GAP }}>
          <Prose clause={data.clauses.financialSummary} />
        </View>

        <SubHeading en="Stay amount" fr="Montant du séjour" />
        <View style={{ marginTop: PAIR_GAP }} wrap={false}>
          <MoneyRow en="Rent" fr="Loyer" amount={data.money.rent} />
          {data.money.vat ? (
            <MoneyRow
              en="of which VAT 10 %"
              fr="dont TVA 10 % (parahôtellerie)"
              amount={data.money.vat}
            />
          ) : null}
          {/* Billed extras carry the asterisk the footnote explains. */}
          {data.money.services.map((sv, i) => (
            <MoneyRow key={i} en={sv.label} note="*" amount={sv.amount} />
          ))}
          <MoneyRow
            en="Tourist tax"
            fr="Taxe de séjour"
            {...(data.money.touristTaxBasis
              ? { note: `(${data.money.touristTaxBasis})` }
              : {})}
            amount={data.money.touristTax}
          />
          <MoneyTotal
            en="Total stay amount (excluding security deposit)"
            fr="Total (sans caution)"
            amount={data.money.total}
          />
        </View>
        {data.money.services.length > 0 ? (
          <Text style={[s.para, { marginTop: PAIR_GAP }]}>
            * Additional cost{" "}
            <Text style={s.itemFr}>/ Frais complémentaire</Text>
          </Text>
        ) : null}

        <SubHeading
          en="Security deposit amount"
          fr="Montant du dépôt de garantie"
        />
        <View style={{ marginTop: PAIR_GAP }} wrap={false}>
          <MoneyRow
            en="Security deposit"
            fr="Dépôt de garantie"
            amount={data.money.securityDeposit}
          />
          <MoneyTotal en="Total" amount={data.money.securityDeposit} />
        </View>

        <SubHeading en="Operation summary" fr="Résumé des opérations" />
        <View style={{ marginTop: PAIR_GAP }} wrap={false}>
          {data.money.deposit ? (
            <MoneyRow
              en="Deposit"
              fr={`Acompte${data.money.depositPercent ? ` (${data.money.depositPercent})` : ""}`}
              amount={data.money.deposit}
            />
          ) : null}
          <MoneyRow
            en="Balance"
            fr={`Solde${data.money.balancePercent ? ` (${data.money.balancePercent})` : ""}`}
            amount={data.money.balance}
          />
          <MoneyRow
            en="Security deposit"
            fr="Dépôt de garantie"
            amount={data.money.securityDeposit}
          />
        </View>

        <Section en="5 - General conditions" fr="Conditions générales" />
        <SubHeading en="5.1 Use of the property" fr="Usage du bien" />
        <View style={{ marginTop: PAIR_GAP }}>
          <Prose clause={data.clauses.generalUse} />
        </View>

        <SubHeading en="5.2 Occupancy" fr="Occupation" />
        <View style={{ marginTop: PAIR_GAP }}>
          <Prose clause={data.clauses.occupancy} />
        </View>

        <SubHeading en="5.3 Condition of the property" fr="État du bien" />
        <View style={{ marginTop: PAIR_GAP }}>
          <Prose clause={data.clauses.condition} />
        </View>

        <SubHeading en="5.4 Keys and access" fr="Clés et accès" />
        <View style={{ marginTop: PAIR_GAP }}>
          <Prose clause={data.clauses.keysAccess} />
        </View>

        <SubHeading en="5.5 Liability" fr="Responsabilité" />
        <View style={{ marginTop: PAIR_GAP }}>
          <Prose clause={data.clauses.liability} />
        </View>

        <SubHeading en="5.6 Additional services" fr="Prestations complémentaires" />
        <View style={{ marginTop: PAIR_GAP }}>
          <Prose clause={data.clauses.additionalServices} />
        </View>

        <SubHeading
          en="5.7 Non-circumvention and purchase"
          fr="Non-contournement et acquisition"
        />
        <View style={{ marginTop: PAIR_GAP }}>
          <Prose clause={data.clauses.nonCircumvention} />
        </View>

        <Section en="6 - Cancellation conditions" fr="Conditions d'annulation" />
        <SubHeading en="6.1 Cancellation by the Tenant" fr="Annulation par le locataire" />
        <View style={{ marginTop: PAIR_GAP }}>
          <Prose clause={data.clauses.cancellationTenant} />
        </View>

        <SubHeading en="6.2 Cancellation by the Owner" fr="Annulation par le propriétaire" />
        <View style={{ marginTop: PAIR_GAP }}>
          <Prose clause={data.clauses.cancellationOwner} />
        </View>

        <SubHeading en="6.3 Force majeure" />
        <View style={{ marginTop: PAIR_GAP }}>
          <Prose clause={data.clauses.forceMajeure} />
        </View>

        <Section en="7 - Legal provisions" fr="Dispositions juridiques" />
        <SubHeading en="7.1 Data protection" fr="Données personnelles" />
        <View style={{ marginTop: PAIR_GAP }}>
          <Prose clause={data.clauses.dataProtection} />
        </View>

        <SubHeading en="7.2 Non-discrimination" />
        <View style={{ marginTop: PAIR_GAP }}>
          <Prose clause={data.clauses.nonDiscrimination} />
        </View>

        <SubHeading en="7.3 Validity" fr="Validité partielle" />
        <View style={{ marginTop: PAIR_GAP }}>
          <Prose clause={data.clauses.validity} />
        </View>

        <Footer a={a} />
      </Page>

      {/* Governing law and the signatures that close the agreement. */}
      <Page size="A4" style={h.page}>
        <Section
          first
          en="8 - Governing law & jurisdiction"
          fr="Droit applicable et juridiction"
        />
        <Prose clause={data.clauses.governingLaw} />

        <Section en="9 - Signatures" />
        <Prose clause={data.clauses.signatures} />

        <Text style={[s.para, { marginTop: GAP }]}>
          Fait à {data.place}, le {data.date}.
        </Text>

        <View style={s.signRow} wrap={false}>
          <View style={{ flex: 1 }}>
            <View style={s.signBox} />
            <View style={s.signMeta}>
              <Cap en="The Tenant" fr="le Locataire" />
              <Text style={s.signName}>{t.name}</Text>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <View style={s.signBox} />
            <View style={s.signMeta}>
              <Cap en="The Agent" fr="le Mandataire" />
              <Text style={s.signName}>{a.name}</Text>
              <View style={{ marginTop: LABEL_GAP }}>
                <Cap en="Represented by" fr="Représenté par" />
              </View>
              <Text style={[h.infoValue, { marginTop: PAIR_GAP }]}>
                {a.representedBy}, {a.capacity}
              </Text>
            </View>
          </View>
        </View>

        <Footer a={a} />
      </Page>
    </Document>
  );
}
