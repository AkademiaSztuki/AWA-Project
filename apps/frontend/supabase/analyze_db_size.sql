-- ============================================
-- ANALYZE DATABASE SIZE
-- ============================================
-- Run this in Supabase SQL Editor to see what's taking up space
-- ============================================

-- 1. Table sizes (including indexes)
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname || '.' || tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename) - pg_relation_size(schemaname || '.' || tablename)) AS indexes_size,
  pg_total_relation_size(schemaname || '.' || tablename) AS size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;

-- 2. Record counts per table
SELECT 
  'sessions' as table_name, COUNT(*) as record_count, 
  pg_size_pretty(pg_total_relation_size('public.sessions')) as size
FROM sessions
UNION ALL
SELECT 'behavioral_logs', COUNT(*), pg_size_pretty(pg_total_relation_size('public.behavioral_logs'))
FROM behavioral_logs
UNION ALL
SELECT 'user_profiles', COUNT(*), pg_size_pretty(pg_total_relation_size('public.user_profiles'))
FROM user_profiles
UNION ALL
SELECT 'projects', COUNT(*), pg_size_pretty(pg_total_relation_size('public.projects'))
FROM projects
UNION ALL
SELECT 'generation_jobs', COUNT(*), pg_size_pretty(pg_total_relation_size('public.generation_jobs'))
FROM generation_jobs
UNION ALL
SELECT 'tinder_swipes', COUNT(*), pg_size_pretty(pg_total_relation_size('public.tinder_swipes'))
FROM tinder_swipes
UNION ALL
SELECT 'tinder_exposures', COUNT(*), pg_size_pretty(pg_total_relation_size('public.tinder_exposures'))
FROM tinder_exposures
UNION ALL
SELECT 'dna_snapshots', COUNT(*), pg_size_pretty(pg_total_relation_size('public.dna_snapshots'))
FROM dna_snapshots
UNION ALL
SELECT 'ladder_paths', COUNT(*), pg_size_pretty(pg_total_relation_size('public.ladder_paths'))
FROM ladder_paths
UNION ALL
SELECT 'ladder_summary', COUNT(*), pg_size_pretty(pg_total_relation_size('public.ladder_summary'))
FROM ladder_summary
UNION ALL
SELECT 'survey_results', COUNT(*), pg_size_pretty(pg_total_relation_size('public.survey_results'))
FROM survey_results
UNION ALL
SELECT 'generated_images', COUNT(*), pg_size_pretty(pg_total_relation_size('public.generated_images'))
FROM generated_images
UNION ALL
SELECT 'generation_sets', COUNT(*), pg_size_pretty(pg_total_relation_size('public.generation_sets'))
FROM generation_sets
UNION ALL
SELECT 'discovery_sessions', COUNT(*), pg_size_pretty(pg_total_relation_size('public.discovery_sessions'))
FROM discovery_sessions
ORDER BY size_bytes DESC NULLS LAST;

-- 3. Check for large JSONB columns (sessions.session_json is likely culprit)
SELECT 
  'sessions' as table_name,
  COUNT(*) as total_records,
  pg_size_pretty(SUM(pg_column_size(session_json))) as jsonb_size,
  pg_size_pretty(AVG(pg_column_size(session_json))) as avg_jsonb_size,
  pg_size_pretty(MAX(pg_column_size(session_json))) as max_jsonb_size
FROM sessions
WHERE session_json IS NOT NULL;

-- 4. Check user_profiles JSONB size
SELECT 
  'user_profiles' as table_name,
  COUNT(*) as total_records,
  pg_size_pretty(SUM(
    COALESCE(pg_column_size(lifestyle), 0) +
    COALESCE(pg_column_size(semantic_differential), 0) +
    COALESCE(pg_column_size(colors_and_materials), 0) +
    COALESCE(pg_column_size(sensory_preferences), 0) +
    COALESCE(pg_column_size(nature_metaphor), 0) +
    COALESCE(pg_column_size(aspirational_self), 0) +
    COALESCE(pg_column_size(prs_ideal), 0)
  )) as total_jsonb_size
FROM user_profiles;

-- 5. Find largest individual sessions
SELECT 
  user_hash,
  pg_size_pretty(pg_column_size(session_json)) as session_size,
  updated_at
FROM sessions
WHERE session_json IS NOT NULL
ORDER BY pg_column_size(session_json) DESC
LIMIT 10;

-- 6. Total database size
SELECT 
  pg_size_pretty(pg_database_size(current_database())) as total_database_size,
  pg_size_pretty(pg_database_size(current_database()) - 
    (SELECT SUM(pg_total_relation_size(schemaname || '.' || tablename))
     FROM pg_tables WHERE schemaname = 'public')) as other_size;

