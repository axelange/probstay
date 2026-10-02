/**
 * Where a stored document is fetched from. Client-safe: the components only
 * need the address, and the route behind it does the authorising.
 *
 * The buckets are addressed by name rather than by a query parameter so the
 * URL says what it points at, and so an unknown one is a 404 from the router
 * rather than a case the handler has to think about.
 *
 * `invoice` reads a different bucket under a different rule — the invoice
 * permissions, not rental visibility — but comes through here all the same:
 * what this route exists for is spelling an accented file name correctly, and
 * that is worth solving once rather than per feature.
 */
export type DocumentOrigin = "generated" | "signed" | "invoice";

export function documentDownloadHref(
  origin: DocumentOrigin,
  id: string
): string {
  return `/api/documents/${origin}/${id}`;
}
