# 🔧 Naprawa: ERR_INVALID_CHAR w Stripe Secret Key

## Problem
```
Invalid character in header content ["Authorization"]
ERR_INVALID_CHAR
```

**To oznacza, że `STRIPE_SECRET_KEY` zawiera nieprawidłowy znak!**

## ✅ Rozwiązanie: Napraw w Vercel

### Krok 1: Sprawdź STRIPE_SECRET_KEY w Vercel

1. Vercel Dashboard → **Settings** → **Environment Variables**
2. Znajdź `STRIPE_SECRET_KEY`
3. Kliknij na zmienną

### Krok 2: Sprawdź wartość

**Częste problemy:**
- ✅ Znaki nowej linii (`\n`) na końcu
- ✅ Dodatkowe spacje na początku/końcu
- ✅ Nieprawidłowe znaki

### Krok 3: Napraw wartość

1. **Skopiuj wartość** z Vercel
2. **Wklej do notatnika** i sprawdź czy nie ma:
   - Znaków nowej linii na końcu
   - Dodatkowych spacji
3. **Usuń wszystkie białe znaki** z początku i końca
4. **Wklej poprawioną wartość** z powrotem do Vercel
5. Kliknij **"Save"**

### Krok 4: Redeploy

1. **Deployments** → najnowszy deployment
2. Kliknij **"..."** → **"Redeploy"**
3. **ODZNACZ** "Use existing Build Cache"
4. Kliknij **"Redeploy"**

## 🔍 Weryfikacja

Po redeploy, w Runtime Logs powinny pojawić się:

```
[Stripe] Using Stripe key: sk_test_51...xxxx
```

**NIE powinno być:**
```
Invalid character in header content ["Authorization"]
```

## 💡 Co dodałem w kodzie

Kod automatycznie:
- ✅ Usuwa białe znaki z początku i końca (`trim()`)
- ✅ Usuwa znaki nowej linii (`replace(/\r?\n/g, '')`)
- ✅ Loguje pierwsze i ostatnie znaki klucza (dla debugowania)

**Ale lepiej naprawić w Vercel!**

## 🐛 Najczęstsze problemy

### Problem 1: Znak nowej linii na końcu

**Objaw:** Klucz wygląda OK, ale ma `\n` na końcu

**Rozwiązanie:** Usuń znak nowej linii w Vercel

### Problem 2: Dodatkowe spacje

**Objaw:** Klucz ma spacje na początku/końcu

**Rozwiązanie:** Usuń spacje w Vercel

### Problem 3: Nieprawidłowe znaki

**Objaw:** Klucz zawiera nieprawidłowe znaki

**Rozwiązanie:** Skopiuj klucz ponownie z Stripe Dashboard

## 📋 Checklist

- [ ] Sprawdziłem `STRIPE_SECRET_KEY` w Vercel
- [ ] Usunąłem białe znaki z początku i końca
- [ ] Usunąłem znaki nowej linii
- [ ] Zrobiłem redeploy (bez cache)
- [ ] Sprawdziłem Runtime Logs - nie ma błędu ERR_INVALID_CHAR

## 🆘 Jeśli nadal nie działa

1. **Skopiuj klucz ponownie** z Stripe Dashboard
2. **Usuń starą zmienną** w Vercel
3. **Dodaj nową zmienną** z poprawnym kluczem
4. **Zrób redeploy** (bez cache)

