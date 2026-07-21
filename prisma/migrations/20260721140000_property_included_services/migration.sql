-- Services included with a stay, shown on the rental. BSTAY's own labels,
-- not APIMO's service codes. The sync never writes this column, so it
-- survives re-syncs like marketingName.
ALTER TABLE "properties" ADD COLUMN "includedServices" TEXT[];
