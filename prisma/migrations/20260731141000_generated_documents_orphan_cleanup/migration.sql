-- Let generation clean up after itself, without letting anything delete an
-- issued document.
--
-- Generation uploads the file, then records it. If the record fails, the
-- object is left behind: invisible, unreachable, and impossible to find again
-- since nothing points at it. The previous migration left no DELETE policy at
-- all, so that orphan could never be removed either.
--
-- The distinction that matters is not "may this user delete" but "is this file
-- recorded". A file no row points at was never issued to anyone, so removing
-- it loses nothing; a file with a row may have been sent or signed, and must
-- survive regardless of who asks. The policy tests exactly that.
CREATE POLICY "generated_documents_objects_delete_orphan" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'generated-documents'
    AND NOT EXISTS (
      SELECT 1
      FROM public.generated_documents g
      WHERE g."storagePath" = storage.objects.name
    )
    AND (
      internal.has_permission('MANAGE_RENTALS')
      OR internal.is_rental_agent(((storage.foldername(name))[1])::uuid)
    )
  );
