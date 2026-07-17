/**
 * APIMO returns classifications as numeric codes against its own
 * referentiel (see api3.apimo.com/fr/api/referentiel/...). The sync
 * stores the codes verbatim; labels are resolved here.
 *
 * Only the codes the agency actually uses are mapped, and they were
 * confirmed with the agency rather than inferred — a wrong price period
 * would misprice every listing on the page. Any code outside these maps
 * renders as its raw value rather than a guess.
 *
 * These cover the current data, not the full referentiel: APIMO defines
 * many more codes, and a new one would show as a raw value. The durable
 * fix is to sync the referentiel into its own table and look up from
 * there.
 */

/** Confirmed with the agency. Only 1 and 2 occur in the synced data. */
const PROPERTY_TYPES: Record<number, string> = {
  1: "Appartement",
  2: "Maison",
};

/** Confirmed with the agency. Only 2 and 4 occur in the synced data. */
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
 *
 * A null value is not missing data. APIMO renders those as "price on
 * demand" and the agency means it, so it's said plainly rather than
 * shown as an em dash, which reads like the app failed to load
 * something.
 */
export function formatPrice(
  value: number | null,
  currency: string | null,
  period: number | null
): string {
  if (value === null) return "Prix sur demande";

  const amount = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency ?? "EUR",
    maximumFractionDigits: 0,
  }).format(value);

  const suffix = pricePeriodLabel(period);
  return suffix ? `${amount} / ${suffix}` : amount;
}

/**
 * For amounts that aren't a headline rate — commission, fees, deposit.
 * These genuinely can be absent, so an em dash is right; "Prix sur
 * demande" would be nonsense on a deposit.
 */
export function formatAmount(
  value: number | null,
  currency: string | null
): string {
  if (value === null) return "—";

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency ?? "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatArea(area: number | null): string {
  if (area === null) return "—";
  return `${new Intl.NumberFormat("fr-FR").format(area)} m²`;
}
