-- Add free grant tracking columns to participants (idempotent-ish).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'participants'
      AND column_name = 'free_grant_used'
  ) THEN
    ALTER TABLE participants
      ADD COLUMN free_grant_used BOOLEAN DEFAULT FALSE,
      ADD COLUMN free_grant_used_at TIMESTAMPTZ;
  END IF;
END;
$$ LANGUAGE plpgsql;

