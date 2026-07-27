-- New pipeline stage between Informations and Contrat: FINANCIAL
-- ("Financier"), where the money (net owner, commission, services) is
-- settled and validated before the contract stage opens.
--
-- The value is only ADDED here; every use of it (CHECK constraint) lives in
-- the follow-up migration, since Postgres cannot use a new enum value in
-- the transaction that adds it.
ALTER TYPE "RentalBookingStatus" ADD VALUE IF NOT EXISTS 'FINANCIAL' BEFORE 'CONTRACT';
