-- ============================================================================
-- AWA — zapytania kontrolne zapisu w Cloud SQL (PostgreSQL)
-- Użycie: zamień :user_hash, :auth_user_id, :user_id_text, :session_id na literały
--         lub użyj prepared statements ($1, $2, …) w psql / aplikacji.
-- ============================================================================

-- --- Uczestnik + ścieżka (badawczo: full vs fast) --------------------------
SELECT
  user_hash,
  path_type,
  auth_user_id,
  consent_timestamp,
  current_step,
  core_profile_complete,
  core_profile_completed_at,
  updated_at
FROM participants
WHERE user_hash = :user_hash;  -- literal, np. 'user_abc123'

-- Kohorty (np. ostatnie 7 dni)
SELECT path_type, COUNT(*) AS n
FROM participants
WHERE updated_at > NOW() - INTERVAL '7 days'
GROUP BY path_type;

-- --- Powiązanie konta --------------------------------------------------------
SELECT user_hash, auth_user_id
FROM participants
WHERE auth_user_id = :auth_user_id;

-- --- Swipy (szczegółowy ślad zachowań) ---------------------------------------
SELECT COUNT(*) AS swipe_rows
FROM participant_swipes
WHERE user_hash = :user_hash;  -- literal, np. 'user_abc123'

SELECT
  image_id,
  direction,
  reaction_time_ms,
  swipe_timestamp
FROM participant_swipes
WHERE user_hash = :user_hash
ORDER BY swipe_timestamp DESC
LIMIT 50;

-- --- Generacje ---------------------------------------------------------------
SELECT id, job_type, status, started_at, finished_at, latency_ms
FROM participant_generations
WHERE user_hash = :user_hash
ORDER BY started_at DESC
LIMIT 30;

-- --- Macierz 6 wizji (POST /api/participants/:userHash/matrix/sync) ----------
-- Wymaga migracji: infra/gcp/sql/09_participant_research_extensions.sql
SELECT COUNT(*) AS matrix_entry_rows
FROM participant_matrix_entries
WHERE user_hash = :user_hash;

SELECT
  step_index,
  client_id,
  label,
  source,
  is_selected,
  image_url,
  extra,
  created_at
FROM participant_matrix_entries
WHERE user_hash = :user_hash
ORDER BY step_index ASC;

-- --- Obrazy (metadane + ścieżki do GCS) --------------------------------------
SELECT id, type, storage_path, public_url, created_at, generation_id
FROM participant_images
WHERE user_hash = :user_hash
ORDER BY created_at DESC
LIMIT 50;

-- --- Spaces (jeśli używane) --------------------------------------------------
-- Nazwa tabeli z migracji: participant_spaces
SELECT *
FROM participant_spaces
WHERE user_hash = :user_hash;  -- literal, np. 'user_abc123'

-- --- Zgoda badawcza ----------------------------------------------------------
SELECT id, user_id, consent_version, locale, created_at
FROM research_consents
WHERE user_id = :user_id_text;

-- --- Feedback / regeneracje (sesje generacji) -------------------------------
SELECT session_id, selection_time_ms, user_rating, created_at
FROM generation_feedback
WHERE session_id = :session_id
LIMIT 20;

SELECT session_id, regeneration_count, interpretation, created_at
FROM regeneration_events
WHERE session_id = :session_id
LIMIT 20;

-- ============================================================================
-- Implicit vs explicit + Big Five (wykresy / porównania)
-- ============================================================================
SELECT
  user_hash,
  path_type,
  implicit_warmth,
  explicit_warmth,
  implicit_brightness,
  explicit_brightness,
  implicit_complexity,
  explicit_complexity,
  implicit_dominant_style,
  explicit_style,
  dna_accuracy_score,
  big5_openness,
  big5_conscientiousness,
  big5_extraversion,
  big5_agreeableness,
  big5_neuroticism
FROM participants
WHERE user_hash = :user_hash;  -- literal, np. 'user_abc123'

-- JSON pod rozkłady (sprawdź czy NOT NULL po /flow/big-five)
SELECT
  user_hash,
  big5_responses IS NOT NULL AS has_big5_responses,
  big5_facets IS NOT NULL AS has_big5_facets,
  sus_answers IS NOT NULL AS has_sus_answers,
  clarity_answers IS NOT NULL AS has_clarity_answers
FROM participants
WHERE user_hash = :user_hash;  -- literal, np. 'user_abc123'

-- --- Monitoring jakości zbioru (opcjonalnie) ----------------------------------
SELECT
  'participants' AS tbl,
  COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '24 hours') AS last_24h
FROM participants
UNION ALL
SELECT 'participant_swipes', COUNT(*) FILTER (WHERE COALESCE(swipe_timestamp, created_at) > NOW() - INTERVAL '24 hours')
FROM participant_swipes
UNION ALL
SELECT 'participant_generations', COUNT(*) FILTER (WHERE started_at > NOW() - INTERVAL '24 hours')
FROM participant_generations;
