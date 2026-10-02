/**
 * The name an uploaded file is recorded under.
 *
 * macOS stores file names decomposed (NFD): "é" is an "e" followed by a
 * combining accent, and the browser hands them over exactly as they are on
 * disk. Everything the app writes itself — a generated document's name — is
 * composed (NFC), so the two forms end up side by side in the same column.
 * They look alike but are different strings: they sort apart, they compare
 * unequal, and a search for "écran" typed on any keyboard misses the
 * decomposed row entirely. Some fonts also render the loose accent visibly
 * off, which is how this usually gets noticed.
 *
 * Normalising at the door is safe: NFC is canonical equivalence, so no name
 * is altered in any sense a reader would recognise — only its encoding.
 */
export function normalizeFileName(name: string): string {
  return name.normalize("NFC");
}

/**
 * The `Content-Disposition` a download is served with.
 *
 * An HTTP header carries no accents: `filename=` is bytes a client reads as
 * ASCII, so "saisonnière" put there comes out mangled — which is how a file
 * downloaded from here once came back named "saisonni%C3%A8re.pdf". RFC 6266
 * answers with two spellings, and both are sent: `filename` stripped down to
 * ASCII for whatever still reads only that, and `filename*` (RFC 5987)
 * carrying the real name as percent-encoded UTF-8, which every current
 * browser prefers.
 */
export function attachmentDisposition(fileName: string): string {
  const name = normalizeFileName(fileName);

  // The fallback: accents decomposed then dropped, so "è" degrades to "e"
  // rather than to a placeholder. Quotes and backslashes would end the
  // quoted string early, and anything left outside printable ASCII is not
  // representable here at all.
  const ascii = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/["\\]/g, "_")
    .replace(/[^\x20-\x7e]/g, "_");

  // encodeURIComponent leaves ' ( ) * alone; RFC 5987 does not allow them.
  const encoded = encodeURIComponent(name).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );

  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
