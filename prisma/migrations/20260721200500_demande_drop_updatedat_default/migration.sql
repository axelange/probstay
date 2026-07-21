-- Drop the DB default now the table is created; Prisma's @updatedAt is
-- application-side and carries no default. Same as tourist_taxes.
ALTER TABLE "demandes" ALTER COLUMN "updatedAt" DROP DEFAULT;
