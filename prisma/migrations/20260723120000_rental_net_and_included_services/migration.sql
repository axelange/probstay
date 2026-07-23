-- Reshape rental pricing. The stay amount (grossAmount / "Loyer") is no
-- longer the agent's flat authoritative figure. It is now derived: the
-- owner's net take plus the agency commission, plus any service (typically
-- cleaning) marked as included in the stay. Services not included are extras
-- billed on top, in the client total.
--
--   grossAmount = netOwnerAmount + commissionAmount + Σ(included services)
--   client total = grossAmount + Σ(non-included services) + tourist tax

ALTER TABLE "rentals" ADD COLUMN "netOwnerAmount" DECIMAL(12, 2);

ALTER TABLE "rental_services"
  ADD COLUMN "includedInStay" BOOLEAN NOT NULL DEFAULT false;
