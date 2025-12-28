-- ============================================
-- Enable RLS for feedback tables
-- Reason: Standardize RLS across all tables for security best practices
-- These tables are used in supabase.ts for tracking generation feedback
-- ============================================

-- First, ensure tables exist (without project_id foreign key since projects table was dropped)
CREATE TABLE IF NOT EXISTS public.generation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  project_id TEXT, -- Changed from UUID REFERENCES projects (projects table was dropped)
  
  -- What was generated
  generated_sources TEXT[] NOT NULL,
  selected_source TEXT,
  selection_time_ms INTEGER,
  
  -- User input context
  has_complete_bigfive BOOLEAN DEFAULT false,
  tinder_swipe_count INTEGER DEFAULT 0,
  explicit_answer_count INTEGER DEFAULT 0,
  
  -- Quality metrics (stored as JSONB for flexibility)
  source_quality JSONB DEFAULT '{}',
  implicit_quality JSONB,
  conflict_analysis JSONB,
  
  -- Optional user rating
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.regeneration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  project_id TEXT, -- Changed from UUID REFERENCES projects (projects table was dropped)
  
  -- What was shown before regeneration
  previous_sources TEXT[],
  previous_selected TEXT,
  
  -- Context
  regeneration_count INTEGER NOT NULL,
  time_since_last_ms INTEGER,
  interpretation TEXT, -- 'exploring_options' | 'dissatisfied' | 'very_dissatisfied'
  
  -- Quality context
  source_quality JSONB DEFAULT '{}',
  implicit_quality JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_generation_feedback_session_id ON public.generation_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_generation_feedback_created_at ON public.generation_feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_regeneration_events_session_id ON public.regeneration_events(session_id);
CREATE INDEX IF NOT EXISTS idx_regeneration_events_created_at ON public.regeneration_events(created_at);

-- Enable RLS on generation_feedback
ALTER TABLE public.generation_feedback ENABLE ROW LEVEL SECURITY;

-- Add permissive policy for both anon and authenticated roles
DO $$ BEGIN
  CREATE POLICY "generation_feedback_permissive" ON public.generation_feedback
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enable RLS on regeneration_events
ALTER TABLE public.regeneration_events ENABLE ROW LEVEL SECURITY;

-- Add permissive policy for both anon and authenticated roles
DO $$ BEGIN
  CREATE POLICY "regeneration_events_permissive" ON public.regeneration_events
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
