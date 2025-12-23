# 🔧 Naprawa: Zmienne środowiskowe nie ładują się w Vercel Runtime

## Problem
Zmienne są poprawnie skonfigurowane w Vercel Dashboard (widać "Production, Preview, and Development"), ale nadal występuje błąd:
```
Error: STRIPE_PRICE_BASIC_MONTHLY is not set
```

## 🔍 Diagnoza

To oznacza, że Vercel **nie ładuje zmiennych w runtime**, mimo że są skonfigurowane.

## ✅ Rozwiązanie: Pełny Redeploy bez Cache

### Krok 1: Sprawdź czy deployment był po dodaniu zmiennych

1. Vercel Dashboard → **Deployments**
2. Sprawdź timestamp najnowszego deployment
3. Porównaj z czasem kiedy dodałeś zmienne (13m temu według screenshotu)

**Jeśli deployment był PRZED dodaniem zmiennych** - to jest problem!

### Krok 2: Zrób pełny redeploy (BEZ CACHE)

**WAŻNE:** To jest kluczowe!

1. Vercel Dashboard → **Deployments**
2. Znajdź najnowszy deployment
3. Kliknij **"..."** (trzy kropki) → **"Redeploy"**
4. **ODZNACZ** checkbox **"Use existing Build Cache"** ⚠️
5. Kliknij **"Redeploy"**
6. Poczekaj 2-3 minuty

**Dlaczego bez cache?**
- Next.js może cache'ować zmienne środowiskowe podczas build
- Vercel może cache'ować build artifacts
- Pełny rebuild wymusi załadowanie nowych zmiennych

### Krok 3: Alternatywnie - Trigger nowy deployment przez Git

Jeśli redeploy nie pomaga:

1. Zrób pusty commit:
```bash
git commit --allow-empty -m "Trigger redeploy to load env vars"
git push origin main
```

2. Vercel automatycznie zrobi nowy deployment z nowymi zmiennymi

## 🔍 Weryfikacja

Po redeploy:

1. **Sprawdź Runtime Logs:**
   - Vercel Dashboard → Deployments → najnowszy deployment
   - Kliknij **"Runtime Logs"** → **"Stream"**
   - Kliknij "Wybierz plan" na stronie
   - W logach powinny pojawić się:
     ```
     [Stripe] Checking STRIPE_PRICE_BASIC_MONTHLY: price_...
     [Stripe] All STRIPE_* env vars: [lista wszystkich zmiennych]
     ```

2. **Sprawdź czy błąd zniknął:**
   - Nie powinno być: `STRIPE_PRICE_... is not set`
   - Powinno być: `[Stripe] Plan config: { priceId: 'price_...' }`

## 🐛 Jeśli nadal nie działa

### Opcja 1: Sprawdź czy zmienne nie są puste

1. Vercel Dashboard → Settings → Environment Variables
2. Kliknij na każdą zmienną
3. Sprawdź czy wartość nie jest pusta
4. Sprawdź czy nie ma dodatkowych spacji

### Opcja 2: Usuń i dodaj ponownie

Czasami Vercel ma problem z aktualizacją istniejących zmiennych:

1. Vercel Dashboard → Settings → Environment Variables
2. Dla każdej zmiennej:
   - Kliknij **"..."** → **"Delete"**
   - Kliknij **"Add New"**
   - Dodaj ponownie z tą samą wartością
   - Zaznacz **Production, Preview, Development**
3. Zrób redeploy (bez cache)

### Opcja 3: Sprawdź czy nie ma duplikatów

1. Vercel Dashboard → Settings → Environment Variables
2. Sprawdź czy nie ma dwóch zmiennych o tej samej nazwie
3. Jeśli są - usuń stare, zostaw nowe

### Opcja 4: Sprawdź logi build

1. Vercel Dashboard → Deployments → najnowszy deployment
2. Kliknij **"Build Logs"**
3. Szukaj błędów związanych z environment variables

## 📋 Checklist

- [ ] Sprawdziłem timestamp deployment vs czas dodania zmiennych
- [ ] Zrobiłem redeploy **BEZ cache** (odznaczone "Use existing Build Cache")
- [ ] Sprawdziłem Runtime Logs - widzę logi `[Stripe] Checking...`
- [ ] Sprawdziłem czy wartości zmiennych nie są puste
- [ ] Sprawdziłem czy nie ma duplikatów zmiennych

## 🆘 Ostateczne rozwiązanie

Jeśli nadal nie działa:

1. **Skopiuj wszystkie wartości zmiennych** (z Stripe Dashboard)
2. **Usuń wszystkie zmienne Stripe** z Vercel
3. **Dodaj je ponownie** (wszystkie na raz)
4. **Zrób redeploy bez cache**
5. **Sprawdź Runtime Logs** - powinny pokazać wszystkie zmienne

## 💡 Dlaczego to się dzieje?

- Next.js cache'uje zmienne środowiskowe podczas build time
- Vercel może cache'ować build artifacts
- Zmienne dodane po build nie są automatycznie dostępne
- Pełny redeploy wymusza załadowanie nowych zmiennych

**Najważniejsze:** ZAWSZE rób redeploy po dodaniu/zmianie zmiennych środowiskowych!

