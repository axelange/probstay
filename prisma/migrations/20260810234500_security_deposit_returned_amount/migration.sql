-- Combien de la caution a été rendu, et pas seulement quand.
--
-- The booking recorded `securityDepositReturnedAt` and nothing else, which
-- says the deposit was settled without saying for how much. Once expenses can
-- be charged to the client, "returned" and "returned in full" stop being the
-- same statement, and the difference is what the client is owed.
--
-- Frozen at the moment the agent ticks it, on the departure step: it is the
-- figure they acted on. Recomputing it later from expenses that have since
-- moved would rewrite what was actually paid back.
ALTER TABLE "rentals"
  ADD COLUMN IF NOT EXISTS "securityDepositReturnedAmount" numeric(12, 2);
