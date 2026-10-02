import { NextResponse } from "next/server";
import { findDownloadableDocument } from "@/features/documents/services/document-download";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";
import { attachmentDisposition } from "@/lib/uploads";

/**
 * Serves a stored document under its real name.
 *
 * The buckets are private, and the app used to hand out a short-lived signed
 * URL per click. That worked, but the name travelled as a query parameter and
 * came back out of storage's own `Content-Disposition` percent-encoded, so a
 * contract could land on disk as "saisonni%C3%A8re.pdf". Streaming the object
 * through here costs one hop and puts the header under our control, which is
 * the only way to spell an accented name correctly (RFC 6266).
 *
 * The session client, not the service key: the storage policies mirror rental
 * visibility, so they remain the second line behind the check in the service.
 */
export async function GET(
  _request: Request,
  context: RouteContext<"/api/documents/[origin]/[id]">
) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Session expirée.", { status: 401 });

  const { origin, id } = await context.params;
  const doc = await findDownloadableDocument(origin, id, user);
  if (!doc) return new NextResponse("Document introuvable.", { status: 404 });

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(doc.bucket)
    .download(doc.storagePath);

  if (error || !data) {
    console.error("document download failed", error);
    return new NextResponse("Fichier indisponible.", { status: 502 });
  }

  // The blob goes back as it came: passing it whole lets the runtime set
  // Content-Length itself, which a hand-written one would only get wrong the
  // day a response is compressed on the way out.
  return new NextResponse(data, {
    headers: {
      "content-type": doc.mimeType,
      "content-disposition": attachmentDisposition(doc.fileName),
      // A private document behind a session: no cache may keep a copy.
      "cache-control": "private, no-store",
    },
  });
}
