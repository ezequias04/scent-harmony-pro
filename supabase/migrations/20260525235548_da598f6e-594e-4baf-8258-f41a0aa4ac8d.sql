
-- Fix function search_path
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Restrict public listing of bucket: only allow SELECT on files owned by the user OR by file path lookup via signed/public URL.
-- Replace broad SELECT with one limited to the user's own folder.
DROP POLICY IF EXISTS "perfume imgs public read" ON storage.objects;
CREATE POLICY "perfume imgs read own"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'perfume-imagens'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
-- Images are still accessible publicly via direct public URL since the bucket is public; this only prevents listing.
