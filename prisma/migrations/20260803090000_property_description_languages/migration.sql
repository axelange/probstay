-- Property descriptions, per language.
--
-- The bilingual Seasonal Rental Agreement prints the property's description in
-- English above the French. APIMO carries both — its comments[] holds one
-- entry per language — but the sync deliberately kept only French, because
-- until now the text was read solely by a French admin screen.
--
-- The column is renamed rather than left as a bare `description`: its holding
-- French was a fact recorded in a schema comment, and the contract was written
-- against it on the assumption it held whatever the document needed. Naming
-- the language makes that impossible to get wrong again.
--
-- RENAME preserves the existing text, so all 52 synced descriptions survive as
-- descriptionFr. descriptionEn stays null until the next sync populates it.
ALTER TABLE "properties" RENAME COLUMN "description" TO "descriptionFr";
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "descriptionEn" text;
