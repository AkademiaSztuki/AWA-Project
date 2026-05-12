# 🔧 Konfiguracja zmiennych środowiskowych w Vercel

## Problem: Błąd 500 przy tworzeniu checkout session w produkcji

Błąd oznacza, że zmienne środowiskowe nie są ustawione w Vercel.

## ✅ Rozwiązanie: Dodaj zmienne do Vercel

### Krok 1: Otwórz Vercel Dashboard
1. Idź do: https://vercel.com/dashboard
2. Znajdź projekt: `awa-project-frontend` (lub odpowiedni)
3. Kliknij na projekt

### Krok 2: Przejdź do Settings → Environment Variables
1. Kliknij zakładkę **"Settings"**
2. Kliknij **"Environment Variables"** (w lewym menu)

### Krok 3: Dodaj wszystkie zmienne Stripe

Kliknij **"Add New"** i dodaj każdą zmienną:

#### 1. Stripe Keys
```
Name: STRIPE_SECRET_KEY
Value: sk_live_...  (lub sk_test_... dla testów)
Environment: Production, Preview, Development (zaznacz wszystkie)
```

```
Name: STRIPE_WEBHOOK_SECRET
Value: whsec_...  (z Stripe Dashboard → Webhooks)
Environment: Production, Preview, Development
```

#### 2. Price IDs (wszystkie 12: PLN + USD)
```
Name: STRIPE_PRICE_BASIC_MONTHLY_PLN
Value: price_...  (z Stripe Dashboard)
Environment: Production, Preview, Development
```

```
Name: STRIPE_PRICE_BASIC_YEARLY_PLN
Value: price_...
Environment: Production, Preview, Development
```

```
Name: STRIPE_PRICE_PRO_MONTHLY_PLN
Value: price_...
Environment: Production, Preview, Development
```

```
Name: STRIPE_PRICE_PRO_YEARLY_PLN
Value: price_...
Environment: Production, Preview, Development
```

```
Name: STRIPE_PRICE_STUDIO_MONTHLY_PLN
Value: price_...
Environment: Production, Preview, Development
```

```
Name: STRIPE_PRICE_STUDIO_YEARLY_PLN
Value: price_...
Environment: Production, Preview, Development
```

Dodaj analogicznie ceny USD dla języka angielskiego:

```
STRIPE_PRICE_BASIC_MONTHLY_USD=price_...
STRIPE_PRICE_BASIC_YEARLY_USD=price_...
STRIPE_PRICE_PRO_MONTHLY_USD=price_...
STRIPE_PRICE_PRO_YEARLY_USD=price_...
STRIPE_PRICE_STUDIO_MONTHLY_USD=price_...
STRIPE_PRICE_STUDIO_YEARLY_USD=price_...
```

Aktualne ceny:
- Starter (`basic`): 29 PLN / $9 miesięcznie, 290 PLN / $90 rocznie
- Creator (`pro`): 59 PLN / $19 miesięcznie, 590 PLN / $190 rocznie
- Pro (`studio`): 119 PLN / $39 miesięcznie, 1190 PLN / $390 rocznie

Subskrypcja w aplikacji: **60 / 160 / 320 obrazów AI na miesiąc** (rocznie 12× ta sama miesięczna pula w kredytach backendu). **60 obrazów powitalnych** przy nowym koncie to osobna logika — bez Price ID w Stripe.

### Krok 4: Redeploy
Po dodaniu wszystkich zmiennych:
1. Przejdź do zakładki **"Deployments"**
2. Kliknij **"..."** (trzy kropki) na najnowszym deployment
3. Wybierz **"Redeploy"**
4. Poczekaj aż deployment się zakończy (~2-3 minuty)

## 🔍 Sprawdzenie

### Sprawdź logi Vercel
1. Vercel Dashboard → Twój projekt → **"Deployments"**
2. Kliknij najnowszy deployment
3. Sprawdź **"Runtime Logs"**
4. Szukaj błędów związanych z Stripe

### Testuj ponownie
1. Otwórz: `https://project-ida.com/subscription/plans`
2. Kliknij "Wybierz plan"
3. Powinno działać bez błędu 500

## ⚠️ Ważne

- **Test vs Live:** Upewnij się że używasz odpowiednich kluczy (test dla development, live dla produkcji)
- **Price IDs:** Muszą być z tego samego Stripe account (test lub live)
- **Redeploy:** Po dodaniu zmiennych ZAWSZE zrób redeploy!

## 🐛 Jeśli nadal nie działa

Sprawdź logi w Vercel:
1. Deployments → Najnowszy deployment → Runtime Logs
2. Szukaj błędów: "STRIPE_PRICE_... is not set" lub "STRIPE_SECRET_KEY is not set"
3. Sprawdź czy wszystkie zmienne są dodane i czy są w odpowiednim środowisku (Production)

