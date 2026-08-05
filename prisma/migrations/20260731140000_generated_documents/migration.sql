-- Generated documents.
--
-- Records every document actually produced for a rental and the file it
-- wrote. Immutable and append-only: regenerating adds a row rather than
-- replacing one, so "what exactly did the client receive on the 12th" stays
-- answerable after the wording or the amounts have moved on.

CREATE TABLE IF NOT EXISTS "generated_documents" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "rentalId"        uuid NOT NULL REFERENCES "rentals"("id") ON DELETE CASCADE,
  "type"            "DocumentTemplateType" NOT NULL,
  "reference"       text NOT NULL,
  "fileName"        text NOT NULL,
  -- Object key in the private `generated-documents` bucket. Unique because
  -- each generation writes its own object; nothing is ever replaced.
  "storagePath"     text NOT NULL UNIQUE,
  -- Null when the document was produced from the wording shipped in code,
  -- before any template version was saved. A real state, not a gap.
  "templateVersion" integer,
  "generatedById"   uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "createdAt"       timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- The funnel lists a rental's documents newest-first, per type.
CREATE INDEX IF NOT EXISTS "generated_documents_rental_type_created_idx"
  ON "generated_documents" ("rentalId", "type", "createdAt");

ALTER TABLE "generated_documents" ENABLE ROW LEVEL SECURITY;

-- Visibility mirrors the rental itself, exactly as identity_documents does:
-- MANAGE_RENTALS sees everything, and an agent sees the rentals they handle
-- on either side (property agent or tenant-side co-agent).
CREATE POLICY "generated_documents_manage_rentals" ON "generated_documents"
  FOR ALL
  USING (internal.has_permission('MANAGE_RENTALS'))
  WITH CHECK (internal.has_permission('MANAGE_RENTALS'));

CREATE POLICY "generated_documents_agent" ON "generated_documents"
  FOR ALL
  USING (internal.is_rental_agent("rentalId"))
  WITH CHECK (internal.is_rental_agent("rentalId"));
