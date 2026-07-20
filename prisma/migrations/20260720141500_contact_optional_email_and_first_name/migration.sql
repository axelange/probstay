-- Contacts: email and firstName become optional.
--
-- Measured against the live APIMO data once the `contacts` scope was
-- granted. Of the 46 owners of our 52 broadcast properties, 14 have no
-- email and 4 no first name (2 have neither). Across the agency's whole
-- 5052-contact CRM, 673 lack an email and 730 a first name.
--
-- Requiring them would not have produced better data — it would have
-- rejected 16 of 46 owners at insert, leaving 16 properties silently
-- owner-less while the sync reported success. A partial contact is worth
-- more than none, and the agency is filling the gaps at source.
--
-- lastName stays NOT NULL: it is present on all 46 owners and on 5026 of
-- 5052 contacts. Surname-only records are the normal shape here.
--
-- The unique index on email is deliberately KEPT. No two of the 46
-- owners share an address, and Postgres does not treat NULLs as
-- conflicting, so incomplete records coexist without collision. It must
-- be reconsidered if the sync ever widens past owners to the full CRM,
-- where 201 addresses are shared by 442 contacts.
--
-- Phone is deliberately NOT made unique. It is no better as an identity
-- (30 of 46 owners have a number, versus 32 with an email) and 182
-- numbers are shared by 398 contacts agency-wide, because households and
-- couples genuinely share a line. Duplicate detection on phone belongs
-- in the application as a soft warning, not as a constraint.
ALTER TABLE "contacts"
  ALTER COLUMN "firstName" DROP NOT NULL,
  ALTER COLUMN "email" DROP NOT NULL;
