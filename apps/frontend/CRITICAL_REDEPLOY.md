# 🚨 KRYTYCZNE: Redeploy na Vercel

## Problem

Błędy RLS nadal występują:
```
Error saving webhook event: new row violates row-level security policy for table "stripe_webhook_events"
new row violates row-level security policy for table "subscriptions"
```

## Przyczyna

Kod został poprawiony lokalnie, ale **NIE został jeszcze wdrożony na produkcji (Vercel)**.

## Rozwiązanie

### Krok 1: Kod został już wypushowany do Git ✅

Zmiany zostały wypushowane do repozytorium.

### Krok 2: ZRÓB REDEPLOY NA VERCEL (BEZ CACHE!)

1. **Vercel Dashboard** → **Deployments**
2. Znajdź najnowszy deployment (z commit message "Fix RLS errors...")
3. Jeśli nie ma nowego deploymentu, kliknij **"Redeploy"** na najnowszym
4. **WAŻNE:** Wybierz **"Redeploy without cache"** (lub podobną opcję)
5. Poczekaj aż deployment się zakończy

### Krok 3: Sprawdź czy `SUPABASE_SERVICE_ROLE_KEY` jest ustawiony

1. **Vercel Dashboard** → **Settings** → **Environment Variables**
2. Sprawdź czy `SUPABASE_SERVICE_ROLE_KEY` jest na liście
3. Jeśli nie ma, **DODAJ GO TERAZ**:
   - Key: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: service_role key z Supabase Dashboard
   - Environment: **Production**

### Krok 4: Przetestuj ponownie

1. Wykonaj nowy checkout w Stripe
2. Sprawdź Runtime Logs w Vercel:
   - ✅ Powinno być: `[Webhook] Subscription created/updated successfully`
   - ✅ Powinno być: `[Credits] Credit transaction created successfully`
   - ❌ NIE powinno być: `new row violates row-level security policy`

## Jeśli nadal nie działa po redeploy

### Sprawdź Runtime Logs:

1. Vercel Dashboard → **Deployments** → najnowszy deployment
2. Kliknij **"Runtime Logs"** → **"Stream"**
3. Szukaj błędów:
   - `Missing SUPABASE_SERVICE_ROLE_KEY` = zmienna nie jest załadowana
   - `new row violates row-level security policy` = kod nie został zaktualizowany

### Sprawdź czy kod został zaktualizowany:

W Runtime Logs powinieneś zobaczyć logi z `[Webhook]` i `[Credits]` - jeśli ich nie ma, kod nie został zaktualizowany.

## Najważniejsze

**ZRÓB REDEPLOY NA VERCEL BEZ CACHE!**

Bez tego kod z poprawkami nie będzie działał na produkcji.

