-- Additive share cards + referral (run after 21_promo_codes.sql).
-- Idempotent: CREATE TABLE IF NOT EXISTS only. Does not ALTER existing tables.

CREATE TABLE IF NOT EXISTS referral_codes (
  user_hash TEXT PRIMARY KEY REFERENCES participants(user_hash) ON DELETE CASCADE,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT referral_codes_code_unique UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_code_upper ON referral_codes (UPPER(code));

CREATE TABLE IF NOT EXISTS referral_attributions (
  user_hash TEXT PRIMARY KEY REFERENCES participants(user_hash) ON DELETE CASCADE,
  referrer_code TEXT NOT NULL,
  referrer_user_hash TEXT REFERENCES participants(user_hash) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_attributions_referrer
  ON referral_attributions (referrer_user_hash);

CREATE TABLE IF NOT EXISTS referral_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_hash TEXT NOT NULL REFERENCES participants(user_hash) ON DELETE CASCADE,
  invitee_user_hash TEXT REFERENCES participants(user_hash) ON DELETE SET NULL,
  invitee_auth_user_id TEXT,
  kind TEXT NOT NULL CHECK (
    kind IN ('verified', 'first_generation', 'milestone_3', 'milestone_10')
  ),
  credits_granted INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_referral_events_verified_invitee
  ON referral_events (invitee_auth_user_id)
  WHERE kind = 'verified' AND invitee_auth_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_referral_events_first_gen_invitee
  ON referral_events (invitee_auth_user_id)
  WHERE kind = 'first_generation' AND invitee_auth_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_referral_events_milestone_3
  ON referral_events (user_hash)
  WHERE kind = 'milestone_3';

CREATE UNIQUE INDEX IF NOT EXISTS ux_referral_events_milestone_10
  ON referral_events (user_hash)
  WHERE kind = 'milestone_10';

CREATE INDEX IF NOT EXISTS idx_referral_events_referrer_kind
  ON referral_events (user_hash, kind);

CREATE TABLE IF NOT EXISTS share_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  user_hash TEXT NOT NULL REFERENCES participants(user_hash) ON DELETE CASCADE,
  referral_code TEXT,
  path_type TEXT NOT NULL CHECK (path_type IN ('fast', 'full')),
  image_public_url TEXT NOT NULL,
  storage_path TEXT,
  style_label TEXT,
  room_type TEXT,
  personality_labels TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT share_cards_slug_unique UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS idx_share_cards_user_hash ON share_cards (user_hash);
CREATE INDEX IF NOT EXISTS idx_share_cards_created ON share_cards (created_at DESC);
