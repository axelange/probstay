-- Les colonnes « pièce d'identité » passent du texte libre à l'énumération.
--
-- `IdentityDocumentType` existed but nothing used it: both contact forms wrote
-- French labels into a text column, and `idDocLabel` normalised accents, case
-- and punctuation at read time to recognise them again. That worked, but left
-- the enum looking authoritative while the truth lived in a TypeScript
-- constant — and a value nobody recognised printed raw onto a contract.
--
-- The mapping below is deliberately generous rather than exact: it accepts the
-- French labels the forms wrote, the English ones, and the enum spellings that
-- a legacy import might have left. Anything it does not recognise becomes
-- NULL — a pièce d'identité we cannot name is not one we should print.
UPDATE "contacts"
SET "idDocType" = CASE
  WHEN lower(unaccent_ish) IN ('cni', 'id card', 'carte d identite', 'carte nationale d identite', 'id_card') THEN 'ID_CARD'
  WHEN lower(unaccent_ish) IN ('passeport', 'passport') THEN 'PASSPORT'
  WHEN lower(unaccent_ish) IN ('permis', 'permis de conduire', 'driving license', 'driving licence', 'driving_license') THEN 'DRIVING_LICENSE'
  WHEN lower(unaccent_ish) IN ('titre de sejour', 'residence permit', 'residence_permit') THEN 'RESIDENCE_PERMIT'
  ELSE NULL
END
FROM (
  SELECT id AS cid,
         regexp_replace(
           translate("idDocType", 'àâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ', 'aaaeeeeiioouuucAAAEEEEIIOOUUUC'),
           '[^a-zA-Z]+', ' ', 'g'
         ) AS unaccent_ish
  FROM "contacts"
  WHERE "idDocType" IS NOT NULL
) AS norm
WHERE "contacts".id = norm.cid;

ALTER TABLE "contacts"
  ALTER COLUMN "idDocType" TYPE "IdentityDocumentType"
  USING NULLIF(btrim("idDocType"), '')::"IdentityDocumentType";

-- Empty today, so nothing to normalise first.
ALTER TABLE "rental_occupants"
  ALTER COLUMN "idDocType" TYPE "IdentityDocumentType"
  USING NULLIF(btrim("idDocType"), '')::"IdentityDocumentType";
