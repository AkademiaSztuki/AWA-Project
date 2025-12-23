-- ============================================
-- CLEANUP GENERATED_IMAGES
-- ============================================
-- This table likely takes up the most space
-- Run this to free up significant database space
-- ============================================

-- STEP 1: Check how many images exist and their total size
SELECT 
  COUNT(*) as total_images,
  COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '30 days') as old_images_30d,
  COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '7 days') as old_images_7d,
  pg_size_pretty(pg_total_relation_size('public.generated_images')) as table_size
FROM generated_images;

-- STEP 2: See size breakdown by age
SELECT 
  CASE 
    WHEN created_at < NOW() - INTERVAL '30 days' THEN 'Older than 30 days'
    WHEN created_at < NOW() - INTERVAL '7 days' THEN '7-30 days old'
    ELSE 'Less than 7 days'
  END as age_category,
  COUNT(*) as count,
  pg_size_pretty(SUM(pg_column_size(image_url) + pg_column_size(prompt_fragment))) as estimated_size
FROM generated_images
GROUP BY age_category
ORDER BY age_category;

-- STEP 3: Delete ALL generated_images (CURRENT REQUEST)
-- This will delete ALL images regardless of age
-- Uncomment to execute:
/*
DELETE FROM generated_images;
*/

-- STEP 4: More aggressive - Delete images older than 7 days
-- Use this if you need more space immediately
-- Uncomment to execute:
/*
DELETE FROM generated_images 
WHERE created_at < NOW() - INTERVAL '7 days';
*/

-- STEP 5: Delete ALL generated_images (NUCLEAR OPTION)
-- Only use if you're sure you don't need any of this data!
-- Uncomment to execute:
/*
DELETE FROM generated_images;
*/

-- ============================================
-- NOTE: Related tables
-- ============================================
-- generated_images references generation_sets
-- Deleting generation_sets will CASCADE delete related images
-- If you want to clean both:
/*
DELETE FROM generation_sets 
WHERE created_at < NOW() - INTERVAL '30 days';
-- This will automatically delete related generated_images
*/

