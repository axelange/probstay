/**
 * A free-text line the agency keeps in French and, sometimes, in English.
 *
 * The French is the reference and always present when the line is; the
 * English exists only where someone has written it on the contact.
 */

/** The English when it says something the French does not, or nothing. */
export function englishOf(
  fr: string | null | undefined,
  en: string | null | undefined,
): string | undefined {
  const english = en?.trim();
  return english && english !== fr?.trim() ? english : undefined;
}

/**
 * The line as a bilingual document prints it on one row: "Manager / Gérant",
 * English first as every label is, or the French alone when there is no
 * English to set beside it.
 */
export function enFr(
  fr: string | null | undefined,
  en: string | null | undefined,
): string {
  const french = fr?.trim() ?? "";
  const english = englishOf(french, en);
  return english && french ? `${english} / ${french}` : english ?? french;
}
