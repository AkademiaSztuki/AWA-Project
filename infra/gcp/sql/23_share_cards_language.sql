-- Add language to share_cards for OG / Twitter card localization.
-- Idempotent.

ALTER TABLE share_cards
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'pl'
  CHECK (language IN ('pl', 'en'));
