-- ============================================
-- Re-enable RLS with permissive policies
-- Reason: Best practice - RLS should be enabled even if policies are permissive (true)
-- This allows future policy tightening without structural changes
-- ============================================

-- participants
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- anon policies
  CREATE POLICY "participants_anon_insert" ON public.participants FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "participants_anon_select" ON public.participants FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "participants_anon_update" ON public.participants FOR UPDATE TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  -- authenticated policies
  CREATE POLICY "participants_authenticated_insert" ON public.participants FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "participants_authenticated_select" ON public.participants FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "participants_authenticated_update" ON public.participants FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- participant_swipes
ALTER TABLE public.participant_swipes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "swipes_anon_insert" ON public.participant_swipes FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "swipes_anon_select" ON public.participant_swipes FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "swipes_authenticated_insert" ON public.participant_swipes FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "swipes_authenticated_select" ON public.participant_swipes FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- participant_images
ALTER TABLE public.participant_images ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "images_anon_insert" ON public.participant_images FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "images_anon_select" ON public.participant_images FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "images_anon_update" ON public.participant_images FOR UPDATE TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "images_anon_delete" ON public.participant_images FOR DELETE TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "images_authenticated_insert" ON public.participant_images FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "images_authenticated_select" ON public.participant_images FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "images_authenticated_update" ON public.participant_images FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "images_authenticated_delete" ON public.participant_images FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- participant_generations
ALTER TABLE public.participant_generations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "generations_anon_insert" ON public.participant_generations FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "generations_anon_select" ON public.participant_generations FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "generations_anon_update" ON public.participant_generations FOR UPDATE TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "generations_authenticated_insert" ON public.participant_generations FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "generations_authenticated_select" ON public.participant_generations FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "generations_authenticated_update" ON public.participant_generations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

