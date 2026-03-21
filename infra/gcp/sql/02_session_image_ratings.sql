-- Add persisted session image ratings from Generate flow (idempotent for existing DBs).
-- Production Cloud SQL: run this once (e.g. Console → SQL) before relying on `session_image_ratings` in CSV export (`-IncludeSessionImageRatings`).
ALTER TABLE participants ADD COLUMN IF NOT EXISTS session_image_ratings JSONB;
