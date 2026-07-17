/**
 * APIMO returns classifications as numeric codes against its own
 * referentiel (see api3.apimo.com/fr/api/referentiel/...). The sync
 * stores the codes verbatim; labels are resolved here.
 *
 * UNVERIFIED. These mappings are inferred from the synced data, not read
 * from APIMO's referentiel, so an unknown code renders as the raw value
 * rather than a confident guess — mislabelling a price period would be
 * worse than showing nothing.
 *
 * The durable fix is to sync the referentiel into its own table and look
 * up from there, so new codes can't silently appear as "—".
 */

/** `type`: only 1 and 2 occur across the 52 synced properties. */
const PROPERTY_TYPES: Record<number, string> = {
  1: "Appartement",
  2: "Maison",
};

/** `pricePeriod`: only 2 and 4 occur. */
const PRICE_PERIODS: Record<number, string> = {
  2: "semaine",
  4: "mois",
};

export function propertyTypeLabel(type: number | null): string | null {
  if (type === null) return null;
  return PROPERTY_TYPES[type] ?? `Type ${type}`;
}

export function pricePeriodLabel(period: number | null): string | null {
  if (period === null) return null;
  return PRICE_PERIODS[period] ?? null;
}

/**
 * A price is meaningless without its period — "109 999 €" reads very
 * differently per night than per month. When the period is unknown the
 * suffix is omitted rather than assumed.
 */
export function formatPrice(
  value: number | null,
  currency: string | null,
  period: number | null
): string {
  if (value === null) return "—";

  const amount = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency ?? "EUR",
    maximumFractionDigits: 0,
  }).format(value);

  const suffix = pricePeriodLabel(period);
  return suffix ? `${amount} / ${suffix}` : amount;
}

export function formatArea(area: number | null): string {
  if (area === null) return "—";
  return `${new Intl.NumberFormat("fr-FR").format(area)} m²`;
}
