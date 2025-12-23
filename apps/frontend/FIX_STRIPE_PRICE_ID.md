# 🔧 Naprawa: Price ID z znakiem '=' na początku

## Problem
W logach widzę:
```
[Stripe] Checking STRIPE_PRICE_PRO_MONTHLY: =price_1ShZoFCRp3yNU...
[Stripe] Plan config: { priceId: '=price_1ShZoFCRp3yNU...', priceIdLength: 31 }
```

**Price ID zaczyna się od `=` (znak równości)!** To jest niepoprawne - Price ID powinno zaczynać się od `price_`, bez `=`.

## ✅ Rozwiązanie

### Opcja 1: Napraw w Vercel (ZALECANE)

1. Vercel Dashboard → **Settings** → **Environment Variables**
2. Dla każdej zmiennej `STRIPE_PRICE_...`:
   - Kliknij na zmienną
   - Sprawdź wartość - jeśli zaczyna się od `=`, usuń ten znak
   - Przykład: `=price_1ShZoFCRp3yNUjS4...` → `price_1ShZoFCRp3yNUjS4...`
   - Kliknij **"Save"**
3. Zrób redeploy (bez cache)

### Opcja 2: Kod automatycznie naprawi (tymczasowe)

Dodałem kod który automatycznie usuwa `=` z początku Price ID. To działa, ale **lepiej naprawić w Vercel**.

## 🔍 Sprawdź też Stripe Secret Key

W logach widzę:
```
[Stripe] Stripe secret key present: sk_test_51...
```

**Używasz test key (`sk_test_...`) w produkcji!**

### Jeśli testujesz:
- To jest OK - możesz używać test keys

### Jeśli to produkcja:
- Musisz użyć **live keys** (`sk_live_...`, `pk_live_...`)
- Test keys nie działają z live Price IDs

## 📋 Checklist

- [ ] Sprawdziłem czy Price IDs w Vercel nie zaczynają się od `=`
- [ ] Usunąłem `=` z Price IDs jeśli były
- [ ] Sprawdziłem czy używam live keys w produkcji (jeśli to produkcja)
- [ ] Zrobiłem redeploy (bez cache)

## 🆘 Jeśli nadal nie działa

### Sprawdź logi Stripe

1. Stripe Dashboard → **Developers** → **Logs**
2. Szukaj błędów związanych z:
   - Niepoprawnym Price ID
   - Niepoprawnym API key
   - Problemami z połączeniem

### Sprawdź czy Price ID jest aktywne

1. Stripe Dashboard → **Products**
2. Sprawdź czy Price jest **Active** (nie Archived)
3. Sprawdź czy Price ID w Vercel odpowiada Price ID w Stripe

## 💡 Dlaczego to się dzieje?

- Czasami przy kopiowaniu wartości do Vercel może się dodać `=`
- Vercel może interpretować `=` jako część wartości
- Stripe API nie akceptuje Price ID z `=` na początku

**Najważniejsze:** Usuń `=` z Price IDs w Vercel i zrób redeploy!

