-- Append-only friendly log of modify-flow prompts (preset + free-text), JSON array of objects.
-- Idempotent.

ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS modification_prompt_log JSONB DEFAULT '[]'::JSONB;

COMMENT ON COLUMN participants.modification_prompt_log IS
  'Chronological log of image modifications: preset id, labels, user text, full prompt sent to the model.';
