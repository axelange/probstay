/**
 * Turns a synced property description into paragraphs.
 *
 * APIMO's text is typed into a textarea, so it arrives wrapped by hand: CRLF
 * line endings, blank lines between paragraphs, and — in 11 of the 53
 * descriptions — hard breaks in the middle of a sentence, where someone hit
 * return rather than let the text flow. Printed verbatim those breaks land
 * mid-phrase ("…à proximité immédiate" / "du vieux village de Mougins"), which
 * reads as a fault in the document rather than in the source.
 *
 * So a single break inside a paragraph is a wrap and becomes a space; a blank
 * line is a paragraph and is kept.
 *
 * With one exception: a line opening with a bullet is a list item, and its
 * break is meaningful. Two descriptions carry a services list of twelve such
 * lines, and joining those would produce "Services hôteliers inclus : • 2
 * agents d'entretien • 1 chef…" in a single run. Bullets therefore stand alone.
 */
export function descriptionParagraphs(
  text: string | null | undefined
): string[] {
  if (!text) return [];

  const isBullet = (line: string) => /^[•·▪◦*-]\s/.test(line.trim());

  return (
    text
      // CRLF first: the paragraph split below looks for blank lines, and a
      // stray carriage return between them would hide one.
      .replace(/\r\n?/g, "\n")
      .split(/\n\s*\n/)
      .flatMap((block) => {
        const out: string[] = [];
        let wrapped: string[] = [];
        const flush = () => {
          if (wrapped.length) out.push(wrapped.join(" "));
          wrapped = [];
        };
        for (const raw of block.split("\n")) {
          const line = raw.trim();
          if (!line) continue;
          if (isBullet(line)) {
            flush();
            out.push(line);
          } else {
            wrapped.push(line);
          }
        }
        flush();
        return out;
      })
      .map((p) => p.replace(/[ \t]+/g, " ").trim())
      .filter(Boolean)
  );
}
