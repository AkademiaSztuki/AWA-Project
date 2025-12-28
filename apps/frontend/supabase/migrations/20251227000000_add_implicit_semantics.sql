-- Migration: add implicit semantic scores to participants table
-- Created: 2025-12-27q111111111111111

ALTER TABLE public.participants 
ADD COLUMN IF NOT EXISTS implicit_warmth NUMERIC,
ADD COLUMN IF NOT EXISTS implicit_brightness NUMERIC,
ADD COLUMN IF NOT EXISTS implicit_complexity NUMERIC;

COMMENT ON COLUMN public.participants.implicit_warmth IS 'Implicit warmth score derived from Tinder swipes';
COMMENT ON COLUMN public.participants.implicit_brightness IS 'Implicit brightness score derived from Tinder swipes';
COMMENT ON COLUMN public.participants.implicit_complexity IS 'Implicit complexity score derived from Tinder swipes';

