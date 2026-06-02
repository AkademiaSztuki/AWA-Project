-- Persist full Tinder swipe metadata (frontend already sends tags + categories).

ALTER TABLE participant_swipes
  ADD COLUMN IF NOT EXISTS image_mood TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS image_biophilia SMALLINT,
  ADD COLUMN IF NOT EXISTS image_tags TEXT[] DEFAULT '{}';

COMMENT ON COLUMN participant_swipes.image_tags IS
  'Full filename token list from Livingroom parser (images unchanged).';
