-- ============================================
-- VACUUM - Reclaim disk space
-- ============================================
-- Run this AFTER completing cleanup_database.sql
--
-- NOTE: VACUUM FULL may not work in Supabase (requires superuser)
-- This uses regular VACUUM which works in most cases
--
-- Instructions:
-- 1. Open NEW query in Supabase SQL Editor
-- 2. Paste this file
-- 3. Run it
-- ============================================

-- Regular VACUUM (works in Supabase)
VACUUM;

-- Analyze tables for better query performance
ANALYZE;

-- ============================================
-- ALTERNATIVE: If VACUUM doesn't work
-- ============================================
-- Supabase automatically runs VACUUM in the background
-- The space will be reclaimed automatically within 24 hours
-- You can check disk usage in: Dashboard -> Settings -> Database

