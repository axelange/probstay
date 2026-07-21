-- The seed used a CURRENT_TIMESTAMP default so it needn't set updatedAt.
-- Now that it has run, drop the default to match Prisma's schema, where
-- @updatedAt is application-side and carries no DB default. Future writes
-- go through Prisma, which sets it.
ALTER TABLE "tourist_taxes" ALTER COLUMN "updatedAt" DROP DEFAULT;
