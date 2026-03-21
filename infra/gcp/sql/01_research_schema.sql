-- AWA research schema for Cloud SQL (PostgreSQL)
-- Greenfield version based on Supabase migrations, without data.

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TABLE: participants (main participant profile)
-- ============================================

CREATE TABLE IF NOT EXISTS participants (
  user_hash TEXT PRIMARY KEY,
  auth_user_id TEXT,  /* Google OAuth sub (numeric string), not UUID */
  consent_timestamp TIMESTAMPTZ NOT NULL,
  path_type TEXT CHECK (path_type IN ('fast', 'full')),
  current_step TEXT,

  -- Demographics
  age_range TEXT,
  gender TEXT,
  country TEXT,
  education TEXT,

  -- Big Five
  big5_openness NUMERIC,
  big5_conscientiousness NUMERIC,
  big5_extraversion NUMERIC,
  big5_agreeableness NUMERIC,
  big5_neuroticism NUMERIC,
  big5_completed_at TIMESTAMPTZ,
  big5_responses JSONB,
  big5_facets JSONB,

  -- Implicit (from swipes)
  implicit_dominant_style TEXT,
  implicit_style_1 TEXT,
  implicit_style_2 TEXT,
  implicit_style_3 TEXT,
  implicit_color_1 TEXT,
  implicit_color_2 TEXT,
  implicit_color_3 TEXT,
  implicit_material_1 TEXT,
  implicit_material_2 TEXT,
  implicit_material_3 TEXT,
  implicit_warmth NUMERIC,
  implicit_brightness NUMERIC,
  implicit_complexity NUMERIC,
  dna_accuracy_score NUMERIC,

  -- Explicit
  explicit_warmth NUMERIC,
  explicit_brightness NUMERIC,
  explicit_complexity NUMERIC,
  explicit_texture NUMERIC,
  explicit_palette TEXT,
  explicit_style TEXT,
  explicit_material_1 TEXT,
  explicit_material_2 TEXT,
  explicit_material_3 TEXT,

  -- Sensory / biophilia
  sensory_music TEXT,
  sensory_texture TEXT,
  sensory_light TEXT,
  biophilia_score NUMERIC,
  nature_metaphor TEXT,

  -- Lifestyle
  living_situation TEXT,
  life_vibe TEXT,
  life_goals TEXT[],

  -- Aspirational
  aspirational_feelings TEXT[],
  aspirational_rituals TEXT[],

  -- PRS
  prs_ideal_x NUMERIC,
  prs_ideal_y NUMERIC,
  prs_current_x NUMERIC,
  prs_current_y NUMERIC,
  prs_target_x NUMERIC,
  prs_target_y NUMERIC,

  -- Laddering
  ladder_path TEXT[],
  ladder_core_need TEXT,

  -- Surveys
  sus_score NUMERIC,
  clarity_score NUMERIC,
  agency_score NUMERIC,
  satisfaction_score NUMERIC,
  sus_answers JSONB,
  agency_answers JSONB,
  satisfaction_answers JSONB,
  clarity_answers JSONB,

  -- Room data
  room_type TEXT,
  room_name TEXT,
  room_usage_type TEXT CHECK (room_usage_type IN ('solo', 'shared')),
  room_shared_with TEXT[],
  room_pain_points TEXT[],
  room_activities JSONB,
  room_detected_type TEXT,
  room_analysis_confidence NUMERIC,
  room_description TEXT,
  room_suggestions TEXT[],

  -- Tinder aggregates
  tinder_total_swipes INTEGER DEFAULT 0,
  tinder_likes INTEGER DEFAULT 0,
  tinder_dislikes INTEGER DEFAULT 0,

  -- Inspiration aggregates
  inspiration_style_1 TEXT,
  inspiration_style_2 TEXT,
  inspiration_style_3 TEXT,
  inspiration_color_1 TEXT,
  inspiration_color_2 TEXT,
  inspiration_color_3 TEXT,
  inspiration_material_1 TEXT,
  inspiration_material_2 TEXT,
  inspiration_material_3 TEXT,
  inspiration_biophilia_avg NUMERIC,
  inspirations_count INTEGER DEFAULT 0,

  -- Generation stats
  generations_count INTEGER DEFAULT 0,
  session_image_ratings JSONB,

  -- Profile status
  core_profile_complete BOOLEAN DEFAULT FALSE,
  core_profile_completed_at TIMESTAMPTZ,
  free_grant_used BOOLEAN DEFAULT FALSE,
  free_grant_used_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_participants_created ON participants(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_participants_path ON participants(path_type);
CREATE INDEX IF NOT EXISTS idx_participants_consent ON participants(consent_timestamp) WHERE consent_timestamp IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_participants_auth_user_id
  ON participants(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- ============================================
-- TABLE: participant_swipes
-- ============================================

CREATE TABLE IF NOT EXISTS participant_swipes (
  id BIGSERIAL PRIMARY KEY,
  user_hash TEXT NOT NULL REFERENCES participants(user_hash) ON DELETE CASCADE,
  image_id TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('left', 'right')),
  reaction_time_ms INTEGER,
  swipe_timestamp TIMESTAMPTZ,
  image_styles TEXT[],
  image_colors TEXT[],
  image_materials TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_swipes_user ON participant_swipes(user_hash);
CREATE INDEX IF NOT EXISTS idx_swipes_direction ON participant_swipes(direction);
CREATE INDEX IF NOT EXISTS idx_swipes_timestamp ON participant_swipes(swipe_timestamp DESC);

-- ============================================
-- TABLE: participant_generations
-- ============================================

CREATE TABLE IF NOT EXISTS participant_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_hash TEXT NOT NULL REFERENCES participants(user_hash) ON DELETE CASCADE,
  job_type TEXT NOT NULL CHECK (job_type IN ('initial', 'micro', 'macro')),
  prompt TEXT NOT NULL,
  parameters JSONB,
  source TEXT,
  has_base_image BOOLEAN DEFAULT FALSE,
  modification_label TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('pending', 'success', 'error')),
  latency_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generations_user ON participant_generations(user_hash);
CREATE INDEX IF NOT EXISTS idx_generations_type ON participant_generations(job_type);
CREATE INDEX IF NOT EXISTS idx_generations_status ON participant_generations(status);
CREATE INDEX IF NOT EXISTS idx_generations_started ON participant_generations(started_at DESC);

-- ============================================
-- TABLE: participant_images
-- ============================================

CREATE TABLE IF NOT EXISTS participant_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_hash TEXT NOT NULL REFERENCES participants(user_hash) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('generated', 'inspiration', 'room_photo', 'room_photo_empty')),
  storage_path TEXT NOT NULL,
  public_url TEXT,
  thumbnail_url TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  tags_styles TEXT[],
  tags_colors TEXT[],
  tags_materials TEXT[],
  tags_biophilia NUMERIC,
  description TEXT,
  source TEXT,
  generation_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_images_user ON participant_images(user_hash);
CREATE INDEX IF NOT EXISTS idx_images_type ON participant_images(type);
CREATE INDEX IF NOT EXISTS idx_images_favorite ON participant_images(is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX IF NOT EXISTS idx_images_created ON participant_images(created_at DESC);

-- ============================================
-- TABLE: participant_spaces
-- ============================================

CREATE TABLE IF NOT EXISTS participant_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_hash TEXT NOT NULL REFERENCES participants(user_hash) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'personal',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_participant_spaces_user ON participant_spaces(user_hash);
CREATE UNIQUE INDEX IF NOT EXISTS ux_participant_spaces_default
  ON participant_spaces(user_hash) WHERE is_default = TRUE;

ALTER TABLE participant_images
  ADD COLUMN IF NOT EXISTS space_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'participant_images' AND c.conname = 'participant_images_space_fk'
  ) THEN
    ALTER TABLE participant_images
      ADD CONSTRAINT participant_images_space_fk
      FOREIGN KEY (space_id) REFERENCES participant_spaces(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;  /* constraint already exists, np. inna baza/schema */
END $$;

CREATE INDEX IF NOT EXISTS idx_participant_images_space ON participant_images(space_id);

-- ============================================
-- TABLE: subscriptions
-- ============================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_hash TEXT NOT NULL REFERENCES participants(user_hash) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  plan_id TEXT NOT NULL CHECK (plan_id IN ('basic', 'pro', 'studio')),
  billing_period TEXT NOT NULL CHECK (billing_period IN ('monthly', 'yearly')),
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'past_due', 'unpaid')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  credits_allocated INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  subscription_credits_remaining INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_hash ON subscriptions(user_hash);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- ============================================
-- TABLE: credit_transactions
-- ============================================

CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_hash TEXT NOT NULL REFERENCES participants(user_hash) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('grant', 'used', 'subscription_allocated', 'expired')),
  amount INTEGER NOT NULL,
  source TEXT,
  generation_id TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_hash ON credit_transactions(user_hash);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_generation_id ON credit_transactions(generation_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_expires_at ON credit_transactions(expires_at);

-- ============================================
-- TABLE: stripe_webhook_events
-- ============================================

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed ON stripe_webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_event_type ON stripe_webhook_events(event_type);

-- ============================================
-- TABLE: research_consents
-- ============================================

CREATE TABLE IF NOT EXISTS research_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  consent_research BOOLEAN NOT NULL,
  consent_processing BOOLEAN NOT NULL,
  acknowledged_art13 BOOLEAN NOT NULL,
  locale TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_consents_user_id
  ON research_consents(user_id);

CREATE INDEX IF NOT EXISTS idx_research_consents_created_at
  ON research_consents(created_at DESC);

-- ============================================
-- TABLE: generation_feedback
-- ============================================

CREATE TABLE IF NOT EXISTS generation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  project_id UUID,
  generated_sources TEXT[] NOT NULL,
  selected_source TEXT,
  selection_time_ms INTEGER,
  has_complete_bigfive BOOLEAN DEFAULT FALSE,
  tinder_swipe_count INTEGER DEFAULT 0,
  explicit_answer_count INTEGER DEFAULT 0,
  source_quality JSONB DEFAULT '{}'::JSONB,
  implicit_quality JSONB,
  conflict_analysis JSONB,
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generation_feedback_session_id
  ON generation_feedback(session_id);

CREATE INDEX IF NOT EXISTS idx_generation_feedback_project_id
  ON generation_feedback(project_id);

CREATE INDEX IF NOT EXISTS idx_generation_feedback_selected_source
  ON generation_feedback(selected_source);

CREATE INDEX IF NOT EXISTS idx_generation_feedback_created_at
  ON generation_feedback(created_at);

-- ============================================
-- TABLE: regeneration_events
-- ============================================

CREATE TABLE IF NOT EXISTS regeneration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  project_id UUID,
  previous_sources TEXT[],
  previous_selected TEXT,
  regeneration_count INTEGER NOT NULL,
  time_since_last_ms INTEGER,
  interpretation TEXT,
  source_quality JSONB DEFAULT '{}'::JSONB,
  implicit_quality JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_regeneration_events_session_id
  ON regeneration_events(session_id);

CREATE INDEX IF NOT EXISTS idx_regeneration_events_project_id
  ON regeneration_events(project_id);

CREATE INDEX IF NOT EXISTS idx_regeneration_events_interpretation
  ON regeneration_events(interpretation);

CREATE INDEX IF NOT EXISTS idx_regeneration_events_created_at
  ON regeneration_events(created_at);

-- ============================================
-- Updated-at trigger for participants
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_participants_updated_at ON participants;

CREATE TRIGGER update_participants_updated_at
  BEFORE UPDATE ON participants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

