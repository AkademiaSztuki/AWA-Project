# ✅ Co zrobić PO dodaniu zmiennych do Vercel

## 🚀 KROK 1: Redeploy (WYMAGANE!)

Vercel **NIE** ładuje nowych zmiennych automatycznie. Musisz zrobić redeploy:

### Opcja A: Przez Vercel Dashboard (NAJŁATWIEJSZE) ⭐

1. Otwórz: https://vercel.com/dashboard
2. Znajdź swój projekt
3. Kliknij zakładkę **"Deployments"**
4. Znajdź najnowszy deployment (na górze listy)
5. Kliknij **"..."** (trzy kropki) obok deployment
6. Wybierz **"Redeploy"**
7. **WAŻNE:** Zaznacz checkbox **"Use existing Build Cache"** = **NIE** (odznacz!)
   - To wymusi pełny rebuild z nowymi zmiennymi
8. Kliknij **"Redeploy"**
9. Poczekaj 2-3 minuty aż deployment się zakończy

### Opcja B: Przez Push do Git (AUTOMATYCZNE)

Jeśli masz dostęp do repozytorium:
```bash
# Zrób pusty commit (lub zmień coś małego)
git commit --allow-empty -m "Trigger redeploy after adding env vars"
git push origin main
```

Vercel automatycznie zrobi nowy deployment z nowymi zmiennymi.

## 🔍 KROK 2: Sprawdź czy deployment się powiódł

1. Vercel Dashboard → **"Deployments"**
2. Sprawdź status najnowszego deployment:
   - ✅ **"Ready"** = sukces
   - ❌ **"Error"** = sprawdź logi

3. Kliknij na deployment → **"Build Logs"** i **"Runtime Logs"**
4. Szukaj błędów związanych z:
   - `STRIPE_PRICE_... is not set`
   - `STRIPE_SECRET_KEY is not set`
   - Inne błędy Stripe

## ✅ KROK 3: Testuj

1. Otwórz: `https://project-ida.com/subscription/plans`
2. Otwórz DevTools (F12) → zakładka **Console**
3. Kliknij **"Wybierz plan"** na dowolnym planie
4. Sprawdź:
   - ✅ **Nie ma błędu 500** w Network tab
   - ✅ **Nie ma błędów** w Console
   - ✅ **Przekierowanie do Stripe Checkout** (jeśli wszystko OK)

## 🐛 Jeśli nadal nie działa

### Sprawdź czy wszystkie zmienne są dodane:

1. Vercel Dashboard → **Settings** → **Environment Variables**
2. Sprawdź czy masz **WSZYSTKIE** te zmienne:
   - ✅ `STRIPE_SECRET_KEY`
   - ✅ `STRIPE_WEBHOOK_SECRET`
   - ✅ `STRIPE_PRICE_BASIC_MONTHLY`
   - ✅ `STRIPE_PRICE_BASIC_YEARLY`
   - ✅ `STRIPE_PRICE_PRO_MONTHLY`
   - ✅ `STRIPE_PRICE_PRO_YEARLY`
   - ✅ `STRIPE_PRICE_STUDIO_MONTHLY`
   - ✅ `STRIPE_PRICE_STUDIO_YEARLY`

### Sprawdź środowiska (Environment):

Dla każdej zmiennej sprawdź czy są zaznaczone:
- ✅ **Production** (dla produkcji)
- ✅ **Preview** (dla preview deployments)
- ✅ **Development** (opcjonalnie)

### Sprawdź wartości:

1. Kliknij na zmienną w Vercel
2. Sprawdź czy wartość jest poprawna (nie pusta, bez dodatkowych spacji)
3. Sprawdź czy używasz **live keys** dla produkcji (`sk_live_...`, `pk_live_...`)

### Sprawdź logi Vercel:

1. Deployments → najnowszy deployment → **Runtime Logs**
2. Szukaj błędów:
   ```
   Error: STRIPE_PRICE_BASIC_MONTHLY is not set
   Error: STRIPE_SECRET_KEY is not set
   ```

## ⚠️ Ważne uwagi

1. **Redeploy jest WYMAGANY** - bez tego zmienne nie będą działać!
2. **Odznacz "Use existing Build Cache"** - to wymusi pełny rebuild
3. **Poczekaj na zakończenie deployment** - może zająć 2-5 minut
4. **Sprawdź logi** - jeśli są błędy, zobaczysz je w Runtime Logs

## 📝 Checklist

- [ ] Dodałem wszystkie zmienne do Vercel
- [ ] Zaznaczyłem odpowiednie środowiska (Production, Preview)
- [ ] Zrobiłem redeploy (bez cache)
- [ ] Deployment zakończył się sukcesem (status "Ready")
- [ ] Sprawdziłem logi (brak błędów Stripe)
- [ ] Przetestowałem na stronie (brak błędu 500)

## 🎉 Jeśli wszystko działa

Gratulacje! Subskrypcje Stripe powinny teraz działać. Możesz:
- Testować checkout flow
- Sprawdzić webhooki w Stripe Dashboard
- Sprawdzić czy kredyty są przydzielane po płatności

