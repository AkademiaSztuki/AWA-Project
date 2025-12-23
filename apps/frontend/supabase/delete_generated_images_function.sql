-- ============================================
-- CREATE FUNCTION TO DELETE GENERATED_IMAGES
-- ============================================
-- This function runs with SECURITY DEFINER, bypassing RLS
-- Run this FIRST in Supabase SQL Editor
-- ============================================

CREATE OR REPLACE FUNCTION delete_generated_images_batch(batch_size INTEGER DEFAULT 100)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete in batches
  WITH deleted AS (
    DELETE FROM generated_images
    WHERE id IN (
      SELECT id FROM generated_images LIMIT batch_size
    )
    RETURNING *
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$;

-- ============================================
-- USAGE:
-- ============================================
-- Call this function repeatedly until it returns 0:
-- 
-- SELECT delete_generated_images_batch(100);
-- 
-- Or delete all at once (if not too many):
-- SELECT delete_generated_images_batch(10000);
-- ============================================

