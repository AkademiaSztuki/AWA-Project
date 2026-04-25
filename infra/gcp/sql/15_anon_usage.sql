-- Anonymous free-generation limits (Cloud SQL, backend-gcp).
-- Mirrors product rules: 1 generate per path (fast/full) per anon cookie + 3 per IP per 24h window.

CREATE TABLE IF NOT EXISTS aura_anon_path_usage (
  anon_session_id TEXT NOT NULL,
  path_scope TEXT NOT NULL CHECK (path_scope IN ('fast', 'full')),
  usage_count INT NOT NULL DEFAULT 0,
  first_used_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (anon_session_id, path_scope)
);

CREATE TABLE IF NOT EXISTS aura_anon_generation_dedup (
  generation_id TEXT PRIMARY KEY,
  anon_session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aura_anon_dedup_session ON aura_anon_generation_dedup (anon_session_id);

CREATE TABLE IF NOT EXISTS aura_anon_ip_rate (
  ip_hash TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL,
  count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE aura_anon_path_usage IS 'Per-cookie usage of free anonymous generations by funnel path';
COMMENT ON TABLE aura_anon_generation_dedup IS 'Idempotent deduct per generation_id for anon billing';
COMMENT ON TABLE aura_anon_ip_rate IS 'Rolling 24h generation count per hashed client IP';
