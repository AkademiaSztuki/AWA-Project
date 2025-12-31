-- Migration: Ensure every new participant gets free grant credits (600)
-- Created: 2025-12-31
-- Purpose:
--  - Guarantee that new users receive initial 600 credits even if frontend/API call fails
--  - Make free_grant idempotent (no double crediting on retries/races)
--  - Ensure guests can read credit balance via RPC (EXECUTE privilege)

-- 0) Ensure participants has required columns (safe / idempotent)
ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS free_grant_used BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS free_grant_used_at TIMESTAMPTZ;

-- 1) Add unique partial index to prevent double free_grant per user_hash
DO $$
BEGIN
  IF to_regclass('public.credit_transactions') IS NOT NULL THEN
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS ux_credit_transactions_free_grant_user
             ON public.credit_transactions(user_hash)
             WHERE source = ''free_grant''';
  END IF;
END $$;

-- 2) Helper function: grant free credits for a given user_hash (idempotent)
CREATE OR REPLACE FUNCTION public.grant_free_credits_for_user_hash(p_user_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inserted BOOLEAN := FALSE;
BEGIN
  -- If credit system is not installed yet, do nothing (avoid breaking environments)
  IF to_regclass('public.credit_transactions') IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Create the credit transaction if it doesn't already exist.
  -- With the partial unique index, this is safe against races.
  INSERT INTO public.credit_transactions (user_hash, type, amount, source, generation_id, expires_at)
  VALUES (p_user_hash, 'grant', 600, 'free_grant', NULL, NULL)
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_inserted = (ROW_COUNT > 0);

  -- Mark as used (even if the transaction already existed)
  UPDATE public.participants
  SET
    free_grant_used = TRUE,
    free_grant_used_at = COALESCE(free_grant_used_at, NOW()),
    updated_at = NOW()
  WHERE user_hash = p_user_hash
    AND COALESCE(free_grant_used, FALSE) IS DISTINCT FROM TRUE;

  RETURN v_inserted;
END;
$$;

COMMENT ON FUNCTION public.grant_free_credits_for_user_hash(TEXT)
  IS 'Idempotently grants the initial 600 free credits to a participant user_hash and marks free_grant_used.';

-- 3) Trigger: automatically grant free credits on participant creation
CREATE OR REPLACE FUNCTION public.trg_participants_auto_free_grant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.grant_free_credits_for_user_hash(NEW.user_hash);
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.participants') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS participants_auto_free_grant ON public.participants;
    CREATE TRIGGER participants_auto_free_grant
      AFTER INSERT ON public.participants
      FOR EACH ROW
      EXECUTE FUNCTION public.trg_participants_auto_free_grant();
  END IF;
END $$;

-- 4) Ensure clients can call balance RPC (prevents "credits not visible" for anon/authenticated)
DO $$
BEGIN
  IF to_regprocedure('public.get_credit_balance(text)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION public.get_credit_balance(text) TO anon, authenticated;
  END IF;

  IF to_regprocedure('public.check_credits_available(text, integer)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION public.check_credits_available(text, integer) TO anon, authenticated;
  END IF;
END $$;

