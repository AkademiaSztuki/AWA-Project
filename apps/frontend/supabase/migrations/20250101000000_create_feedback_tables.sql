-- Migration: Create feedback tables for generation quality tracking
-- Created: 2025-01-01
-- Purpose: Track user selections, regeneration events, and data quality metrics

-- Table: generation_feedback
-- Stores feedback from user's image selection in blind comparison
CREATE TABLE IF NOT EXISTS generation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  project_id UUID REFERENCES projects(project_id) ON DELETE CASCADE,
  
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

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_generation_feedback_session_id ON generation_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_generation_feedback_project_id ON generation_feedback(project_id);
CREATE INDEX IF NOT EXISTS idx_generation_feedback_selected_source ON generation_feedback(selected_source);
CREATE INDEX IF NOT EXISTS idx_generation_feedback_created_at ON generation_feedback(created_at);

-- Table: regeneration_events
-- Stores negative feedback signals (when user clicks regenerate)
CREATE TABLE IF NOT EXISTS regeneration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  project_id UUID REFERENCES projects(project_id) ON DELETE CASCADE,
  
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

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_regeneration_events_session_id ON regeneration_events(session_id);
CREATE INDEX IF NOT EXISTS idx_regeneration_events_project_id ON regeneration_events(project_id);
CREATE INDEX IF NOT EXISTS idx_regeneration_events_interpretation ON regeneration_events(interpretation);
CREATE INDEX IF NOT EXISTS idx_regeneration_events_created_at ON regeneration_events(created_at);

-- Comments for documentation
COMMENT ON TABLE generation_feedback IS 'Tracks user selections in blind comparison matrix - key data for validating hypotheses';
COMMENT ON TABLE regeneration_events IS 'Tracks regeneration events (negative feedback signals) when user clicks regenerate';
COMMENT ON COLUMN generation_feedback.source_quality IS 'JSON object mapping GenerationSource to DataStatus (sufficient|limited|insufficient)';
COMMENT ON COLUMN generation_feedback.implicit_quality IS 'ImplicitQualityMetrics JSON: style consistency, like ratio, quality score';
COMMENT ON COLUMN generation_feedback.conflict_analysis IS 'SourceConflictAnalysis JSON: detected conflicts between implicit and explicit preferences';
COMMENT ON COLUMN regeneration_events.interpretation IS 'Interpretation of regeneration: exploring_options, dissatisfied, or very_dissatisfied';

