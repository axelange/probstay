-- Comment une dépense est réglée, et non seulement qui la porte.
--
-- Who bears a cost and how it is settled turned out to be two questions:
--
--   • an owner's expense does not touch their net. The agency keeps the
--     invoice, passes it on, and the owner settles it himself — so it is
--     recorded and forwarded, never deducted;
--   • a tenant's expense may be withheld from the caution, or invoiced
--     separately. Both happen, and only the agent knows which;
--   • the agency's own still comes off its commission.
DO $$ BEGIN
  CREATE TYPE "ExpenseSettlement" AS ENUM ('DEPOSIT', 'INVOICE', 'COMMISSION');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "rental_expenses"
  ADD COLUMN IF NOT EXISTS "settlement" "ExpenseSettlement";

-- Existing rows take the settlement their bearer implied when they were
-- recorded: withheld for a tenant, forwarded for an owner, off the commission
-- for the agency. The table is empty today, so this decides nothing in
-- practice — it is here so a replay on a populated database is not a guess.
UPDATE "rental_expenses"
SET "settlement" = CASE "bearer"
  WHEN 'CLIENT' THEN 'DEPOSIT'::"ExpenseSettlement"
  WHEN 'OWNER'  THEN 'INVOICE'::"ExpenseSettlement"
  ELSE 'COMMISSION'::"ExpenseSettlement"
END
WHERE "settlement" IS NULL;

ALTER TABLE "rental_expenses"
  ALTER COLUMN "settlement" SET NOT NULL,
  ALTER COLUMN "settlement" SET DEFAULT 'INVOICE';
