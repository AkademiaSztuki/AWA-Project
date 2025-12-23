# 🚨 KRYTYCZNE: Naprawa zmiennych środowiskowych

## Problem
Nawet po redeploy nadal występuje błąd `STRIPE_PRICE_... is not set`.

W logach build widzę:
```
Restored build cache from previous deployment
```

**To oznacza, że Vercel nadal używa cache z poprzedniego deployment!**

## ✅ Rozwiązanie: Redeploy BEZ CACHE przez Vercel Dashboard

**WAŻNE:** Push przez Git NIE usuwa cache! Musisz zrobić redeploy przez Vercel Dashboard.

### Krok 1: Otwórz Vercel Dashboard

1. https://vercel.com/dashboard
2. Znajdź projekt
3. Kliknij zakładkę **"Deployments"**

### Krok 2: Redeploy BEZ CACHE

1. Znajdź najnowszy deployment (ten który właśnie się zakończył)
2. Kliknij **"..."** (trzy kropki) obok deployment
3. Wybierz **"Redeploy"**
4. **WAŻNE:** W oknie dialogowym **ODZNACZ** checkbox **"Use existing Build Cache"** ⚠️
5. Kliknij **"Redeploy"**
6. Poczekaj 2-3 minuty

**Dlaczego przez Dashboard a nie przez Git?**
- Push przez Git może użyć cache
- Redeploy przez Dashboard z odznaczonym cache wymusza pełny rebuild
- To jedyny sposób, żeby Vercel załadował nowe zmienne środowiskowe

### Krok 3: Sprawdź Runtime Logs

Po redeploy bez cache:

1. Kliknij na nowy deployment
2. Kliknij **"Runtime Logs"** → **"Stream"**
3. Na stronie kliknij **"Wybierz plan"**
4. **W logach POWINNY pojawić się:**
   ```
   [Stripe] Environment check: { NODE_ENV: 'production', VERCEL_ENV: 'production' }
   [Stripe] Checking STRIPE_PRICE_BASIC_MONTHLY: price_...
   [Stripe] All STRIPE_* env vars: [lista wszystkich zmiennych]
   ```

**Jeśli NIE widzisz tych logów** - to znaczy że cache nadal jest używany!

## 🔍 Weryfikacja

### Sprawdź czy zmienne są dostępne w Runtime Logs

Po redeploy bez cache, w Runtime Logs powinny być:

1. **Logi diagnostyczne:**
   ```
   [Stripe] Checking STRIPE_PRICE_BASIC_MONTHLY: price_...
   [Stripe] All STRIPE_* env vars: STRIPE_PRICE_BASIC_MONTHLY, STRIPE_PRICE_BASIC_YEARLY, ...
   ```

2. **NIE powinno być:**
   ```
   STRIPE_PRICE_... is not set
   ```

### Jeśli nadal nie działa

#### Opcja 1: Sprawdź czy zmienne są rzeczywiście w Vercel

1. Vercel Dashboard → **Settings** → **Environment Variables**
2. Dla każdej zmiennej sprawdź:
   - ✅ Czy wartość nie jest pusta
   - ✅ Czy **Production** jest zaznaczone
   - ✅ Czy nie ma dodatkowych spacji

#### Opcja 2: Usuń i dodaj ponownie zmienne

Czasami Vercel ma problem z aktualizacją istniejących zmiennych:

1. Vercel Dashboard → **Settings** → **Environment Variables**
2. Dla każdej zmiennej Stripe:
   - Kliknij **"..."** → **"Delete"**
   - Kliknij **"Add New"**
   - Dodaj ponownie z tą samą wartością
   - Zaznacz **Production, Preview, Development**
3. Zrób redeploy **bez cache**

## 📋 Checklist

- [ ] Zrobiłem redeploy **przez Vercel Dashboard** (nie przez Git!)
- [ ] **ODZNACZYŁEM** "Use existing Build Cache"
- [ ] Sprawdziłem Runtime Logs - widzę logi `[Stripe] Checking...`
- [ ] Sprawdziłem czy wartości zmiennych nie są puste
- [ ] Sprawdziłem czy **Production** jest zaznaczone dla wszystkich zmiennych

## 🆘 Ostateczne rozwiązanie

Jeśli nadal nie działa po redeploy bez cache:

1. **Skopiuj wszystkie wartości zmiennych** (z Stripe Dashboard)
2. **Usuń wszystkie zmienne Stripe** z Vercel
3. **Dodaj je ponownie** (wszystkie na raz)
4. **Zrób redeploy bez cache przez Vercel Dashboard**
5. **Sprawdź Runtime Logs** - powinny pokazać wszystkie zmienne

## 💡 Dlaczego to się dzieje?

- Vercel cache'uje build artifacts
- Cache zawiera stare zmienne środowiskowe
- Push przez Git może użyć cache
- Redeploy przez Dashboard z odznaczonym cache wymusza pełny rebuild

**Najważniejsze:** ZAWSZE rób redeploy **przez Vercel Dashboard BEZ cache** po dodaniu/zmianie zmiennych środowiskowych!

