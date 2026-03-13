-- Auth-related extensions for existing databases.
-- Adds email/password fields to participants and purpose to magic_link_tokens.

ALTER TABLE IF EXISTS participants
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE IF EXISTS magic_link_tokens
  ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'magic_login',
  ADD COLUMN IF NOT EXISTS used_by_auth_user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_purpose ON magic_link_tokens(purpose);

