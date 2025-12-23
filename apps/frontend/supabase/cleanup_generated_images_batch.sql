-- ============================================
-- CLEANUP GENERATED_IMAGES (BATCH MODE)
-- ============================================
-- Use this if DELETE FROM generated_images; times out
-- Deletes in small batches to avoid timeout
-- ============================================

-- STEP 1: Check how many images exist
SELECT COUNT(*) as total_images,
       pg_size_pretty(pg_total_relation_size('public.generated_images')) as table_size
FROM generated_images;

-- STEP 2: Delete in batches of 100
-- Run this query multiple times until it returns 0 rows deleted
-- Copy and paste this block, run it, wait a few seconds, run again, repeat

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete 100 records at a time
  WITH deleted AS (
    DELETE FROM generated_images
    WHERE id IN (
      SELECT id FROM generated_images LIMIT 100
    )
    RETURNING *
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RAISE NOTICE 'Deleted % records', deleted_count;
END $$;

-- STEP 3: Verify all deleted
SELECT COUNT(*) as remaining_images FROM generated_images;

-- ============================================
-- ALTERNATIVE: Delete via generation_sets (CASCADE)
-- ============================================
-- If generated_images references generation_sets,
-- deleting generation_sets will cascade delete images
-- This might be faster:

-- First check:
SELECT COUNT(*) as generation_sets_count FROM generation_sets;

-- Then delete (this will cascade delete related generated_images):
-- DELETE FROM generation_sets;

