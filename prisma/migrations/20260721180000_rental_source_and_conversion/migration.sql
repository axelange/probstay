-- A booking is a "demande" (request) until confirmed; convertedAt marks
-- the moment it becomes a real rental, and source records where the first
-- contact came from. Together they let demandes be separated from
-- rentals, and conversion be measured by channel later.
CREATE TYPE "RentalSource" AS ENUM ('ASSISTANT', 'AGENT', 'WEBSITE');

ALTER TABLE "rentals"
  ADD COLUMN "source" "RentalSource",
  ADD COLUMN "convertedAt" TIMESTAMP(3);

CREATE INDEX "rentals_convertedAt_idx" ON "rentals"("convertedAt");
