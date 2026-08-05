-- Default security deposit per property.
--
-- Every rental carries a security deposit (agency rule), but nothing supplied
-- one: rentals were created with the column null and it stayed null, which is
-- how a booking reached CHECK_OUT without a caution ever being recorded.
--
-- The property is where the figure actually belongs — it follows the villa,
-- not the booking — so it is set once there and copied onto each rental at
-- conversion.
--
-- The copy is deliberately one-way. A rental keeps the amount it was created
-- with even after the property's default changes, because by then a contract
-- may already quote it, and revising a property must never rewrite a figure a
-- tenant has signed. Same reasoning as the owner/agent snapshots on Rental.
--
-- Additive and nullable: existing properties have no default until someone
-- sets one, and existing rentals are untouched.
ALTER TABLE "properties"
  ADD COLUMN IF NOT EXISTS "defaultSecurityDeposit" numeric(12, 2);
