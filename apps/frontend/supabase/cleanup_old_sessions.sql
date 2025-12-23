-- ============================================
-- CLEANUP OLD SESSIONS (if they exist)
-- ============================================
-- This removes sessions older than 30 days
-- Run AFTER checking what's taking up space
-- ============================================

-- First, check how many old sessions exist
SELECT 
  COUNT(*) as old_sessions_count,
  pg_size_pretty(SUM(pg_column_size(session_json))) as total_size
FROM sessions
WHERE updated_at < NOW() - INTERVAL '30 days';

-- If you want to delete them, uncomment below:
-- DELETE FROM sessions 
-- WHERE updated_at < NOW() - INTERVAL '30 days';

-- ============================================
-- ALTERNATIVE: Archive large sessions
-- ============================================
-- Instead of deleting, you could export large sessions to JSON files
-- and then delete them from database

-- Find sessions larger than 1MB
SELECT 
  user_hash,
  pg_size_pretty(pg_column_size(session_json)) as size,
  updated_at
FROM sessions
WHERE pg_column_size(session_json) > 1048576  -- 1MB
ORDER BY pg_column_size(session_json) DESC;

