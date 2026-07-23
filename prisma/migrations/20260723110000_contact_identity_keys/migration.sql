-- Identity keys, scoped per kind. The same email serves an individual and
-- the companies they represent (Aslan Khabliev + his two SCPs all use
-- aslan@loewe.de), so no single global key works:
--   • an INDIVIDUAL is identified by its email,
--   • a COMPANY by its registration number.
-- Each rule is a partial unique index so it applies only to its kind, and
-- only where the key is present (a foreign company may have no number, and
-- several such nulls must coexist).

-- Individuals: unique email. Companies are exempt — they legitimately reuse
-- their representative's address.
CREATE UNIQUE INDEX "contacts_email_individual_key"
  ON "contacts" ("email")
  WHERE "kind" = 'INDIVIDUAL' AND "email" IS NOT NULL;

-- Companies: unique registration number among filled ones.
CREATE UNIQUE INDEX "contact_companies_registrationNumber_key"
  ON "contact_companies" ("registrationNumber")
  WHERE "registrationNumber" IS NOT NULL;
