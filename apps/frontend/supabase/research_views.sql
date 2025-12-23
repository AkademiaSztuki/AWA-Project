-- ============================================
-- RESEARCH DATA VIEWS FOR ANALYTICS
-- ============================================
-- Create views for easy data analysis and visualization
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- VIEW 1: Participants Summary
-- ============================================
CREATE OR REPLACE VIEW research_participants_summary AS
SELECT 
  COUNT(DISTINCT user_hash) as total_participants,
  COUNT(DISTINCT CASE WHEN session_json->>'pathType' = 'fast' THEN user_hash END) as fast_track_users,
  COUNT(DISTINCT CASE WHEN session_json->>'pathType' = 'full' THEN user_hash END) as full_experience_users,
  COUNT(DISTINCT CASE WHEN session_json->>'consentTimestamp' IS NOT NULL THEN user_hash END) as consented_users,
  AVG(EXTRACT(EPOCH FROM (updated_at - (session_json->>'consentTimestamp')::timestamptz))/60) as avg_session_duration_minutes
FROM sessions
WHERE session_json IS NOT NULL;

-- ============================================
-- VIEW 2: Tinder Swipes Analysis
-- ============================================
CREATE OR REPLACE VIEW research_tinder_analysis AS
SELECT 
  ts.project_id,
  COUNT(*) as total_swipes,
  SUM(CASE WHEN direction = 'right' THEN 1 ELSE 0 END) as likes,
  SUM(CASE WHEN direction = 'left' THEN 1 ELSE 0 END) as dislikes,
  AVG(reaction_time_ms) as avg_reaction_time_ms,
  AVG(drag_distance) as avg_drag_distance,
  ROUND(SUM(CASE WHEN direction = 'right' THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 2) as like_rate_percent,
  MIN(reaction_time_ms) as min_reaction_time,
  MAX(reaction_time_ms) as max_reaction_time
FROM tinder_swipes ts
GROUP BY ts.project_id;

-- ============================================
-- VIEW 3: Style Preferences from DNA
-- ============================================
CREATE OR REPLACE VIEW research_style_preferences AS
SELECT 
  ds.project_id,
  ds.weights->>'scandinavian' as scandinavian_weight,
  ds.weights->>'minimalist' as minimalist_weight,
  ds.weights->>'modern' as modern_weight,
  ds.weights->>'industrial' as industrial_weight,
  ds.weights->>'bohemian' as bohemian_weight,
  ds.weights->>'rustic' as rustic_weight,
  ds.weights->>'contemporary' as contemporary_weight,
  ds.confidence,
  ds.created_at
FROM dna_snapshots ds;

-- ============================================
-- VIEW 4: Survey Results (SUS scores)
-- ============================================
CREATE OR REPLACE VIEW research_sus_scores AS
SELECT 
  session_id,
  sus_score,
  answers,
  timestamp,
  CASE 
    WHEN sus_score >= 80 THEN 'Excellent'
    WHEN sus_score >= 68 THEN 'Good'
    WHEN sus_score >= 51 THEN 'OK'
    ELSE 'Poor'
  END as usability_rating
FROM survey_results
WHERE type = 'sus' AND sus_score IS NOT NULL;

-- ============================================
-- VIEW 5: Clarity Survey Results
-- ============================================
CREATE OR REPLACE VIEW research_clarity_scores AS
SELECT 
  session_id,
  clarity_score,
  answers,
  timestamp
FROM survey_results
WHERE type = 'clarity' AND clarity_score IS NOT NULL;

-- ============================================
-- VIEW 6: Generation Feedback Analysis
-- ============================================
-- NOTE: This view requires generation_feedback table
-- If generation_feedback table doesn't exist, comment out this view
-- To create the table, run: 20250101000000_create_feedback_tables.sql
-- ============================================
-- Uncomment below if generation_feedback table exists:
/*
CREATE OR REPLACE VIEW research_generation_analysis AS
SELECT 
  gf.session_id,
  gf.generated_sources,
  gf.selected_source,
  gf.selection_time_ms,
  gf.has_complete_bigfive,
  gf.tinder_swipe_count,
  gf.explicit_answer_count,
  gf.user_rating,
  gf.source_quality,
  gf.created_at
FROM generation_feedback gf;
*/

-- ============================================
-- VIEW 7: Big Five Personality Scores
-- ============================================
CREATE OR REPLACE VIEW research_big_five AS
SELECT 
  user_hash,
  session_json->'bigFive'->'scores'->'domains'->>'O' as openness,
  session_json->'bigFive'->'scores'->'domains'->>'C' as conscientiousness,
  session_json->'bigFive'->'scores'->'domains'->>'E' as extraversion,
  session_json->'bigFive'->'scores'->'domains'->>'A' as agreeableness,
  session_json->'bigFive'->'scores'->'domains'->>'N' as neuroticism,
  session_json->'bigFive'->>'completedAt' as completed_at
FROM sessions
WHERE session_json->'bigFive'->'scores'->'domains' IS NOT NULL;

-- ============================================
-- VIEW 8: Complete Research Export (Flattened)
-- ============================================
CREATE OR REPLACE VIEW research_complete_export AS
SELECT 
  s.user_hash,
  s.session_json->>'pathType' as path_type,
  s.session_json->'demographics'->>'ageRange' as age_range,
  s.session_json->'demographics'->>'gender' as gender,
  s.session_json->'demographics'->>'education' as education,
  s.session_json->'demographics'->>'country' as country,
  -- Visual DNA
  s.session_json->'visualDNA'->'preferences'->'styles' as preferred_styles,
  s.session_json->'visualDNA'->>'accuracyScore' as dna_accuracy,
  -- Lifestyle
  s.session_json->'lifestyle'->>'livingSituation' as living_situation,
  s.session_json->'lifestyle'->>'lifeVibe' as life_vibe,
  -- Big Five
  s.session_json->'bigFive'->'scores'->'domains'->>'O' as openness,
  s.session_json->'bigFive'->'scores'->'domains'->>'C' as conscientiousness,
  s.session_json->'bigFive'->'scores'->'domains'->>'E' as extraversion,
  s.session_json->'bigFive'->'scores'->'domains'->>'A' as agreeableness,
  s.session_json->'bigFive'->'scores'->'domains'->>'N' as neuroticism,
  -- Surveys
  s.session_json->'surveyData'->>'susScore' as sus_score,
  s.session_json->'surveyData'->>'clarityScore' as clarity_score,
  -- Timestamps
  s.updated_at
FROM sessions s;

-- ============================================
-- VIEW 9: Style Distribution
-- ============================================
CREATE OR REPLACE VIEW research_style_distribution AS
SELECT 
  style_name,
  COUNT(*) as count,
  ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM dna_snapshots) * 100, 2) as percentage
FROM (
  SELECT 
    project_id,
    CASE 
      WHEN (weights->>'scandinavian')::numeric > 0.3 THEN 'Scandinavian'
      WHEN (weights->>'minimalist')::numeric > 0.3 THEN 'Minimalist'
      WHEN (weights->>'modern')::numeric > 0.3 THEN 'Modern'
      WHEN (weights->>'industrial')::numeric > 0.3 THEN 'Industrial'
      WHEN (weights->>'bohemian')::numeric > 0.3 THEN 'Bohemian'
      ELSE 'Mixed'
    END as style_name
  FROM dna_snapshots
) sub
GROUP BY style_name
ORDER BY count DESC;

-- ============================================
-- VIEW 10: Reaction Time Distribution
-- ============================================
CREATE OR REPLACE VIEW research_reaction_times AS
SELECT 
  CASE 
    WHEN reaction_time_ms < 500 THEN 'Very Fast (<500ms)'
    WHEN reaction_time_ms < 1000 THEN 'Fast (500-1000ms)'
    WHEN reaction_time_ms < 2000 THEN 'Medium (1-2s)'
    WHEN reaction_time_ms < 3000 THEN 'Slow (2-3s)'
    ELSE 'Very Slow (>3s)'
  END as reaction_category,
  COUNT(*) as count,
  AVG(reaction_time_ms) as avg_reaction_time,
  direction
FROM tinder_swipes
WHERE reaction_time_ms IS NOT NULL
GROUP BY reaction_category, direction
ORDER BY avg_reaction_time;

-- ============================================
-- VIEW 11: Complete Research Export v2 (ALL FIELDS)
-- ============================================
CREATE OR REPLACE VIEW research_full_export_v2 AS
SELECT 
  -- === IDENTYFIKACJA ===
  s.user_hash,
  s.updated_at as last_activity,
  s.session_json->>'consentTimestamp' as consent_timestamp,
  s.session_json->>'pathType' as path_type,
  s.session_json->>'currentStep' as current_step,
  
  -- === DEMOGRAFIA ===
  s.session_json->'demographics'->>'ageRange' as age_range,
  s.session_json->'demographics'->>'gender' as gender,
  s.session_json->'demographics'->>'country' as country,
  s.session_json->'demographics'->>'education' as education,
  
  -- === BIG FIVE (IPIP-NEO-120) ===
  s.session_json->'bigFive'->>'instrument' as big5_instrument,
  (s.session_json->'bigFive'->'scores'->'domains'->>'O')::numeric as big5_openness,
  (s.session_json->'bigFive'->'scores'->'domains'->>'C')::numeric as big5_conscientiousness,
  (s.session_json->'bigFive'->'scores'->'domains'->>'E')::numeric as big5_extraversion,
  (s.session_json->'bigFive'->'scores'->'domains'->>'A')::numeric as big5_agreeableness,
  (s.session_json->'bigFive'->'scores'->'domains'->>'N')::numeric as big5_neuroticism,
  s.session_json->'bigFive'->'scores'->'facets' as big5_facets_json,
  s.session_json->'bigFive'->>'completedAt' as big5_completed_at,
  s.session_json->'bigFive'->'responses' as big5_responses_json,
  
  -- === VISUAL DNA (IMPLICIT) - TAGI JAKO KOLUMNY ===
  s.session_json->'visualDNA'->>'dominantStyle' as implicit_dominant_style,
  (s.session_json->'visualDNA'->'preferences'->'styles'->>0)::text as implicit_style_1,
  (s.session_json->'visualDNA'->'preferences'->'styles'->>1)::text as implicit_style_2,
  (s.session_json->'visualDNA'->'preferences'->'styles'->>2)::text as implicit_style_3,
  (s.session_json->'visualDNA'->'preferences'->'colors'->>0)::text as implicit_color_1,
  (s.session_json->'visualDNA'->'preferences'->'colors'->>1)::text as implicit_color_2,
  (s.session_json->'visualDNA'->'preferences'->'colors'->>2)::text as implicit_color_3,
  (s.session_json->'visualDNA'->'preferences'->'materials'->>0)::text as implicit_material_1,
  (s.session_json->'visualDNA'->'preferences'->'materials'->>1)::text as implicit_material_2,
  (s.session_json->'visualDNA'->'preferences'->'materials'->>2)::text as implicit_material_3,
  (s.session_json->'visualDNA'->>'accuracyScore')::numeric as dna_accuracy_score,
  s.session_json->'visualDNA'->'preferences'->'lighting' as implicit_lighting,
  (s.session_json->>'dnaAccuracyScore')::numeric as dna_accuracy_score_alt,
  
  -- === EXPLICIT PREFERENCES ===
  (s.session_json->'semanticDifferential'->>'warmth')::numeric as explicit_warmth,
  (s.session_json->'semanticDifferential'->>'brightness')::numeric as explicit_brightness,
  (s.session_json->'semanticDifferential'->>'complexity')::numeric as explicit_complexity,
  (s.session_json->'semanticDifferential'->>'texture')::numeric as explicit_texture,
  s.session_json->'colorsAndMaterials'->>'selectedPalette' as explicit_palette,
  s.session_json->'colorsAndMaterials'->>'selectedStyle' as explicit_style,
  (s.session_json->'colorsAndMaterials'->'topMaterials'->>0)::text as explicit_material_1,
  (s.session_json->'colorsAndMaterials'->'topMaterials'->>1)::text as explicit_material_2,
  (s.session_json->'colorsAndMaterials'->'topMaterials'->>2)::text as explicit_material_3,
  
  -- === SENSORY / BIOPHILIA ===
  s.session_json->'sensoryPreferences'->>'music' as sensory_music,
  s.session_json->'sensoryPreferences'->>'texture' as sensory_texture,
  s.session_json->'sensoryPreferences'->>'light' as sensory_light,
  (s.session_json->>'biophiliaScore')::numeric as biophilia_score,
  s.session_json->>'natureMetaphor' as nature_metaphor,
  
  -- === LIFESTYLE ===
  s.session_json->'lifestyle'->>'livingSituation' as living_situation,
  s.session_json->'lifestyle'->>'lifeVibe' as life_vibe,
  s.session_json->'lifestyle'->'goals' as life_goals_json,
  
  -- === ASPIRATIONAL ===
  s.session_json->'aspirationalSelf'->'feelings' as aspirational_feelings_json,
  s.session_json->'aspirationalSelf'->'rituals' as aspirational_rituals_json,
  
  -- === PRS (MOOD GRID) ===
  (s.session_json->'prsIdeal'->>'x')::numeric as prs_ideal_x,
  (s.session_json->'prsIdeal'->>'y')::numeric as prs_ideal_y,
  (s.session_json->'prsCurrent'->>'x')::numeric as prs_current_x,
  (s.session_json->'prsCurrent'->>'y')::numeric as prs_current_y,
  (s.session_json->'prsTarget'->>'x')::numeric as prs_target_x,
  (s.session_json->'prsTarget'->>'y')::numeric as prs_target_y,
  
  -- === LADDERING ===
  s.session_json->'ladderResults'->'path' as ladder_path_json,
  s.session_json->'ladderResults'->>'coreNeed' as ladder_core_need,
  s.session_json->'ladderResults'->'promptElements' as ladder_prompt_elements_json,
  s.session_json->'ladderPath' as ladder_path_alt_json,
  s.session_json->>'coreNeed' as core_need_alt,
  
  -- === SURVEYS ===
  (s.session_json->'surveyData'->>'susScore')::numeric as sus_score,
  (s.session_json->'surveyData'->>'clarityScore')::numeric as clarity_score,
  (s.session_json->'surveyData'->>'agencyScore')::numeric as agency_score,
  (s.session_json->'surveyData'->>'satisfactionScore')::numeric as satisfaction_score,
  s.session_json->'surveyData'->'susAnswers' as sus_answers_json,
  s.session_json->'surveyData'->'agencyAnswers' as agency_answers_json,
  s.session_json->'surveyData'->'satisfactionAnswers' as satisfaction_answers_json,
  s.session_json->'surveyData'->'clarityAnswers' as clarity_answers_json,
  
  -- === ROOM DATA ===
  s.session_json->>'roomType' as room_type,
  s.session_json->>'roomName' as room_name,
  s.session_json->>'roomUsageType' as room_usage_type,
  s.session_json->'roomSharedWith' as room_shared_with_json,
  s.session_json->'roomPainPoints' as room_pain_points_json,
  s.session_json->'roomActivities' as room_activities_json,
  s.session_json->'roomAnalysis'->>'detected_room_type' as detected_room_type,
  (s.session_json->'roomAnalysis'->>'confidence')::numeric as room_analysis_confidence,
  s.session_json->'roomAnalysis'->>'room_description' as room_description,
  s.session_json->'roomAnalysis'->'suggestions' as room_suggestions_json,
  
  -- === TINDER STATS ===
  jsonb_array_length(COALESCE(s.session_json->'tinderResults', '[]'::jsonb)) as tinder_total_swipes,
  (SELECT COUNT(*) FROM jsonb_array_elements(COALESCE(s.session_json->'tinderResults', '[]'::jsonb)) elem 
   WHERE elem->>'direction' = 'right') as tinder_likes,
  (SELECT COUNT(*) FROM jsonb_array_elements(COALESCE(s.session_json->'tinderResults', '[]'::jsonb)) elem 
   WHERE elem->>'direction' = 'left') as tinder_dislikes,
  s.session_json->'tinderData'->>'totalImages' as tinder_total_images,
  
  -- === SPACES / IMAGES (liczniki) ===
  jsonb_array_length(COALESCE(s.session_json->'spaces', '[]'::jsonb)) as spaces_count,
  jsonb_array_length(COALESCE(s.session_json->'inspirations', '[]'::jsonb)) as inspirations_count,
  jsonb_array_length(COALESCE(s.session_json->'generations', '[]'::jsonb)) as generations_count,
  
  -- === TAGI INSPIRACJI - AGGREGATED TOP 3 ===
  -- Aggregate styles from all inspirations (flatten and get top 3)
  (SELECT DISTINCT style FROM (
    SELECT unnest(insp->'tags'->'styles')::text as style
    FROM jsonb_array_elements(COALESCE(s.session_json->'inspirations', '[]'::jsonb)) insp
    WHERE insp->'tags'->'styles' IS NOT NULL
  ) styles ORDER BY style LIMIT 1 OFFSET 0) as inspiration_style_1,
  (SELECT DISTINCT style FROM (
    SELECT unnest(insp->'tags'->'styles')::text as style
    FROM jsonb_array_elements(COALESCE(s.session_json->'inspirations', '[]'::jsonb)) insp
    WHERE insp->'tags'->'styles' IS NOT NULL
  ) styles ORDER BY style LIMIT 1 OFFSET 1) as inspiration_style_2,
  (SELECT DISTINCT style FROM (
    SELECT unnest(insp->'tags'->'styles')::text as style
    FROM jsonb_array_elements(COALESCE(s.session_json->'inspirations', '[]'::jsonb)) insp
    WHERE insp->'tags'->'styles' IS NOT NULL
  ) styles ORDER BY style LIMIT 1 OFFSET 2) as inspiration_style_3,
  -- Aggregate colors
  (SELECT DISTINCT color FROM (
    SELECT unnest(insp->'tags'->'colors')::text as color
    FROM jsonb_array_elements(COALESCE(s.session_json->'inspirations', '[]'::jsonb)) insp
    WHERE insp->'tags'->'colors' IS NOT NULL
  ) colors ORDER BY color LIMIT 1 OFFSET 0) as inspiration_color_1,
  (SELECT DISTINCT color FROM (
    SELECT unnest(insp->'tags'->'colors')::text as color
    FROM jsonb_array_elements(COALESCE(s.session_json->'inspirations', '[]'::jsonb)) insp
    WHERE insp->'tags'->'colors' IS NOT NULL
  ) colors ORDER BY color LIMIT 1 OFFSET 1) as inspiration_color_2,
  (SELECT DISTINCT color FROM (
    SELECT unnest(insp->'tags'->'colors')::text as color
    FROM jsonb_array_elements(COALESCE(s.session_json->'inspirations', '[]'::jsonb)) insp
    WHERE insp->'tags'->'colors' IS NOT NULL
  ) colors ORDER BY color LIMIT 1 OFFSET 2) as inspiration_color_3,
  -- Aggregate materials
  (SELECT DISTINCT material FROM (
    SELECT unnest(insp->'tags'->'materials')::text as material
    FROM jsonb_array_elements(COALESCE(s.session_json->'inspirations', '[]'::jsonb)) insp
    WHERE insp->'tags'->'materials' IS NOT NULL
  ) materials ORDER BY material LIMIT 1 OFFSET 0) as inspiration_material_1,
  (SELECT DISTINCT material FROM (
    SELECT unnest(insp->'tags'->'materials')::text as material
    FROM jsonb_array_elements(COALESCE(s.session_json->'inspirations', '[]'::jsonb)) insp
    WHERE insp->'tags'->'materials' IS NOT NULL
  ) materials ORDER BY material LIMIT 1 OFFSET 1) as inspiration_material_2,
  (SELECT DISTINCT material FROM (
    SELECT unnest(insp->'tags'->'materials')::text as material
    FROM jsonb_array_elements(COALESCE(s.session_json->'inspirations', '[]'::jsonb)) insp
    WHERE insp->'tags'->'materials' IS NOT NULL
  ) materials ORDER BY material LIMIT 1 OFFSET 2) as inspiration_material_3,
  -- Average biophilia from inspirations
  (SELECT AVG((insp->'tags'->>'biophilia')::numeric)
   FROM jsonb_array_elements(COALESCE(s.session_json->'inspirations', '[]'::jsonb)) insp
   WHERE insp->'tags'->>'biophilia' IS NOT NULL
  ) as inspiration_biophilia_avg,
  
  -- === PROFILE COMPLETION ===
  (s.session_json->>'coreProfileComplete')::boolean as core_profile_complete,
  s.session_json->>'coreProfileCompletedAt' as core_profile_completed_at,
  
  -- === RAW JSON (dla szczegolowej analizy) ===
  s.session_json as full_session_json
  
FROM sessions s
WHERE s.session_json->>'consentTimestamp' IS NOT NULL;

-- ============================================
-- VIEW 12: Detailed Swipes (with tags)
-- ============================================
CREATE OR REPLACE VIEW research_swipes_detailed AS
SELECT 
  s.user_hash,
  elem->>'imageId' as image_id,
  elem->>'direction' as direction,
  (elem->>'reactionTimeMs')::integer as reaction_time_ms,
  elem->>'timestamp' as swipe_timestamp,
  -- Extract tags from image metadata if available
  elem->'tags'->'styles' as image_styles_json,
  elem->'tags'->'colors' as image_colors_json,
  elem->'tags'->'materials' as image_materials_json
FROM sessions s,
jsonb_array_elements(COALESCE(s.session_json->'tinderResults', '[]'::jsonb)) elem
WHERE s.session_json->>'consentTimestamp' IS NOT NULL;

-- ============================================
-- VIEW 13: Big Five Facets (30 facets as columns)
-- ============================================
CREATE OR REPLACE VIEW research_bigfive_facets AS
SELECT 
  s.user_hash,
  s.session_json->'bigFive'->>'completedAt' as completed_at,
  -- Openness facets (O1-O6)
  (s.session_json->'bigFive'->'scores'->'facets'->'O'->>'1')::numeric as facet_O1,
  (s.session_json->'bigFive'->'scores'->'facets'->'O'->>'2')::numeric as facet_O2,
  (s.session_json->'bigFive'->'scores'->'facets'->'O'->>'3')::numeric as facet_O3,
  (s.session_json->'bigFive'->'scores'->'facets'->'O'->>'4')::numeric as facet_O4,
  (s.session_json->'bigFive'->'scores'->'facets'->'O'->>'5')::numeric as facet_O5,
  (s.session_json->'bigFive'->'scores'->'facets'->'O'->>'6')::numeric as facet_O6,
  -- Conscientiousness facets (C1-C6)
  (s.session_json->'bigFive'->'scores'->'facets'->'C'->>'1')::numeric as facet_C1,
  (s.session_json->'bigFive'->'scores'->'facets'->'C'->>'2')::numeric as facet_C2,
  (s.session_json->'bigFive'->'scores'->'facets'->'C'->>'3')::numeric as facet_C3,
  (s.session_json->'bigFive'->'scores'->'facets'->'C'->>'4')::numeric as facet_C4,
  (s.session_json->'bigFive'->'scores'->'facets'->'C'->>'5')::numeric as facet_C5,
  (s.session_json->'bigFive'->'scores'->'facets'->'C'->>'6')::numeric as facet_C6,
  -- Extraversion facets (E1-E6)
  (s.session_json->'bigFive'->'scores'->'facets'->'E'->>'1')::numeric as facet_E1,
  (s.session_json->'bigFive'->'scores'->'facets'->'E'->>'2')::numeric as facet_E2,
  (s.session_json->'bigFive'->'scores'->'facets'->'E'->>'3')::numeric as facet_E3,
  (s.session_json->'bigFive'->'scores'->'facets'->'E'->>'4')::numeric as facet_E4,
  (s.session_json->'bigFive'->'scores'->'facets'->'E'->>'5')::numeric as facet_E5,
  (s.session_json->'bigFive'->'scores'->'facets'->'E'->>'6')::numeric as facet_E6,
  -- Agreeableness facets (A1-A6)
  (s.session_json->'bigFive'->'scores'->'facets'->'A'->>'1')::numeric as facet_A1,
  (s.session_json->'bigFive'->'scores'->'facets'->'A'->>'2')::numeric as facet_A2,
  (s.session_json->'bigFive'->'scores'->'facets'->'A'->>'3')::numeric as facet_A3,
  (s.session_json->'bigFive'->'scores'->'facets'->'A'->>'4')::numeric as facet_A4,
  (s.session_json->'bigFive'->'scores'->'facets'->'A'->>'5')::numeric as facet_A5,
  (s.session_json->'bigFive'->'scores'->'facets'->'A'->>'6')::numeric as facet_A6,
  -- Neuroticism facets (N1-N6)
  (s.session_json->'bigFive'->'scores'->'facets'->'N'->>'1')::numeric as facet_N1,
  (s.session_json->'bigFive'->'scores'->'facets'->'N'->>'2')::numeric as facet_N2,
  (s.session_json->'bigFive'->'scores'->'facets'->'N'->>'3')::numeric as facet_N3,
  (s.session_json->'bigFive'->'scores'->'facets'->'N'->>'4')::numeric as facet_N4,
  (s.session_json->'bigFive'->'scores'->'facets'->'N'->>'5')::numeric as facet_N5,
  (s.session_json->'bigFive'->'scores'->'facets'->'N'->>'6')::numeric as facet_N6
FROM sessions s
WHERE s.session_json->'bigFive'->'scores'->'facets' IS NOT NULL;

-- ============================================
-- VERIFY VIEWS WERE CREATED
-- ============================================
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name LIKE 'research_%'
ORDER BY table_name;

