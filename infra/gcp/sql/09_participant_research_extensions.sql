-- Research persistence extensions: matrix history (normalized) + participants columns.
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- participant_matrix_entries: long-format matrix steps (no base64 blobs)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS participant_matrix_entries (
  id BIGSERIAL PRIMARY KEY,
  user_hash TEXT NOT NULL REFERENCES participants(user_hash) ON DELETE CASCADE,
  step_index INTEGER NOT NULL,
  client_id TEXT,
  label TEXT,
  source TEXT,
  is_selected BOOLEAN DEFAULT FALSE,
  image_url TEXT,
  extra JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matrix_entries_user ON participant_matrix_entries(user_hash);
CREATE INDEX IF NOT EXISTS idx_matrix_entries_user_step ON participant_matrix_entries(user_hash, step_index);

-- ---------------------------------------------------------------------------
-- participants: additional research fields
-- ---------------------------------------------------------------------------
ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS room_preference_source TEXT;

ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS room_activity_context JSONB;

ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS final_survey JSONB;

ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS ladder_prompt_elements JSONB;

ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS ladder_completed_at TIMESTAMPTZ;

ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS room_analysis_comment TEXT;

ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS room_analysis_human_comment TEXT;

ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS room_photo_image_id UUID REFERENCES participant_images(id) ON DELETE SET NULL;
