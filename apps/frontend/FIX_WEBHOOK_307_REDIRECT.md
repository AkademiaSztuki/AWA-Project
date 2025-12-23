# 🔧 Naprawa: Webhook 307 Temporary Redirect

## Problem
W logach Stripe Dashboard widzę:
```
307 ERR Temporary Redirect
Response: "redirect": "https://www.project-ida.com/api/stripe/webhook"
```

**Stripe próbuje wysłać webhook do `https://project-ida.com/api/stripe/webhook` (bez www), ale serwer zwraca redirect 307 do `https://www.project-ida.com/api/stripe/webhook` (z www).**

**Stripe NIE podąża za redirectami 307!** Webhook musi być dostępny bezpośrednio pod podanym URL.

## ✅ Rozwiązanie: Zmień URL webhook w Stripe Dashboard

### Krok 1: Otwórz Stripe Dashboard

1. Stripe Dashboard → **Developers** → **Webhooks**
2. Znajdź webhook endpoint: `https://project-ida.com/api/stripe/webhook`
3. Kliknij na webhook (lub "..." → "Edit")

### Krok 2: Zmień URL na wersję z www

1. Kliknij **"Edit"** lub **"Update endpoint"**
2. Zmień URL z:
   - ❌ `https://project-ida.com/api/stripe/webhook`
   - ✅ `https://www.project-ida.com/api/stripe/webhook`
3. Kliknij **"Update endpoint"** lub **"Save"**

### Krok 3: Sprawdź czy działa

1. Stripe Dashboard → **Developers** → **Webhooks**
2. Kliknij na webhook
3. Kliknij **"Send test webhook"** (opcjonalnie)
4. Sprawdź **"Recent events"** - powinny być status **200** (nie 307)

### Krok 4: Przetestuj ponownie zakup

1. Przejdź przez checkout ponownie
2. Sprawdź czy kredyty zostały przydzielone
3. Sprawdź logi w Stripe Dashboard - powinien być status **200**

## 🔍 Alternatywa: Napraw redirect w Vercel

Jeśli chcesz używać URL bez www, możesz skonfigurować Vercel żeby nie przekierowywał:

1. Vercel Dashboard → **Settings** → **Domains**
2. Sprawdź konfigurację domeny
3. Upewnij się że `project-ida.com` i `www.project-ida.com` są skonfigurowane

**Ale łatwiej jest zmienić URL w Stripe Dashboard na wersję z www!**

## 📋 Checklist

- [ ] Zmieniłem URL webhook w Stripe Dashboard na `https://www.project-ida.com/api/stripe/webhook`
- [ ] Sprawdziłem czy webhook działa (status 200, nie 307)
- [ ] Przetestowałem zakup ponownie
- [ ] Sprawdziłem czy kredyty zostały przydzielone

## 🆘 Jeśli nadal nie działa

1. **Sprawdź czy endpoint jest dostępny:**
   - Otwórz: `https://www.project-ida.com/api/stripe/webhook` w przeglądarce
   - Powinien zwrócić błąd 405 (Method Not Allowed) dla GET, ale to OK
   - Ważne: NIE powinien przekierowywać!

2. **Sprawdź logi Stripe:**
   - Stripe Dashboard → **Developers** → **Webhooks** → **Recent events**
   - Sprawdź czy status to **200** (nie 307)

3. **Sprawdź Runtime Logs:**
   - Vercel Dashboard → **Deployments** → **Runtime Logs**
   - Szukaj logów `[Webhook]` - powinny pojawić się po poprawieniu URL

## 💡 Dlaczego to się dzieje?

- Vercel automatycznie przekierowuje `project-ida.com` → `www.project-ida.com`
- Stripe nie podąża za redirectami 307
- Webhook musi być dostępny bezpośrednio pod podanym URL

**Najważniejsze:** Zmień URL webhook w Stripe Dashboard na wersję z `www` - to rozwiąże problem!

