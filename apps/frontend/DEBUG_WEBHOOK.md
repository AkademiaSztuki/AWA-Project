# 🐛 Debugowanie Webhook Stripe

## Problem: Kredyty nie zostały przydzielone po płatności

### Krok 1: Sprawdź czy webhook został wywołany

**Lokalnie (localhost):**
- Webhooki NIE działają automatycznie!
- Musisz użyć Stripe CLI:
  ```bash
  stripe listen --forward-to localhost:3000/api/stripe/webhook
  ```

**Produkcja:**
- Webhook powinien działać automatycznie
- Sprawdź w Stripe Dashboard → Webhooks → Events

### Krok 2: Sprawdź bazę danych

W Supabase SQL Editor sprawdź:

```sql
-- 1. Sprawdź webhook events
SELECT 
  event_type, 
  processed, 
  error_message,
  created_at
FROM stripe_webhook_events 
ORDER BY created_at DESC 
LIMIT 10;

-- 2. Sprawdź subskrypcje
SELECT 
  user_hash,
  plan_id,
  billing_period,
  status,
  credits_allocated,
  subscription_credits_remaining,
  created_at
FROM subscriptions 
ORDER BY created_at DESC 
LIMIT 5;

-- 3. Sprawdź transakcje kredytowe
SELECT 
  user_hash,
  type,
  amount,
  source,
  created_at
FROM credit_transactions 
ORDER BY created_at DESC 
LIMIT 10;
```

### Krok 3: Sprawdź logi

**Terminal dev servera:**
- Powinny być logi z webhook handlera
- Szukaj: "Error processing webhook event" lub "checkout.session.completed"

**Stripe Dashboard:**
- Developers → Webhooks → Twój webhook → Events
- Kliknij na event → Sprawdź "Response" i "Request"

### Krok 4: Ręczne przetworzenie (jeśli webhook nie zadziałał)

Jeśli webhook nie został wywołany, możesz ręcznie przydzielić kredyty:

```sql
-- Znajdź subskrypcję
SELECT * FROM subscriptions WHERE user_hash = 'twój_user_hash';

-- Ręcznie przydziel kredyty (jeśli subskrypcja istnieje)
-- Użyj funkcji allocateSubscriptionCredits przez API lub bezpośrednio SQL
```

## 🔧 Rozwiązania

### Rozwiązanie 1: Użyj Stripe CLI (lokalnie)

```bash
# Zainstaluj Stripe CLI
# Windows: https://github.com/stripe/stripe-cli/releases
# Lub: scoop install stripe

# Uruchom forwardowanie webhooków
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

To da Ci nowy webhook secret - użyj go w `.env.local`:
```env
STRIPE_WEBHOOK_SECRET=whsec_...  # z Stripe CLI
```

### Rozwiązanie 2: Testuj na produkcji

Webhooki działają automatycznie w produkcji:
1. Wykonaj płatność na `project-ida.com`
2. Webhook zostanie automatycznie wywołany
3. Sprawdź czy kredyty zostały przydzielone

### Rozwiązanie 3: Ręczne wywołanie webhook (dla testów)

Możesz ręcznie wywołać webhook event z Stripe Dashboard:
1. Stripe Dashboard → Developers → Webhooks
2. Kliknij na event `checkout.session.completed`
3. Kliknij "Send test webhook" lub "Replay event"

## 📋 Checklist debugowania

- [ ] Sprawdziłem czy webhook event istnieje w `stripe_webhook_events`
- [ ] Sprawdziłem czy `processed = true`
- [ ] Sprawdziłem czy są błędy w `error_message`
- [ ] Sprawdziłem logi w terminalu dev servera
- [ ] Sprawdziłem logi w Stripe Dashboard
- [ ] Sprawdziłem czy subskrypcja została utworzona w `subscriptions`
- [ ] Sprawdziłem czy transakcje kredytowe istnieją w `credit_transactions`
- [ ] Sprawdziłem czy używam Stripe CLI (lokalnie) lub produkcyjnego webhook URL

