-- APIMO's price.hide: a rate that exists but the agency has marked
-- not-to-publish. Six properties currently carry it, including one at
-- 78 000 EUR.
--
-- Stored so anything public can honour it. The planned website API reads
-- from this database, and without the flag it would publish rates the
-- agency deliberately withheld — the schema would have no way to say
-- otherwise.
--
-- Distinct from a null priceValue, which is APIMO's "price on demand":
-- no rate at all, rather than one that's withheld.
--
-- Defaults false, then set correctly by the next sync.

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "priceHidden" BOOLEAN NOT NULL DEFAULT false;
