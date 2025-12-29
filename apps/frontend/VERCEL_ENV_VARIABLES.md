# 📋 Zmienne środowiskowe do Vercel

## ✅ BEZPIECZNE DO DODANIA (Publiczne - NEXT_PUBLIC_*)

Te zmienne są widoczne w przeglądarce, więc są bezpieczne:

```
✅ NEXT_PUBLIC_SUPABASE_URL
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
✅ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
✅ NEXT_PUBLIC_MODAL_API_URL
✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
✅ NEXT_PUBLIC_APP_URL
✅ NEXT_PUBLIC_DEBUG
```

## 🔐 WRAŻLIWE ALE POTRZEBNE (Secret Keys)

Te zmienne są wrażliwe, ale MUSZĄ być w Vercel (tylko po stronie serwera):

### Stripe (WYMAGANE dla subskrypcji):
```
🔐 STRIPE_SECRET_KEY=sk_live_...  (lub sk_test_... dla testów)
🔐 STRIPE_WEBHOOK_SECRET=whsec_...
🔐 STRIPE_PRICE_BASIC_MONTHLY=price_...
🔐 STRIPE_PRICE_BASIC_YEARLY=price_...
🔐 STRIPE_PRICE_PRO_MONTHLY=price_...
🔐 STRIPE_PRICE_PRO_YEARLY=price_...
🔐 STRIPE_PRICE_STUDIO_MONTHLY=price_...
🔐 STRIPE_PRICE_STUDIO_YEARLY=price_...
```

### Google AI (jeśli używasz):
```
🔐 GOOGLE_AI_API_KEY=your-google-ai-api-key-here
🔐 GOOGLE_CLOUD_PROJECT=your-project-id-here
```

**UWAGA:** `GOOGLE_APPLICATION_CREDENTIALS` - to ścieżka do pliku lokalnego, NIE dodawaj do Vercel. Zamiast tego użyj service account JSON jako zmiennej środowiskowej lub Vercel Secrets.

### Groq (jeśli używasz):
```
🔐 GROQ_API_KEY=gsk_...
```

### Hugging Face (jeśli używasz):
```
🔐 HF_NEWTOKEN=hf_...
```

## ❌ NIE DODAWAJ DO VERCEL

Te zmienne są tylko lokalne lub nie są potrzebne w produkcji:

```
❌ GOOGLE_APPLICATION_CREDENTIALS=./keys/google-service-account.json
   (To ścieżka lokalna - w Vercel użyj Vercel Secrets lub zmiennej z zawartością JSON)

❌ NEXT_PUBLIC_GA_ID=your-google-analytics-id
   (Jeśli nie używasz Google Analytics, nie dodawaj)

❌ NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
   (Jeśli nie używasz Sentry, nie dodawaj)

❌ modal secret create groq-secret ...
   (To komenda Modal CLI, nie zmienna środowiskowa)

❌ huggingface-secret-new=...
   (To komenda Modal CLI, nie zmienna środowiskowa)
```

## 📝 Instrukcja dodawania do Vercel

### Krok 1: Otwórz Vercel Dashboard
1. https://vercel.com/dashboard
2. Znajdź projekt
3. **Settings** → **Environment Variables**

### Krok 2: Dodaj zmienne

Dla każdej zmiennej:
1. Kliknij **"Add New"**
2. Wpisz **Name** (np. `STRIPE_SECRET_KEY`)
3. Wklej **Value** (skopiuj z `.env.local`)
4. Zaznacz środowiska:
   - ✅ **Production** (dla produkcji)
   - ✅ **Preview** (dla preview deployments)
   - ✅ **Development** (opcjonalnie, dla lokalnego testowania z Vercel CLI)

### Krok 3: Lista wszystkich zmiennych do dodania

**Publiczne (NEXT_PUBLIC_*):**
1. `NEXT_PUBLIC_SUPABASE_URL`
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
4. `NEXT_PUBLIC_MODAL_API_URL`
5. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
6. `NEXT_PUBLIC_APP_URL`
7. `NEXT_PUBLIC_DEBUG` (opcjonalnie)

**Stripe (WYMAGANE):**
8. `STRIPE_SECRET_KEY`
9. `STRIPE_WEBHOOK_SECRET`
10. `STRIPE_PRICE_BASIC_MONTHLY`
11. `STRIPE_PRICE_BASIC_YEARLY`
12. `STRIPE_PRICE_PRO_MONTHLY`
13. `STRIPE_PRICE_PRO_YEARLY`
14. `STRIPE_PRICE_STUDIO_MONTHLY`
15. `STRIPE_PRICE_STUDIO_YEARLY`

**Google AI (jeśli używasz):**
16. `GOOGLE_AI_API_KEY`
17. `GOOGLE_CLOUD_PROJECT`

**Groq (jeśli używasz):**
18. `GROQ_API_KEY`

**Hugging Face (jeśli używasz):**
19. `HF_NEWTOKEN`

### Krok 4: Redeploy

Po dodaniu wszystkich zmiennych:
1. **Deployments** → najnowszy deployment
2. Kliknij **"..."** → **"Redeploy"**
3. Poczekaj 2-3 minuty

## ⚠️ Ważne uwagi

1. **Test vs Live keys:**
   - W produkcji użyj **live keys** (`sk_live_...`, `pk_live_...`)
   - W development możesz użyć test keys

2. **Price IDs:**
   - Muszą być z tego samego Stripe account (test lub live)
   - Sprawdź w Stripe Dashboard czy są aktywne

3. **Bezpieczeństwo:**
   - NIGDY nie commituj `.env.local` do git
   - NIGDY nie udostępniaj secret keys publicznie
   - Używaj różnych keys dla development i production

4. **Vercel Secrets:**
   - Dla bardzo wrażliwych danych możesz użyć Vercel Secrets zamiast Environment Variables
   - Secrets są szyfrowane i bardziej bezpieczne

## 🔍 Sprawdzenie po dodaniu

1. **Sprawdź logi Vercel:**
   - Deployments → Runtime Logs
   - Szukaj błędów związanych z brakującymi zmiennymi

2. **Testuj:**
   - Otwórz `https://project-ida.com/subscription/plans`
   - Kliknij "Wybierz plan"
   - Powinno działać bez błędu 500

