-- Storage for generated documents.
--
-- A private bucket holding the PDFs recorded in `generated_documents`. Unlike
-- the `identity-documents` bucket, which was created by hand in the
-- dashboard, this one lives in a migration so a fresh environment can issue
-- paperwork without a manual setup step.
--
-- Object keys are `<rentalId>/<uuid>.pdf`: opaque, ASCII, and stable. The
-- readable name ("RC-0001240 - John Berntal - Confirmation de location.pdf")
-- is applied at download time by the signed URL, so a tenant's name never has
-- to survive as a storage key.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'generated-documents',
  'generated-documents',
  false,
  20971520, -- 20 MB; a three-page PDF with embedded fonts is far under this
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Reads mirror the rental itself, like every other rental-scoped table:
-- MANAGE_RENTALS sees all, an agent sees the rentals they handle on either
-- side. The rental id is the first path segment.
DROP POLICY IF EXISTS "generated_documents_objects_read" ON storage.objects;
CREATE POLICY "generated_documents_objects_read" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'generated-documents'
    AND (
      internal.has_permission('MANAGE_RENTALS')
      OR internal.is_rental_agent(((storage.foldername(name))[1])::uuid)
    )
  );

DROP POLICY IF EXISTS "generated_documents_objects_insert" ON storage.objects;
CREATE POLICY "generated_documents_objects_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'generated-documents'
    AND (
      internal.has_permission('MANAGE_RENTALS')
      OR internal.is_rental_agent(((storage.foldername(name))[1])::uuid)
    )
  );

-- Deliberately no UPDATE or DELETE policy. The records are append-only, and
-- the files they point at must be too: a document that was sent or signed
-- cannot be quietly replaced or removed.
