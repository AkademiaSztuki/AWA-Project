-- Migration: 5-Image Generation Matrix Results
-- Tracks which data source users prefer in blind comparison tests

-- Create generation_matrix_results table
CREATE TABLE IF NOT EXISTS public.generation_matrix_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference to project and generation set
  project_id text NOT NULL,
  generation_set_id uuid REFERENCES public.generation_sets(id) ON DELETE CASCADE,
  
  -- Source type for this image
  source_type text NOT NULL CHECK (source_type IN (
    'implicit',           -- Tinder swipes + Inspirations
    'explicit',           -- CoreProfile / room-specific preferences
    'personality',        -- Big Five IPIP-NEO-120 facets
    'mixed',              -- All aesthetic sources combined
    'mixed_functional'    -- Mixed + functional data
  )),
  
  -- The prompt that was used
  prompt_used text NOT NULL,
  
  -- Display position in blind comparison (0-4)
  display_position integer NOT NULL CHECK (display_position >= 0 AND display_position <= 4),
  
  -- Selection tracking
  was_selected boolean DEFAULT false,
  selection_time_ms integer, -- Time in ms from display to selection
  
  -- Optional ratings after reveal
  ratings jsonb DEFAULT '{}'::jsonb,
  
  -- Image URL/data reference
  image_url text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_generation_matrix_project_id 
  ON public.generation_matrix_results(project_id);

CREATE INDEX IF NOT EXISTS idx_generation_matrix_source_type 
  ON public.generation_matrix_results(source_type);

CREATE INDEX IF NOT EXISTS idx_generation_matrix_was_selected 
  ON public.generation_matrix_results(was_selected) 
  WHERE was_selected = true;

-- Create matrix_sessions table to track complete blind comparison sessions
CREATE TABLE IF NOT EXISTS public.generation_matrix_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text NOT NULL,
  
  -- Session info
  room_type text,
  
  -- All sources that were generated
  generated_sources text[] NOT NULL,
  
  -- Sources that were skipped (insufficient data)
  skipped_sources text[] DEFAULT '{}',
  
  -- Display order (shuffled for blind comparison)
  display_order text[] NOT NULL,
  
  -- Which source was ultimately selected
  selected_source text,
  selected_position integer,
  selection_time_ms integer,
  
  -- Timing
  generation_started_at timestamptz NOT NULL,
  generation_completed_at timestamptz,
  selection_made_at timestamptz,
  
  -- Processing stats
  total_generation_time_ms integer,
  successful_count integer,
  failed_count integer,
  
  -- Metadata
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_matrix_sessions_project_id 
  ON public.generation_matrix_sessions(project_id);

CREATE INDEX IF NOT EXISTS idx_matrix_sessions_selected_source 
  ON public.generation_matrix_sessions(selected_source);

-- Analytics view: Which sources are preferred overall
CREATE OR REPLACE VIEW public.matrix_source_preferences AS
SELECT 
  source_type,
  COUNT(*) FILTER (WHERE was_selected = true) as times_selected,
  COUNT(*) as times_shown,
  ROUND(
    COUNT(*) FILTER (WHERE was_selected = true)::numeric / 
    NULLIF(COUNT(*)::numeric, 0) * 100, 
    2
  ) as selection_rate_percent,
  AVG(selection_time_ms) FILTER (WHERE was_selected = true) as avg_selection_time_ms
FROM public.generation_matrix_results
GROUP BY source_type
ORDER BY times_selected DESC;

-- Enable RLS
ALTER TABLE public.generation_matrix_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_matrix_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow authenticated users to insert matrix results"
  ON public.generation_matrix_results FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow users to view own matrix results"
  ON public.generation_matrix_results FOR SELECT
  USING (true);

CREATE POLICY "Allow users to update own matrix results"
  ON public.generation_matrix_results FOR UPDATE
  USING (true);

CREATE POLICY "Allow authenticated users to insert matrix sessions"
  ON public.generation_matrix_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow users to view own matrix sessions"
  ON public.generation_matrix_sessions FOR SELECT
  USING (true);

CREATE POLICY "Allow users to update own matrix sessions"
  ON public.generation_matrix_sessions FOR UPDATE
  USING (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_generation_matrix_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generation_matrix_results_updated_at
  BEFORE UPDATE ON public.generation_matrix_results
  FOR EACH ROW
  EXECUTE FUNCTION update_generation_matrix_updated_at();

-- Comments for documentation
COMMENT ON TABLE public.generation_matrix_results IS 
  '5-Image Matrix: Tracks individual image results from blind comparison tests';
COMMENT ON TABLE public.generation_matrix_sessions IS 
  '5-Image Matrix: Tracks complete blind comparison sessions';
COMMENT ON VIEW public.matrix_source_preferences IS 
  'Analytics: Shows which data sources users prefer in blind comparisons';

