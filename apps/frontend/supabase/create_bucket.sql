-- RUN THIS IN SUPABASE SQL EDITOR TO CREATE THE BUCKET
-- Go to: Supabase Dashboard → SQL Editor → New Query → Paste this → Run

-- Step 1: Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'aura-assets',
  'aura-assets',
  true,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Create RLS policies (allow all operations for anon users)
-- Insert policy
DROP POLICY IF EXISTS "aura_assets_insert" ON storage.objects;
CREATE POLICY "aura_assets_insert" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'aura-assets');

-- Select policy  
DROP POLICY IF EXISTS "aura_assets_select" ON storage.objects;
CREATE POLICY "aura_assets_select" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'aura-assets');

-- Update policy
DROP POLICY IF EXISTS "aura_assets_update" ON storage.objects;
CREATE POLICY "aura_assets_update" ON storage.objects
  FOR UPDATE TO anon, authenticated
  USING (bucket_id = 'aura-assets')
  WITH CHECK (bucket_id = 'aura-assets');

-- Delete policy
DROP POLICY IF EXISTS "aura_assets_delete" ON storage.objects;
CREATE POLICY "aura_assets_delete" ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (bucket_id = 'aura-assets');

-- Verify bucket was created
SELECT id, name, public FROM storage.buckets WHERE id = 'aura-assets';

