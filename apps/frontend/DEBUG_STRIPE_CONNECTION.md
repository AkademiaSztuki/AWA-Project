# 🔍 Debugowanie błędu połączenia z Stripe

## Problem
```
Failed to create Stripe checkout session: An error occurred with our connection to Stripe. Request was retried 1 times.
```

Price ID jest poprawne, ale nadal występuje błąd połączenia z Stripe API.

## 🔍 Możliwe przyczyny

### 1. Test vs Live Mode Mismatch

W logach widzę:
```
[Stripe] Stripe secret key present: sk_test_51...
```

**Używasz test key (`sk_test_...`) w produkcji!**

**Problem:** Jeśli Price IDs są z **live mode**, a używasz **test key**, Stripe API zwróci błąd.

**Rozwiązanie:**
- Jeśli testujesz: użyj **test Price IDs** z Stripe Dashboard (test mode)
- Jeśli to produkcja: użyj **live keys** (`sk_live_...`, `pk_live_...`) i **live Price IDs**

### 2. Price ID nie istnieje lub jest nieaktywne

**Sprawdź w Stripe Dashboard:**
1. Stripe Dashboard → **Products**
2. Znajdź produkt z Price ID: `price_1Shb7PCRp3yNUj...`
3. Sprawdź czy Price jest **Active** (nie Archived)
4. Sprawdź czy Price ID w Vercel odpowiada Price ID w Stripe

### 3. Problem z siecią/timeout

**Możliwe przyczyny:**
- Vercel serverless function timeout
- Problem z połączeniem do Stripe API
- Rate limiting Stripe

**Rozwiązanie:**
- Sprawdź logi Stripe Dashboard → **Developers** → **Logs**
- Sprawdź czy są błędy związane z timeout

### 4. Niepoprawny Stripe Secret Key

**Sprawdź:**
1. Vercel Dashboard → **Settings** → **Environment Variables**
2. Sprawdź czy `STRIPE_SECRET_KEY` jest poprawny
3. Sprawdź czy nie ma dodatkowych spacji
4. Sprawdź czy używasz odpowiedniego key (test vs live)

## ✅ Rozwiązanie krok po kroku

### Krok 1: Sprawdź logi Stripe

1. Stripe Dashboard → **Developers** → **Logs**
2. Szukaj błędów związanych z:
   - `checkout.sessions.create`
   - `No such price`
   - `Invalid API Key`
   - `test mode` / `live mode`

### Krok 2: Sprawdź czy Price ID jest aktywne

1. Stripe Dashboard → **Products**
2. Sprawdź czy Price z ID `price_1Shb7PCRp3yNUj...` jest **Active**
3. Sprawdź czy Price ID w Vercel odpowiada Price ID w Stripe

### Krok 3: Sprawdź test vs live mode

**Jeśli używasz test keys:**
- Upewnij się że Price IDs są z **test mode** w Stripe Dashboard
- Przełącz Stripe Dashboard na **test mode** (toggle w prawym górnym rogu)

**Jeśli używasz live keys:**
- Upewnij się że Price IDs są z **live mode** w Stripe Dashboard
- Przełącz Stripe Dashboard na **live mode**

### Krok 4: Sprawdź Runtime Logs

Po dodaniu lepszego logowania, w Runtime Logs powinny pojawić się:

```
[Stripe] Stripe API error: {
  type: 'StripeInvalidRequestError',
  code: 'resource_missing',
  message: 'No such price: price_...',
  ...
}
```

To pokaże dokładny błąd z Stripe API.

## 🐛 Najczęstsze błędy

### Błąd 1: "No such price"

**Przyczyna:** Price ID nie istnieje w Stripe

**Rozwiązanie:**
- Sprawdź czy Price ID jest poprawne w Stripe Dashboard
- Sprawdź czy Price jest Active (nie Archived)

### Błąd 2: "Invalid API Key"

**Przyczyna:** Niepoprawny Stripe Secret Key

**Rozwiązanie:**
- Sprawdź czy `STRIPE_SECRET_KEY` jest poprawny w Vercel
- Sprawdź czy nie ma dodatkowych spacji

### Błąd 3: "test mode" / "live mode" mismatch

**Przyczyna:** Używasz test keys z live Price IDs (lub odwrotnie)

**Rozwiązanie:**
- Użyj test keys z test Price IDs
- Użyj live keys z live Price IDs

## 📋 Checklist

- [ ] Sprawdziłem logi Stripe Dashboard → Developers → Logs
- [ ] Sprawdziłem czy Price ID jest Active w Stripe Dashboard
- [ ] Sprawdziłem czy używam test keys z test Price IDs (lub live z live)
- [ ] Sprawdziłem Runtime Logs - widzę szczegółowy błąd Stripe API
- [ ] Sprawdziłem czy `STRIPE_SECRET_KEY` jest poprawny w Vercel

## 🆘 Jeśli nadal nie działa

1. **Skopiuj szczegółowy błąd z Runtime Logs** (po dodaniu lepszego logowania)
2. **Sprawdź logi Stripe Dashboard** → Developers → Logs
3. **Sprawdź czy Price ID jest aktywne** w Stripe Dashboard
4. **Sprawdź czy używasz odpowiednich keys** (test vs live)

