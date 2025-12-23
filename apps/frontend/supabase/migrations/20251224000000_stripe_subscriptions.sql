-- ============================================
-- Stripe Subscriptions + Credit System
-- Tabele: subscriptions, credit_transactions, stripe_webhook_events
-- Modyfikacje: participants (dodanie free_grant_used, free_grant_used_at)
-- ============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TABELA 1: subscriptions
-- ============================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_hash TEXT NOT NULL REFERENCES public.participants(user_hash) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  plan_id TEXT NOT NULL CHECK (plan_id IN ('basic', 'pro', 'studio')),
  billing_period TEXT NOT NULL CHECK (billing_period IN ('monthly', 'yearly')),
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'past_due', 'unpaid')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  credits_allocated INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  subscription_credits_remaining INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_hash ON public.subscriptions(user_hash);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON public.subscriptions(user_hash, status);

-- ============================================
-- TABELA 2: credit_transactions
-- ============================================
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_hash TEXT NOT NULL REFERENCES public.participants(user_hash) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('grant', 'subscription_allocated', 'used', 'expired')),
  amount INTEGER NOT NULL,
  source TEXT,
  generation_id UUID REFERENCES public.participant_generations(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_hash ON public.credit_transactions(user_hash);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON public.credit_transactions(type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_expires_at ON public.credit_transactions(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_credit_transactions_generation_id ON public.credit_transactions(generation_id) WHERE generation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_created ON public.credit_transactions(user_hash, created_at DESC);

-- ============================================
-- TABELA 3: stripe_webhook_events
-- ============================================
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_event_id ON public.stripe_webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON public.stripe_webhook_events(processed) WHERE processed = FALSE;
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON public.stripe_webhook_events(event_type);

-- ============================================
-- MODYFIKACJE: participants
-- ============================================
ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS free_grant_used BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS free_grant_used_at TIMESTAMPTZ;

-- ============================================
-- RLS POLICIES - TYLKO authenticated
-- ============================================

-- subscriptions: Tylko authenticated, sprawdzanie przez participants.auth_user_id
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can manage own subscriptions" ON public.subscriptions
  FOR ALL USING (
    auth.role() = 'authenticated' AND EXISTS (
      SELECT 1 FROM public.participants p
      WHERE p.user_hash = subscriptions.user_hash
      AND p.auth_user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- credit_transactions: Tylko authenticated, sprawdzanie przez participants.auth_user_id
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own credit transactions" ON public.credit_transactions
  FOR SELECT USING (
    auth.role() = 'authenticated' AND EXISTS (
      SELECT 1 FROM public.participants p
      WHERE p.user_hash = credit_transactions.user_hash
      AND p.auth_user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- credit_transactions: Insert/Update tylko przez backend (service role)
-- Frontend nie może bezpośrednio modyfikować kredytów
DO $$ BEGIN
  CREATE POLICY "Service role can manage credit transactions" ON public.credit_transactions
  FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- stripe_webhook_events: Tylko service role
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can manage webhook events" ON public.stripe_webhook_events
  FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger do aktualizacji updated_at w subscriptions
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_subscriptions_updated_at_trigger ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at_trigger
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();

-- ============================================
-- FUNKCJE POMOCNICZE
-- ============================================

-- Funkcja do obliczania bilansu kredytów użytkownika
CREATE OR REPLACE FUNCTION get_credit_balance(p_user_hash TEXT)
RETURNS INTEGER AS $$
DECLARE
  balance INTEGER;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO balance
  FROM public.credit_transactions
  WHERE user_hash = p_user_hash
    AND (expires_at IS NULL OR expires_at > NOW());
  
  RETURN balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funkcja do sprawdzania dostępności kredytów
CREATE OR REPLACE FUNCTION check_credits_available(p_user_hash TEXT, p_amount INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  balance INTEGER;
BEGIN
  balance := get_credit_balance(p_user_hash);
  RETURN balance >= p_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- KOMENTARZE
-- ============================================

COMMENT ON TABLE public.subscriptions IS 'Aktywne subskrypcje użytkowników - Stripe';
COMMENT ON TABLE public.credit_transactions IS 'Historia transakcji kredytowych (10 kredytów = 1 generacja)';
COMMENT ON TABLE public.stripe_webhook_events IS 'Log zdarzeń webhook Stripe dla idempotencji i retry';

