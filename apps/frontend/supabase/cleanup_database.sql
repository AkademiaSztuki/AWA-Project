-- ============================================
-- SUPABASE DATABASE CLEANUP SCRIPT
-- ============================================
-- Run this in Supabase SQL Editor
-- Dashboard -> SQL Editor -> New Query -> Paste -> Run
--
-- IMPORTANT: Review each section before running!
-- ============================================

-- ============================================
-- STEP 1: DIAGNOSTICS - Check table sizes
-- ============================================
-- Run this FIRST to see what's taking up space

SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS total_size,
  pg_total_relation_size(schemaname || '.' || tablename) AS size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;

-- ============================================
-- STEP 2: Delete system logs
-- ============================================
-- Removes health_checks and errors older than 7 days

-- Delete old health_checks
DELETE FROM health_checks 
WHERE checked_at < NOW() - INTERVAL '7 days';

-- Delete old errors
DELETE FROM errors 
WHERE occurred_at < NOW() - INTERVAL '7 days';

-- ============================================
-- STEP 3: Delete page_views
-- ============================================
-- Removes all page tracking data (not needed for research)

-- Delete ALL page_views
DELETE FROM page_views;

-- ALTERNATIVE: Keep last 7 days only
-- DELETE FROM page_views WHERE entered_at < NOW() - INTERVAL '7 days';

-- ============================================
-- STEP 4: Delete old behavioral_logs
-- ============================================
-- Removes behavioral logs older than 30 days

DELETE FROM behavioral_logs 
WHERE created_at < NOW() - INTERVAL '30 days';

-- ============================================
-- STEP 4b: Delete ALL generated_images
-- ============================================
-- Removes ALL generated images
-- WARNING: This will free up significant space!
-- Use this if you want to delete everything

DELETE FROM generated_images;

-- ============================================
-- STEP 5: Delete test data
-- ============================================
-- Removes test sessions, projects, and user_profiles
-- WARNING: This will cascade delete related data!

-- Delete test sessions
DELETE FROM sessions 
WHERE user_hash LIKE 'test%' OR user_hash LIKE 'TEST%';

-- Delete test projects (cascades to related data)
DELETE FROM projects 
WHERE user_hash LIKE 'test%' OR user_hash LIKE 'TEST%';

-- Delete test user_profiles
DELETE FROM user_profiles 
WHERE user_hash LIKE 'test%' OR user_hash LIKE 'TEST%';

-- ============================================
-- STEP 6: Check Storage size
-- ============================================
-- Check how much space is used in storage bucket

SELECT 
  COUNT(*) AS file_count, 
  SUM((metadata->>'size')::bigint) / 1024 / 1024 AS total_mb
FROM storage.objects
WHERE bucket_id = 'aura-assets';

-- ============================================
-- STEP 7: Verify cleanup
-- ============================================
-- Check table sizes again after cleanup

SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS total_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;

-- ============================================
-- STEP 8: Reclaim disk space (OPTIONAL)
-- ============================================
-- Run vacuum_full.sql in a SEPARATE query after deletions
-- 
-- NOTE: Supabase also automatically reclaims space in the background
-- You may not need to run VACUUM manually - check disk usage first
-- in Dashboard -> Settings -> Database

-- ============================================
-- NOTE: Automated cleanup (cron) REMOVED
-- ============================================
-- DO NOT enable automatic cleanup during research!
-- It will delete data you need for your thesis.
-- Run cleanup manually only when you're sure you don't need the data.

