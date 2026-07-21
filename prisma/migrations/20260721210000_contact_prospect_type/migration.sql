-- Prospect: a contact who has only made a request and is nothing else
-- yet. Added alone — Postgres can't use a new enum value in the same
-- transaction that adds it, so the exclusivity CHECK is a follow-up.
ALTER TYPE "ContactType" ADD VALUE 'PROSPECT';
