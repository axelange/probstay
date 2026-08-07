/**
 * Asking APIMO for a picture at the width it will actually be shown at.
 *
 * Every stored URL ends `_<width>-original.jpg`, and APIMO serves any width
 * from the same key — 1920, 1440, 1024, 400 and so on all resolve. The sync
 * stores the 1920 variant, which is right for the property page and wildly
 * oversized anywhere it is printed small.
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
