# 🧪 Testowanie Stripe Lokalnie

## ✅ Możesz testować lokalnie!

Nie musisz używać `project-ida.com` - możesz testować wszystko lokalnie na `localhost:3000`.

## 📋 Wymagania do testowania lokalnie:

### 1. Stripe Test Keys
W `.env.local` użyj **test keys** (nie live):
```env
STRIPE_SECRET_KEY=sk_test_...  # ⚠️ Użyj TEST key, nie LIVE!
STRIPE_WEBHOOK_SECRET=whsec_...  # Webhook secret z Stripe Dashboard
```

### 2. Price IDs (OBOWIĄZKOWE!)
Musisz utworzyć produkty w Stripe Dashboard i dodać Price IDs:

```env
STRIPE_PRICE_BASIC_MONTHLY=price_xxxxx
STRIPE_PRICE_BASIC_YEARLY=price_xxxxx
STRIPE_PRICE_PRO_MONTHLY=price_xxxxx
STRIPE_PRICE_PRO_YEARLY=price_xxxxx
STRIPE_PRICE_STUDIO_MONTHLY=price_xxxxx
STRIPE_PRICE_STUDIO_YEARLY=price_xxxxx
```

**Jak uzyskać Price IDs:**
1. Stripe Dashboard → **Products**
2. Kliknij na produkt
3. Skopiuj **Price ID** (zaczyna się od `price_...`)
4. Wklej do `.env.local`

### 3. Webhook dla lokalnego testowania

**Opcja A: Stripe CLI (ZALECANE dla lokalnego testowania)**
```bash
# Zainstaluj Stripe CLI: https://stripe.com/docs/stripe-cli
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

To da Ci webhook secret który możesz użyć lokalnie (np. `whsec_...`).

**Opcja B: Użyj webhook z produkcji**
- Skopiuj `STRIPE_WEBHOOK_SECRET` z produkcji
- Webhook będzie działał, ale events będą przychodzić z produkcji

## 🐛 Rozwiązywanie błędów:

### Błąd: "STRIPE_PRICE_... is not set"
**Rozwiązanie:** Dodaj wszystkie Price IDs do `.env.local`

### Błąd: "No such price"
**Rozwiązanie:** 
- Sprawdź czy Price ID jest poprawny w Stripe Dashboard
- Upewnij się że używasz **test** Price IDs (nie live)
- Sprawdź czy produkt jest aktywny w Stripe

### Błąd: "STRIPE_SECRET_KEY is not set"
**Rozwiązanie:** 
- Dodaj `STRIPE_SECRET_KEY=sk_test_...` do `.env.local`
- Użyj **test key** (zaczyna się od `sk_test_`)
- Zrestartuj dev server: `pnpm dev`

### Błąd: 500 Internal Server Error przy checkout
**Sprawdź:**
1. Czy wszystkie Price IDs są ustawione w `.env.local`
2. Czy używasz test keys (nie live)
3. Sprawdź logi w terminalu dev servera - powinny pokazać dokładny błąd

## 🧪 Testowe karty Stripe:

Użyj tych kart do testowania płatności:

- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **3D Secure:** `4000 0025 0000 3155`

Data wygaśnięcia: dowolna przyszła data (np. `12/34`)
CVC: dowolne 3 cyfry (np. `123`)

## 📝 Checklist przed testowaniem:

- [ ] `STRIPE_SECRET_KEY` ustawiony (test key)
- [ ] Wszystkie 6 Price IDs ustawione w `.env.local`
- [ ] Produkty utworzone w Stripe Dashboard (test mode)
- [ ] Dev server zrestartowany po dodaniu zmiennych
- [ ] Stripe CLI uruchomiony (jeśli testujesz webhooki)

## 🚀 Szybki start:

1. **Utwórz produkty w Stripe Dashboard** (test mode)
2. **Skopiuj Price IDs** do `.env.local`
3. **Zrestartuj dev server:** `pnpm dev`
4. **Przetestuj:** Otwórz `/subscription/plans` i kliknij "Wybierz plan"

## ⚠️ Ważne:

- **Test mode vs Live mode:** Upewnij się że używasz test keys i test Price IDs
- **Webhook:** Lokalnie użyj Stripe CLI, w produkcji użyj webhook URL
- **Price IDs:** Muszą być z tego samego Stripe account (test lub live)

