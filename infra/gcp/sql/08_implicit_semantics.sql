-- Align Cloud SQL participants with Supabase / 01_research_schema (implicit semantic scores from swipes).
ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS implicit_warmth NUMERIC,
  ADD COLUMN IF NOT EXISTS implicit_brightness NUMERIC,
  ADD COLUMN IF NOT EXISTS implicit_complexity NUMERIC;
