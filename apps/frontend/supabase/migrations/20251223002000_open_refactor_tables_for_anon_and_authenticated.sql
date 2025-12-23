-- ============================================
-- "Fix-all" access patch for the radical refactor tables
-- Goal: remove RLS/privilege blockers for both anon and authenticated clients
-- This matches the existing "research kiosk" behavior (policies were already (true)).
-- ============================================

-- 1) Ensure privileges exist (RLS aside)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.participants TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.participant_images TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.participant_generations TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.participant_swipes TO anon, authenticated;

-- Bigserial sequence for participant_swipes.id
DO $$
BEGIN
  EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE public.participant_swipes_id_seq TO anon, authenticated';
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- 2) Disable RLS to avoid role mismatches and future policy drift
ALTER TABLE public.participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_images DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_generations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_swipes DISABLE ROW LEVEL SECURITY;


