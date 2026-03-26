-- One row per (user_hash, image_id) for idempotent swipe inserts (wizard + DNA backfill).
-- Safe re-run: dedupe then unique index.

DELETE FROM participant_swipes
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY user_hash, image_id ORDER BY created_at DESC NULLS LAST, id DESC) AS rn
    FROM participant_swipes
  ) sub
  WHERE sub.rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_participant_swipes_user_image
  ON participant_swipes(user_hash, image_id);
