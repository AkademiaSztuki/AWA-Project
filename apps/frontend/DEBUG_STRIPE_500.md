# 🐛 Debugowanie błędu 500 w Stripe Checkout

## Problem
Błąd 500 przy tworzeniu checkout session: `Error: No checkout URL returned`

## 🔍 Krok 1: Sprawdź Runtime Logs w Vercel

**To jest NAJWAŻNIEJSZE** - logi pokażą dokładny błąd:

1. Otwórz: https://vercel.com/dashboard
2. Znajdź swój projekt
3. Kliknij zakładkę **"Deployments"**
4. Kliknij na **najnowszy deployment** (ten który właśnie zrobiłeś)
5. Kliknij zakładkę **"Runtime Logs"** (nie "Build Logs"!)
6. **WAŻNE:** Kliknij przycisk **"Stream"** (żeby widzieć logi w czasie rzeczywistym)
7. Teraz na stronie kliknij "Wybierz plan" i obserwuj logi

### Co szukać w logach:

Szukaj linii z:
- `[Stripe]` - logi z funkcji Stripe
- `[API]` - logi z API route
- `Error:` - błędy
- `Missing environment variable` - brakujące zmienne

**Przykładowe błędy:**

```
[Stripe] Missing environment variable: STRIPE_PRICE_BASIC_MONTHLY
[Stripe] STRIPE_SECRET_KEY is not set
[Stripe] Session created but no URL: {...}
```

## 🔍 Krok 2: Sprawdź zmienne środowiskowe w Vercel

1. Vercel Dashboard → Twój projekt → **Settings** → **Environment Variables**
2. Sprawdź czy masz **WSZYSTKIE** te zmienne:
   - ✅ `STRIPE_SECRET_KEY`
   - ✅ `STRIPE_WEBHOOK_SECRET`
   - ✅ `STRIPE_PRICE_BASIC_MONTHLY`
   - ✅ `STRIPE_PRICE_BASIC_YEARLY`
   - ✅ `STRIPE_PRICE_PRO_MONTHLY`
   - ✅ `STRIPE_PRICE_PRO_YEARLY`
   - ✅ `STRIPE_PRICE_STUDIO_MONTHLY`
   - ✅ `STRIPE_PRICE_STUDIO_YEARLY`

3. Dla każdej zmiennej sprawdź:
   - ✅ Czy jest zaznaczone **Production** (dla produkcji)
   - ✅ Czy wartość nie jest pusta
   - ✅ Czy nie ma dodatkowych spacji na początku/końcu

## 🔍 Krok 3: Sprawdź czy Price IDs są poprawne

1. Otwórz: https://dashboard.stripe.com/test/products (lub `/products` dla live)
2. Sprawdź czy produkty istnieją i są aktywne
3. Sprawdź czy Price IDs w Vercel odpowiadają Price IDs w Stripe Dashboard

**WAŻNE:** 
- W produkcji użyj **live keys** (`sk_live_...`, `pk_live_...`)
- Price IDs muszą być z tego samego Stripe account (test lub live)

## 🔍 Krok 4: Sprawdź Stripe Secret Key

1. Stripe Dashboard → **Developers** → **API keys**
2. Sprawdź czy używasz:
   - **Test keys** dla development (`sk_test_...`)
   - **Live keys** dla produkcji (`sk_live_...`)

3. W Vercel sprawdź czy `STRIPE_SECRET_KEY` ma poprawną wartość

## 🔍 Krok 5: Sprawdź czy Price ID jest aktywne

W Stripe Dashboard:
1. Products → wybierz produkt
2. Sprawdź czy Price jest **Active** (nie Archived)
3. Sprawdź czy Price ID w Vercel odpowiada Price ID w Stripe

## 🛠️ Najczęstsze problemy i rozwiązania

### Problem 1: "STRIPE_PRICE_... is not set"

**Rozwiązanie:**
1. Sprawdź czy zmienna jest dodana w Vercel
2. Sprawdź czy jest zaznaczone **Production**
3. Zrób redeploy (bez cache)

### Problem 2: "STRIPE_SECRET_KEY is not set"

**Rozwiązanie:**
1. Dodaj `STRIPE_SECRET_KEY` w Vercel
2. Upewnij się że używasz live key dla produkcji
3. Zrób redeploy

### Problem 3: "Session created but no URL returned"

**Możliwe przyczyny:**
- Price ID jest niepoprawny lub nieaktywny
- Stripe API zwróciło błąd (sprawdź logi Stripe)
- Problem z konfiguracją Stripe account

**Rozwiązanie:**
1. Sprawdź logi w Vercel Runtime Logs
2. Sprawdź logi w Stripe Dashboard → **Developers** → **Logs**
3. Sprawdź czy Price ID jest aktywne

### Problem 4: Błąd w Runtime Logs ale nie widzę szczegółów

**Rozwiązanie:**
1. W Runtime Logs kliknij na konkretny błąd
2. Sprawdź pełny stack trace
3. Skopiuj błąd i sprawdź w dokumentacji Stripe

## 📋 Checklist debugowania

- [ ] Sprawdziłem Runtime Logs w Vercel (Stream mode)
- [ ] Sprawdziłem czy wszystkie zmienne są dodane
- [ ] Sprawdziłem czy zmienne mają zaznaczone Production
- [ ] Sprawdziłem czy Price IDs są poprawne w Stripe Dashboard
- [ ] Sprawdziłem czy Stripe Secret Key jest poprawny (live dla produkcji)
- [ ] Sprawdziłem logi w Stripe Dashboard → Developers → Logs
- [ ] Zrobiłem redeploy po dodaniu zmiennych

## 🆘 Jeśli nadal nie działa

1. **Skopiuj pełny błąd z Runtime Logs** (cały stack trace)
2. **Sprawdź logi w Stripe Dashboard** → Developers → Logs
3. **Sprawdź czy Price ID jest aktywne** w Stripe Dashboard
4. **Sprawdź czy używasz live keys** dla produkcji

## 📞 Pomoc

Jeśli nadal nie działa, potrzebuję:
1. Pełny błąd z Runtime Logs (skopiuj całą linię z błędem)
2. Listę zmiennych które masz w Vercel (tylko nazwy, nie wartości!)
3. Czy Price IDs są aktywne w Stripe Dashboard

