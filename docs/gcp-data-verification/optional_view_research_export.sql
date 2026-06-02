-- ============================================================================
-- Opcjonalny widok READ-ONLY do eksportu pod wykresy / porównania implicit vs explicit
-- Uruchomij w Cloud SQL (jednorazowo lub przy deployu schematu) jako użytkownik z prawem CREATE.
-- Dostosuj nazwę schematu jeśli używasz innego niż public.
-- ============================================================================

CREATE OR REPLACE VIEW public.v_participants_research_export AS
SELECT
  user_hash,
  path_type,
  auth_user_id::text AS auth_user_id,
  consent_timestamp,
  updated_at,
  -- Kohorty / status
  core_profile_complete,
  core_profile_completed_at,
  -- Big Five (skale)
  big5_openness,
  big5_conscientiousness,
  big5_extraversion,
  big5_agreeableness,
  big5_neuroticism,
  big5_completed_at,
  big5_responses,
  big5_facets,
  -- Implicit (Visual DNA / swipy)
  implicit_dominant_style,
  implicit_style_1,
  implicit_style_2,
  implicit_style_3,
  implicit_color_1,
  implicit_color_2,
  implicit_color_3,
  implicit_material_1,
  implicit_material_2,
  implicit_material_3,
  implicit_warmth,
  implicit_brightness,
  implicit_complexity,
  dna_accuracy_score,
  -- Explicit (wizard / semantyka)
  explicit_warmth,
  explicit_brightness,
  explicit_complexity,
  explicit_texture,
  explicit_palette,
  explicit_style,
  explicit_material_1,
  explicit_material_2,
  explicit_material_3,
  sensory_texture,
  -- Implicit vs explicit comparison (/setup/profile vs Tinder tags)
  preference_comparison_json,
  style_match,
  color_tokens_match_score,
  biophilia_match,
  nature_metaphor_match,
  -- Ankiety (agregaty)
  sus_score,
  clarity_score,
  agency_score,
  satisfaction_score,
  sus_answers,
  clarity_answers,
  agency_answers,
  satisfaction_answers,
  -- Pokój / inspiracje (agregaty)
  room_type,
  room_name,
  inspirations_count,
  tinder_total_swipes,
  tinder_likes,
  tinder_dislikes,
  -- Optional: requires migration 20 (participant_preference_snapshots)
  snap.latest_snapshot_id,
  snap.latest_snapshot_at
FROM public.participants p
LEFT JOIN LATERAL (
  SELECT id AS latest_snapshot_id, created_at AS latest_snapshot_at
  FROM public.participant_preference_snapshots
  WHERE user_hash = p.user_hash
  ORDER BY created_at DESC, id DESC
  LIMIT 1
) snap ON TRUE;

COMMENT ON VIEW public.v_participants_research_export IS
  'Płaski eksport kolumn badawczych (implicit vs explicit, Big Five, ankiety) — pod BI / CSV. '
  'Materiały: porównuj implicit_material_1..3 (Tinder/visualDNA) z explicit_material_1..3 (krok Materiały); '
  'sensory_texture to legacy — zwykle = explicit_material_1.';
