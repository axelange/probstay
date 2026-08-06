-- Per-user mandate preference.
--
-- The agency lets property, but also holds the odd mandat de vente. Someone
-- who never works sales should not have to filter them out on every visit to
-- Biens, and someone who does should not have to hunt for them.
--
-- A preference, not a permission. It seeds the visible Mandat filter and
-- nothing more: an agent set to RENTALS can still switch that control and see
-- a sale. Nothing is withheld on the strength of it, so a property missing
-- from a list always has a visible reason — a filter someone can see and
-- change, rather than a setting they forgot they set.
--
-- Defaults to RENTALS, which is what the list already opened on, so no
-- existing user's experience changes.
CREATE TYPE "MandatePreference" AS ENUM ('RENTALS', 'SALES', 'BOTH');

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "mandatePreference" "MandatePreference"
  NOT NULL DEFAULT 'RENTALS';
