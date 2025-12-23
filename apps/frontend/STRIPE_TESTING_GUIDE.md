# 🧪 Przewodnik testowania Stripe

## ✅ Szybki start - testowanie checkout

### 1. Otwórz stronę z planami
```
http://localhost:3000/subscription/plans
```
lub w produkcji:
```
https://project-ida.com/subscription/plans
```

### 2. Wybierz plan
- Kliknij "Wybierz plan" na dowolnym planie
- Zostaniesz przekierowany do Stripe Checkout

### 3. Użyj testowej karty
W Stripe Checkout użyj jednej z testowych kart:

#### ✅ Karta sukcesu (domyślna):
```
Numer karty: 4242 4242 4242 4242
Data wygaśnięcia: dowolna przyszła data (np. 12/34)
CVC: dowolne 3 cyfry (np. 123)
ZIP: dowolny (np. 12345)
```

#### ❌ Karta odrzucona:
```
Numer karty: 4000 0000 0000 0002
Data wygaśnięcia: dowolna przyszła data
CVC: dowolne 3 cyfry
```

#### 🔐 Karta wymagająca 3D Secure:
```
Numer karty: 4000 0025 0000 3155
Data wygaśnięcia: dowolna przyszła data
CVC: dowolne 3 cyfry
```

### 4. Po udanej płatności
- Zostaniesz przekierowany na `/subscription/success`
- Webhook Stripe przydzieli kredyty automatycznie
- Sprawdź w dashboardzie czy kredyty zostały dodane

## 🔍 Sprawdzanie czy wszystko działa

### 1. Sprawdź kredyty w dashboardzie
```
http://localhost:3000/dashboard
```
Powinieneś zobaczyć:
- Komponent "Twoje kredyty" z aktualnym bilansem
- Jeśli masz subskrypcję: "Zarządzanie subskrypcją"

### 2. Sprawdź webhook events w Stripe Dashboard
1. Stripe Dashboard → **Developers** → **Webhooks**
2. Kliknij na swój webhook
3. Sprawdź zakładkę **Events** - powinny być eventy:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `invoice.payment_succeeded`

### 3. Sprawdź bazę danych
W Supabase Dashboard sprawdź tabele:

**`subscriptions`** - powinna być nowa subskrypcja:
```sql
SELECT * FROM subscriptions 
WHERE user_hash = 'twój_user_hash'
ORDER BY created_at DESC;
```

**`credit_transactions`** - powinny być transakcje:
```sql
SELECT * FROM credit_transactions 
WHERE user_hash = 'twój_user_hash'
ORDER BY created_at DESC;
```

**`stripe_webhook_events`** - logi webhooków:
```sql
SELECT event_type, processed, created_at 
FROM stripe_webhook_events 
ORDER BY created_at DESC 
LIMIT 10;
```

## 🐛 Rozwiązywanie problemów

### Problem: Webhook nie działa lokalnie

**Rozwiązanie:** Użyj Stripe CLI do forwardowania webhooków:

```bash
# Zainstaluj Stripe CLI: https://stripe.com/docs/stripe-cli
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

To da Ci nowy webhook secret - użyj go w `.env.local`:
```env
STRIPE_WEBHOOK_SECRET=whsec_...  # z Stripe CLI
```

### Problem: Kredyty nie zostały przydzielone

**Sprawdź:**
1. Czy webhook event został przetworzony w `stripe_webhook_events`?
2. Czy `processed = true`?
3. Czy są błędy w `error_message`?

**Sprawdź logi:**
- Terminal dev servera (powinny być logi z webhook handlera)
- Stripe Dashboard → Webhooks → Events → Kliknij event → "Response"

### Problem: Checkout nie działa

**Sprawdź:**
1. Czy Price IDs są poprawne w `.env.local`?
2. Czy produkty istnieją w Stripe Dashboard (test mode)?
3. Czy `STRIPE_SECRET_KEY` jest ustawiony (test key)?

**Sprawdź logi API:**
- Otwórz DevTools (F12) → Network
- Kliknij "Wybierz plan"
- Sprawdź request do `/api/stripe/create-checkout`
- Sprawdź response - powinien zawierać `url` do Stripe Checkout

## 📊 Testowanie różnych scenariuszy

### Scenariusz 1: Nowa subskrypcja
1. Wybierz plan → Zapłać testową kartą
2. ✅ Sprawdź: Subskrypcja utworzona, kredyty przydzielone

### Scenariusz 2: Anulowanie subskrypcji
1. Dashboard → "Zarządzaj subskrypcją"
2. Stripe Customer Portal → Anuluj subskrypcję
3. ✅ Sprawdź: Subskrypcja oznaczona jako `cancel_at_period_end = true`

### Scenariusz 3: Odnowienie subskrypcji
1. Poczekaj aż subskrypcja się odnowi (lub użyj Stripe test mode)
2. ✅ Sprawdź: Nowe kredyty przydzielone, `current_period_end` zaktualizowany

### Scenariusz 4: Płatność nieudana
1. Użyj karty: `4000 0000 0000 0002`
2. ✅ Sprawdź: Subskrypcja oznaczona jako `past_due` lub `unpaid`

## 🎯 Checklist testowania

- [ ] Checkout session tworzy się poprawnie
- [ ] Płatność testową kartą działa
- [ ] Webhook otrzymuje eventy
- [ ] Kredyty są przydzielane po płatności
- [ ] Subskrypcja jest zapisywana w bazie
- [ ] Customer Portal działa (zarządzanie subskrypcją)
- [ ] Anulowanie subskrypcji działa
- [ ] Komponent CreditBalance pokazuje poprawne kredyty
- [ ] Komponent SubscriptionManagement pokazuje aktywną subskrypcję

## 🔗 Przydatne linki

- **Stripe Dashboard:** https://dashboard.stripe.com/test
- **Stripe Test Cards:** https://stripe.com/docs/testing
- **Stripe Webhooks:** https://dashboard.stripe.com/test/webhooks
- **Stripe Logs:** https://dashboard.stripe.com/test/logs

## 💡 Wskazówki

1. **Zawsze używaj test mode** podczas rozwoju
2. **Sprawdzaj webhook events** w Stripe Dashboard
3. **Używaj Stripe CLI** do testowania webhooków lokalnie
4. **Sprawdzaj logi** w terminalu dev servera
5. **Testuj różne scenariusze** (sukces, błąd, 3D Secure)

