-- Research fields: blind matrix selection flag + implicit dominant tags array.
-- Idempotent: safe to re-run.

ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS blind_selection_made BOOLEAN;

ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS implicit_dominant_tags TEXT[];
