# ✅ Następne kroki po migracji

## 1. ✅ Migracja SQL - GOTOWE
Tabele zostały utworzone w Supabase.

## 2. Utwórz produkty i ceny w Stripe Dashboard

1. Idź do: https://dashboard.stripe.com/products
2. Kliknij **"+ Add product"**

### Utwórz 3 produkty:

#### Produkt 1: Basic
- **Name**: Basic
- **Description**: 2000 kredytów (200 generacji)
- **Pricing model**: Standard pricing
- **Price**: $20.00 USD
- **Billing period**: Monthly
- **Price ID**: Skopiuj (zaczyna się od `price_...`)
- **Dodaj drugą cenę**: $200.00 USD, Yearly

#### Produkt 2: Pro
- **Name**: Pro
- **Description**: 5000 kredytów (500 generacji)
- **Price**: $45.00 USD (Monthly)
- **Price**: $450.00 USD (Yearly)
- **Price IDs**: Skopiuj oba

#### Produkt 3: Studio
- **Name**: Studio
- **Description**: 8000 kredytów (800 generacji)
- **Price**: $69.00 USD (Monthly)
- **Price**: $690.00 USD (Yearly)
- **Price IDs**: Skopiuj oba

## 3. Dodaj Price IDs do `.env.local`

Otwórz `apps/frontend/.env.local` i dodaj:

```env
# Stripe Price IDs (z Stripe Dashboard)
STRIPE_PRICE_BASIC_MONTHLY=price_xxxxx
STRIPE_PRICE_BASIC_YEARLY=price_xxxxx
STRIPE_PRICE_PRO_MONTHLY=price_xxxxx
STRIPE_PRICE_PRO_YEARLY=price_xxxxx
STRIPE_PRICE_STUDIO_MONTHLY=price_xxxxx
STRIPE_PRICE_STUDIO_YEARLY=price_xxxxx
```

## 4. Sprawdź czy masz wszystkie klucze Stripe

W `.env.local` powinieneś mieć:

```env
STRIPE_SECRET_KEY=sk_live_... lub sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_live_... lub pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_5meUFBYCZmdiAmkwQHF4sUxJyQsL2Wqo
```

## 5. Przetestuj system

### Test 1: Sprawdź bilans kredytów
```typescript
// W konsoli przeglądarki lub w komponencie
import { getCreditBalance } from '@/lib/credits';
const balance = await getCreditBalance('user_hash_here');
console.log(balance);
```

### Test 2: Sprawdź czy darmowy grant działa
- Zarejestruj nowego użytkownika
- Sprawdź czy otrzymał 600 kredytów

### Test 3: Test checkout
- Przejdź do strony z planami subskrypcji
- Kliknij "Wybierz plan"
- Powinno przekierować do Stripe Checkout

## 6. Sprawdź webhook

W Stripe Dashboard → Webhooks → `IDA Webhook (subscriptions)`:
- Kliknij **"Send test webhook"**
- Wybierz `checkout.session.completed`
- Sprawdź w Supabase czy event pojawił się w tabeli `stripe_webhook_events`

## 7. (Opcjonalne) Skonfiguruj cron job dla wygasania kredytów

Dodaj do `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/credits/expire",
    "schedule": "0 0 * * *"
  }]
}
```

## Gotowe! 🎉

System subskrypcji jest gotowy do użycia.

