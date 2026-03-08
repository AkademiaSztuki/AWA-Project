-- Migration: change participants.auth_user_id from UUID to TEXT
-- Reason: Google OAuth returns "sub" as a numeric string (e.g. "103547318597142817347"), not UUID.
-- Run this on existing Cloud SQL if the table was created with auth_user_id UUID.
-- Safe to run multiple times (idempotent).
--
-- How to run: Google Cloud Console → SQL → your instance (awa-research-sql)
--             → "Open Cloud Shell" or "Connect" → Query editor → paste this file → Run.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'participants' AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE public.participants
      ALTER COLUMN auth_user_id TYPE TEXT USING auth_user_id::TEXT;
    RAISE NOTICE 'participants.auth_user_id changed to TEXT';
  END IF;
END $$;
