-- Migration: Add atomic credit deduction function
-- Created: 2025-12-24
-- Purpose: Fix race condition when multiple requests deduct credits simultaneously
--          Uses SQL UPDATE with expression instead of read-then-write

-- Funkcja do atomowego odejmowania kredytów z subskrypcji
CREATE OR REPLACE FUNCTION deduct_subscription_credits(
  p_subscription_id UUID,
  p_amount INTEGER
)
RETURNS TABLE(
  new_remaining INTEGER,
  new_used INTEGER
) AS $$
DECLARE
  v_new_remaining INTEGER;
  v_new_used INTEGER;
BEGIN
  -- Atomowo aktualizuj używając SQL UPDATE z wyrażeniem
  -- To zapobiega race condition przy równoległych requestach
  UPDATE public.subscriptions
  SET 
    subscription_credits_remaining = GREATEST(0, subscription_credits_remaining - p_amount),
    credits_used = credits_used + p_amount
  WHERE id = p_subscription_id
    AND status = 'active'
    AND subscription_credits_remaining >= p_amount
  RETURNING subscription_credits_remaining, credits_used
  INTO v_new_remaining, v_new_used;
  
  -- Zwróć nowe wartości
  RETURN QUERY SELECT v_new_remaining, v_new_used;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION deduct_subscription_credits IS 'Atomowo odejmuje kredyty z subskrypcji, zapobiegając race condition przy równoległych requestach';

