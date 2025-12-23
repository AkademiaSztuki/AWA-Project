# ⚠️ Problem: Zmienne środowiskowe nie ładują się w Vercel

## Błąd
```
Error: STRIPE_PRICE_BASIC_MONTHLY is not set in .env.local.
```

**To oznacza, że Vercel NIE widzi zmiennych środowiskowych w runtime!**

## 🔍 Sprawdź to krok po kroku

### Krok 1: Sprawdź czy zmienne są dodane w Vercel

1. Otwórz: https://vercel.com/dashboard
2. Znajdź projekt
3. **Settings** → **Environment Variables**
4. Sprawdź czy widzisz **WSZYSTKIE** te zmienne:
   - `STRIPE_PRICE_BASIC_MONTHLY`
   - `STRIPE_PRICE_BASIC_YEARLY`
   - `STRIPE_PRICE_PRO_MONTHLY`
   - `STRIPE_PRICE_PRO_YEARLY`
   - `STRIPE_PRICE_STUDIO_MONTHLY`
   - `STRIPE_PRICE_STUDIO_YEARLY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`

### Krok 2: Sprawdź środowiska (Environment)

**TO JEST BARDZO WAŻNE!**

Dla każdej zmiennej sprawdź czy są zaznaczone:
- ✅ **Production** (dla produkcji - www.project-ida.com)
- ✅ **Preview** (dla preview deployments)
- ✅ **Development** (opcjonalnie)

**Jeśli "Production" NIE jest zaznaczone, zmienna NIE będzie dostępna w produkcji!**

### Krok 3: Sprawdź wartości

1. Kliknij na każdą zmienną
2. Sprawdź czy wartość:
   - ✅ Nie jest pusta
   - ✅ Nie ma dodatkowych spacji na początku/końcu
   - ✅ Zaczyna się od `price_` (dla Price IDs) lub `sk_`/`whsec_` (dla keys)

### Krok 4: Sprawdź czy zmienne są w odpowiednim środowisku

**WAŻNE:** Vercel ma różne środowiska:
- **Production** - dla domeny produkcyjnej (www.project-ida.com)
- **Preview** - dla preview deployments
- **Development** - dla lokalnego development z Vercel CLI

Jeśli dodałeś zmienne tylko do "Preview" lub "Development", **NIE będą dostępne w produkcji!**

## 🛠️ Rozwiązanie

### Opcja 1: Dodaj zmienne do Production (ZALECANE)

1. Vercel Dashboard → **Settings** → **Environment Variables**
2. Dla każdej zmiennej:
   - Kliknij na zmienną
   - Sprawdź czy **Production** jest zaznaczone
   - Jeśli NIE - zaznacz **Production** i zapisz
3. **Zrób redeploy** (bez cache)

### Opcja 2: Dodaj zmienne ponownie

Jeśli zmienne nie działają, dodaj je ponownie:

1. Vercel Dashboard → **Settings** → **Environment Variables**
2. Kliknij **"Add New"**
3. Dla każdej zmiennej:
   - **Name:** `STRIPE_PRICE_BASIC_MONTHLY` (bez spacji!)
   - **Value:** `price_...` (skopiuj z Stripe Dashboard)
   - **Environment:** Zaznacz **Production**, **Preview**, **Development**
4. Kliknij **"Save"**
5. Powtórz dla wszystkich zmiennych

### Opcja 3: Sprawdź czy nie ma duplikatów

1. Vercel Dashboard → **Settings** → **Environment Variables**
2. Sprawdź czy nie ma **duplikatów** (ta sama nazwa dwa razy)
3. Jeśli są duplikaty - usuń stare, zostaw nowe

## ✅ Po dodaniu zmiennych

**WAŻNE:** ZAWSZE zrób redeploy po dodaniu/zmianie zmiennych!

1. **Deployments** → najnowszy deployment
2. Kliknij **"..."** → **"Redeploy"**
3. **ODZNACZ** "Use existing Build Cache"
4. Kliknij **"Redeploy"**
5. Poczekaj 2-3 minuty

## 🔍 Weryfikacja

Po redeploy sprawdź:

1. **Runtime Logs** w Vercel
2. Kliknij "Wybierz plan" na stronie
3. W logach powinny pojawić się linie:
   ```
   [Stripe] Creating checkout session: {...}
   [Stripe] Plan config: { priceId: 'price_...' }
   ```
   
   **NIE powinno być:**
   ```
   [Stripe] Missing environment variable: STRIPE_PRICE_...
   ```

## 🐛 Najczęstsze błędy

### Błąd 1: Zmienne dodane tylko do Preview/Development

**Objaw:** Błąd w produkcji, ale działa w preview

**Rozwiązanie:** Zaznacz **Production** dla wszystkich zmiennych

### Błąd 2: Puste wartości

**Objaw:** Zmienna istnieje, ale wartość jest pusta

**Rozwiązanie:** Sprawdź czy wartość nie jest pusta i nie ma spacji

### Błąd 3: Niepoprawne nazwy

**Objaw:** Zmienna nie jest rozpoznawana

**Rozwiązanie:** Sprawdź czy nazwa jest dokładnie taka sama (bez spacji, wielkie litery)

### Błąd 4: Nie zrobiłeś redeploy

**Objaw:** Zmienne dodane, ale nadal błąd

**Rozwiązanie:** Zrób redeploy (bez cache!)

## 📋 Checklist

- [ ] Sprawdziłem czy wszystkie zmienne są dodane w Vercel
- [ ] Sprawdziłem czy **Production** jest zaznaczone dla każdej zmiennej
- [ ] Sprawdziłem czy wartości nie są puste
- [ ] Sprawdziłem czy nie ma duplikatów
- [ ] Zrobiłem redeploy (bez cache)
- [ ] Sprawdziłem Runtime Logs - nie ma błędów o brakujących zmiennych

## 🆘 Jeśli nadal nie działa

1. **Skopiuj listę zmiennych** z Vercel (tylko nazwy, nie wartości!)
2. **Sprawdź Runtime Logs** - powinny pokazać które zmienne są dostępne
3. **Sprawdź czy Price IDs są poprawne** w Stripe Dashboard

