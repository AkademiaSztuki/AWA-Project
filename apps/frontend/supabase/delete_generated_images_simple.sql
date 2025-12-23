-- ============================================
-- DELETE GENERATED_IMAGES - SIMPLE BATCH
-- ============================================
-- Copy and paste this query in Supabase SQL Editor
-- Run it MULTIPLE TIMES until it says "0 rows deleted"
-- Each run deletes 50 records
-- ============================================

-- Delete 50 records at a time
DELETE FROM generated_images
WHERE id IN (
  SELECT id FROM generated_images 
  LIMIT 50
);

-- Check how many are left (run this separately)
-- SELECT COUNT(*) as remaining FROM generated_images;

