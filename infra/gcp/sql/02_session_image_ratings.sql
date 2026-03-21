-- Add persisted session image ratings from Generate flow (idempotent for existing DBs)
ALTER TABLE participants ADD COLUMN IF NOT EXISTS session_image_ratings JSONB;
