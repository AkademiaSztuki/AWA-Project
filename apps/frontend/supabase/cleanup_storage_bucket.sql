-- ============================================
-- CLEANUP STORAGE BUCKET - aura-assets
-- ============================================
-- Cleans up inspiration images from storage bucket
-- Run this in Supabase SQL Editor

-- Option 1: Delete all files in bucket
DELETE FROM storage.objects 
WHERE bucket_id = 'aura-assets';

-- Option 2: Delete files older than 7 days
-- DELETE FROM storage.objects 
-- WHERE bucket_id = 'aura-assets'
-- AND created_at < NOW() - INTERVAL '7 days';

-- Option 3: Delete files for specific user
-- DELETE FROM storage.objects 
-- WHERE bucket_id = 'aura-assets'
-- AND name LIKE 'inspirations/user_2zjin1gb36vmidnd5zf/%';

-- Check remaining files
SELECT 
  name,
  created_at,
  pg_size_pretty((metadata->>'size')::bigint) AS file_size
FROM storage.objects 
WHERE bucket_id = 'aura-assets'
ORDER BY created_at DESC
LIMIT 20;

