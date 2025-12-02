-- Creates the aura-assets storage bucket for inspiration images
-- This migration is idempotent (safe to re-run)

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'aura-assets',
  'aura-assets',
  true,  -- public bucket for easy access
  52428800,  -- 50MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create RLS policies for the bucket
-- Allow anonymous uploads (for users without accounts)
DO $$
BEGIN
  -- Policy for inserting (uploading) files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'aura_assets_insert_policy'
  ) THEN
    CREATE POLICY aura_assets_insert_policy ON storage.objects
      FOR INSERT TO anon, authenticated
      WITH CHECK (bucket_id = 'aura-assets');
  END IF;

  -- Policy for selecting (reading) files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'aura_assets_select_policy'
  ) THEN
    CREATE POLICY aura_assets_select_policy ON storage.objects
      FOR SELECT TO anon, authenticated
      USING (bucket_id = 'aura-assets');
  END IF;

  -- Policy for updating files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'aura_assets_update_policy'
  ) THEN
    CREATE POLICY aura_assets_update_policy ON storage.objects
      FOR UPDATE TO anon, authenticated
      USING (bucket_id = 'aura-assets')
      WITH CHECK (bucket_id = 'aura-assets');
  END IF;

  -- Policy for deleting files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'aura_assets_delete_policy'
  ) THEN
    CREATE POLICY aura_assets_delete_policy ON storage.objects
      FOR DELETE TO anon, authenticated
      USING (bucket_id = 'aura-assets');
  END IF;
END $$;

