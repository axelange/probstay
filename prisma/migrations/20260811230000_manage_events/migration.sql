-- Gérer les événements du calendrier.
--
-- Its own permission rather than MANAGE_RENTALS: putting a gardener on the
-- calendar has nothing to do with running a booking, and an agent who noted a
-- viewing must be able to move it without being able to reshape a rental.
--
-- Alone in its migration: Postgres refuses to use an enum value in the same
-- transaction that adds it, and the policies in the next one do exactly that.
ALTER TYPE "Permission" ADD VALUE IF NOT EXISTS 'MANAGE_EVENTS';
