-- BSTAY's own name for a property — what clients are shown ("Villa Alba"),
-- as against APIMO's numeric reference. The only field on properties that
-- does not originate from APIMO.
--
-- Unique: two properties sharing a marketing name would be
-- indistinguishable to a client.

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "marketingName" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "properties_marketingName_key" ON "properties"("marketingName");

-- Seed from the public site's marketing-names.json, which has been the
-- source of truth until now. Imported rather than regenerated: these names
-- are already published on b-stay.com and known to clients, so inventing
-- new ones would rename properties out from under them.
--
-- Guarded on marketingName IS NULL, so re-running never overwrites a name
-- edited since.
UPDATE "properties" p
SET "marketingName" = v.name, "updatedAt" = now()
FROM (VALUES
  (4410099, 'Appartement La Loggia'),
  (6179573, 'Appartement La Perle'),
  (8112636, 'Appartement L''Ocre'),
  (8142491, 'Appartement L''Alizé'),
  (82196969, 'Villa Minimal'),
  (82205412, 'Villa Dolce'),
  (82206772, 'Villa Anna'),
  (82206815, 'Villa Nature'),
  (82214482, 'Villa Agape'),
  (82243697, 'Appartement Le Nacre'),
  (82247684, 'Villa Les Pierres'),
  (82247735, 'Villa La Baldina'),
  (82313361, 'Villa Romana'),
  (82316521, 'Villa Gaia'),
  (82345085, 'Villa Laurana'),
  (82346416, 'Villa Sea View'),
  (82348282, 'Villa Bella'),
  (82400365, 'Villa Croisette'),
  (82481740, 'Villa Blanche'),
  (82487902, 'Villa Brigitte'),
  (82498867, 'Villa Wateredge'),
  (82504528, 'Villa Blu'),
  (82610093, 'Villa Tara'),
  (82769391, 'Villa One'),
  (82838307, 'Villa White'),
  (82857710, 'Villa Les Salins'),
  (82895060, 'Appartement L''Amiral'),
  (83317963, 'Villa Bohème'),
  (83463773, 'Villa Madara'),
  (83463794, 'Villa Andreas'),
  (83487691, 'Villa L''Escalet'),
  (83588429, 'Appartement La Silène'),
  (83588565, 'Appartement Le Passage'),
  (83588715, 'Appartement L''Azurée'),
  (84132097, 'Villa Liona'),
  (84189484, 'Villa Freddie'),
  (84222794, 'Appartement Le Belvédère'),
  (84679349, 'Villa Ayouna'),
  (84985505, 'Appartement Le Marbre'),
  (85342353, 'Villa Vista'),
  (85407431, 'Villa Bianca'),
  (85414482, 'Villa Noemie'),
  (85417886, 'Villa Marie'),
  (85459794, 'Villa Margaux'),
  (85619167, 'Appartement Le Panorama'),
  (85662675, 'Appartement La Bastide'),
  (85792128, 'Villa Alba'),
  (85839780, 'Appartement L''Écrin'),
  (85935728, 'Appartement La Demeure'),
  (85951376, 'Villa Les Oliviers'),
  (86665380, 'Villa Marcel'),
  (86926267, 'Appartement La Reina')) AS v(apimo_id, name)
WHERE p."apimoId" = v.apimo_id
  AND p."marketingName" IS NULL;
