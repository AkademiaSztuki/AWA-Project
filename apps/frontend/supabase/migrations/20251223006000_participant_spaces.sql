-- ============================================
-- Add participant_spaces + space_id on participant_images
-- Goal: allow 1 user -> many spaces, and keep images grouped per space
-- ============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) Spaces table (minimal, refactor-compatible)
CREATE TABLE IF NOT EXISTS public.participant_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_hash TEXT NOT NULL REFERENCES public.participants(user_hash) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'personal',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_participant_spaces_user ON public.participant_spaces(user_hash);
CREATE UNIQUE INDEX IF NOT EXISTS ux_participant_spaces_default ON public.participant_spaces(user_hash) WHERE is_default = TRUE;

-- 2) Add space_id to participant_images
ALTER TABLE public.participant_images
  ADD COLUMN IF NOT EXISTS space_id UUID;

ALTER TABLE public.participant_images
  ADD CONSTRAINT participant_images_space_fk
  FOREIGN KEY (space_id) REFERENCES public.participant_spaces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_participant_images_space ON public.participant_images(space_id);

-- 3) Backfill: create default space per user_hash (based on existing participant_images)
--    then attach images without space_id to that default.
WITH users AS (
  SELECT DISTINCT user_hash
  FROM public.participant_images
),
ins AS (
  INSERT INTO public.participant_spaces (user_hash, name, type, is_default)
  SELECT u.user_hash, 'Moja Przestrzeń', 'personal', TRUE
  FROM users u
  ON CONFLICT DO NOTHING
  RETURNING user_hash, id
)
UPDATE public.participant_images pi
SET space_id = ps.id
FROM public.participant_spaces ps
WHERE pi.user_hash = ps.user_hash
  AND ps.is_default = TRUE
  AND pi.space_id IS NULL;

-- 4) RLS/privileges: match refactor kiosk behavior (open for anon/auth)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.participant_spaces TO anon, authenticated;

-- If your project keeps RLS disabled on refactor tables, keep it consistent:
ALTER TABLE public.participant_spaces DISABLE ROW LEVEL SECURITY;


