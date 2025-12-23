# 🔧 Naprawa błędu RLS w webhook handlerze

## Problem

Webhook handler zwracał błędy RLS:
```
Error saving webhook event: new row violates row-level security policy for table "stripe_webhook_events"
new row violates row-level security policy for table "subscriptions"
```

## Przyczyna

Webhook handler używał zwykłego Supabase clienta (z `anon` key), ale RLS policies wymagają `service_role` do zapisu do tabel:
- `stripe_webhook_events`
- `subscriptions`
- `credit_transactions`

## Rozwiązanie

Webhook handler i funkcja `allocateSubscriptionCredits` teraz używają **service_role key** do operacji które wymagają omijania RLS.

### Zmiany:

1. **`src/app/api/stripe/webhook/route.ts`**:
   - Dodano funkcję `getSupabaseAdmin()` która tworzy Supabase client z `SUPABASE_SERVICE_ROLE_KEY`
   - Wszystkie operacje zapisu do `stripe_webhook_events` i `subscriptions` używają `supabaseAdmin`

2. **`src/lib/credits.ts`**:
   - Dodano funkcję `getSupabaseAdmin()` 
   - Funkcja `allocateSubscriptionCredits` używa `supabaseAdmin` do zapisu do `credit_transactions` i `subscriptions`

## Wymagane zmienne środowiskowe

Upewnij się, że masz `SUPABASE_SERVICE_ROLE_KEY` w:
- ✅ `.env.local` (development)
- ✅ Vercel Environment Variables (production)

**Gdzie znaleźć Service Role Key:**
1. Supabase Dashboard → **Settings** → **API**
2. Skopiuj **service_role** key (nie anon key!)
3. Dodaj do `.env.local`:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

## Testowanie

Po dodaniu `SUPABASE_SERVICE_ROLE_KEY`:

1. **Redeploy na Vercel** (jeśli zmieniasz w production)
2. **Przetestuj webhook**:
   - Wykonaj nowy checkout w Stripe
   - Sprawdź Runtime Logs w Vercel - nie powinno być błędów RLS
   - Sprawdź bazę danych - kredyty powinny zostać przydzielone

## Sprawdzenie czy działa

### 1. Sprawdź Runtime Logs w Vercel

Szukaj logów:
```
[Webhook] Processing event: { eventId: 'evt_...', eventType: 'checkout.session.completed' }
[Webhook] Subscription created/updated successfully
[Credits] Allocating subscription credits: { ... }
[Credits] Credit transaction created successfully
[Credits] Subscription updated successfully
```

**Nie powinno być błędów:**
- ❌ `new row violates row-level security policy`
- ❌ `Error saving webhook event`

### 2. Sprawdź bazę danych

Uruchom w Supabase SQL Editor:

```sql
-- Sprawdź webhook events
SELECT 
  stripe_event_id,
  event_type,
  processed,
  error_message,
  created_at
FROM stripe_webhook_events 
WHERE event_type = 'checkout.session.completed'
ORDER BY created_at DESC 
LIMIT 5;

-- Sprawdź subskrypcje
SELECT 
  user_hash,
  stripe_subscription_id,
  plan_id,
  credits_allocated,
  subscription_credits_remaining,
  status
FROM subscriptions 
ORDER BY created_at DESC 
LIMIT 5;

-- Sprawdź transakcje kredytowe
SELECT 
  user_hash,
  type,
  amount,
  source,
  created_at
FROM credit_transactions 
WHERE type = 'subscription_allocated'
ORDER BY created_at DESC 
LIMIT 5;
```

**Oczekiwane wyniki:**
- ✅ `stripe_webhook_events.processed = true`
- ✅ `stripe_webhook_events.error_message IS NULL`
- ✅ `subscriptions.credits_allocated > 0`
- ✅ `credit_transactions` z `type = 'subscription_allocated'` i `amount > 0`

## Jeśli nadal nie działa

1. **Sprawdź czy `SUPABASE_SERVICE_ROLE_KEY` jest ustawiony**:
   - W `.env.local` (development)
   - W Vercel Environment Variables (production)

2. **Sprawdź czy key jest poprawny**:
   - Powinien zaczynać się od `eyJ...` (JWT token)
   - Powinien być **service_role** key, nie anon key

3. **Redeploy na Vercel**:
   - Vercel Dashboard → **Deployments** → **Redeploy** (bez cache)

4. **Sprawdź Runtime Logs**:
   - Jeśli widzisz `SUPABASE_SERVICE_ROLE_KEY not set`, key nie jest załadowany

