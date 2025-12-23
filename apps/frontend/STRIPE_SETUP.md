# Stripe Subscription Setup

## Wymagane zmienne środowiskowe

Dodaj do `.env.local`:

```env
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (utworzone w Stripe Dashboard)
STRIPE_PRICE_BASIC_MONTHLY=price_...
STRIPE_PRICE_BASIC_YEARLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_STUDIO_MONTHLY=price_...
STRIPE_PRICE_STUDIO_YEARLY=price_...

# Cron Secret (opcjonalne, dla /api/credits/expire)
CRON_SECRET=your-secret-key-here
```

## Konfiguracja Stripe Dashboard

1. **Utwórz produkty i ceny:**
   - Basic Monthly: $20
   - Basic Yearly: $200
   - Pro Monthly: $45
   - Pro Yearly: $450
   - Studio Monthly: $69
   - Studio Yearly: $690

2. **Skonfiguruj webhook:**
   - URL: `https://project-ida.com/api/stripe/webhook` ✅ (już skonfigurowane)
   - Events do nasłuchiwania:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

3. **Skonfiguruj Customer Portal:**
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

