# 📋 Zmienne środowiskowe do Vercel

## ✅ WYMAGANE – GCP Backend

```
✅ NEXT_PUBLIC_GCP_API_BASE_URL=https://awa-backend-api-xxxxx-ew.a.run.app
✅ NEXT_PUBLIC_GCP_PERSISTENCE_MODE=primary
```

## ✅ WYMAGANE – Google Auth (logowanie bez Supabase)

```
✅ NEXT_PUBLIC_USE_GOOGLE_NATIVE_AUTH=1
✅ NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
```

## ✅ PUBLICZNE (NEXT_PUBLIC_*)

```
✅ NEXT_PUBLIC_SITE_URL=https://www.project-ida.com
✅ NEXT_PUBLIC_MODAL_API_URL
✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
✅ NEXT_PUBLIC_APP_URL
```

`NEXT_PUBLIC_SITE_URL` — canonical URL dla SEO (sitemap, Open Graph, JSON-LD). Ustaw na produkcji na `https://www.project-ida.com`.

## 🔐 WRAŻLIWE ALE POTRZEBNE (Secret Keys)

### Stripe (WYMAGANE dla subskrypcji):
```
🔐 STRIPE_SECRET_KEY=sk_live_...
🔐 STRIPE_WEBHOOK_SECRET=whsec_...
🔐 STRIPE_PRICE_BASIC_MONTHLY_PLN=price_...
🔐 STRIPE_PRICE_BASIC_YEARLY_PLN=price_...
🔐 STRIPE_PRICE_PRO_MONTHLY_PLN=price_...
🔐 STRIPE_PRICE_PRO_YEARLY_PLN=price_...
🔐 STRIPE_PRICE_STUDIO_MONTHLY_PLN=price_...
🔐 STRIPE_PRICE_STUDIO_YEARLY_PLN=price_...
🔐 STRIPE_PRICE_BASIC_MONTHLY_USD=price_...
🔐 STRIPE_PRICE_BASIC_YEARLY_USD=price_...
🔐 STRIPE_PRICE_PRO_MONTHLY_USD=price_...
🔐 STRIPE_PRICE_PRO_YEARLY_USD=price_...
🔐 STRIPE_PRICE_STUDIO_MONTHLY_USD=price_...
🔐 STRIPE_PRICE_STUDIO_YEARLY_USD=price_...
```

### Google AI:
```
🔐 GOOGLE_AI_API_KEY=your-google-ai-api-key
🔐 GOOGLE_CLOUD_PROJECT=your-project-id
🔐 GOOGLE_CLOUD_LOCATION=europe-west4
🔐 GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}
```

### ElevenLabs (TTS):
```
🔐 ELEVENLABS_API_KEY=...
🔐 ELEVENLABS_VOICE_ID=...
```

### Cron:
```
🔐 CRON_SECRET=...
```

## ❌ DO USUNIĘCIA Z VERCEL (stare Supabase)

Te zmienne NIE SĄ już potrzebne – Supabase został odłączony:

```
❌ NEXT_PUBLIC_SUPABASE_URL          → USUŃ
❌ NEXT_PUBLIC_SUPABASE_ANON_KEY     → USUŃ
❌ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY → USUŃ
❌ SUPABASE_SERVICE_ROLE_KEY         → USUŃ
```

## 📝 Instrukcja

### Krok 1: Vercel Dashboard
1. https://vercel.com/dashboard
2. Znajdź projekt → **Settings** → **Environment Variables**

### Krok 2: Usuń stare zmienne Supabase
- Usuń `NEXT_PUBLIC_SUPABASE_URL`
- Usuń `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Usuń `SUPABASE_SERVICE_ROLE_KEY`

### Krok 3: Dodaj/zaktualizuj zmienne GCP
- Dodaj `NEXT_PUBLIC_GCP_API_BASE_URL` = URL backendu Cloud Run
- Dodaj `NEXT_PUBLIC_GCP_PERSISTENCE_MODE` = `primary`
- Dodaj `NEXT_PUBLIC_USE_GOOGLE_NATIVE_AUTH` = `1`
- Dodaj `NEXT_PUBLIC_GOOGLE_CLIENT_ID` = OAuth 2.0 Client ID z GCP Console

### Krok 4: Redeploy
1. **Deployments** → najnowszy deployment
2. **"..."** → **"Redeploy"**
