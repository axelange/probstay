-- APIMO has no bathroom count. It is derived during the sync from the
-- property's areas[] (types 8/13/41/42 — bathroom, shower room,
-- bathroom/lavatory, shower/lavatory; standalone WCs excluded) and,
-- failing that, by reading the descriptions.
--
-- Nullable and left null by this migration: the value only appears once
-- the sync has run and derived it.

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "bathrooms" INTEGER;
