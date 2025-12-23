# 🔍 Sprawdzenie statusu webhook i kredytów

## Problem
Eventy są w Stripe Dashboard, ale kredyty nie zostały przydzielone (0 kredytów).

## 🔍 Krok 1: Sprawdź czy webhook został wywołany

### W Stripe Dashboard:

1. Stripe Dashboard → **Developers** → **Webhooks**
2. Kliknij na webhook endpoint: `https://www.project-ida.com/api/stripe/webhook`
3. Sprawdź **"Recent events"**
4. Kliknij na event `checkout.session.completed` (z 9:44:13 PM)
5. Sprawdź:
   - **Status** (powinien być 200, nie 307!)
   - **Request** (czy request został wysłany)
   - **Response** (czy response był poprawny)

**Jeśli status to 307:**
- Webhook nadal używa starego URL (bez www)
- Zmień URL w Stripe Dashboard na `https://www.project-ida.com/api/stripe/webhook`

**Jeśli status to 500:**
- Webhook został wywołany, ale wystąpił błąd
- Sprawdź Runtime Logs w Vercel

## 🔍 Krok 2: Sprawdź Runtime Logs w Vercel

1. Vercel Dashboard → **Deployments** → najnowszy deployment
2. Kliknij **"Runtime Logs"** → **"Stream"**
3. Szukaj logów z `[Webhook]` z czasu 9:44:13 PM:
   ```
   [Webhook] Processing event: { eventId: 'evt_...', eventType: 'checkout.session.completed' }
   [Webhook] handleCheckoutCompleted called: { ... }
   [Webhook] Credits allocated successfully: { ... }
   ```

**Jeśli NIE widzisz logów `[Webhook]`:**
- Webhook nie został wywołany (sprawdź URL w Stripe Dashboard)
- Albo webhook został wywołany, ale nie dotarł do Vercel

**Jeśli widzisz błędy:**
- Skopiuj błąd i sprawdź co poszło nie tak

## 🔍 Krok 3: Sprawdź bazę danych

Uruchom te zapytania w Supabase SQL Editor:

### 1. Sprawdź webhook events:

```sql
SELECT 
  stripe_event_id,
  event_type,
  processed,
  retry_count,
  error_message,
  created_at
FROM stripe_webhook_events 
WHERE event_type = 'checkout.session.completed'
ORDER BY created_at DESC 
LIMIT 10;
```

**Co sprawdzić:**
- ✅ Czy event został zapisany (`stripe_event_id` istnieje)
- ✅ Czy `processed = true` (jeśli `false`, webhook nie został przetworzony)
- ✅ Czy `error_message` jest puste (jeśli nie, jest błąd)

### 2. Sprawdź subskrypcje:

```sql
SELECT 
  user_hash,
  stripe_subscription_id,
  plan_id,
  billing_period,
  status,
  credits_allocated,
  subscription_credits_remaining,
  created_at
FROM subscriptions 
ORDER BY created_at DESC 
LIMIT 10;
```

**Co sprawdzić:**
- ✅ Czy subskrypcja została utworzona
- ✅ Czy `credits_allocated` > 0
- ✅ Czy `status = 'active'`

### 3. Sprawdź transakcje kredytowe:

```sql
SELECT 
  user_hash,
  type,
  amount,
  source,
  expires_at,
  created_at
FROM credit_transactions 
WHERE type IN ('allocated', 'subscription_allocated')
ORDER BY created_at DESC 
LIMIT 10;
```

**Co sprawdzić:**
- ✅ Czy są transakcje typu `allocated` lub `subscription_allocated`
- ✅ Czy `amount` > 0
- ✅ Czy `user_hash` odpowiada Twojemu user_hash

### 4. Sprawdź Twój user_hash:

```sql
SELECT 
  user_hash,
  free_grant_used,
  created_at
FROM participants 
WHERE user_hash = 'user_yqjt7uwtzwamj1q5tpo'
LIMIT 1;
```

## 🐛 Najczęstsze problemy

### Problem 1: Webhook nie został wywołany (status 307)

**Objaw:** W Stripe Dashboard webhook ma status 307

**Rozwiązanie:**
1. Stripe Dashboard → **Developers** → **Webhooks**
2. Zmień URL na: `https://www.project-ida.com/api/stripe/webhook`
3. Kliknij **"Resend"** na event `checkout.session.completed`

### Problem 2: Webhook został wywołany ale zwrócił błąd 500

**Objaw:** W Stripe Dashboard webhook ma status 500

**Rozwiązanie:**
1. Sprawdź Runtime Logs w Vercel - zobaczysz szczegółowy błąd
2. Sprawdź czy wszystkie zmienne środowiskowe są ustawione
3. Sprawdź czy tabele w bazie danych istnieją

### Problem 3: Webhook został przetworzony ale kredyty nie zostały przydzielone

**Objaw:** W bazie danych `stripe_webhook_events.processed = true`, ale brak transakcji kredytowych

**Rozwiązanie:**
1. Sprawdź Runtime Logs - zobaczysz czy `allocateSubscriptionCredits` się powiódł
2. Sprawdź czy `userHash` jest poprawny
3. Sprawdź czy `credits` > 0

## ✅ Rozwiązanie krok po kroku

### Krok 1: Sprawdź status webhook w Stripe

1. Stripe Dashboard → **Developers** → **Webhooks**
2. Kliknij na webhook endpoint
3. Kliknij na event `checkout.session.completed` (z 9:44:13 PM)
4. Sprawdź status:
   - ✅ **200** = webhook został przetworzony
   - ❌ **307** = zmień URL na wersję z www
   - ❌ **500** = sprawdź Runtime Logs

### Krok 2: Sprawdź Runtime Logs

1. Vercel Dashboard → **Deployments** → najnowszy deployment
2. Kliknij **"Runtime Logs"** → **"Stream"**
3. Szukaj logów z `[Webhook]` z czasu 9:44:13 PM

### Krok 3: Sprawdź bazę danych

Uruchom zapytania SQL w Supabase - sprawdź czy:
- Webhook events są zapisane
- Subskrypcje są utworzone
- Transakcje kredytowe są przydzielone

### Krok 4: Ręczne przydzielenie kredytów (tymczasowe)

Jeśli webhook nie działa, możesz ręcznie przydzielić kredyty:

1. Otwórz: `https://www.project-ida.com/api/test/allocate-credits`
2. Wykonaj POST request z:
   ```json
   {
     "userHash": "user_yqjt7uwtzwamj1q5tpo",
     "planId": "studio",
     "billingPeriod": "monthly"
   }
   ```

## 📋 Checklist

- [ ] Sprawdziłem status webhook w Stripe Dashboard (powinien być 200, nie 307)
- [ ] Sprawdziłem Runtime Logs w Vercel - widzę logi `[Webhook]`
- [ ] Sprawdziłem bazę danych - czy są webhook events, subscriptions, credit_transactions
- [ ] Sprawdziłem czy `userHash` jest poprawny

## 🆘 Jeśli nadal nie działa

1. **Skopiuj szczegółowe logi** z Runtime Logs
2. **Sprawdź zapytania SQL** - czy dane są w bazie
3. **Sprawdź czy webhook endpoint jest poprawny** w Stripe Dashboard

