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
# PLN – język polski
STRIPE_PRICE_BASIC_MONTHLY_PLN=price_...
STRIPE_PRICE_BASIC_YEARLY_PLN=price_...
STRIPE_PRICE_PRO_MONTHLY_PLN=price_...
STRIPE_PRICE_PRO_YEARLY_PLN=price_...
STRIPE_PRICE_STUDIO_MONTHLY_PLN=price_...
STRIPE_PRICE_STUDIO_YEARLY_PLN=price_...

# USD – język angielski
STRIPE_PRICE_BASIC_MONTHLY_USD=price_...
STRIPE_PRICE_BASIC_YEARLY_USD=price_...
STRIPE_PRICE_PRO_MONTHLY_USD=price_...
STRIPE_PRICE_PRO_YEARLY_USD=price_...
STRIPE_PRICE_STUDIO_MONTHLY_USD=price_...
STRIPE_PRICE_STUDIO_YEARLY_USD=price_...

# Cron Secret (opcjonalne)
CRON_SECRET=your-secret-key-here
```

## Jak uzyskać Price IDs:

1. Idź do **Stripe Dashboard → Products**
2. Utwórz produkty:
   - **Starter** (`basic`) – Monthly: 29 PLN / $9, Yearly: 290 PLN / $90
   - **Creator** (`pro`) – Monthly: 59 PLN / $19, Yearly: 590 PLN / $190
   - **Pro** (`studio`) – Monthly: 119 PLN / $39, Yearly: 1190 PLN / $390
   - Limity subskrypcji w aplikacji: **60 / 160 / 320 obrazów AI miesięcznie** (powitanie 60 obrazów jest poza Stripe).
3. Dla każdej ceny skopiuj **Price ID** (zaczyna się od `price_...`)
4. Wklej do `.env.local`

## Pakiet powitalny (poza Stripe)

- **60 obrazów AI** przy nowym koncie to jednorazowy bonus w aplikacji, **nie** osobny produkt ani Price ID w Stripe.

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

