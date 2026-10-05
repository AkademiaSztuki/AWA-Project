-- Aggregate snapshot only. No participant identifiers.
\pset footer off

\echo === OVERVIEW ===
SELECT COUNT(*)::int AS total,
  COUNT(*) FILTER (WHERE path_type = 'full')::int AS full_path,
  COUNT(*) FILTER (WHERE path_type = 'fast')::int AS fast_path,
  COUNT(*) FILTER (WHERE path_type IS NULL OR path_type NOT IN ('full','fast'))::int AS other_path,
  COUNT(*) FILTER (WHERE session_export_json IS NOT NULL)::int AS session_export,
  COUNT(*) FILTER (WHERE core_profile_complete IS TRUE)::int AS core_complete,
  COUNT(*) FILTER (WHERE consent_timestamp IS NOT NULL)::int AS with_consent_ts,
  COUNT(*) FILTER (WHERE big5_completed_at IS NOT NULL)::int AS big5_done,
  COUNT(*) FILTER (WHERE blind_selection_made IS TRUE)::int AS blind_selected,
  COUNT(*) FILTER (WHERE tinder_total_swipes > 0)::int AS with_swipes,
  COUNT(*) FILTER (WHERE generations_count > 0)::int AS with_generations,
  MAX(updated_at) AS last_updated,
  MIN(created_at) AS first_created
FROM participants;

\echo === FULL WITH EXPORT ===
SELECT COUNT(*)::int AS full_with_session_export
FROM participants
WHERE path_type = 'full' AND session_export_json IS NOT NULL;

\echo === TABLES ===
SELECT 'participants' AS tbl, COUNT(*)::int AS n FROM participants
UNION ALL SELECT 'participant_swipes', COUNT(*)::int FROM participant_swipes
UNION ALL SELECT 'participant_generations', COUNT(*)::int FROM participant_generations
UNION ALL SELECT 'participant_matrix_entries', COUNT(*)::int FROM participant_matrix_entries
UNION ALL SELECT 'participant_research_events', COUNT(*)::int FROM participant_research_events
UNION ALL SELECT 'research_consents', COUNT(*)::int FROM research_consents
ORDER BY tbl;

\echo === PATH ===
SELECT COALESCE(path_type, '(null)') AS path_type, COUNT(*)::int AS n
FROM participants GROUP BY 1 ORDER BY n DESC;

\echo === FUNNEL ===
SELECT
  COUNT(*)::int AS rows,
  COUNT(*) FILTER (WHERE consent_timestamp IS NOT NULL)::int AS consent,
  COUNT(*) FILTER (WHERE core_profile_complete IS TRUE)::int AS core_profile,
  COUNT(*) FILTER (WHERE tinder_total_swipes > 0)::int AS swipes,
  COUNT(*) FILTER (WHERE big5_completed_at IS NOT NULL)::int AS big5,
  COUNT(*) FILTER (WHERE generations_count > 0)::int AS generations,
  COUNT(*) FILTER (WHERE session_export_json IS NOT NULL)::int AS session_export,
  COUNT(*) FILTER (WHERE blind_selection_made IS TRUE)::int AS blind_choice
FROM participants;

\echo === MATRIX SOURCES ===
SELECT COALESCE(source, '(null)') AS source,
  COUNT(*)::int AS entries,
  COUNT(*) FILTER (WHERE is_selected IS TRUE)::int AS selected
FROM participant_matrix_entries
GROUP BY 1
ORDER BY selected DESC, entries DESC;

\echo === DAILY UPDATES 30D ===
SELECT to_char(date_trunc('day', updated_at AT TIME ZONE 'Europe/Warsaw'), 'YYYY-MM-DD') AS day,
  COUNT(*)::int AS participants_updated
FROM participants
WHERE updated_at >= (NOW() AT TIME ZONE 'Europe/Warsaw') - INTERVAL '45 days'
GROUP BY 1
ORDER BY 1;

\echo === UX MEANS ===
SELECT
  ROUND(AVG(sus_score)::numeric, 2) AS sus_mean,
  ROUND(AVG(clarity_score)::numeric, 2) AS clarity_mean,
  ROUND(AVG(agency_score)::numeric, 2) AS agency_mean,
  ROUND(AVG(satisfaction_score)::numeric, 2) AS satisfaction_mean,
  COUNT(sus_score)::int AS sus_n,
  COUNT(clarity_score)::int AS clarity_n,
  COUNT(agency_score)::int AS agency_n,
  COUNT(satisfaction_score)::int AS satisfaction_n
FROM participants;

\echo === GENERATIONS STATUS ===
SELECT COALESCE(status, '(null)') AS status, COUNT(*)::int AS n
FROM participant_generations
GROUP BY 1
ORDER BY n DESC;

\echo === SWIPE DIRECTION ===
SELECT COALESCE(direction, '(null)') AS direction, COUNT(*)::int AS n
FROM participant_swipes
GROUP BY 1
ORDER BY n DESC;
