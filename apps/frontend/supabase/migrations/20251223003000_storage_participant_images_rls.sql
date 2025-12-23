-- ============================================
-- Supabase Storage RLS policies for bucket: participant-images
-- Fix: allow uploads of generated images (data URLs) from anon/authenticated clients.
--
-- NOTE: This intentionally mirrors "kiosk/research" behavior: wide-open access
-- within this bucket. If you want stricter per-user access later, we can
-- introduce auth-bound folder policies and store auth_user_id.
-- ============================================

-- Public read (needed for dashboard previews)
DROP POLICY IF EXISTS "participant-images public read" ON storage.objects;
CREATE POLICY "participant-images public read"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'participant-images');

-- Public insert (needed for uploads)
DROP POLICY IF EXISTS "participant-images public insert" ON storage.objects;
CREATE POLICY "participant-images public insert"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'participant-images');

-- Public update (needed for upsert overwrite / metadata changes)
DROP POLICY IF EXISTS "participant-images public update" ON storage.objects;
CREATE POLICY "participant-images public update"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'participant-images')
WITH CHECK (bucket_id = 'participant-images');

-- Public delete (needed for delete image in dashboard)
DROP POLICY IF EXISTS "participant-images public delete" ON storage.objects;
CREATE POLICY "participant-images public delete"
ON storage.objects
FOR DELETE
TO anon, authenticated
USING (bucket_id = 'participant-images');


