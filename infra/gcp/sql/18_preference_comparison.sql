-- Implicit (Tinder tags) vs explicit (/setup/profile) comparison snapshot on participants.

ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS preference_comparison_json JSONB,
  ADD COLUMN IF NOT EXISTS style_match BOOLEAN,
  ADD COLUMN IF NOT EXISTS color_tokens_match_score NUMERIC,
  ADD COLUMN IF NOT EXISTS biophilia_match BOOLEAN,
  ADD COLUMN IF NOT EXISTS nature_metaphor_match BOOLEAN;

COMMENT ON COLUMN participants.preference_comparison_json IS
  'Canonical implicit vs explicit preference comparison (schemaVersion 1, per dimension).';
