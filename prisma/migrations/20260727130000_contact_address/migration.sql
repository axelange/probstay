-- Postal address on the contact, needed on rental documents (an individual
-- owner's "demeurant …", the tenant's address line). BSTAY's own column:
-- the APIMO sync never writes it, so it survives every re-sync — a
-- company's registered office stays in contact_companies.
ALTER TABLE "contacts" ADD COLUMN "address" TEXT;
