-- Backfill participant_images.space_id for rows pointing at missing or NULL spaces.
-- Run per user_hash after deploying space UUID sync (RoomSetup / getOrCreateSpaceId fix).
--
-- Preview orphans:
--   SELECT pi.id, pi.type, pi.space_id
--   FROM participant_images pi
--   WHERE pi.user_hash = 'user_3i8srks2toampv7eptm'
--     AND (
--       pi.space_id IS NULL
--       OR pi.space_id NOT IN (
--         SELECT id FROM participant_spaces ps WHERE ps.user_hash = pi.user_hash
--       )
--     );

-- Dry-run: default space for a user
-- SELECT id, name, is_default FROM participant_spaces
-- WHERE user_hash = 'user_3i8srks2toampv7eptm'
-- ORDER BY is_default DESC, created_at ASC
-- LIMIT 1;

UPDATE participant_images pi
SET space_id = def.space_id
FROM (
  SELECT ps.id AS space_id
  FROM participant_spaces ps
  WHERE ps.user_hash = :user_hash
  ORDER BY ps.is_default DESC, ps.created_at ASC
  LIMIT 1
) def
WHERE pi.user_hash = :user_hash
  AND def.space_id IS NOT NULL
  AND (
    pi.space_id IS NULL
    OR pi.space_id NOT IN (
      SELECT id FROM participant_spaces ps2 WHERE ps2.user_hash = pi.user_hash
    )
  );

-- Example (psql literals):
-- \set user_hash 'user_3i8srks2toampv7eptm'
-- Then replace :user_hash above or use:
-- UPDATE participant_images pi SET space_id = (
--   SELECT id FROM participant_spaces WHERE user_hash = 'user_3i8srks2toampv7eptm'
--   ORDER BY is_default DESC, created_at ASC LIMIT 1
-- )
-- WHERE user_hash = 'user_3i8srks2toampv7eptm'
--   AND (space_id IS NULL OR space_id NOT IN (
--     SELECT id FROM participant_spaces WHERE user_hash = 'user_3i8srks2toampv7eptm'
--   ));
