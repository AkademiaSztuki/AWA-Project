# 🔧 Rozwiązywanie problemów ze zmiennymi środowiskowymi

## Problem: Next.js nie widzi zmiennych z .env.local

### ✅ Rozwiązanie 1: Zrestartuj dev server

**WAŻNE:** Next.js ładuje zmienne środowiskowe tylko podczas startu!

```bash
# Zatrzymaj dev server (Ctrl+C)
# Uruchom ponownie:
pnpm dev
```

### ✅ Rozwiązanie 2: Sprawdź nazwę pliku

Plik musi się nazywać dokładnie: `.env.local` (nie `.env`, nie `.env.local.txt`)

### ✅ Rozwiązanie 3: Sprawdź składnię

W `.env.local` nie używaj cudzysłowów (chyba że wartość zawiera spacje):

```env
# ✅ DOBRZE:
STRIPE_PRICE_BASIC_MONTHLY=price_1234567890

# ❌ ŹLE:
STRIPE_PRICE_BASIC_MONTHLY="price_1234567890"
STRIPE_PRICE_BASIC_MONTHLY = price_1234567890
```

### ✅ Rozwiązanie 4: Sprawdź czy nie ma spacji

```env
# ✅ DOBRZE:
STRIPE_PRICE_BASIC_MONTHLY=price_1234567890

# ❌ ŹLE (spacja przed =):
STRIPE_PRICE_BASIC_MONTHLY =price_1234567890
```

### ✅ Rozwiązanie 5: Sprawdź czy wszystkie zmienne są ustawione

Wymagane zmienne:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_BASIC_MONTHLY=price_...
STRIPE_PRICE_BASIC_YEARLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_STUDIO_MONTHLY=price_...
STRIPE_PRICE_STUDIO_YEARLY=price_...
```

### ✅ Rozwiązanie 6: Sprawdź czy plik jest w odpowiednim miejscu

Plik `.env.local` musi być w katalogu `apps/frontend/` (tam gdzie jest `package.json`)

```
AWA-Project/
  apps/
    frontend/
      .env.local  ← TUTAJ!
      package.json
      next.config.js
```

### 🧪 Testowanie

Uruchom:
```bash
node check-env.js
```

Powinno pokazać wszystkie zmienne jako ✅.

### ⚠️ Ważne

- **NEXT_PUBLIC_** prefix: Zmienne z tym prefiksem są widoczne w przeglądarce
- **Bez prefixu**: Zmienne są widoczne tylko w Node.js (API routes, server components)
- **Restart**: Zawsze restartuj dev server po zmianie .env.local

