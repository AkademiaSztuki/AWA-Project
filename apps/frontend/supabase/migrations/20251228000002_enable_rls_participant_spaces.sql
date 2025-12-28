-- ============================================
-- Enable RLS for participant_spaces table
-- Reason: Standardize RLS across all tables for security best practices
-- This matches the permissive policy pattern used in other refactor tables
-- ============================================

-- Enable RLS on participant_spaces
ALTER TABLE public.participant_spaces ENABLE ROW LEVEL SECURITY;

-- Add permissive policy for both anon and authenticated roles
-- This allows all operations (SELECT, INSERT, UPDATE, DELETE) for both roles
DO $$ BEGIN
  CREATE POLICY "participant_spaces_permissive" ON public.participant_spaces
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
