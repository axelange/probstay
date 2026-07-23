import * as React from "react";

// Two decimals always — the agency works to the cent.
const MONEY = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * An amount with its centimes rendered smaller than the euros, e.g.
 * "10 300,50 €" with the ",50" in a reduced size. "—" when null, matching
 * formatAmount, so an enquiry with no agreed price reads the same.
 */
export function Money({ value }: { value: number | null }) {
  if (value === null) return <>—</>;
  return (
    <>
      {MONEY.formatToParts(value).map((part, i) =>
        part.type === "decimal" || part.type === "fraction" ? (
          <span key={i} className="text-[0.72em] opacity-80">
            {part.value}
          </span>
        ) : (
          <React.Fragment key={i}>{part.value}</React.Fragment>
        )
      )}
    </>
  );
}
