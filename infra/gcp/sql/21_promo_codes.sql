-- Promo codes for manual Starter grants (does not consume founders program slots)

CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  grant_credits INTEGER NOT NULL DEFAULT 6000,
  max_redemptions INTEGER NOT NULL DEFAULT 1,
  redemption_count INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT promo_codes_code_unique UNIQUE (code),
  CONSTRAINT promo_codes_grant_credits_positive CHECK (grant_credits > 0),
  CONSTRAINT promo_codes_max_redemptions_positive CHECK (max_redemptions > 0)
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code_upper ON promo_codes (UPPER(code));

CREATE TABLE IF NOT EXISTS promo_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  user_hash TEXT NOT NULL,
  auth_user_id TEXT NOT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT promo_redemptions_auth_per_code UNIQUE (promo_code_id, auth_user_id)
);

CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user_hash ON promo_redemptions (user_hash);

-- Example test code (inactive by default in production — set active = TRUE when needed)
INSERT INTO promo_codes (code, grant_credits, max_redemptions, note, active)
VALUES ('IDA-TEST-STARTER', 6000, 100, 'Internal test / invite code', FALSE)
ON CONFLICT (code) DO NOTHING;
