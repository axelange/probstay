import type { Bilingual } from "@/features/documents/concierge-packages";

/**
 * The quarterly instalments of a concierge agreement, on calendar quarters.
 *
 * Fees are invoiced quarterly in advance, and the quarters are the calendar's
 * — not twelve months counted from the signature. An agreement starting in
 * November therefore opens on a two-month instalment, because that is all of
 * the fourth quarter it uses, and the twelve-month term ends part-way through
 * a quarter a year later, which closes it with a short one.
 *
 * The alternative — four equal instalments from the start date — would be
 * simpler and wrong: it would bill December's quarter in November, and the
 * agency's own invoicing follows the calendar.
 */

export type Instalment = {
  /** "Q4 2026", the quarter it covers. */
  quarter: Bilingual;
  /**
   * How much of that quarter the term uses, in months — fractional when the
   * agreement starts or ends part-way through one.
   *
   * Kept for the arithmetic and not for the page: "1.53 months" means nothing
   * to a reader. The dates below are what the instalment prints.
   */
  months: number;
  /** The first and last day the instalment covers. */
  from: Date;
  to: Date;
  /**
   * The day the instalment is invoiced: the day its quarter opens, or the
   * start date for the first one, since the fee is charged in advance.
   *
   * Not the day it falls due. Article 7.4 allows fifteen days from issue, so
   * the two differ by a fortnight, and the field was called `due` while the
   * page printed "dû le" — the contract then contradicted its own payment
   * terms. Named for what it is so the page cannot misread it again.
   */
  invoicedOn: Date;
  /** months × the monthly fee. */
  amount: number;
};

const QUARTER_LABEL: Bilingual[] = [
  { en: "Q1", fr: "1er trimestre" },
  { en: "Q2", fr: "2e trimestre" },
  { en: "Q3", fr: "3e trimestre" },
  { en: "Q4", fr: "4e trimestre" },
];

const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

/**
 * @param start  the day the agreement takes effect
 * @param monthly  the agreed fee, per month, excluding VAT
 * @param termMonths  the initial term — 12, per the duration article
 */
export function quarterlyInstalments(
  start: Date,
  monthly: number,
  termMonths = 12,
): Instalment[] {
  // The term runs from the start date to the day before its anniversary: 15
  // November 2026 to 14 November 2027 is twelve months, not thirteen.
  const end = new Date(
    start.getFullYear(),
    start.getMonth() + termMonths,
    start.getDate() - 1,
  );

  // Each calendar month the term touches, and how much of it the term uses.
  // Article 7.1 says the first quarter is invoiced pro rata, and an agreement
  // signed on the 15th uses half of that month — counting it whole would bill
  // a fortnight nobody is owed, on the very first invoice.
  const months: {
    year: number;
    month: number;
    fraction: number;
    firstDay: Date;
    lastDay: Date;
  }[] = [];
  for (
    let d = new Date(start.getFullYear(), start.getMonth(), 1);
    d <= end;
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1)
  ) {
    const y = d.getFullYear();
    const m = d.getMonth();
    const total = daysInMonth(y, m);
    const from =
      y === start.getFullYear() && m === start.getMonth() ? start.getDate() : 1;
    const to =
      y === end.getFullYear() && m === end.getMonth() ? end.getDate() : total;
    months.push({
      year: y,
      month: m,
      fraction: (to - from + 1) / total,
      firstDay: new Date(y, m, from),
      lastDay: new Date(y, m, to),
    });
  }

  const out: Instalment[] = [];
  for (const { year, month, fraction, firstDay, lastDay } of months) {
    const q = Math.floor(month / 3);
    const last = out[out.length - 1];
    if (
      last &&
      last.invoicedOn.getFullYear() === year &&
      Math.floor(last.invoicedOn.getMonth() / 3) === q
    ) {
      last.months += fraction;
      last.amount += monthly * fraction;
      last.to = lastDay;
      continue;
    }

    // The first instalment is invoiced on the start date itself; every later
    // one on the day its quarter opens.
    const quarterOpens = new Date(year, q * 3, 1);
    out.push({
      quarter: {
        en: `${QUARTER_LABEL[q].en} ${year}`,
        fr: `${QUARTER_LABEL[q].fr} ${year}`,
      },
      months: fraction,
      from: firstDay,
      to: lastDay,
      invoicedOn:
        out.length === 0 && start > quarterOpens ? start : quarterOpens,
      amount: monthly * fraction,
    });
  }

  // Four instalments, never five.
  //
  // A term starting mid-quarter spans five calendar quarters, the last of them
  // a stub of a few weeks. Printing it turned a schedule of what will be
  // invoiced into an arithmetic proof that the term is twelve months — and the
  // stub is not an invoice the Owner will recognise, since by then the
  // agreement has either been renewed or ended. The schedule shows the next
  // four quarters; the term itself is stated in article 8.1.
  return (
    out
      .slice(0, 4)
      // Rounded last, not along the way: adding rounded parts would leave each
      // instalment a few centimes adrift of the months it actually covers.
      .map((i) => ({ ...i, amount: Math.round(i.amount * 100) / 100 }))
  );
}

/**
 * Reads a fee as an agent types it.
 *
 * "1450", "1 450", "1 450,00", "1450.50 €" and "1 450,00 € HT" all mean the
 * same number. Returns null rather than 0 for anything it cannot read, so the
 * schedule is absent instead of showing a contract worth nothing.
 */
export function parseAmount(input: string): number | null {
  const cleaned = input
    .replace(/[\s  ]/g, "")
    .replace(/[^\d,.-]/g, "")
    // A comma is the decimal separator here; a dot may be either, and is only
    // a thousands separator when more than two digits follow it.
    .replace(/\.(?=\d{3}\b)/g, "")
    .replace(",", ".");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const MONEY = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * "1 450,00 €", the form the other documents print money in.
 *
 * The replace is not cosmetic. fr-FR groups thousands with U+202F, a narrow
 * no-break space, and separates the currency with U+00A0 — and Archivo has no
 * glyph for U+202F, checked against the font. react-pdf then draws its
 * fallback, which on the page looks like a slash: "2/900,00 €".
 *
 * Both the invoice builder and the rental contract already do this, and said
 * why. This one did not, which is how a figure nobody could read reached a
 * contract — the house practice existed and was not followed.
 */
export function euros(n: number): string {
  return MONEY.format(n).replace(/[\u202f\u00a0]/g, " ");
}

/**
 * Strips the spaces the document faces cannot draw from a typed value.
 *
 * The fee is parsed into a number and reformatted, so it cannot carry them.
 * The fund amount and threshold are not — they print as typed, and a figure
 * pasted from a spreadsheet or a web page brings U+202F with it. The same
 * slash would then appear on a line nobody had formatted.
 */
export function pdfSafe(input: string): string {
  return input.replace(/[\u202f\u00a0]/g, " ");
}
