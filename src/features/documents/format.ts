/**
 * Formatting shared by the places a stored document is shown — the rental's
 * own panels and the documents library. Client-safe: no server imports.
 */

/** A stored size as a human reads it: `1536` → `"2 Ko"`. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/**
 * The spaces a bundled face cannot draw, replaced by ones it can.
 *
 * fr-FR groups thousands with a narrow no-break space (U+202F) and precedes €
 * with a no-break space (U+00A0). The document faces carry neither, and
 * react-pdf draws the missing U+202F as a slash-like glyph — "8⁄500" instead of
 * "8 500". Every figure printed into a PDF has to go through this.
 */
export function pdfSpaces(value: string): string {
  return value.replace(/[\u202f\u00a0]/g, " ");
}
