-- Migration: Fix generation_id type in credit_transactions
-- Created: 2025-12-24
-- Purpose: Change generation_id from UUID to TEXT to support string IDs like "matrix-google-0-explicit"

-- Drop the foreign key constraint first
ALTER TABLE public.credit_transactions 
  DROP CONSTRAINT IF EXISTS credit_transactions_generation_id_fkey;

-- Change the column type from UUID to TEXT
ALTER TABLE public.credit_transactions 
  ALTER COLUMN generation_id TYPE TEXT USING generation_id::TEXT;

-- Drop the old index if it exists
DROP INDEX IF EXISTS idx_credit_transactions_generation_id;

-- Recreate the index for TEXT type
CREATE INDEX IF NOT EXISTS idx_credit_transactions_generation_id 
  ON public.credit_transactions(generation_id) 
  WHERE generation_id IS NOT NULL;

COMMENT ON COLUMN public.credit_transactions.generation_id IS 'ID generacji (może być UUID z participant_generations lub string jak "matrix-google-0-explicit")';

