import * as React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

import { BstayLogo } from "@/features/documents/templates/logo";
import {
  type AgencyIdentity,
  Cap,
  Footer,
  ink,
  rule,
  grey,
  h,
  BLOCK,
  GAP,
  LABEL_GAP,
  LH,
  BODY,
  TITLE,
} from "@/features/documents/templates/house-style";

/**
 * The agency's billing documents: "Invoice / Facture" and "Fund call / Appel
 * de fonds".
 *
 * Drawn on the same house system as the contract and the confirmation, so a
 * document arriving in the same inbox is recognisably from the same agency:
 * the vertical lockup, the gold hairlines, the grey caps labels, the two type
 * families and the fixed legal footer all come from `house-style`.
 *
 * Where it parts company is the frame. The contract sets its data on flat grey
 * cards; a billing document has fewer things to say and says them better plain,
 * so almost nothing here is boxed — labels and whitespace carry the structure,
 * and the only rules are the ones that mean something: the masthead, the table
 * head, the line above the amount due. The single exception is the bank block,
 * framed because a client copying an IBAN needs to see where the details they
 * must transcribe begin and end.
 *
 * Every value arrives already formatted. The component decides where a figure
 * sits, never what it says — the same rule the other two templates follow, and
 * what lets the totals on the paper be the stored ones rather than a second
 * computation that could disagree with the screen.
 */

export type InvoiceDocumentData = {
  /**
   * Which document this is. A fund call is not an invoice and must not print
   * the word: it asks for money the agency holds for someone else — a deposit,
   * a balance, a caution — which is not its revenue. It also carries no VAT,
   * for the same reason.
   */
  family: "FEE" | "FUND_CALL";
  /**
   * The document's own heading, when it has one — "Balance Payment Request"
   * over "Demande de paiement du solde". Absent falls back to the family's
   * generic title.
   */
  titleEn?: string;
  titleFr?: string;
  reference: string;
  /** What the invoice is for, in one line, under the subject. */
  description?: string;
  issuedOn: string;
  dueOn?: string;
  agency: AgencyIdentity & { legalName: string };
  client: { name: string; address?: string };
  lines: {
    label: string;
    /** Optional second line under the title, printed smaller. */
    description?: string;
    quantity: string;
    unitPrice: string;
    amount: string;
  }[];
  totals: {
    ht: string;
    /** "TVA 20 %" — the rate as this invoice was issued under it. */
    vatLabel: string;
    vat: string;
    ttc: string;
  };
  /** Whether the VAT line is printed at all — never on a fund call. */
  showVat: boolean;
  payment: {
    bankName: string;
    accountName: string;
    iban: string;
    bic: string;
  };
  notes?: string;
};

/**
 * The masthead's meta pairs. Label and value are set alike — same face, same
 * size, same caps and letterspacing — so each line reads as one thing rather
 * than a caption followed by a quotation. Only the colour separates them: the
 * label grey, the value black.
 */
const META_SIZE = 8;
const META_TRACKING = 0.8;

/**
 * The horizontal lockup, small: the mark anchors the corner, it does not
 * announce the document — the title does that, centred below. Its height is
 * derived from its own 170.17 × 47.02 frame rather than typed, so the two can
 * never fall out of proportion, and the art meets the left margin flush
 * instead of being centred inside a box that does not fit it.
 */
const LOGO_WIDTH = 110;
const LOGO_RATIO = 338.41 / 100.86;

// Column widths across the 495 pt content column. The designation takes what
// the three numeric columns leave, and those are sized for the widest figure
// each will hold — a six-figure amount at ten point.
const COL_QTY = 55;
const COL_UNIT = 95;
const COL_AMOUNT = 95;

const s = StyleSheet.create({
  // Masthead: the mark in one corner, the two facts that identify the
  // document in the other, a rule under both, and the title beneath it with
  // the width of the page to itself — which is what a long heading needs.
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  topMeta: { alignItems: "flex-end", gap: LABEL_GAP, flexShrink: 0 },
  // Centred between two rules, and given room to breathe between them. The
  // padding below is half the gap because the rule that follows carries the
  // other half in its own margin — the two sides end up equal at BLOCK.
  titleBlock: {
    alignItems: "center",
    marginTop: BLOCK,
    paddingBottom: BLOCK - GAP,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "flex-end",
    gap: LABEL_GAP,
  },
  metaValue: {
    fontSize: META_SIZE,
    color: ink,
    letterSpacing: META_TRACKING,
    textTransform: "uppercase",
    lineHeight: LH,
  },
  titleEn: {
    fontFamily: TITLE,
    fontWeight: 200,
    fontSize: 29,
    color: ink,
    lineHeight: LH,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  titleFr: { fontFamily: TITLE, fontWeight: 200, fontSize: 15, color: ink, lineHeight: LH },
  rule: { height: 0.5, backgroundColor: rule, marginTop: GAP },

  // Head — the two identities, side by side under the masthead. No cards: the
  // grey grounds were doing the work a column and a label already do, and a
  // billing document reads better plain. Whitespace separates, nothing frames.
  parties: { flexDirection: "row", gap: BLOCK, marginTop: BLOCK },
  party: { flex: 1 },
  partyRight: { alignItems: "flex-end" },
  partyName: { fontFamily: BODY, fontWeight: 500, fontSize: 12, color: ink, lineHeight: LH },
  partyLine: { fontSize: 9, color: ink, lineHeight: LH, marginTop: 3 },

  // A full block gap above the subject: the grey grounds used to hold the
  // identities apart from it, and without them the two run together.
  dateVal: { fontSize: 10, color: ink, lineHeight: LH, marginTop: 3 },
  // The subject has the page to itself, edge to edge. Nothing shares its row,
  // so a written object runs the full measure before it wraps.
  subject: { marginTop: BLOCK },
  subjectDetail: { fontSize: 9, color: grey, lineHeight: LH, marginTop: 2 },
  lineDetail: { fontSize: 8.5, color: grey, lineHeight: LH, marginTop: 2 },

  // Line table. The head carries the block gap the section marker used to
  // provide, and its gold rule is the only line above the list.
  thead: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: rule,
    paddingBottom: 5,
    marginTop: BLOCK,
  },
  th: {
    fontSize: 8,
    color: grey,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    lineHeight: LH,
  },
  tr: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e6e6e6",
  },
  td: { fontSize: 10, color: ink, lineHeight: LH },
  right: { textAlign: "right" },
  colLabel: { flex: 1, paddingRight: GAP },
  colQty: { width: COL_QTY },
  colUnit: { width: COL_UNIT },
  colAmount: { width: COL_AMOUNT },

  // Payment and totals share one row under the table: the totals need 240 pt
  // of the 495 pt column and the left half would otherwise sit empty, which is
  // what pushed a three-line invoice onto a second page. Reading "amount due"
  // beside "how to pay it" is also the order the reader wants them in.
  settle: { flexDirection: "row", gap: GAP, marginTop: BLOCK },
  // No padding of its own: the two columns align on their top edges, and the
  // box's inset is what a padded frame is supposed to look like beside an
  // unboxed one.
  totalsBox: { width: 240 },
  // The one framed block on the page. A hairline and a light ground, not the
  // grey cards the contract uses: enough to bound the digits a client has to
  // copy without turning into a panel. Its top aligns with the totals beside
  // it, so the two read as one row rather than two stacked afterthoughts.
  payBox: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: "#e6e6e6",
    backgroundColor: "#fafaf8",
    paddingVertical: GAP,
    paddingHorizontal: GAP,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  totalLabel: { fontSize: 10, color: grey, lineHeight: LH },
  totalValue: { fontSize: 10, color: ink, lineHeight: LH },
  grandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: rule,
    marginTop: 5,
    paddingTop: 6,
  },
  grandLabel: {
    fontFamily: BODY,
    fontSize: 10,
    fontWeight: 500,
    color: ink,
    lineHeight: LH,
  },
  // Medium, like every other figure on the invoice. There is one face left on
  // the document, so emphasis is weight: the one number a client checks first
  // should read as a number, and half a step above the copy is enough to find
  // it without setting it in the title face.
  grandValue: {
    fontFamily: BODY,
    fontWeight: 500,
    fontSize: 14,
    color: ink,
    lineHeight: LH,
  },

  // Payment details and free notes.
  payLine: { fontSize: 10, color: ink, lineHeight: LH, marginTop: 3 },
  iban: { fontSize: 10, color: ink, lineHeight: LH, letterSpacing: 0.5 },
  notesBlock: { marginTop: BLOCK },
  notes: { fontSize: 9, color: grey, lineHeight: LH, marginTop: 3 },
});

/**
 * A label and its value on one line, running to the right margin, set in the
 * same face at the same size — see META_SIZE.
 */
function Meta({ en, fr, value }: { en: string; fr: string; value: string }) {
  return (
    <View style={s.metaRow}>
      <Cap en={en} fr={fr} />
      <Text style={s.metaValue}>{value}</Text>
    </View>
  );
}

/**
 * One of the two identities, unlabelled.
 *
 * Which is which is said by the side of the page it sits on — issuer left,
 * recipient right — and by what it holds: an agency's legal mentions on one
 * side, a name and an address on the other. "From" and "Billed to" were
 * captioning something no reader was going to mistake.
 */
function Party({
  name,
  lines,
  align = "left",
}: {
  name: string;
  lines: string[];
  align?: "left" | "right";
}) {
  const right = align === "right";

  return (
    // `alignItems` places each line against the edge; `textAlign` decides
    // where a line that wraps breaks to. Both are needed for a long address to
    // stay squared against its side.
    <View style={right ? [s.party, s.partyRight] : s.party}>
      <Text style={right ? [s.partyName, s.right] : s.partyName}>{name}</Text>
      {lines.map((line, index) => (
        <Text key={index} style={right ? [s.partyLine, s.right] : s.partyLine}>
          {line}
        </Text>
      ))}
    </View>
  );
}

export function Facture({ data }: { data: InvoiceDocumentData }) {
  const a = data.agency;

  return (
    <Document
      title={data.reference}
      author={a.legalName}
      subject={`${data.family === "FUND_CALL" ? "Demande de paiement" : "Facture"} ${data.reference}`}
    >
      <Page size="A4" style={h.page}>
        {/* The mark and the facts that identify the document, on the same line
            and at opposite ends: when it was issued, what it is numbered, and
            when it falls due. The deadline joins them because it is one of the
            things a client looks for before reading anything else, and the
            corner is where this document puts what is looked up. */}
        <View style={s.top}>
          <BstayLogo width={LOGO_WIDTH} height={LOGO_WIDTH / LOGO_RATIO} />

          <View style={s.topMeta}>
            <Meta en="Issue date" fr="Date d'émission" value={data.issuedOn} />
            {/* The number is labelled by what it numbers, rather than by the
                word "reference": a client filing this reads "Facture n°".
                Shortened to "No." when the document carries its own heading —
                the title beside it has already said what this numbers, and
                repeating it would crowd the title off its line. */}
            <Meta
              en={
                data.titleEn
                  ? "No."
                  : data.family === "FUND_CALL"
                    ? "Payment request no."
                    : "Invoice no."
              }
              fr={
                data.titleFr
                  ? "N°"
                  : data.family === "FUND_CALL"
                    ? "Demande de paiement n°"
                    : "Facture n°"
              }
              value={data.reference}
            />
            {/* Absent on a request raised inside the signature window, where
                everything is due at signature and a printed deadline would
                name a day later than the money is actually wanted. */}
            {data.dueOn ? (
              <Meta
                en="Due date"
                fr="Date limite de paiement"
                value={data.dueOn}
              />
            ) : null}
          </View>
        </View>

        <View style={s.rule} />

        {/* The paper asks in its own words: a payment request. The screens
            call the same document an avis de paiement — see the note in
            reference.ts. Neither ever says "facture". */}
        <View style={s.titleBlock}>
          <Text style={s.titleEn}>
            {data.titleEn ??
              (data.family === "FUND_CALL" ? "Payment Request" : "Invoice")}
          </Text>
          <Text style={s.titleFr}>
            {data.titleFr ??
              (data.family === "FUND_CALL"
                ? "Demande de paiement"
                : "Facture")}
          </Text>
        </View>

        <View style={s.rule} />

        {/* Who issues and who is billed, side by side and unlabelled — the
            first thing read on any of these, and the pair a bookkeeper checks
            before anything else. */}
        <View style={s.parties}>
          <Party name={a.legalName} lines={[a.address, a.rcs, a.cartePro]} />
          {/* Never "facturé" on a fund call: the document is not a facture,
              and the word must not appear on it anywhere. */}
          <Party
            name={data.client.name}
            lines={data.client.address ? [data.client.address] : []}
            align="right"
          />
        </View>

        {/* What the document is for, written as written — one sentence on a
            fee invoice, the booking and its dates on a fund call. Each line of
            the subject is printed on its own line; the block disappears when
            nothing has been written yet. */}
        {data.description ? (
          <View style={s.subject}>
            <Cap en="Subject" fr="Objet" />
            {data.description.split("\n").map((line, index) => (
              <Text key={index} style={s.dateVal}>
                {line}
              </Text>
            ))}
          </View>
        ) : null}

        {/* No section marker above the table: the column head already says
            what follows, and saying it twice — once in caps over a rule, once
            in grey caps under it — was two headings for one list. */}
        <View style={s.thead}>
          <Text style={[s.th, s.colLabel]}>Details / Détails</Text>
          <Text style={[s.th, s.colQty, s.right]}>Qté</Text>
          <Text style={[s.th, s.colUnit, s.right]}>
            {data.showVat ? "P.U. HT" : "P.U."}
          </Text>
          <Text style={[s.th, s.colAmount, s.right]}>
            {data.showVat ? "Montant HT" : "Montant"}
          </Text>
        </View>

        {data.lines.map((line, index) => (
          <View key={index} style={s.tr} wrap={false}>
            <View style={s.colLabel}>
              <Text style={s.td}>{line.label}</Text>
              {line.description ? (
                <Text style={s.lineDetail}>{line.description}</Text>
              ) : null}
            </View>
            <Text style={[s.td, s.colQty, s.right]}>{line.quantity}</Text>
            <Text style={[s.td, s.colUnit, s.right]}>{line.unitPrice}</Text>
            <Text style={[s.td, s.colAmount, s.right]}>{line.amount}</Text>
          </View>
        ))}

        <View style={s.settle} wrap={false}>
          <View style={s.payBox}>
            <Cap en="Payment by transfer" fr="Règlement par virement" />
            <Text style={s.payLine}>{data.payment.accountName}</Text>
            <Text style={s.payLine}>{data.payment.bankName}</Text>
            <Text style={s.iban}>IBAN {data.payment.iban}</Text>
            <Text style={s.payLine}>BIC {data.payment.bic}</Text>
          </View>

          <View style={s.totalsBox}>
            {/* A fund call shows one figure: the sum being called. Printing a
                "Total HT" above a VAT line of zero would suggest the document
                is a taxed sale, which is exactly what it is not. */}
            {data.showVat ? (
              <>
                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>Total HT</Text>
                  <Text style={s.totalValue}>{data.totals.ht}</Text>
                </View>
                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>{data.totals.vatLabel}</Text>
                  <Text style={s.totalValue}>{data.totals.vat}</Text>
                </View>
              </>
            ) : null}
            <View style={s.grandRow}>
              <Text style={s.grandLabel}>
                {data.showVat
                  ? "Total TTC / Amount due"
                  : "Montant dû / Amount due"}
              </Text>
              <Text style={s.grandValue}>{data.totals.ttc}</Text>
            </View>
          </View>
        </View>

        {/* A free line, not a section: observations are a sentence, and a
            marker over one sentence was enough to push a three-line invoice
            onto a second page. */}
        {/* Not `wrap={false}`: the mentions a security deposit travels with
            run to a paragraph in each language, and a block that long has to
            be allowed to break across pages rather than jump to the next one
            whole. */}
        {data.notes ? (
          <View style={s.notesBlock}>
            <Cap en="Notes" fr="Observations" />
            {data.notes.split("\n").map((line, index) =>
              line.trim() === "" ? null : (
                <Text key={index} style={s.notes}>
                  {line}
                </Text>
              )
            )}
          </View>
        ) : null}

        <Footer a={a} reference={data.reference} initials={false} pagination={false} />
      </Page>
    </Document>
  );
}
