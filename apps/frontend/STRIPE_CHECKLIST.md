# ✅ Stripe Configuration Checklist

## Co już masz skonfigurowane:

- ✅ **Webhook Endpoint URL**: `https://project-ida.com/api/stripe/webhook`
- ✅ **Webhook Secret**: `whsec_5meUFBYCZmdiAmkwQHF4sUxJyQsL2Wqo` (w `.env.local`)
- ✅ **Webhook ID**: `we_1Sha6QCRp3yNUjS4tfrk0bNm`

## Co musisz dodać do `.env.local`:

Sprawdź czy masz wszystkie te zmienne:

```env
# Stripe Keys (WYMAGANE)
STRIPE_SECRET_KEY=sk_live_...  # lub sk_test_... dla testów
STRIPE_PUBLISHABLE_KEY=pk_live_...  # lub pk_test_... dla testów
STRIPE_WEBHOOK_SECRET=whsec_5meUFBYCZmdiAmkwQHF4sUxJyQsL2Wqo  # ✅ MASZ

# Stripe Price IDs (WYMAGANE - utwórz w Stripe Dashboard)
STRIPE_PRICE_BASIC_MONTHLY=price_...
STRIPE_PRICE_BASIC_YEARLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_STUDIO_MONTHLY=price_...
STRIPE_PRICE_STUDIO_YEARLY=price_...

# Cron Secret (opcjonalne)
CRON_SECRET=your-secret-key-here
```

## Jak uzyskać Price IDs:

1. Idź do **Stripe Dashboard → Products**
2. Utwórz produkty:
   - **Basic** (Monthly: $20, Yearly: $200)
   - **Pro** (Monthly: $45, Yearly: $450)
   - **Studio** (Monthly: $69, Yearly: $690)
3. Dla każdej ceny skopiuj **Price ID** (zaczyna się od `price_...`)
4. Wklej do `.env.local`

## Sprawdź webhook events:

W Stripe Dashboard → Webhooks → `IDA Webhook (subscriptions)` sprawdź czy masz zaznaczone:
- ✅ `checkout.session.completed`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `invoice.payment_succeeded`
- ✅ `invoice.payment_failed`

## Test webhooka:

1. W Stripe Dashboard → Webhooks → kliknij na swój webhook
2. Kliknij **"Send test webhook"**
3. Wybierz event np. `checkout.session.completed`
4. Sprawdź czy w bazie danych (`stripe_webhook_events`) pojawił się event

## Gdzie endpoint URL jest używany:

**NIE MUSISZ** wpisywać endpoint URL w projekcie - jest już skonfigurowany w Stripe Dashboard.

Projekt automatycznie odbiera webhooki na: `/api/stripe/webhook` (plik: `apps/frontend/src/app/api/stripe/webhook/route.ts`)

Endpoint URL w Stripe Dashboard (`https://project-ida.com/api/stripe/webhook`) mówi Stripe gdzie wysyłać webhooki.

