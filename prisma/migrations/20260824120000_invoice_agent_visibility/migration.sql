-- Un agent voit les documents de ses propres locations.
--
-- Until now the two financial permissions were the whole rule: MANAGE_INVOICES
-- or VIEW_FINANCIALS saw everything, an Agent saw nothing — not even the
-- payment request raised against a booking they are handling, which they are
-- the one being asked about when the client rings.
--
-- The rule becomes the one the rest of the application already uses for
-- anything hanging off a booking: the permissions see the register, and an
-- agent sees what belongs to their own rentals. A fee invoice with no rental
-- on it stays out of their reach, which is right — a co-agency fee is the
-- agency's business, not the booking's.
--
-- Reading only. Raising, issuing, cancelling and the catalogue remain
-- MANAGE_INVOICES, and the policies below are unchanged in that respect.

DROP POLICY IF EXISTS "invoices_select" ON "invoices";
CREATE POLICY "invoices_select" ON "invoices"
  FOR SELECT
  USING (
    internal.has_permission('MANAGE_INVOICES')
    OR internal.has_permission('VIEW_FINANCIALS')
    -- Null for a fee invoice that concerns no booking: the function is never
    -- true for it, so an agent does not see it.
    OR internal.is_rental_agent("rentalId")
  );

DROP POLICY IF EXISTS "invoice_lines_select" ON "invoice_lines";
CREATE POLICY "invoice_lines_select" ON "invoice_lines"
  FOR SELECT
  USING (
    internal.has_permission('MANAGE_INVOICES')
    OR internal.has_permission('VIEW_FINANCIALS')
    OR EXISTS (
      SELECT 1 FROM "invoices" i
      WHERE i."id" = "invoiceId" AND internal.is_rental_agent(i."rentalId")
    )
  );

-- The stored PDF follows the row. Object keys are `<invoiceId>/<uuid>.pdf`, so
-- the first path segment is the document the agent's access is judged on — the
-- same shape the generated and signed document buckets use.
DROP POLICY IF EXISTS "invoices_objects_read" ON storage.objects;
CREATE POLICY "invoices_objects_read" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'invoices'
    AND (
      internal.has_permission('MANAGE_INVOICES')
      OR internal.has_permission('VIEW_FINANCIALS')
      OR EXISTS (
        SELECT 1 FROM "invoices" i
        WHERE i."id" = ((storage.foldername(name))[1])::uuid
          AND internal.is_rental_agent(i."rentalId")
      )
    )
  );
