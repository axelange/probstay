-- Noms de fichiers téléversés : NFD (macOS) -> NFC.
--
-- macOS keeps file names decomposed on disk — "é" as an "e" plus a combining
-- accent — and the browser hands them to the upload exactly as they are. What
-- the app writes itself is composed, so both forms sat in the same column:
-- alike to read, different as strings, so they sorted apart and a search for
-- "écran" missed the uploaded row.
--
-- The uploads now normalise on the way in; this brings the rows written before
-- that into line. NFC is canonical equivalence — nothing a reader would call
-- the name changes, only its encoding — so the update is lossless and can be
-- run again harmlessly.
UPDATE "signed_documents"
SET "fileName" = normalize("fileName", NFC)
WHERE "fileName" <> normalize("fileName", NFC);

UPDATE "rental_expenses"
SET "fileName" = normalize("fileName", NFC)
WHERE "fileName" IS NOT NULL
  AND "fileName" <> normalize("fileName", NFC);
