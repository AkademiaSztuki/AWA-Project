-- ============================================
-- DROP legacy tables after radical refactor
-- IMPORTANT: Apply only after verifying app runs on participants/participant_* tables.
-- ============================================

-- Core legacy blobs / redundant structures
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS survey_results CASCADE;
DROP TABLE IF EXISTS tinder_swipes CASCADE;
DROP TABLE IF EXISTS dna_snapshots CASCADE;

-- Unused domain tables
DROP TABLE IF EXISTS households CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS design_sessions CASCADE;
DROP TABLE IF EXISTS discovery_sessions CASCADE;

-- Old generation tables
DROP TABLE IF EXISTS generation_sets CASCADE;
DROP TABLE IF EXISTS generated_images CASCADE;

-- Old dashboard tables
DROP TABLE IF EXISTS spaces CASCADE;
DROP TABLE IF EXISTS space_images CASCADE;

-- Old auxiliary / experiments
DROP TABLE IF EXISTS enhanced_swipes CASCADE;
DROP TABLE IF EXISTS ladder_paths CASCADE;
DROP TABLE IF EXISTS ladder_summary CASCADE;
DROP TABLE IF EXISTS image_ratings_history CASCADE;
DROP TABLE IF EXISTS tinder_exposures CASCADE;
DROP TABLE IF EXISTS device_context_snapshots CASCADE;
DROP TABLE IF EXISTS behavioral_logs CASCADE;
DROP TABLE IF EXISTS page_views CASCADE;
DROP TABLE IF EXISTS projects CASCADE;

-- Old infra tables (optional)
DROP TABLE IF EXISTS health_checks CASCADE;
DROP TABLE IF EXISTS errors CASCADE;
DROP TABLE IF EXISTS generation_matrix_results CASCADE;
DROP TABLE IF EXISTS generation_matrix_sessions CASCADE;


