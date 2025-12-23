# 🚀 Subskrypcje - Następne kroki

## ✅ Co jest już gotowe:
- ✅ Kod komponentów UI (CreditBalance, SubscriptionManagement, SubscriptionPlans, UpgradePrompt)
- ✅ API routes dla Stripe i kredytów
- ✅ Funkcje zarządzania kredytami
- ✅ Integracja z flow generacji
- ✅ Migracja SQL (plik gotowy)

## 📋 Co musisz zrobić (krok po kroku):

### KROK 1: Uruchom migrację bazy danych

**Opcja A: Supabase Dashboard (najłatwiejsze)**
1. Otwórz: https://supabase.com/dashboard/project/zcaaqbbcqpkzunepnhpb/sql/new
2. Otwórz plik: `apps/frontend/supabase/migrations/20251224000000_stripe_subscriptions.sql`
3. Skopiuj całą zawartość
4. Wklej do SQL Editor w Supabase Dashboard
5. Kliknij **"Run"**

**Opcja B: Supabase CLI**
```bash
cd apps/frontend
supabase db push
```

**Opcja C: psql (bezpośrednio)**
```bash
psql "postgresql://postgres:[HASŁO]@db.zcaaqbbcqpkzunepnhpb.supabase.co:5432/postgres" -f supabase/migrations/20251224000000_stripe_subscriptions.sql
```

### KROK 2: Dodaj zmienne środowiskowe

Dodaj do `apps/frontend/.env.local`:

```env
# Stripe Keys (z Stripe Dashboard → Developers → API keys)
STRIPE_SECRET_KEY=sk_test_...  # lub sk_live_... dla produkcji
STRIPE_PUBLISHABLE_KEY=pk_test_...  # opcjonalne (jeśli używasz Stripe.js)
STRIPE_WEBHOOK_SECRET=whsec_...  # z Stripe Dashboard → Webhooks → Twój webhook

# Stripe Price IDs (utworzysz w KROKU 3)
STRIPE_PRICE_BASIC_MONTHLY=price_...
STRIPE_PRICE_BASIC_YEARLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_STUDIO_MONTHLY=price_...
STRIPE_PRICE_STUDIO_YEARLY=price_...
```

### KROK 3: Utwórz produkty w Stripe Dashboard

1. Zaloguj się do: https://dashboard.stripe.com/
2. Przejdź do: **Products** → **Add product**

**Utwórz 3 produkty:**

#### Produkt 1: Basic Plan
- **Name:** Basic Plan
- **Description:** 2000 credits (200 generations)
- **Pricing:**
  - Monthly: $20 → **Price ID:** `price_xxxxx` (skopiuj do `.env.local`)
  - Yearly: $200 → **Price ID:** `price_xxxxx` (skopiuj do `.env.local`)

#### Produkt 2: Pro Plan
- **Name:** Pro Plan
- **Description:** 5000 credits (500 generations)
- **Pricing:**
  - Monthly: $45 → **Price ID:** `price_xxxxx`
  - Yearly: $450 → **Price ID:** `price_xxxxx`

#### Produkt 3: Studio Plan
- **Name:** Studio Plan
- **Description:** 8000 credits (800 generations)
- **Pricing:**
  - Monthly: $69 → **Price ID:** `price_xxxxx`
  - Yearly: $690 → **Price ID:** `price_xxxxx`

**Ważne:** Skopiuj wszystkie Price IDs do `.env.local`!

### KROK 4: Skonfiguruj Customer Portal

1. Stripe Dashboard → **Settings** → **Billing** → **Customer portal**
2. Włącz:
   - ✅ **Allow customers to cancel subscriptions**
   - ✅ **Allow customers to switch plans**
   - ✅ **Allow customers to update payment methods**

### KROK 5: Włącz komponenty w dashboardzie

Otwórz: `apps/frontend/src/components/dashboard/UserDashboard.tsx`

Znajdź linie 859-875 i **odkomentuj**:

```typescript
{/* Credits & Subscription */}
{(() => {
  try {
    const userHash = getUserHash();
    if (!userHash) return null;
    
    return (
      <div className="space-y-6 mb-8">
        <CreditBalance userHash={userHash} />
        <SubscriptionManagement userHash={userHash} />
      </div>
    );
  } catch (error) {
    console.error('Error rendering credits/subscription:', error);
    return null;
  }
})()}
```

### KROK 6: Zrestartuj dev server

```bash
# Zatrzymaj obecny (Ctrl+C)
# Uruchom ponownie:
pnpm dev
```

## ✅ Sprawdzenie czy działa:

1. **Otwórz dashboard:** `/dashboard`
2. **Powinieneś zobaczyć:**
   - Komponent "Twoje kredyty" (600 kredytów darmowych dla nowych użytkowników)
   - Komponent "Zarządzanie subskrypcją" (jeśli masz aktywną subskrypcję)

3. **Przetestuj zakup:**
   - Otwórz: `/subscription/plans`
   - Kliknij "Wybierz plan"
   - Użyj testowej karty: `4242 4242 4242 4242`
   - Sprawdź czy kredyty zostały przydzielone

## 🐛 Rozwiązywanie problemów:

### Problem: "STRIPE_SECRET_KEY is not set"
**Rozwiązanie:** Dodaj klucz do `.env.local` i zrestartuj dev server

### Problem: "Table 'subscriptions' does not exist"
**Rozwiązanie:** Uruchom migrację SQL (KROK 1)

### Problem: Komponenty nie wyświetlają się
**Rozwiązanie:** Sprawdź czy odkomentowałeś kod w UserDashboard.tsx (KROK 5)

### Problem: Webhook nie działa
**Rozwiązanie:** 
- Sprawdź czy webhook URL jest poprawny: `https://project-ida.com/api/stripe/webhook`
- Sprawdź czy `STRIPE_WEBHOOK_SECRET` jest ustawiony
- Sprawdź logi w Stripe Dashboard → Webhooks → Events

## 📝 Notatki:

- **Darmowy grant:** Nowi użytkownicy dostają automatycznie 600 kredytów (60 generacji) przy pierwszym logowaniu
- **Kredyty wygasają:** Subskrypcyjne kredyty wygasają na koniec okresu rozliczeniowego
- **Cron job:** Skonfiguruj cron job do wywoływania `/api/credits/expire` codziennie (np. przez Vercel Cron)

