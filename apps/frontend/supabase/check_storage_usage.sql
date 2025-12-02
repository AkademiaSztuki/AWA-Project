-- ============================================
-- CHECK STORAGE USAGE
-- ============================================
-- Run this to see what's taking up space

-- 1. Table sizes (database storage)
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = schemaname AND table_name = tablename) AS column_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 2. Row counts per table
SELECT 
  'generated_images' AS table_name, COUNT(*) AS row_count, 
  pg_size_pretty(pg_total_relation_size('public.generated_images')) AS size
FROM public.generated_images
UNION ALL
SELECT 
  'generation_sets', COUNT(*), 
  pg_size_pretty(pg_total_relation_size('public.generation_sets'))
FROM public.generation_sets
UNION ALL
SELECT 
  'generation_feedback', COUNT(*), 
  pg_size_pretty(pg_total_relation_size('public.generation_feedback'))
FROM public.generation_feedback
UNION ALL
SELECT 
  'regeneration_events', COUNT(*), 
  pg_size_pretty(pg_total_relation_size('public.regeneration_events'))
FROM public.regeneration_events
UNION ALL
SELECT 
  'behavioral_logs', COUNT(*), 
  pg_size_pretty(pg_total_relation_size('public.behavioral_logs'))
FROM public.behavioral_logs
UNION ALL
SELECT 
  'sessions', COUNT(*), 
  pg_size_pretty(pg_total_relation_size('public.sessions'))
FROM public.sessions
UNION ALL
SELECT 
  'tinder_swipes', COUNT(*), 
  pg_size_pretty(pg_total_relation_size('public.tinder_swipes'))
FROM public.tinder_swipes
UNION ALL
SELECT 
  'tinder_exposures', COUNT(*), 
  pg_size_pretty(pg_total_relation_size('public.tinder_exposures'))
FROM public.tinder_exposures;

-- 3. Storage bucket usage (if bucket exists)
SELECT 
  bucket_id,
  COUNT(*) AS file_count,
  pg_size_pretty(SUM((metadata->>'size')::bigint)) AS total_size
FROM storage.objects
WHERE bucket_id = 'aura-assets'
GROUP BY bucket_id;

-- 4. Largest generated_images (if they contain base64 URLs)
SELECT 
  id,
  created_at,
  LENGTH(image_url) AS url_length,
  LEFT(image_url, 50) AS url_preview
FROM public.generated_images
ORDER BY LENGTH(image_url) DESC
LIMIT 10;

