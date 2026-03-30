-- generation_feedback / regeneration_events: project_id stores user_hash (non-UUID), not a UUID.
-- Safe re-run: idempotent ALTER (no-op if already TEXT).

ALTER TABLE generation_feedback
  ALTER COLUMN project_id TYPE TEXT USING project_id::text;

ALTER TABLE regeneration_events
  ALTER COLUMN project_id TYPE TEXT USING project_id::text;
