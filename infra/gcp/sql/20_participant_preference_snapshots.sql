-- Append-only history of explicit / room preferences for research comparisons.
-- participants row remains the latest state for the app.

ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS current_space_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'participants'
      AND c.conname = 'participants_current_space_id_fk'
  ) THEN
    ALTER TABLE participants
      ADD CONSTRAINT participants_current_space_id_fk
      FOREIGN KEY (current_space_id) REFERENCES participant_spaces(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_participants_current_space
  ON participants(current_space_id)
  WHERE current_space_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS participant_preference_snapshots (
  id BIGSERIAL PRIMARY KEY,
  user_hash TEXT NOT NULL REFERENCES participants(user_hash) ON DELETE CASCADE,
  space_id UUID REFERENCES participant_spaces(id) ON DELETE SET NULL,
  source TEXT NOT NULL,
  milestone TEXT,
  content_hash TEXT NOT NULL,
  explicit_style TEXT,
  explicit_palette TEXT,
  explicit_warmth DOUBLE PRECISION,
  explicit_brightness DOUBLE PRECISION,
  explicit_complexity DOUBLE PRECISION,
  explicit_texture DOUBLE PRECISION,
  explicit_material_1 TEXT,
  explicit_material_2 TEXT,
  explicit_material_3 TEXT,
  sensory_light TEXT,
  sensory_music TEXT,
  sensory_texture TEXT,
  biophilia_score SMALLINT,
  nature_metaphor TEXT,
  room_preference_source TEXT,
  implicit_style_1 TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  preference_comparison_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pref_snapshots_user_created
  ON participant_preference_snapshots(user_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pref_snapshots_user_hash
  ON participant_preference_snapshots(user_hash, content_hash);

CREATE INDEX IF NOT EXISTS idx_pref_snapshots_space
  ON participant_preference_snapshots(space_id)
  WHERE space_id IS NOT NULL;

COMMENT ON TABLE participant_preference_snapshots IS
  'Append-only explicit preference versions; deduplicated by content_hash unless milestone forces insert.';

COMMENT ON COLUMN participants.current_space_id IS
  'Active participant_spaces.id for dashboard / room setup (latest session).';
