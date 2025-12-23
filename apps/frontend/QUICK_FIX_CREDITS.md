# ⚡ Szybkie rozwiązanie - brak kredytów po płatności

## Problem
Zapłaciłeś za subskrypcję, ale kredyty nie zostały przydzielone.

## Przyczyna
**Lokalnie webhooki Stripe NIE działają automatycznie!**

Stripe nie może wysłać webhooka do `localhost:3000` - potrzebujesz Stripe CLI lub musisz testować na produkcji.

## 🚀 Szybkie rozwiązanie (3 opcje)

### Opcja 1: Użyj Stripe CLI (ZALECANE)

```bash
# Zainstaluj Stripe CLI: https://stripe.com/docs/stripe-cli
# Windows: https://github.com/stripe/stripe-cli/releases

# Uruchom forwardowanie webhooków
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

To da Ci nowy webhook secret - użyj go w `.env.local`:
```env
STRIPE_WEBHOOK_SECRET=whsec_...  # z Stripe CLI
```

Następnie:
1. Zrestartuj dev server
2. Wykonaj płatność ponownie
3. Webhook zostanie automatycznie przetworzony

### Opcja 2: Ręczne przydzielenie kredytów (TEST)

Dodałem endpoint testowy do ręcznego przydzielenia kredytów:

1. Otwórz DevTools (F12) → Console
2. Wykonaj:
```javascript
fetch('/api/test/allocate-credits', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userHash: localStorage.getItem('aura_user_hash'),
    planId: 'basic',  // lub 'pro', 'studio'
    billingPeriod: 'monthly'  // lub 'yearly'
  })
}).then(r => r.json()).then(console.log);
```

3. Odśwież dashboard - kredyty powinny się pojawić

### Opcja 3: Testuj na produkcji

Webhooki działają automatycznie w produkcji:
1. Wykonaj płatność na `project-ida.com`
2. Webhook zostanie automatycznie wywołany
3. Kredyty zostaną przydzielone

## 🔍 Sprawdź co się stało

### 1. Sprawdź czy webhook został wywołany

W Supabase SQL Editor:
```sql
SELECT * FROM stripe_webhook_events 
ORDER BY created_at DESC 
LIMIT 5;
```

Jeśli tabela jest pusta → webhook nie został wywołany (lokalnie to normalne)

### 2. Sprawdź czy subskrypcja istnieje

```sql
SELECT * FROM subscriptions 
ORDER BY created_at DESC 
LIMIT 5;
```

Jeśli subskrypcja istnieje ale kredytów nie ma → webhook nie przetworzył eventu

### 3. Sprawdź transakcje kredytowe

```sql
SELECT * FROM credit_transactions 
ORDER BY created_at DESC 
LIMIT 10;
```

Jeśli nie ma transakcji `subscription_allocated` → kredyty nie zostały przydzielone

## ✅ Rekomendacja

**Najlepiej użyj Stripe CLI** - to najbliższe do produkcji:
1. Zainstaluj Stripe CLI
2. Uruchom `stripe listen --forward-to localhost:3000/api/stripe/webhook`
3. Wykonaj płatność ponownie
4. Webhook zostanie automatycznie przetworzony

