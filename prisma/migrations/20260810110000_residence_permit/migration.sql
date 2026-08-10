-- Le titre de séjour rejoint les pièces d'identité acceptées.
--
-- Alone in its own migration on purpose: Postgres refuses to *use* an enum
-- value in the same transaction that adds it, and the next migration converts
-- two columns onto this type. Splitting them is the only way both can run.
--
-- Not reversible in practice: removing a value from an enum means recreating
-- the type and every column that references it.
ALTER TYPE "IdentityDocumentType" ADD VALUE IF NOT EXISTS 'RESIDENCE_PERMIT';
