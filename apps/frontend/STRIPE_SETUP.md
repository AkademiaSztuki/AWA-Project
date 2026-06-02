# Stripe Subscription Setup

## Wymagane zmienne środowiskowe

Dodaj do `.env.local`:

```env
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (utworzone w Stripe Dashboard)
# PLN – pokazywane dla języka polskiego
STRIPE_PRICE_BASIC_MONTHLY_PLN=price_...
STRIPE_PRICE_BASIC_YEARLY_PLN=price_...
STRIPE_PRICE_PRO_MONTHLY_PLN=price_...
STRIPE_PRICE_PRO_YEARLY_PLN=price_...
STRIPE_PRICE_STUDIO_MONTHLY_PLN=price_...
STRIPE_PRICE_STUDIO_YEARLY_PLN=price_...

# USD – pokazywane dla języka angielskiego
STRIPE_PRICE_BASIC_MONTHLY_USD=price_...
STRIPE_PRICE_BASIC_YEARLY_USD=price_...
STRIPE_PRICE_PRO_MONTHLY_USD=price_...
STRIPE_PRICE_PRO_YEARLY_USD=price_...
STRIPE_PRICE_STUDIO_MONTHLY_USD=price_...
STRIPE_PRICE_STUDIO_YEARLY_USD=price_...

# Cron Secret (opcjonalne, dla /api/credits/expire)
CRON_SECRET=your-secret-key-here
```

## Konfiguracja Stripe Dashboard

1. **Utwórz produkty i ceny:**
   - Basic Monthly: 29 PLN / $9
   - Basic Yearly: 290 PLN / $90
   - Creator Monthly: 59 PLN / $19
   - Creator Yearly: 590 PLN / $190
   - Pro Monthly: 119 PLN / $39
   - Pro Yearly: 1190 PLN / $390

   Techniczne `planId` zostają bez zmian:
   - Basic = `basic` (plan id)
   - Creator = `pro`
   - Pro = `studio`

   **Limity po stronie aplikacji (metadata `credits` w checkoutie):** przy `CREDITS_PER_IMAGE = 10` to odpowiednio **60 / 160 / 320 obrazów AI miesięcznie** oraz **600 / 1600 / 3200** kredytów miesięcznie w backendzie; rocznie **10× cena, 12×** te miesięczne kredyty.

2. **Pakiet powitalny (60 obrazów AI)** dla nowego konta jest **poza Stripe** (jednorazowy bonus w aplikacji). Nie tworzysz do tego Price ID.

3. **Skonfiguruj webhook:**
   - URL: `https://project-ida.com/api/stripe/webhook` ✅ (już skonfigurowane)
   - Events do nasłuchiwania:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

4. **Skonfiguruj Customer Portal:**
   - Włącz w Stripe Dashboard → Settings → Billing → Customer portal
   - Włącz anulowanie subskrypcji
   - Włącz zmianę planu

## Migracja bazy danych

Uruchom migrację:

```bash
supabase db push
# lub
psql -f apps/frontend/supabase/migrations/20251224000000_stripe_subscriptions.sql
```

## Cron Job dla wygasania kredytów

Skonfiguruj cron job do wywoływania `/api/credits/expire` codziennie:

### Vercel Cron:
Dodaj do `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/credits/expire",
    "schedule": "0 0 * * *"
  }]
}
```

### Supabase Edge Function:
Utwórz Edge Function która wywołuje endpoint lub bezpośrednio funkcję `expireCredits()`.

## Testowanie

1. **Testowe karty Stripe:**
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`

2. **Testowanie webhooków lokalnie:**
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

3. **Sprawdź logi:**
   - Webhook events w `stripe_webhook_events` table
   - Credit transactions w `credit_transactions` table
   - Subscriptions w `subscriptions` table

