-- Editing document templates gets its own permission. Added alone here;
-- everything that uses the value (has_permission update, RLS on the new
-- tables) lives in the follow-up migration, since Postgres cannot use a
-- new enum value in the transaction that adds it.
ALTER TYPE "Permission" ADD VALUE IF NOT EXISTS 'MANAGE_DOCUMENT_TEMPLATES';
