-- Combined Fix Migration: Unique Auth User and Research Consents Table/RLS
-- Created: 2025-12-28

-- 1. FIX: participants table unique auth_user_id cleanup and constraint
DO $$ 
BEGIN
    -- Remove duplicates for auth_user_id, keeping the latest one
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'participants') THEN
        CREATE TEMP TABLE latest_participants_temp AS
        SELECT DISTINCT ON (auth_user_id) user_hash
        FROM public.participants
        WHERE auth_user_id IS NOT NULL
        ORDER BY auth_user_id, updated_at DESC, user_hash ASC;

        DELETE FROM public.participants
        WHERE auth_user_id IS NOT NULL
        AND user_hash NOT IN (SELECT user_hash FROM latest_participants_temp);

        DROP TABLE latest_participants_temp;

        -- Add UNIQUE constraint if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'participants_auth_user_id_key'
        ) THEN
            ALTER TABLE public.participants 
            ADD CONSTRAINT participants_auth_user_id_key UNIQUE (auth_user_id);
        END IF;
    END IF;
END $$;

-- 2. FIX: research_consents table creation and RLS
CREATE TABLE IF NOT EXISTS public.research_consents (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,  -- user_hash from session
  consent_version text not null,
  consent_research boolean not null,
  consent_processing boolean not null,
  acknowledged_art13 boolean not null,
  locale text not null,
  created_at timestamptz not null default now()
);

-- Index for querying by user_id
CREATE INDEX IF NOT EXISTS idx_research_consents_user_id on public.research_consents(user_id);

-- Enable RLS
ALTER TABLE public.research_consents ENABLE ROW LEVEL SECURITY;

-- Policies for anonymous (guests)
DO $$ BEGIN
  CREATE POLICY "research_consents_anon_insert" ON public.research_consents FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "research_consents_anon_select" ON public.research_consents FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Policies for authenticated users
DO $$ BEGIN
  CREATE POLICY "research_consents_auth_insert" ON public.research_consents FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "research_consents_auth_select" ON public.research_consents FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "research_consents_auth_update" ON public.research_consents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "research_consents_auth_delete" ON public.research_consents FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
