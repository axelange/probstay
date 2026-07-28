-- A company owner under the régime parahôtelier charges 10% VAT on their net
-- rental income. Documents add a "TVA 10 %" line on netOwnerAmount to the
-- client total when this is set; otherwise every amount stays HT. BSTAY-owned,
-- never written by the APIMO sync.
ALTER TABLE "contact_companies" ADD COLUMN "paraHotelRegime" BOOLEAN NOT NULL DEFAULT false;
