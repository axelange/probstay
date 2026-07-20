-- Rental.agentId — the agent of record for a rental.
--
-- Snapshotted from the property's agent at creation, for the same
-- reason Rental.ownerId is snapshotted rather than read through
-- property.ownerId: reassigning a property must not rewrite who handled
-- every past rental of it. Commission is attributed against this.
--
-- Before this, agent attribution on a historical rental was reached
-- through properties.agentId, which is mutable — so reassigning a
-- property silently rewrote the agent on all of its past rentals.
--
-- This is attribution, not authorisation. The rentals RLS policies are
-- deliberately left alone: who may still *edit* a rental follows the
-- property's current agent, because an agent taking over a property has
-- to be able to manage its in-flight bookings.
ALTER TABLE "rentals" ADD COLUMN "agentId" UUID;

CREATE INDEX "rentals_agentId_idx" ON "rentals"("agentId");

-- Both snapshot FKs restrict on delete: a snapshot that can be nulled
-- out is not a snapshot. Business rules are soft-delete-only so neither
-- should ever fire, but a stray hard DELETE would otherwise blank the
-- owner (or agent) across all history in one statement.
-- rentals.propertyId already restricted for exactly this reason;
-- rentals.ownerId did not, which was an inconsistency.
ALTER TABLE "rentals" DROP CONSTRAINT "rentals_ownerId_fkey";

ALTER TABLE "rentals" ADD CONSTRAINT "rentals_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "contacts"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "rentals" ADD CONSTRAINT "rentals_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
