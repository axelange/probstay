-- Signed documents.
--
-- What came back with signatures on it. `generated_documents` records what the
-- agency produced; this records what the parties actually signed, which is the
-- copy that matters if the booking is ever disputed.
--
-- Append-only, like the generated side: a second upload of the same type adds
-- a row and the newest one is the current copy. A signed document must never
-- be quietly replaced — superseding one has to leave a trace.

CREATE TABLE IF NOT EXISTS "signed_documents" (
  "id"       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "rentalId" uuid NOT NULL REFERENCES "rentals"("id") ON DELETE CASCADE,
  "type"     "DocumentTemplateType" NOT NULL,

  -- The name of the file as uploaded, kept for the download and for
  -- recognising a scan among several. Storage keys stay opaque.
  "fileName"  text NOT NULL,
  "mimeType"  text NOT NULL,
  "sizeBytes" integer NOT NULL,

  -- Object key in the private `signed-documents` bucket. Unique because each
  -- upload writes its own object; nothing is ever overwritten.
  "storagePath" text NOT NULL UNIQUE,

  "uploadedById" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "uploadedAt"   timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- The funnel lists a rental's signed copies newest-first, per type.
CREATE INDEX IF NOT EXISTS "signed_documents_rental_type_uploaded_idx"
  ON "signed_documents" ("rentalId", "type", "uploadedAt");

ALTER TABLE "signed_documents" ENABLE ROW LEVEL SECURITY;

-- Visibility mirrors the rental itself, exactly as generated_documents and
-- identity_documents do: MANAGE_RENTALS sees everything, an agent sees the
-- rentals they handle on either side.
CREATE POLICY "signed_documents_manage_rentals" ON "signed_documents"
  FOR ALL
  USING (internal.has_permission('MANAGE_RENTALS'))
  WITH CHECK (internal.has_permission('MANAGE_RENTALS'));

CREATE POLICY "signed_documents_agent" ON "signed_documents"
  FOR ALL
  USING (internal.is_rental_agent("rentalId"))
  WITH CHECK (internal.is_rental_agent("rentalId"));

-- Storage ------------------------------------------------------------------
-- A separate private bucket rather than a folder in `generated-documents`:
-- that bucket accepts only PDFs the server itself rendered, while these
-- arrive from outside as a scan or a photograph of a signed page.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'signed-documents',
  'signed-documents',
  false,
  26214400, -- 25 MB; a scanned thirteen-page contract can be large
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- Object keys are `<rentalId>/<uuid>`, so the rental id is the first path
-- segment and the policies key on it, as the generated bucket's do.
DROP POLICY IF EXISTS "signed_documents_objects_read" ON storage.objects;
CREATE POLICY "signed_documents_objects_read" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'signed-documents'
    AND (
      internal.has_permission('MANAGE_RENTALS')
      OR internal.is_rental_agent(((storage.foldername(name))[1])::uuid)
    )
  );

DROP POLICY IF EXISTS "signed_documents_objects_insert" ON storage.objects;
CREATE POLICY "signed_documents_objects_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'signed-documents'
    AND (
      internal.has_permission('MANAGE_RENTALS')
      OR internal.is_rental_agent(((storage.foldername(name))[1])::uuid)
    )
  );

-- No UPDATE or DELETE policy, deliberately. A signed document is evidence:
-- it can be superseded by a newer upload, never edited away.
