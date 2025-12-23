# 🔧 Wymuszenie Redeploy bez Cache

## Problem
Deployment się zakończył, ale nadal występuje błąd `STRIPE_PRICE_... is not set`.

W logach build widzę:
```
Restored build cache from previous deployment
```

**To oznacza, że Vercel użył cache z poprzedniego deployment, który NIE miał nowych zmiennych środowiskowych!**

## ✅ Rozwiązanie: Redeploy bez Cache przez Vercel Dashboard

### Krok 1: Otwórz Vercel Dashboard

1. https://vercel.com/dashboard
2. Znajdź projekt
3. Kliknij zakładkę **"Deployments"**

### Krok 2: Redeploy bez Cache

1. Znajdź najnowszy deployment (ten z commit `6428d12`)
2. Kliknij **"..."** (trzy kropki) obok deployment
3. Wybierz **"Redeploy"**
4. **WAŻNE:** W oknie dialogowym **ODZNACZ** checkbox **"Use existing Build Cache"** ⚠️
5. Kliknij **"Redeploy"**
6. Poczekaj 2-3 minuty

**Dlaczego bez cache?**
- Cache zawiera stare zmienne środowiskowe z poprzedniego build
- Pełny rebuild wymusi załadowanie nowych zmiennych z Vercel Dashboard

### Krok 3: Sprawdź Runtime Logs

Po redeploy:

1. Kliknij na nowy deployment
2. Kliknij **"Runtime Logs"** → **"Stream"**
3. Na stronie kliknij **"Wybierz plan"**
4. W logach powinny pojawić się:
   ```
   [Stripe] Environment check: { NODE_ENV: 'production', VERCEL_ENV: 'production' }
   [Stripe] Checking STRIPE_PRICE_BASIC_MONTHLY: price_...
   [Stripe] All STRIPE_* env vars: [lista wszystkich zmiennych]
   ```

## 🔍 Alternatywa: Sprawdź czy zmienne są dostępne

Jeśli nadal nie działa, sprawdź czy zmienne są rzeczywiście dostępne:

1. Vercel Dashboard → **Settings** → **Environment Variables**
2. Dla każdej zmiennej sprawdź:
   - ✅ Czy wartość nie jest pusta
   - ✅ Czy **Production** jest zaznaczone
   - ✅ Czy nie ma dodatkowych spacji

## 🐛 Jeśli nadal nie działa

### Opcja 1: Usuń i dodaj ponownie zmienne

Czasami Vercel ma problem z aktualizacją istniejących zmiennych:

1. Vercel Dashboard → **Settings** → **Environment Variables**
2. Dla każdej zmiennej Stripe:
   - Kliknij **"..."** → **"Delete"**
   - Kliknij **"Add New"**
   - Dodaj ponownie z tą samą wartością
   - Zaznacz **Production, Preview, Development**
3. Zrób redeploy **bez cache**

### Opcja 2: Sprawdź czy nie ma duplikatów

1. Vercel Dashboard → **Settings** → **Environment Variables**
2. Sprawdź czy nie ma dwóch zmiennych o tej samej nazwie
3. Jeśli są - usuń stare, zostaw nowe

## 📋 Checklist

- [ ] Zrobiłem redeploy **BEZ cache** (odznaczone "Use existing Build Cache")
- [ ] Sprawdziłem Runtime Logs - widzę logi `[Stripe] Checking...`
- [ ] Sprawdziłem czy wartości zmiennych nie są puste
- [ ] Sprawdziłem czy **Production** jest zaznaczone dla wszystkich zmiennych

## 🆘 Ostateczne rozwiązanie

Jeśli nadal nie działa po redeploy bez cache:

1. **Skopiuj wszystkie wartości zmiennych** (z Stripe Dashboard)
2. **Usuń wszystkie zmienne Stripe** z Vercel
3. **Dodaj je ponownie** (wszystkie na raz)
4. **Zrób redeploy bez cache**
5. **Sprawdź Runtime Logs** - powinny pokazać wszystkie zmienne

## 💡 Dlaczego to się dzieje?

- Vercel cache'uje build artifacts
- Cache zawiera stare zmienne środowiskowe
- Nowe zmienne dodane po build nie są automatycznie dostępne
- Pełny rebuild bez cache wymusza załadowanie nowych zmiennych

**Najważniejsze:** ZAWSZE rób redeploy **BEZ cache** po dodaniu/zmianie zmiennych środowiskowych!

