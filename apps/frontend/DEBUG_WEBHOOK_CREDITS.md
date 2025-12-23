# 🔍 Debugowanie: Kredyty nie zostały przydzielone po zakupie

## Problem
Użytkownik przeszedł przez zakup Stripe (karta testowa 4242 4242 4242 4242), ale nie otrzymał kredytów - nadal ma 0.

## 🔍 Diagnoza

### Krok 1: Sprawdź logi webhook w Stripe Dashboard

1. Stripe Dashboard → **Developers** → **Webhooks**
2. Znajdź webhook endpoint: `https://project-ida.com/api/stripe/webhook`
3. Kliknij na webhook
4. Sprawdź **"Recent events"** - powinny być eventy:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `invoice.payment_succeeded`

**Sprawdź status eventów:**
- ✅ **200** = webhook został przetworzony
- ❌ **500** = błąd w przetwarzaniu
- ❌ **Brak eventu** = webhook nie został wywołany

### Krok 2: Sprawdź Runtime Logs w Vercel

1. Vercel Dashboard → **Deployments** → najnowszy deployment
2. Kliknij **"Runtime Logs"** → **"Stream"**
3. Szukaj logów z `[Webhook]`:
   ```
   [Webhook] Processing event: { eventId: 'evt_...', eventType: 'checkout.session.completed' }
   [Webhook] handleCheckoutCompleted called: { ... }
   [Webhook] Credits allocated successfully: { ... }
   ```

**Jeśli NIE widzisz logów `[Webhook]`:**
- Webhook nie został wywołany przez Stripe
- Sprawdź czy endpoint jest poprawnie skonfigurowany w Stripe Dashboard

### Krok 3: Sprawdź bazę danych

Sprawdź czy webhook event został zapisany:

```sql
-- Sprawdź webhook events
SELECT * FROM stripe_webhook_events 
WHERE event_type = 'checkout.session.completed' 
ORDER BY created_at DESC 
LIMIT 10;

-- Sprawdź subskrypcje
SELECT * FROM subscriptions 
ORDER BY created_at DESC 
LIMIT 10;

-- Sprawdź transakcje kredytowe
SELECT * FROM credit_transactions 
WHERE type = 'allocated' 
ORDER BY created_at DESC 
LIMIT 10;
```

### Krok 4: Sprawdź czy webhook endpoint jest dostępny

1. Sprawdź czy endpoint jest publicznie dostępny:
   - `https://project-ida.com/api/stripe/webhook`
   - Powinien zwrócić błąd 405 (Method Not Allowed) dla GET, ale 200 dla POST

2. Sprawdź czy webhook secret jest poprawny:
   - Vercel Dashboard → **Settings** → **Environment Variables**
   - Sprawdź `STRIPE_WEBHOOK_SECRET`
   - Porównaj z webhook secret w Stripe Dashboard

## 🐛 Najczęstsze problemy

### Problem 1: Webhook nie został wywołany

**Objaw:** Brak eventów w Stripe Dashboard → Webhooks → Recent events

**Rozwiązanie:**
1. Sprawdź czy endpoint jest poprawnie skonfigurowany w Stripe Dashboard
2. Sprawdź czy endpoint jest publicznie dostępny (nie za firewall)
3. Sprawdź czy webhook secret jest poprawny

### Problem 2: Webhook został wywołany ale zwrócił błąd 500

**Objaw:** Event w Stripe Dashboard ma status 500

**Rozwiązanie:**
1. Sprawdź Runtime Logs w Vercel - zobaczysz szczegółowy błąd
2. Sprawdź czy wszystkie zmienne środowiskowe są ustawione
3. Sprawdź czy tabele w bazie danych istnieją

### Problem 3: Webhook został przetworzony ale kredyty nie zostały przydzielone

**Objaw:** Event ma status 200, ale kredyty nie są w bazie

**Rozwiązanie:**
1. Sprawdź Runtime Logs - zobaczysz czy `allocateSubscriptionCredits` się powiódł
2. Sprawdź bazę danych - czy są transakcje kredytowe
3. Sprawdź czy `userHash` jest poprawny

## ✅ Rozwiązanie krok po kroku

### Krok 1: Sprawdź logi Stripe

1. Stripe Dashboard → **Developers** → **Webhooks**
2. Kliknij na webhook endpoint
3. Sprawdź **"Recent events"**
4. Kliknij na event `checkout.session.completed`
5. Sprawdź:
   - **Status** (powinien być 200)
   - **Request** (czy request został wysłany)
   - **Response** (czy response był poprawny)

### Krok 2: Sprawdź Runtime Logs

1. Vercel Dashboard → **Deployments** → najnowszy deployment
2. Kliknij **"Runtime Logs"** → **"Stream"**
3. Szukaj logów z `[Webhook]`
4. Sprawdź czy są błędy

### Krok 3: Sprawdź bazę danych

Uruchom zapytania SQL w Supabase:
- Sprawdź `stripe_webhook_events` - czy event został zapisany
- Sprawdź `subscriptions` - czy subskrypcja została utworzona
- Sprawdź `credit_transactions` - czy kredyty zostały przydzielone

### Krok 4: Ręczne przydzielenie kredytów (tymczasowe)

Jeśli webhook nie działa, możesz ręcznie przydzielić kredyty:

1. Otwórz: `https://project-ida.com/api/test/allocate-credits`
2. Wykonaj POST request z:
   ```json
   {
     "userHash": "user_yqjt7uwtzwamj1q5tpo",
     "planId": "basic",
     "billingPeriod": "monthly"
   }
   ```

## 📋 Checklist

- [ ] Sprawdziłem logi Stripe Dashboard → Webhooks → Recent events
- [ ] Sprawdziłem Runtime Logs w Vercel - widzę logi `[Webhook]`
- [ ] Sprawdziłem bazę danych - czy są webhook events, subscriptions, credit_transactions
- [ ] Sprawdziłem czy webhook endpoint jest dostępny publicznie
- [ ] Sprawdziłem czy `STRIPE_WEBHOOK_SECRET` jest poprawny

## 🆘 Jeśli nadal nie działa

1. **Skopiuj szczegółowe logi** z Runtime Logs (po dodaniu lepszego logowania)
2. **Sprawdź logi Stripe Dashboard** → Webhooks → Recent events
3. **Sprawdź bazę danych** - czy webhook events są zapisane
4. **Sprawdź czy endpoint jest dostępny** publicznie

