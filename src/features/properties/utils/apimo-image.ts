/**
 * Asking APIMO for a picture at the width it will actually be shown at.
 *
 * Every stored URL ends `_<width>-original.jpg`, and APIMO serves other
 * widths from the same key — but not every width for every picture. The path
 * is a cache: 1440 resolves for most photographs and is a 404 for some, with
 * nothing in the URL to tell them apart. Only the stored variant is certain,
 * so a resized URL has to be checked before it is relied on; see
 * `servedApimoImage`. The sync stores the 1920 variant, which is right for the
 * property page and wildly oversized anywhere it is printed small.
 *
 * This matters most in the generated PDF, where the bytes are embedded in the
 * file rather than fetched: the agreement's three cover thumbnails occupy
 * about 162 pt each, so a 1920 px source was being carried at roughly 850 dpi
 * and made the document four times larger than it needed to be.
 */
const APIMO_WIDTH = /_(\d+)-original\.jpg$/;

/**
 * The same picture at `width`, or unchanged if the URL is not one APIMO sizes
 * this way — a host we do not control must not have a width invented for it.
 *
 * Never upscales. Asking for more pixels than the stored variant holds cannot
 * add detail, and would only trade file size for nothing.
 */
export function apimoImageWidth(url: string, width: number): string {
  const match = APIMO_WIDTH.exec(url);
  if (!match) return url;

  const current = Number(match[1]);
  const target = Number.isFinite(current) ? Math.min(current, width) : width;
  return url.replace(APIMO_WIDTH, `_${target}-original.jpg`);
}

/** Long enough for a CDN to answer a HEAD, short enough not to hold a page. */
const PROBE_TIMEOUT_MS = 4000;

/**
 * The picture at `width` if APIMO really serves it there, the stored URL if
 * not.
 *
 * A PDF embeds what it is given: a width the CDN answers with a 404 is a hole
 * in the cover, not a smaller file. Asked once per picture, on the server,
 * before the URL is handed to the document. A probe that fails or times out
 * counts as absent, since the stored variant is the one known to exist.
 */
export async function servedApimoImage(
  url: string,
  width: number,
): Promise<string> {
  const resized = apimoImageWidth(url, width);
  if (resized === url) return url;
  try {
    const res = await fetch(resized, {
      method: "HEAD",
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    return res.ok ? resized : url;
  } catch {
    return url;
  }
}
