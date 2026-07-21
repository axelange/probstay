-- A prospect is exclusive: if a contact holds PROSPECT it holds nothing
-- else. This is what makes it "the status of someone not yet an owner,
-- client, partner or provider". On conversion they become a CLIENT
-- instead, so PROSPECT is dropped as CLIENT is added.
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_prospect_exclusive"
  CHECK (
    NOT ('PROSPECT' = ANY("types"))
    OR array_length("types", 1) = 1
  );
