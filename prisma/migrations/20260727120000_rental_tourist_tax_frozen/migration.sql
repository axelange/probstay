-- The tourist tax becomes part of the rental's frozen record at contract
-- signature: the amount and the rate used are written then, alongside the
-- owner/agent snapshot. Before signature both stay null and the tax is
-- computed live from the city's current rate; after, the stored figures
-- are authoritative — a commune revising its rate must never rewrite a
-- signed contract's total.
ALTER TABLE "rentals" ADD COLUMN "touristTaxAmount" DECIMAL(12, 2);
ALTER TABLE "rentals" ADD COLUMN "touristTaxRate" DECIMAL(6, 2);
