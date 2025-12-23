-- ============================================
-- RADYKALNY REFAKTOR BAZY DANYCH
-- Eliminacja redundancji: ~30 tabel → 7 tabel
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TABELA 1: participants (GLOWNA)
-- ============================================
-- 1 wiersz = 1 uczestnik, wszystkie dane jako kolumny (nie JSON!)

CREATE TABLE IF NOT EXISTS participants (
  -- === IDENTYFIKACJA ===
  user_hash TEXT PRIMARY KEY,
  auth_user_id UUID,
  consent_timestamp TIMESTAMPTZ NOT NULL,
  path_type TEXT CHECK (path_type IN ('fast', 'full')),
  current_step TEXT,
  
  -- === DEMOGRAFIA ===
  age_range TEXT,
  gender TEXT,
  country TEXT,
  education TEXT,
  
  -- === BIG FIVE (IPIP-NEO-120) ===
  big5_openness NUMERIC,
  big5_conscientiousness NUMERIC,
  big5_extraversion NUMERIC,
  big5_agreeableness NUMERIC,
  big5_neuroticism NUMERIC,
  big5_completed_at TIMESTAMPTZ,
  big5_responses JSONB,    -- 120 odpowiedzi (JSON bo duzo)
  big5_facets JSONB,       -- 30 facetow (JSON)
  
  -- === IMPLICIT (z swipe'ow) ===
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
  dna_accuracy_score NUMERIC,
  
  -- === EXPLICIT (z wizarda) ===
  explicit_warmth NUMERIC,       -- semantic differential
  explicit_brightness NUMERIC,
  explicit_complexity NUMERIC,
  explicit_texture NUMERIC,
  explicit_palette TEXT,
  explicit_style TEXT,
  explicit_material_1 TEXT,
  explicit_material_2 TEXT,
  explicit_material_3 TEXT,
  
  -- === SENSORY / BIOPHILIA ===
  sensory_music TEXT,
  sensory_texture TEXT,
  sensory_light TEXT,
  biophilia_score NUMERIC,       -- 0-3
  nature_metaphor TEXT,
  
  -- === LIFESTYLE ===
  living_situation TEXT,
  life_vibe TEXT,
  life_goals TEXT[],             -- PostgreSQL array
  
  -- === ASPIRATIONAL ===
  aspirational_feelings TEXT[],
  aspirational_rituals TEXT[],
  
  -- === PRS (MOOD GRID) ===
  prs_ideal_x NUMERIC,
  prs_ideal_y NUMERIC,
  prs_current_x NUMERIC,
  prs_current_y NUMERIC,
  prs_target_x NUMERIC,
  prs_target_y NUMERIC,
  
  -- === LADDERING ===
  ladder_path TEXT[],
  ladder_core_need TEXT,
  
  -- === SURVEYS ===
  sus_score NUMERIC,
  clarity_score NUMERIC,
  agency_score NUMERIC,
  satisfaction_score NUMERIC,
  sus_answers JSONB,
  agency_answers JSONB,
  satisfaction_answers JSONB,
  clarity_answers JSONB,
  
  -- === ROOM DATA ===
  room_type TEXT,
  room_name TEXT,
  room_usage_type TEXT CHECK (room_usage_type IN ('solo', 'shared')),
  room_shared_with TEXT[],
  room_pain_points TEXT[],
  room_activities JSONB,         -- [{activity, frequency, importance}]
  room_detected_type TEXT,
  room_analysis_confidence NUMERIC,
  room_description TEXT,
  room_suggestions TEXT[],
  
  -- === TINDER STATS (agregaty) ===
  tinder_total_swipes INTEGER DEFAULT 0,
  tinder_likes INTEGER DEFAULT 0,
  tinder_dislikes INTEGER DEFAULT 0,
  
  -- === INSPIRATION TAGS (aggregated) ===
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
  
  -- === GENERATION STATS ===
  generations_count INTEGER DEFAULT 0,
  
  -- === PROFILE STATUS ===
  core_profile_complete BOOLEAN DEFAULT FALSE,
  core_profile_completed_at TIMESTAMPTZ,
  
  -- === METADATA ===
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_participants_created ON participants(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_participants_path ON participants(path_type);
CREATE INDEX IF NOT EXISTS idx_participants_consent ON participants(consent_timestamp) WHERE consent_timestamp IS NOT NULL;

ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "participants_anon_insert" ON participants FOR INSERT TO anon WITH CHECK (true);
  CREATE POLICY "participants_anon_select" ON participants FOR SELECT TO anon USING (true);
  CREATE POLICY "participants_anon_update" ON participants FOR UPDATE TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- TABELA 2: participant_swipes
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

ALTER TABLE participant_swipes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "swipes_anon_insert" ON participant_swipes FOR INSERT TO anon WITH CHECK (true);
  CREATE POLICY "swipes_anon_select" ON participant_swipes FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- TABELA 3: participant_images
-- ============================================
-- Wszystkie obrazy: generated, inspiration, room_photo

CREATE TABLE IF NOT EXISTS participant_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_hash TEXT NOT NULL REFERENCES participants(user_hash) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('generated', 'inspiration', 'room_photo', 'room_photo_empty')),
  storage_path TEXT NOT NULL,    -- sciezka w Supabase Storage
  public_url TEXT,
  thumbnail_url TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  
  -- Tagi (dla inspiracji z VLM)
  tags_styles TEXT[],
  tags_colors TEXT[],
  tags_materials TEXT[],
  tags_biophilia NUMERIC,
  description TEXT,              -- opis z VLM
  
  -- Dla generacji
  source TEXT,                   -- GenerationSource (implicit, explicit, inspirations, itp.)
  generation_id UUID,            -- link do participant_generations
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_images_user ON participant_images(user_hash);
CREATE INDEX IF NOT EXISTS idx_images_type ON participant_images(type);
CREATE INDEX IF NOT EXISTS idx_images_favorite ON participant_images(is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX IF NOT EXISTS idx_images_created ON participant_images(created_at DESC);

ALTER TABLE participant_images ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "images_anon_insert" ON participant_images FOR INSERT TO anon WITH CHECK (true);
  CREATE POLICY "images_anon_select" ON participant_images FOR SELECT TO anon USING (true);
  CREATE POLICY "images_anon_update" ON participant_images FOR UPDATE TO anon USING (true) WITH CHECK (true);
  CREATE POLICY "images_anon_delete" ON participant_images FOR DELETE TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- TABELA 4: participant_generations
-- ============================================
-- Prompty i parametry generacji

CREATE TABLE IF NOT EXISTS participant_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_hash TEXT NOT NULL REFERENCES participants(user_hash) ON DELETE CASCADE,
  job_type TEXT NOT NULL CHECK (job_type IN ('initial', 'micro', 'macro')),
  prompt TEXT NOT NULL,           -- PELNY PROMPT
  parameters JSONB,               -- strength, guidance, itp.
  source TEXT,                    -- GenerationSource
  has_base_image BOOLEAN DEFAULT FALSE,
  modification_label TEXT,        -- np. "warmer_colors", "scandinavian"
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

ALTER TABLE participant_generations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "generations_anon_insert" ON participant_generations FOR INSERT TO anon WITH CHECK (true);
  CREATE POLICY "generations_anon_select" ON participant_generations FOR SELECT TO anon USING (true);
  CREATE POLICY "generations_anon_update" ON participant_generations FOR UPDATE TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- FUNKCJE POMOCNICZE
-- ============================================

-- Funkcja do aktualizacji updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger dla participants
DROP TRIGGER IF EXISTS update_participants_updated_at ON participants;
CREATE TRIGGER update_participants_updated_at
  BEFORE UPDATE ON participants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- KOMENTARZE (dokumentacja)
-- ============================================

COMMENT ON TABLE participants IS 'Glowna tabela uczestnikow - wszystkie dane jako kolumny (nie JSON)';
COMMENT ON TABLE participant_swipes IS 'Szczegoly swipe''ow - dla analizy czasow reakcji';
COMMENT ON TABLE participant_images IS 'Wszystkie obrazy: generowane, inspiracje, zdjecia pokoju';
COMMENT ON TABLE participant_generations IS 'Prompty i parametry generacji obrazow';
